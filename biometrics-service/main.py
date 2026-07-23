from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from config import config
from services.face_engine import face_engine

app = FastAPI(
    title="Apponext HRMS Biometric Face Recognition Service",
    description="High-precision facial feature extraction, matching & liveness verification service",
    version="1.0.0"
)

# Enable CORS for cross-service communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request / Response Schemas
class ExtractEmbeddingRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image string (JPEG/PNG)")
    check_liveness: bool = Field(True, description="Perform blur and illumination checks")

class VerifyFaceRequest(BaseModel):
    candidate_image: str = Field(..., description="Base64 image to verify")
    enrolled_embedding: List[float] = Field(..., description="128-d vector stored in database")
    threshold: Optional[float] = Field(None, description="Custom match threshold")

class CandidateProfile(BaseModel):
    employee_id: str
    employee_name: Optional[str] = None
    face_vector: List[float]

class IdentifyFaceRequest(BaseModel):
    candidate_image: str = Field(..., description="Base64 image snapshot from camera")
    candidates: List[CandidateProfile] = Field(..., description="List of registered employee embeddings")
    threshold: Optional[float] = Field(None, description="Custom match threshold")


@app.get("/", tags=["Health"])
def health_check():
    return {
        "service": "Apponext HRMS Biometrics Service",
        "status": "online",
        "match_threshold": config.MATCH_THRESHOLD
    }


@app.post("/extract-embedding", tags=["Biometrics"])
def extract_embedding(payload: ExtractEmbeddingRequest):
    """
    Decodes image, detects face, performs liveness check, and returns 128-dimensional embedding vector.
    """
    try:
        image = face_engine.decode_base64_image(payload.image)
        
        liveness_res = {}
        if payload.check_liveness:
            liveness_res = face_engine.check_liveness(image)
            if not liveness_res.get("is_live"):
                return {
                    "success": False,
                    "message": liveness_res.get("reason", "Quality check failed"),
                    "liveness": liveness_res
                }

        embedding = face_engine.extract_face_embedding(image)

        return {
            "success": True,
            "message": "Face embedding extracted successfully",
            "embedding": embedding,
            "dimension": len(embedding),
            "liveness": liveness_res
        }
    except ValueError as ve:
        return {
            "success": False,
            "message": str(ve)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal face processing error: {str(e)}"
        )


@app.post("/verify-face", tags=["Biometrics"])
def verify_face(payload: VerifyFaceRequest):
    """
    Verifies a live face photo against a single enrolled employee embedding.
    """
    try:
        image = face_engine.decode_base64_image(payload.candidate_image)
        candidate_embedding = face_engine.extract_face_embedding(image)

        threshold = payload.threshold if payload.threshold is not None else config.MATCH_THRESHOLD
        distance = face_engine.compute_distance(candidate_embedding, payload.enrolled_embedding)
        similarity = face_engine.compute_similarity_score(distance, threshold)
        is_match = distance <= threshold

        return {
            "success": True,
            "is_match": is_match,
            "distance": round(distance, 4),
            "threshold": threshold,
            "similarity_percentage": similarity
        }
    except ValueError as ve:
        return {
            "success": False,
            "is_match": False,
            "message": str(ve)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@app.post("/identify-face", tags=["Biometrics"])
def identify_face(payload: IdentifyFaceRequest):
    """
    Identifies a face from a camera snapshot by matching against a list of candidate employee embeddings.
    Used for 1:N Quick Check-In / Kiosk Recognition.
    """
    try:
        if not payload.candidates:
            return {
                "success": False,
                "matched": False,
                "message": "No enrolled employee profiles provided for identification"
            }

        image = face_engine.decode_base64_image(payload.candidate_image)
        live_embedding = face_engine.extract_face_embedding(image)
        threshold = payload.threshold if payload.threshold is not None else config.MATCH_THRESHOLD

        best_match = None
        min_distance = float("inf")

        for candidate in payload.candidates:
            dist = face_engine.compute_distance(live_embedding, candidate.face_vector)
            if dist < min_distance:
                min_distance = dist
                best_match = candidate

        is_match = min_distance <= threshold
        similarity = face_engine.compute_similarity_score(min_distance, threshold)

        faces = face_engine.detect_faces(image)
        bbox_dict = None
        if faces and len(faces) > 0:
            x, y, w, h = faces[0]
            bbox_dict = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}

        if is_match and best_match:
            emp_name = best_match.employee_name or 'Employee'
            emp_id = best_match.employee_id
            return {
                "success": True,
                "matched": True,
                "employee_id": emp_id,
                "employee_name": emp_name,
                "message": f"Face match with employee: {emp_name} ({emp_id})",
                "distance": round(min_distance, 4),
                "threshold": threshold,
                "similarity_percentage": similarity,
                "bbox": bbox_dict
            }

        return {
            "success": True,
            "matched": False,
            "message": "Face recognized, but no matching employee found in database",
            "closest_distance": round(min_distance, 4) if min_distance != float("inf") else None,
            "bbox": bbox_dict
        }

    except ValueError as ve:
        return {
            "success": False,
            "matched": False,
            "message": str(ve)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Identification error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
