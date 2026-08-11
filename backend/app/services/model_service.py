import time
import numpy as np
from pathlib import Path
from typing import Optional
from PIL import Image
import io

try:
    import tensorflow as tf
except ImportError:
    tf = None

class ModelService:
    """
    Handles loading and inference for a Teachable Machine SavedModel.
    Supports both TensorFlow SavedModel format and Keras .h5 format.
    Replace or extend this class to swap in any other model.
    """

    def __init__(self):
        self.model = None
        self.labels: list[str] = []
        self.input_size: tuple = (96, 96)
        self.model_name: str = "Ship Classifier"
        self.is_loaded: bool = False
        self.training_progress: dict = {
            "epoch": 0,
            "total_epochs": 0,
            "accuracy": 0.0,
            "loss": 0.0,
            "completed": False
        }

    def load_model(self, model_path: str) -> None:
        """
        Load a Teachable Machine exported model.
        Expects either:
          - A directory with saved_model.pb + labels.txt (TF SavedModel)
          - A keras_metadata.pb / model.h5 file
        """
        try:
            import tensorflow as tf

            path = Path(model_path)
            labels_file = path / "labels.txt"

            # Load class labels
            if labels_file.exists():
                with open(labels_file, "r") as f:
                    raw = f.read().splitlines()
                    # Teachable Machine labels can be "0 ClassName" or just "ClassName"
                    self.labels = [
                        line.split(" ", 1)[-1].strip() if line[0].isdigit() else line.strip()
                        for line in raw if line.strip()
                    ]
            else:
                self.labels = [f"Class {i}" for i in range(10)]

            # Try loading as TF SavedModel
            self.model = tf.saved_model.load(str(path))
            self.is_loaded = True
            print(f"[Model] Loaded TF SavedModel from {path}")
            print(f"[Model] Classes: {self.labels}")

        except Exception as e:
            print(f"[Model] TF SavedModel load failed: {e}")
            # Fallback: try as Keras / HDF5 model
            try:
                import tensorflow as tf
                import zipfile
                keras_path = Path(model_path)
                candidates = []
                if keras_path.is_file():
                    candidates.append(keras_path)
                if keras_path.is_dir():
                    # Scan all .keras and .h5 files in the directory
                    candidates.extend(keras_path.glob("*.keras"))
                    candidates.extend(keras_path.glob("*.h5"))
                    # Also try the default names as fallback
                    for ext in ["keras", "h5"]:
                        default = keras_path / f"model.{ext}"
                        if default not in candidates:
                            candidates.append(default)

                for candidate in candidates:
                    if not candidate.exists():
                        continue
                    try:
                        # Strategy 1: Standard load (works for new .keras zip format)
                        self.model = tf.keras.models.load_model(str(candidate))
                        self.is_loaded = True
                        self.model_name = candidate.name
                        print(f"[Model] Loaded Keras model from {candidate}")
                        break
                    except Exception as load_err:
                        print(f"[Model] Standard load failed for {candidate.name}: {load_err}")
                        # Strategy 2: HDF5 format (.keras files saved with older TF/Keras)
                        if not zipfile.is_zipfile(str(candidate)):
                            try:
                                self.model = tf.keras.models.load_model(
                                    str(candidate), compile=False
                                )
                                self.is_loaded = True
                                self.model_name = candidate.name
                                print(f"[Model] Loaded HDF5 Keras model (compile=False) from {candidate}")
                                break
                            except Exception as hdf5_err:
                                print(f"[Model] HDF5 load also failed for {candidate.name}: {hdf5_err}")

                if not self.is_loaded:
                    raise Exception("No valid Keras/HDF5 model found in the provided path.")
            except Exception as e2:
                print(f"[Model] All model load attempts failed: {e2}")
                # Use mock mode so the API still runs during development
                self.is_loaded = False

    def preprocess(self, image_bytes: bytes) -> "np.ndarray":
        """Preprocess image bytes into model-ready tensor."""
        import tensorflow as tf

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize(self.input_size)
        arr = np.array(image, dtype=np.float32)
        if self.model_name != "Custom Trained Model":
            arr = arr / 255.0
        return np.expand_dims(arr, axis=0)  # (1, H, W, 3)

    def predict(self, image_bytes: bytes) -> dict:
        """
        Run inference and return structured result.
        Returns dict with top_prediction, confidence, all_predictions, processing_time_ms.
        """
        if not self.is_loaded:
            return self._mock_predict()

        start = time.perf_counter()
        tensor = self.preprocess(image_bytes)

        try:
            import tensorflow as tf
            # Handle both TF SavedModel and Keras model interfaces
            if hasattr(self.model, "signatures"):
                infer = self.model.signatures.get("serving_default")
                if infer:
                    input_key = list(infer.structured_input_signature[1].keys())[0]
                    output = infer(tf.constant(tensor))
                    output_key = list(output.keys())[0]
                    probs = output[output_key].numpy()[0]
                else:
                    probs = self.model(tf.constant(tensor), training=False).numpy()[0]
            else:
                probs = self.model.predict(tensor, verbose=0)[0]

        except Exception as e:
            print(f"Inference error: {e}")
            return self._mock_predict()

        elapsed_ms = (time.perf_counter() - start) * 1000

        # Build results
        labels = self.labels if self.labels else [f"Class {i}" for i in range(len(probs))]
        all_preds = [
            {"label": labels[i] if i < len(labels) else f"Class {i}", "confidence": float(probs[i])}
            for i in range(len(probs))
        ]
        all_preds.sort(key=lambda x: x["confidence"], reverse=True)
        top = all_preds[0]

        return {
            "success": True,
            "top_prediction": top["label"],
            "confidence": top["confidence"],
            "all_predictions": all_preds,
            "processing_time_ms": round(elapsed_ms, 2),
            "model_name": self.model_name,
        }

    def _mock_predict(self) -> dict:
        """Fallback mock prediction for development without a model."""
        import random
        mock_classes = ["Cargo Ship", "Tanker", "Container Ship", "Naval Vessel", "Passenger Ship"]
        probs = np.random.dirichlet(np.ones(len(mock_classes)))
        all_preds = [
            {"label": cls, "confidence": float(p)}
            for cls, p in zip(mock_classes, probs)
        ]
        all_preds.sort(key=lambda x: x["confidence"], reverse=True)
        return {
            "success": True,
            "top_prediction": all_preds[0]["label"],
            "confidence": all_preds[0]["confidence"],
            "all_predictions": all_preds,
            "processing_time_ms": round(random.uniform(50, 200), 2),
            "model_name": "Mock Model (model not loaded)",
        }

    def train_model(
        self,
        images_bytes_list: list,
        labels_list: list,
        epochs: int = 10,
        batch_size: int = 16,
        lr: float = 0.001,
        signalr_endpoint: str = "http://localhost:5000/api/training/progress",
        signalr_completed_endpoint: str = "http://localhost:5000/api/training/completed"
    ) -> dict:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        
        unique_labels = list(dict.fromkeys(labels_list))
        self.labels = unique_labels
        num_classes = len(unique_labels)
        
        if num_classes < 2:
            raise ValueError("Need at least 2 classes to train a model.")
            
        x_data = []
        y_data = []
        for img_bytes, label in zip(images_bytes_list, labels_list):
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            img = img.resize(self.input_size)
            arr = np.array(img, dtype=np.float32)
            x_data.append(arr)
            y_data.append(unique_labels.index(label))
            
        x_data = np.array(x_data)
        y_data = np.array(y_data)
        
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(self.input_size[0], self.input_size[1], 3),
            include_top=False,
            weights='imagenet',
            pooling='avg'
        )
        base_model.trainable = False
        
        inputs = layers.Input(shape=(self.input_size[0], self.input_size[1], 3))
        data_augmentation = tf.keras.Sequential([
            layers.RandomRotation(0.08, fill_mode='nearest'),
            layers.RandomTranslation(0.08, 0.08, fill_mode='nearest'),
            layers.RandomZoom(0.08, fill_mode='nearest'),
            layers.RandomContrast(0.15),
            layers.RandomBrightness(0.15, value_range=(0.0, 255.0)),
            layers.RandomFlip("horizontal")
        ])
        
        x = data_augmentation(inputs)
        x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
        x = base_model(x, training=False)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = models.Model(inputs=inputs, outputs=outputs, name="TeachableMachine_Custom")
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Instantiate SignalR progress callback
        cb = SignalRProgressCallback(
            total_epochs=epochs,
            model_service=self,
            signalr_endpoint=signalr_endpoint,
            signalr_completed_endpoint=signalr_completed_endpoint
        )
        
        print(f"[Model] Training custom model for {epochs} epochs with live callbacks...")
        history = model.fit(x_data, y_data, epochs=epochs, batch_size=batch_size, verbose=1, callbacks=[cb])
        
        self.model = model
        self.is_loaded = True
        self.model_name = "Custom Trained Model"
        print("[Model] Training complete.")
        
        final_acc = float(history.history.get('accuracy', [0])[-1])
        final_loss = float(history.history.get('loss', [0])[-1])

        self.training_progress = {
            "epoch": epochs,
            "total_epochs": epochs,
            "accuracy": round(final_acc, 4),
            "loss": round(final_loss, 4),
            "completed": True
        }
        
        return {
            "success": True,
            "message": "Model trained successfully",
            "epochs_trained": epochs,
            "final_accuracy": final_acc,
            "final_loss": final_loss
        }


class SignalRProgressCallback(tf.keras.callbacks.Callback if tf is not None else object):
    """
    Custom TensorFlow/Keras callback that updates internal training state for API polling
    and posts epoch progress asynchronously to SignalR without blocking execution.
    """
    def __init__(
        self,
        total_epochs: int,
        model_service = None,
        signalr_endpoint: str = "http://localhost:5000/api/training/progress",
        signalr_completed_endpoint: str = "http://localhost:5000/api/training/completed"
    ):
        super().__init__()
        self.total_epochs = total_epochs
        self.model_service = model_service
        self.signalr_endpoint = signalr_endpoint
        self.signalr_completed_endpoint = signalr_completed_endpoint

    def on_train_begin(self, logs: dict = None):
        if self.model_service is not None:
            self.model_service.training_progress = {
                "epoch": 0,
                "total_epochs": self.total_epochs,
                "accuracy": 0.0,
                "loss": 0.0,
                "completed": False
            }

    def on_epoch_end(self, epoch: int, logs: dict = None):
        import requests
        import threading

        logs = logs or {}
        acc = float(logs.get('accuracy', logs.get('acc', 0.0)))
        loss = float(logs.get('loss', 0.0))
        current_epoch = epoch + 1
        
        if self.model_service is not None:
            self.model_service.training_progress = {
                "epoch": current_epoch,
                "total_epochs": self.total_epochs,
                "accuracy": round(acc, 4),
                "loss": round(loss, 4),
                "completed": False
            }

        payload = {
            "epoch": current_epoch,
            "total_epochs": self.total_epochs,
            "accuracy": round(acc, 4),
            "loss": round(loss, 4)
        }

        # Non-blocking async post to SignalR
        def async_post():
            try:
                requests.post(self.signalr_endpoint, json=payload, timeout=0.1)
            except Exception:
                pass

        threading.Thread(target=async_post, daemon=True).start()

    def on_train_end(self, logs: dict = None):
        import requests
        import threading

        logs = logs or {}
        final_acc = float(logs.get('accuracy', logs.get('acc', 0.0)))
        final_loss = float(logs.get('loss', 0.0))

        if self.model_service is not None:
            self.model_service.training_progress = {
                "epoch": self.total_epochs,
                "total_epochs": self.total_epochs,
                "accuracy": round(final_acc, 4),
                "loss": round(final_loss, 4),
                "completed": True
            }
        
        payload = {
            "final_accuracy": round(final_acc, 4),
            "final_loss": round(final_loss, 4)
        }

        def async_post_end():
            try:
                requests.post(self.signalr_completed_endpoint, json=payload, timeout=0.1)
            except Exception:
                pass

        threading.Thread(target=async_post_end, daemon=True).start()


