import os

class Config:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    # Face match Euclidean Distance threshold (lower = stricter match)
    # Default 0.45 balances high accuracy with low false positives
    MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.45"))
    # Minimum image dimensions for quality face detection
    MIN_FACE_SIZE: int = int(os.getenv("MIN_FACE_SIZE", "80"))

config = Config()
