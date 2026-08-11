import cv2
import re
import numpy as np
import base64
from typing import Optional, List, Dict
from app.core.config import settings
from app.core.vocabulary import check_word

class OCRService:
    def __init__(self):
        self.reader = None
        self.is_initialized = False
        self.error_msg = ""
        self.initialize_reader()

    def initialize_reader(self) -> None:
        """Initialize EasyOCR reader."""
        try:
            import easyocr
            print(f"[OCR] Loading EasyOCR models from storage path: {settings.OCR_MODEL_PATH}")
            # Initialize reader for English language
            self.reader = easyocr.Reader(['en'], model_storage_directory=settings.OCR_MODEL_PATH)
            self.is_initialized = True
            print("[OCR] EasyOCR Reader initialized successfully.")
        except Exception as e:
            self.is_initialized = False
            self.error_msg = str(e)
            print(f"[OCR] Failed to initialize EasyOCR: {e}")

    def to_base64_uri(self, img_np: np.ndarray) -> str:
        """Encode numpy image to base64 JPEG URI."""
        try:
            success, encoded_img = cv2.imencode('.jpg', img_np)
            if success:
                b64 = base64.b64encode(encoded_img).decode('utf-8')
                return f"data:image/jpeg;base64,{b64}"
        except Exception as e:
            print(f"Error encoding image to base64: {e}")
        return ""

    def process_ocr_frame(
        self,
        image_bytes: bytes,
        x: Optional[int] = None,
        y: Optional[int] = None,
        w: Optional[int] = None,
        h: Optional[int] = None,
        video_w: Optional[int] = None,
        video_h: Optional[int] = None
    ) -> dict:
        """
        Executes the OCR pipeline on the captured frame:
        1. Capture frame (imdecode)
        2. Crop ROI (scaled to frame dimensions)
        3. Convert to grayscale
        4. Resize image
        5. Run EasyOCR
        6. Obtain recognized text & compare with vocabulary
        """
        if not self.is_initialized or self.reader is None:
            # Try to reinitialize in case it was a temporary pip install lag
            self.initialize_reader()
            if not self.is_initialized:
                return {
                    "success": False,
                    "error": f"OCR Engine not initialized: {self.error_msg}"
                }

        # 1. Capture/Load frame
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"success": False, "error": "Invalid frame image format"}

        img_h, img_w, _ = img.shape

        # 2. Crop ROI (if coordinates are provided and valid)
        if x is not None and y is not None and w is not None and h is not None:
            # If reference video dimensions are provided, scale the coordinates to the actual image size
            if video_w and video_h:
                scale_x = img_w / video_w
                scale_y = img_h / video_h
                x_val = int(x * scale_x)
                y_val = int(y * scale_y)
                w_val = int(w * scale_x)
                h_val = int(h * scale_y)
            else:
                x_val = x
                y_val = y
                w_val = w
                h_val = h

            # Ensure ROI coordinates are within bounds
            x_val = max(0, min(x_val, img_w - 1))
            y_val = max(0, min(y_val, img_h - 1))
            w_val = max(1, min(w_val, img_w - x_val))
            h_val = max(1, min(h_val, img_h - y_val))
            cropped = img[y_val:y_val+h_val, x_val:x_val+w_val]
        else:
            cropped = img.copy()
            x_val, y_val, w_val, h_val = 0, 0, img_w, img_h

        if cropped.size == 0:
            cropped = img.copy()

        # 3. Upscale & Enhance Crop for CRAFT Text Detector (optimized for CPU speed)
        crop_h, crop_w = cropped.shape[:2]
        if crop_h < 160:
            scale = 160.0 / crop_h
            resized = cv2.resize(cropped, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        else:
            resized = cropped.copy()

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # 4. Run EasyOCR on the enhanced crop with high sensitivity parameters
        try:
            print(f"[OCR] Processing frame. Original: {img_w}x{img_h}, Crop: x={x_val}, y={y_val}, w={w_val}, h={h_val}. Resized crop shape: {resized.shape}")
            results = self.reader.readtext(
                resized,
                text_threshold=0.3,
                low_text=0.2,
                link_threshold=0.4,
                adjust_contrast=0.5,
                batch_size=1
            )
            print(f"[OCR] Raw detection results: {results}")
        except Exception as e:
            return {"success": False, "error": f"OCR Recognition failed: {str(e)}"}

        # 5. Extract text tokens and filter out non-word garbage
        extracted_words = []
        confs = []
        for res in results:
            raw_text = res[1]
            conf_val = res[2]
            # Clean token: allow letters, digits, apostrophes
            clean_token = re.sub(r"[^a-zA-Z0-9']", "", raw_text).strip()
            if clean_token and len(clean_token) >= 2:
                extracted_words.append(clean_token)
                confs.append(conf_val)

        text_upper = " ".join(extracted_words).upper()
        conf = float(np.mean(confs)) if confs else 0.0

        if not text_upper:
            return {
                "success": True,
                "text": "",
                "confidence": 0.0,
                "status": "NO_TEXT",
                "meaning": "No text detected in target box.",
                "pipeline": {
                    "cropped": self.to_base64_uri(cropped),
                    "grayscale": self.to_base64_uri(gray),
                    "resized": self.to_base64_uri(resized)
                }
            }

        # 6. Compare with vocabulary
        match_found, meaning = check_word(text_upper)

        cropped_b64 = self.to_base64_uri(cropped)
        gray_b64 = self.to_base64_uri(gray)
        resized_b64 = self.to_base64_uri(resized)

        return {
            "success": True,
            "text": text_upper,
            "confidence": conf,
            "status": "MATCH FOUND" if match_found else "UNKNOWN WORD",
            "meaning": meaning if match_found else "Please try again.",
            "pipeline": {
                "cropped": cropped_b64,
                "grayscale": gray_b64,
                "resized": resized_b64
            }
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Image Dictionary mode: process full image, extract per-word bboxes
    # ─────────────────────────────────────────────────────────────────────────

    def process_image_for_dictionary(self, image_bytes: bytes) -> dict:
        """
        Run EasyOCR on the full image (no ROI crop).
        Returns per-word bounding boxes and confidence scores for the
        Image Dictionary overlay feature.

        Returns:
            {
              "success": bool,
              "words": [ {"word": str, "bbox": [x1,y1,x2,y2], "confidence": float} ... ]  # unique words
              "all_words": same but includes duplicate occurrences with their positions
              "image_b64": base64 of the original image,
              "image_width": int,
              "image_height": int,
              "full_text": str
            }
        """
        if not self.is_initialized or self.reader is None:
            self.initialize_reader()
            if not self.is_initialized:
                return {"success": False, "error": f"OCR Engine not initialized: {self.error_msg}"}

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"success": False, "error": "Invalid image format"}

        img_h, img_w = img.shape[:2]

        # Run EasyOCR on original (colour) image for best accuracy
        try:
            results = self.reader.readtext(
                img,
                text_threshold=0.4,
                low_text=0.3,
                adjust_contrast=0.5,
            )
        except Exception as e:
            return {"success": False, "error": f"OCR Recognition failed: {str(e)}"}

        all_words: List[Dict] = []
        seen_words: set = set()
        unique_words: List[Dict] = []

        full_text_parts = []

        for bbox_pts, text, conf in results:
            # bbox_pts is [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] (quad)
            xs = [int(p[0]) for p in bbox_pts]
            ys = [int(p[1]) for p in bbox_pts]
            x1, y1 = max(0, min(xs)), max(0, min(ys))
            x2, y2 = min(img_w, max(xs)), min(img_h, max(ys))

            # Split detected text into individual tokens
            tokens = text.split()
            full_text_parts.append(text)

            # For multi-word detections, divide the bbox width evenly
            n_tokens = len(tokens)
            if n_tokens == 0:
                continue

            token_w = max(1, (x2 - x1) // n_tokens)

            for idx, token in enumerate(tokens):
                # Strip punctuation to get the clean word
                clean = re.sub(r"[^a-zA-Z'\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0D00-\u0D7F\u0C80-\u0CFF]", "", token)
                if not clean or len(clean) < 2:
                    continue

                # Sub-bbox for this token
                tx1 = x1 + idx * token_w
                tx2 = min(x1 + (idx + 1) * token_w, x2)
                word_bbox = [tx1, y1, tx2, y2]

                entry = {
                    "word": clean,
                    "bbox": word_bbox,
                    "confidence": round(float(conf), 4),
                }
                all_words.append(entry)

                # Unique words (case-insensitive dedup)
                lower = clean.lower()
                if lower not in seen_words:
                    seen_words.add(lower)
                    unique_words.append(entry)

        image_b64 = self.to_base64_uri(img)

        return {
            "success": True,
            "words": unique_words,
            "all_words": all_words,
            "image_b64": image_b64,
            "image_width": img_w,
            "image_height": img_h,
            "full_text": " ".join(full_text_parts),
        }
