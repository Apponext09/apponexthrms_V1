from __future__ import annotations

import hmac
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from config import settings
from face_engine import (
    EMBEDDING_DIMENSION,
    MODEL_VERSION,
    FaceProcessingError,
    face_engine,

)

app = FastAPI(
    title="Apponext HRMS Biometric Service",
    description="Face-template extraction and strict 1:N identification for attendance.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Biometric-Key"],
)


def require_api_key(x_biometric_key: str | None = Header(default=None)) -> None:
    if settings.api_key and (
        not x_biometric_key
        or not hmac.compare_digest(x_biometric_key, settings.api_key)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid biometric service API key.",
        )


class EnrollmentRequest(BaseModel):
    image: str | None = None
    images: list[str] = Field(default_factory=list, max_length=5)

    def all_images(self) -> list[str]:
        return self.images or ([self.image] if self.image else [])


class Candidate(BaseModel):
    employee_id: str = Field(min_length=1, max_length=100)
    employee_name: str = Field(default="Employee", max_length=255)
    face_vector: list[float]
    model_version: str = MODEL_VERSION

    @field_validator("face_vector")
    @classmethod
    def validate_vector(cls, vector: list[float]) -> list[float]:
        if len(vector) != EMBEDDING_DIMENSION:
            raise ValueError(f"face_vector must contain {EMBEDDING_DIMENSION} values")
        return vector


class IdentificationRequest(BaseModel):
    image: str | None = None
    images: list[str] = Field(default_factory=list, max_length=3)
    candidates: list[Candidate] = Field(min_length=1, max_length=5000)
    threshold: float | None = Field(default=None, ge=0.3, le=0.65)
    ambiguity_margin: float | None = Field(default=None, ge=0.0, le=0.25)

    def all_images(self) -> list[str]:
        return self.images or ([self.image] if self.image else [])


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "apponext-biometric",
        "model_version": MODEL_VERSION,
        "embedding_dimension": EMBEDDING_DIMENSION,
        "match_threshold": settings.match_threshold,
        "ambiguity_margin": settings.ambiguity_margin,
    }


@app.post("/v1/embeddings/enroll", dependencies=[Depends(require_api_key)])
def enroll(payload: EnrollmentRequest) -> dict[str, Any]:
    try:
        result = face_engine.create_enrollment(payload.all_images())
        return {
            "success": True,
            "message": "Face template generated from quality-checked camera capture(s).",
            **result,
        }
    except FaceProcessingError as error:
        return {"success": False, "message": str(error)}


@app.post("/v1/faces/identify", dependencies=[Depends(require_api_key)])
def identify(payload: IdentificationRequest) -> dict[str, Any]:
    try:
        result = face_engine.identify(
            images=payload.all_images(),
            candidates=[candidate.model_dump() for candidate in payload.candidates],
            threshold=payload.threshold,
            ambiguity_margin=payload.ambiguity_margin,
        )
        return {"success": True, **result}
    except FaceProcessingError as error:
        return {"success": False, "matched": False, "message": str(error)}
