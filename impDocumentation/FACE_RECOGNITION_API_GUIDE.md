# Apponext HRMS — Face Recognition API & Integration Guide

This guide describes how to integrate, test, and troubleshoot the Face Recognition AI Service in Apponext HRMS across frontend components, Node.js backend routes, and Python FastAPI microservices.

---

## 1. Architecture Flow

```
┌──────────────────────────┐      ┌─────────────────────────────┐      ┌───────────────────────────┐
│   React Attendance UI    │      │    Node.js Express Backend  │      │  Python FastAPI Service   │
│  (FaceAttendancePage)    │ ───> │ (/attendance/biometric/...) │ ───> │  (http://127.0.0.1:8000)  │
└──────────────────────────┘      └─────────────────────────────┘      └───────────────────────────┘
```

---

## 2. API Endpoint Reference

### 2.1 Python Biometric Service Endpoints (`http://127.0.0.1:8000`)

#### `GET /health`
Returns microservice status, active model version, embedding dimension, and threshold settings.

- **Headers**: None required
- **Response**:
```json
{
  "status": "ok",
  "service": "apponext-biometric",
  "model_version": "dlib_resnet_v1_128",
  "embedding_dimension": 128,
  "match_threshold": 0.48,
  "ambiguity_margin": 0.055
}
```

---

#### `POST /v1/embeddings/enroll`
Extracts and generates a 128-dimensional facial embedding template from 1 to 5 quality-validated Base64 images.

- **Headers**: `Content-Type: application/json`, `X-Biometric-Key: <key>`
- **Request Body**:
```json
{
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ]
}
```
- **Response (Success)**:
```json
{
  "success": true,
  "message": "Face template generated from quality-checked camera capture(s).",
  "embedding": [0.0124, -0.0981, 0.1542, "... (128 floats)"],
  "model_version": "dlib_resnet_v1_128",
  "dimension": 128,
  "sample_count": 2,
  "quality_score": 88.5,
  "max_sample_distance": 0.1245,
  "samples": [
    {
      "blur_score": 112.4,
      "brightness": 128.5,
      "face_area_ratio": 0.145,
      "quality_score": 90.0,
      "face_count": 1
    }
  ]
}
```
- **Response (Validation Error)**:
```json
{
  "success": false,
  "message": "Image is too blurry. Hold still and clean the camera lens."
}
```

---

#### `POST /v1/faces/identify`
Performs a 1:N face identification of live capture images against a candidate pool of enrolled employee templates.

- **Headers**: `Content-Type: application/json`, `X-Biometric-Key: <key>`
- **Request Body**:
```json
{
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ],
  "candidates": [
    {
      "employee_id": "101",
      "employee_name": "John Doe",
      "face_vector": [0.0124, -0.0981, "... (128 floats)"],
      "model_version": "dlib_resnet_v1_128"
    }
  ],
  "threshold": 0.48,
  "ambiguity_margin": 0.055
}
```
- **Response (Match Success)**:
```json
{
  "success": true,
  "matched": true,
  "employee_id": "101",
  "employee_name": "John Doe",
  "distance": 0.2145,
  "second_best_distance": 0.5412,
  "separation": 0.3267,
  "threshold": 0.48,
  "ambiguity_margin": 0.055,
  "match_score": 70.2,
  "message": "Face matched an enrolled employee."
}
```

---

### 2.2 Express Server Attendance Routes (`/api/v1/attendance`)

#### `POST /api/v1/attendance/biometric/enroll`
Enrolls an employee's face profile. Accepts single or multi-frame Base64 camera captures.

- **Auth**: Required (`JWT`)
- **Body**:
```json
{
  "employeeId": 101,
  "images": ["data:image/jpeg;base64,..."]
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Face biometric enrolled for John Doe.",
  "data": {
    "employeeId": 101,
    "qualityScore": 88.5,
    "sampleCount": 1
  }
}
```

---

#### `POST /api/v1/attendance/biometric/verify-punch`
Verifies a live face capture and executes an automated attendance check-in or check-out punch.

- **Auth**: Required (`JWT`)
- **Body**:
```json
{
  "image": "data:image/jpeg;base64,...",
  "images": ["data:image/jpeg;base64,..."],
  "action": "auto",
  "latitude": 23.0225,
  "longitude": 72.5714,
  "deviceInfo": "WebCam Kiosk - Chrome 124"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Check-In successful for John Doe via Face Biometric Validation.",
  "data": {
    "employeeId": 101,
    "employeeName": "John Doe",
    "punchType": "check_in",
    "matchScore": 82.4,
    "record": {
      "id": 501,
      "checkInTime": "2026-08-01 09:00:00"
    }
  }
}
```

---

## 3. How to Run the Biometric Service Locally

### Option 1: Native Python Environment (Windows / PowerShell)

```powershell
# Navigate to biometric directory
cd biometric

# Create virtual environment if not created
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Run the FastAPI server via run.py
python run.py
```
*Service will start listening at `http://127.0.0.1:8000`.*

---

### Option 2: Docker Compose

From the root project directory:
```bash
docker-compose up --build biometric
```

---

## 4. Common Troubleshooting Steps

| Issue / Error | Cause | Resolution |
| :--- | :--- | :--- |
| **"Biometric engine is offline"** | Python FastAPI microservice is not running on port 8000. | Run `python run.py` inside `biometric/` or start docker container `apponexthrms_biometric`. |
| **"No face detected"** | Face is out of frame, obscured by shadow, or camera is misaligned. | Center face in camera preview and ensure adequate lighting. |
| **"Image is too blurry"** | Camera motion blur or low Laplacian variance ($< 45.0$). | Hold camera still during frame capture or clean webcam lens. |
| **"Face is too dark" / "Face is overexposed"** | Low/High ambient lighting ($< 35$ or $> 220$ mean intensity). | Adjust lighting towards camera or avoid direct sunlight behind face. |
| **"Face match is ambiguous between employees"** | Difference between 1st and 2nd closest candidate is $< 0.055$. | Re-enroll employee with multi-frame capture or adjust `BIOMETRIC_AMBIGUITY_MARGIN`. |
