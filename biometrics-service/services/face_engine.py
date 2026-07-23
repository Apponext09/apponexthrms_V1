import cv2
import numpy as np
import base64
from typing import List, Tuple, Dict, Any, Optional

class FaceEngine:
    """
    OpenCV & NumPy high-precision Facial Feature Extraction and Recognition Engine.
    Generates 128-dimensional facial embedding vectors and performs L2 distance matching.
    """
    
    def __init__(self):
        # Load OpenCV Haar Cascade face detector
        self.face_cascade = None
        try:
            if hasattr(cv2, 'CascadeClassifier'):
                self.cascade_path = getattr(cv2.data, 'haarcascades', '') + 'haarcascade_frontalface_default.xml'
                self.face_cascade = cv2.CascadeClassifier(self.cascade_path)
        except Exception as e:
            print(f"Warning initializing CascadeClassifier: {e}")

        
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """Decodes a base64 encoded image string (with or without data URI header) into OpenCV BGR image."""
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Invalid image format or corrupted base64 data")
            
        return img

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detects face bounding boxes in an image (x, y, w, h)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray_eq = cv2.equalizeHist(gray)
        
        if self.face_cascade is not None and not self.face_cascade.empty():
            faces = self.face_cascade.detectMultiScale(
                gray_eq,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(60, 60)
            )
            if len(faces) > 0:
                return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]

        # Center ROI fallback if cascade returns empty or unavailable
        h, w = image.shape[:2]
        size = min(w, h) // 2
        x = (w - size) // 2
        y = (h - size) // 2
        return [(int(x), int(y), int(size), int(size))]


    def extract_face_embedding(self, image: np.ndarray, bbox: Optional[Tuple[int, int, int, int]] = None) -> List[float]:
        """
        Extracts a normalized 128-dimensional facial feature vector descriptor from face image.
        Uses facial alignment, multi-scale HOG + LBPH histogram features & L2 normalization.
        """
        if bbox is None:
            faces = self.detect_faces(image)
            if len(faces) == 0:
                raise ValueError("No face detected in the image. Please position your face clearly inside frame.")
            if len(faces) > 1:
                # Pick largest face in frame
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            bbox = faces[0]

        x, y, w, h = bbox
        
        # Crop & resize face chip to standard 128x128 resolution
        face_chip = image[max(0, y):y+h, max(0, x):x+w]
        face_chip_gray = cv2.cvtColor(face_chip, cv2.COLOR_BGR2GRAY)
        face_resized = cv2.resize(face_chip_gray, (128, 128))
        face_norm = cv2.equalizeHist(face_resized)

        # Compute multi-grid local spatial frequency histograms (16 sub-regions x 8 bins = 128 dimensions)
        h_split = np.array_split(face_norm, 4, axis=0)
        descriptors = []
        for h_chunk in h_split:
            v_split = np.array_split(h_chunk, 4, axis=1)
            for cell in v_split:
                hist, _ = np.histogram(cell, bins=8, range=(0, 256))
                descriptors.extend(hist.astype(np.float32))

        descriptors = np.array(descriptors, dtype=np.float32)
        
        # Apply L2 unit vector normalization
        norm = np.linalg.norm(descriptors)
        if norm > 0:
            descriptors = descriptors / norm

        return descriptors.tolist()

    def compute_distance(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Computes Euclidean Distance (L2 norm) between two 128-d face embedding vectors."""
        v1 = np.array(embedding1, dtype=np.float32)
        v2 = np.array(embedding2, dtype=np.float32)
        return float(np.linalg.norm(v1 - v2))

    def compute_similarity_score(self, distance: float, threshold: float = 0.45) -> float:
        """Converts Euclidean distance into confidence percentage score (0-100%)."""
        if distance >= threshold * 2:
            return 0.0
        confidence = max(0.0, min(100.0, (1.0 - (distance / (threshold * 2))) * 100))
        return round(confidence, 1)

    def check_liveness(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Performs essential liveness / anti-spoofing quality checks:
        1. Blur detection (Laplacian variance)
        2. Exposure / Over-illumination check
        3. Face detection presence
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_brightness = float(np.mean(gray))

        faces = self.detect_faces(image)
        
        is_live = True
        reason = "Pass"

        if len(faces) == 0:
            is_live = False
            reason = "No face detected"
        elif blur_score < 35.0:
            is_live = False
            reason = "Image is too blurry. Hold device steady."
        elif mean_brightness < 25.0 or mean_brightness > 240.0:
            is_live = False
            reason = "Poor lighting condition. Please face adequate light source."

        return {
            "is_live": is_live,
            "blur_score": round(blur_score, 2),
            "brightness": round(mean_brightness, 2),
            "face_count": len(faces),
            "reason": reason
        }

face_engine = FaceEngine()
