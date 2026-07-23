from __future__ import annotations

import base64
import binascii
import math
from dataclasses import dataclass
from itertools import combinations
from typing import Any, Iterable

import cv2
import face_recognition
import numpy as np

from config import settings


MODEL_VERSION = "dlib_resnet_v1_128"
EMBEDDING_DIMENSION = 128


class FaceProcessingError(ValueError):
    """A safe validation error that can be returned to an API caller."""


@dataclass(frozen=True)
class ProcessedFace:
    embedding: np.ndarray
    quality: dict[str, Any]
    bounding_box: dict[str, int]


class FaceEngine:
    def decode_image(self, value: str) -> np.ndarray:
        if not value or not isinstance(value, str):
            raise FaceProcessingError("A base64 JPEG or PNG image is required.")

        encoded = value.split(",", 1)[1] if "," in value else value
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as error:
            raise FaceProcessingError("The camera image is not valid base64 data.") from error

        if not raw or len(raw) > settings.max_image_bytes:
            raise FaceProcessingError("The camera image is empty or exceeds the size limit.")

        decoded = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        if decoded is None:
            raise FaceProcessingError("The camera image is corrupt or uses an unsupported format.")
        if decoded.shape[1] < settings.min_image_width or decoded.shape[0] < settings.min_image_height:
            raise FaceProcessingError(
                f"Camera resolution must be at least "
                f"{settings.min_image_width}x{settings.min_image_height}."
            )
        return decoded

    def process_image(self, value: str, enrollment: bool = False) -> ProcessedFace:
        image_bgr = self.decode_image(value)
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        locations = face_recognition.face_locations(
            image_rgb,
            number_of_times_to_upsample=1,
            model=settings.detector_model,
        )

        if not locations:
            raise FaceProcessingError(
                "No face detected. Face the camera directly and move closer."
            )
        if len(locations) != 1:
            raise FaceProcessingError(
                "More than one face is visible. Only one employee may be in the frame."
            )

        top, right, bottom, left = locations[0]
        height, width = image_bgr.shape[:2]
        face_area_ratio = ((right - left) * (bottom - top)) / float(width * height)
        if face_area_ratio < settings.min_face_ratio:
            raise FaceProcessingError("Face is too small in the frame. Move closer to the camera.")

        crop = image_bgr[max(0, top) : min(height, bottom), max(0, left) : min(width, right)]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        if blur_score < settings.min_blur_score:
            raise FaceProcessingError("Image is too blurry. Hold still and clean the camera lens.")
        if brightness < settings.min_brightness:
            raise FaceProcessingError("Face is too dark. Move toward an even light source.")
        if brightness > settings.max_brightness:
            raise FaceProcessingError("Face is overexposed. Move away from the direct light.")

        encodings = face_recognition.face_encodings(
            image_rgb,
            known_face_locations=locations,
            num_jitters=settings.encoding_jitters if enrollment else 1,
            model="large",
        )
        if len(encodings) != 1:
            raise FaceProcessingError("A stable facial template could not be generated.")

        embedding = self._validate_embedding(encodings[0])
        quality_score = self._quality_score(
            blur_score=blur_score,
            brightness=brightness,
            face_area_ratio=face_area_ratio,
        )
        return ProcessedFace(
            embedding=embedding,
            quality={
                "blur_score": round(blur_score, 2),
                "brightness": round(brightness, 2),
                "face_area_ratio": round(face_area_ratio, 4),
                "quality_score": quality_score,
                "face_count": 1,
            },
            bounding_box={
                "top": int(top),
                "right": int(right),
                "bottom": int(bottom),
                "left": int(left),
            },
        )

    def create_enrollment(self, images: list[str]) -> dict[str, Any]:
        if not images:
            raise FaceProcessingError("At least one enrollment image is required.")
        if len(images) > 5:
            raise FaceProcessingError("A maximum of five enrollment images is supported.")

        processed = [self.process_image(image, enrollment=True) for image in images]
        embeddings = [item.embedding for item in processed]
        pair_distances = [
            self.distance(first, second) for first, second in combinations(embeddings, 2)
        ]
        max_pair_distance = max(pair_distances, default=0.0)
        if max_pair_distance > settings.enrollment_consistency_distance:
            raise FaceProcessingError(
                "Enrollment photos are inconsistent. Keep the same person in all captures "
                "and face the camera directly."
            )

        # A medoid keeps the embedding on dlib's native distance scale while reducing
        # the chance that a noisy frame becomes the stored template.
        template = self._medoid(embeddings)
        qualities = [item.quality["quality_score"] for item in processed]
        return {
            "embedding": template.astype(float).tolist(),
            "model_version": MODEL_VERSION,
            "dimension": EMBEDDING_DIMENSION,
            "sample_count": len(processed),
            "quality_score": round(float(np.mean(qualities)), 1),
            "max_sample_distance": round(max_pair_distance, 4),
            "samples": [item.quality for item in processed],
        }

    def identify(
        self,
        images: list[str],
        candidates: Iterable[dict[str, Any]],
        threshold: float | None = None,
        ambiguity_margin: float | None = None,
    ) -> dict[str, Any]:
        candidate_list = list(candidates)
        if not candidate_list:
            raise FaceProcessingError("No enrolled employee templates are available.")
        if not images:
            raise FaceProcessingError("At least one live camera image is required.")
        if len(images) > 3:
            raise FaceProcessingError("A maximum of three verification images is supported.")

        live_faces = [self.process_image(image, enrollment=False) for image in images]
        live_embedding = self._medoid([face.embedding for face in live_faces])

        scored: list[tuple[float, dict[str, Any]]] = []
        for candidate in candidate_list:
            vector = np.asarray(candidate.get("face_vector", []), dtype=np.float64)
            if vector.shape != (EMBEDDING_DIMENSION,) or not np.isfinite(vector).all():
                continue
            scored.append(
                (self.distance(live_embedding, self._validate_embedding(vector)), candidate)
            )

        if not scored:
            raise FaceProcessingError("No valid 128-dimensional employee templates were supplied.")

        scored.sort(key=lambda item: item[0])
        best_distance, best_candidate = scored[0]
        second_distance = scored[1][0] if len(scored) > 1 else None
        applied_threshold = threshold if threshold is not None else settings.match_threshold
        applied_margin = (
            ambiguity_margin if ambiguity_margin is not None else settings.ambiguity_margin
        )
        separation = (
            second_distance - best_distance if second_distance is not None else math.inf
        )
        matched = best_distance <= applied_threshold and separation >= applied_margin

        message = "Face did not match any enrolled employee."
        if best_distance <= applied_threshold and separation < applied_margin:
            message = (
                "Face match is ambiguous between employees. Capture a clearer image or "
                "verify against a selected employee."
            )
        elif matched:
            message = "Face matched an enrolled employee."

        return {
            "matched": matched,
            "employee_id": str(best_candidate.get("employee_id")) if matched else None,
            "employee_name": best_candidate.get("employee_name") if matched else None,
            "distance": round(best_distance, 4),
            "second_best_distance": (
                round(second_distance, 4) if second_distance is not None else None
            ),
            "separation": round(separation, 4) if math.isfinite(separation) else None,
            "threshold": applied_threshold,
            "ambiguity_margin": applied_margin,
            "match_score": self.match_score(best_distance, applied_threshold),
            "quality": live_faces[0].quality,
            "bounding_box": live_faces[0].bounding_box,
            "model_version": MODEL_VERSION,
            "message": message,
        }

    @staticmethod
    def distance(first: np.ndarray, second: np.ndarray) -> float:
        return float(np.linalg.norm(first - second))

    @staticmethod
    def match_score(distance: float, threshold: float) -> float:
        # This is an operator-friendly score, not a statistical probability.
        scaled = 1.0 - (distance / max(threshold * 1.5, 1e-6))
        return round(float(np.clip(scaled * 100.0, 0.0, 100.0)), 1)

    @staticmethod
    def _validate_embedding(vector: np.ndarray) -> np.ndarray:
        vector = np.asarray(vector, dtype=np.float64)
        if vector.shape != (EMBEDDING_DIMENSION,) or not np.isfinite(vector).all():
            raise FaceProcessingError("The facial template is invalid.")
        norm = float(np.linalg.norm(vector))
        if not math.isfinite(norm) or norm <= 0:
            raise FaceProcessingError("The facial template is invalid.")
        return vector

    @classmethod
    def _medoid(cls, embeddings: list[np.ndarray]) -> np.ndarray:
        if len(embeddings) == 1:
            return embeddings[0]
        distance_sums = [
            sum(cls.distance(candidate, other) for other in embeddings)
            for candidate in embeddings
        ]
        return embeddings[int(np.argmin(distance_sums))]

    @staticmethod
    def _quality_score(
        blur_score: float,
        brightness: float,
        face_area_ratio: float,
    ) -> float:
        blur = min(1.0, blur_score / 180.0)
        light = max(0.0, 1.0 - abs(brightness - 128.0) / 128.0)
        size = min(1.0, face_area_ratio / 0.22)
        return round((blur * 0.4 + light * 0.3 + size * 0.3) * 100.0, 1)


face_engine = FaceEngine()
