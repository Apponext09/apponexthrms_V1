from __future__ import annotations

import os
from dataclasses import dataclass


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("BIOMETRIC_HOST", "127.0.0.1")
    port: int = int(os.getenv("BIOMETRIC_PORT", "8000"))
    api_key: str = os.getenv("BIOMETRIC_API_KEY", "")
    allowed_origins: tuple[str, ...] = tuple(
        _csv(os.getenv("BIOMETRIC_CORS_ORIGINS", "http://localhost:3000"))
    )
    match_threshold: float = float(os.getenv("BIOMETRIC_MATCH_THRESHOLD", "0.48"))
    ambiguity_margin: float = float(os.getenv("BIOMETRIC_AMBIGUITY_MARGIN", "0.055"))
    max_image_bytes: int = int(os.getenv("BIOMETRIC_MAX_IMAGE_BYTES", str(6 * 1024 * 1024)))
    min_image_width: int = int(os.getenv("BIOMETRIC_MIN_IMAGE_WIDTH", "320"))
    min_image_height: int = int(os.getenv("BIOMETRIC_MIN_IMAGE_HEIGHT", "240"))
    min_face_ratio: float = float(os.getenv("BIOMETRIC_MIN_FACE_RATIO", "0.035"))
    min_blur_score: float = float(os.getenv("BIOMETRIC_MIN_BLUR_SCORE", "45"))
    min_brightness: float = float(os.getenv("BIOMETRIC_MIN_BRIGHTNESS", "35"))
    max_brightness: float = float(os.getenv("BIOMETRIC_MAX_BRIGHTNESS", "220"))
    enrollment_consistency_distance: float = float(
        os.getenv("BIOMETRIC_ENROLLMENT_CONSISTENCY_DISTANCE", "0.38")
    )
    detector_model: str = os.getenv("BIOMETRIC_DETECTOR_MODEL", "hog")
    encoding_jitters: int = int(os.getenv("BIOMETRIC_ENCODING_JITTERS", "2"))


settings = Settings()
