from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.services.model_service import ModelService
from app.services.ocr_service import OCRService
from app.services.dictionary_service import DictionaryService
from app.api.routes import router

model_service = ModelService()
ocr_service = OCRService()
dict_service = DictionaryService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model once
    print("[API] Loading AI models...")
    model_service.load_model(settings.MODEL_PATH)
    app.state.model_service = model_service
    app.state.ocr_service = ocr_service
    app.state.dict_service = dict_service
    print("[API] Models loaded and ready.")
    yield
    # Shutdown
    print("[API] Shutting down...")

app = FastAPI(
    title="AI Predictor API",
    description="Ship Classification AI - Inspired by Teachable Machine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model_service.is_loaded}
