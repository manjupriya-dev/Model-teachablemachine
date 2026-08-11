from pydantic import BaseModel
from typing import List, Optional

class PredictionClass(BaseModel):
    label: str
    confidence: float

class PredictionResponse(BaseModel):
    success: bool
    top_prediction: str
    confidence: float
    all_predictions: List[PredictionClass]
    processing_time_ms: float
    model_name: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None

class TrainResponse(BaseModel):
    success: bool
    message: str
    epochs_trained: int
    final_accuracy: Optional[float] = None
    final_loss: Optional[float] = None

class OCRPipelineImages(BaseModel):
    cropped: str
    grayscale: str
    resized: str

class OCRScanResponse(BaseModel):
    success: bool
    text: str
    confidence: float
    status: str
    meaning: str
    pipeline: Optional[OCRPipelineImages] = None
    error: Optional[str] = None

class VocabularyAddRequest(BaseModel):
    word: str
    meaning: str

# ── Dictionary & Image-Scan schemas ─────────────────────────────────────────

class WordBBox(BaseModel):
    """A single word detected in an image, with its bounding box."""
    word: str
    bbox: List[int]          # [x1, y1, x2, y2] in image pixel coords
    confidence: float

class ImageScanResponse(BaseModel):
    """Response for POST /api/ocr/image-scan"""
    success: bool
    words: List[WordBBox]    # All unique words detected
    all_words: List[WordBBox] # All words (including duplicates, with positions)
    image_b64: str           # Base64-encoded original image for overlay rendering
    image_width: int
    image_height: int
    full_text: str
    error: Optional[str] = None

class DictionaryEntry(BaseModel):
    """Rich dictionary entry for a single word."""
    word: str
    meaning: str
    ipa: str                          # IPA phonetic string, e.g. /həˈloʊ/
    pos: str                          # Part of speech: Noun, Verb, etc.
    synonyms: List[str]
    antonyms: List[str]
    example: str
    translation: str
    target_lang: str
    not_found: bool = False
    confidence: Optional[float] = None

class BatchDictionaryRequest(BaseModel):
    words: List[str]
    lang: Optional[str] = "en"

class BatchDictionaryResponse(BaseModel):
    success: bool = True
    entries: List[DictionaryEntry]

