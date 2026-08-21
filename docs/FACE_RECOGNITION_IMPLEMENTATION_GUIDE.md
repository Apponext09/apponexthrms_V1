# Apponext HRMS — Face Recognition Implementation Blueprint & Setup Guide

This document provides a step-by-step technical blueprint for implementing, connecting, and deploying the **Apponext HRMS Biometric Face Recognition System**. It details all required libraries, system dependencies, internal module files, inter-service networking connections, database schemas, and end-to-end setup instructions.

---

## 1. Required Libraries & Tech Stack

### 1.1 Python Biometric Microservice (`biometric/`)

| Library / Dependency | Recommended Version | Role / Purpose |
| :--- | :--- | :--- |
| **`python`** | `3.11` or `3.12` | Runtime engine |
| **`fastapi`** | `0.116.1` | High-performance asynchronous REST API framework |
| **`uvicorn[standard]`** | `0.35.0` | ASGI server for serving FastAPI endpoints |
| **`face-recognition`** | `1.3.0` | Deep learning face detection, alignment, and 128-d encoding wrapper |
| **`dlib` / `dlib-bin`** | `20.0.1` | C++ Machine Learning Toolkit with ResNet-34 face feature extraction model |
| **`opencv-python-headless`** | `4.12.0.88` | Image decoding, color space transformation, blur scoring (Laplacian variance), and brightness analysis |
| **`numpy`** | `2.2.6` | Linear algebra operations, L2 norm calculations, pairwise distance matrices, and medoid computation |
| **`pydantic`** | `2.11.7` | Runtime data parsing, validation, and JSON schema definitions |
| **`Pillow`** | `>= 10.0` | Fallback image conversion and buffer processing |

#### Windows Pre-compiled Binary Note
On Windows environments without full C++ Build Tools (MSVC/CMake), use pre-built wheels to avoid C++ compilation errors:
```powershell
pip install dlib-bin==20.0.1 face-recognition-models==0.3.0
pip install face-recognition==1.3.0 --no-deps
```

#### Linux / Docker OS Packages
Linux environments require `build-essential`, `cmake`, and `libopenblas-dev`:
```bash
apt-get update && apt-get install -y build-essential cmake libopenblas-dev
```

---

### 1.2 Node.js Express Server (`server/`)

| Library / Dependency | Role / Purpose |
| :--- | :--- |
| **`axios`** | HTTP client for making REST calls to the Python Biometric Service on port `8000` |
| **`knex` + `mysql2`** | Database query builder for reading/writing `employee_biometric_profiles` and attendance logs |
| **`pino`** | Structured logger for monitoring inter-service biometric calls and errors |
| **`zod`** | Schema validation for attendance punch payloads and coordinates |

---

### 1.3 React Frontend (`client/`)

| Library / Feature | Role / Purpose |
| :--- | :--- |
| **`navigator.mediaDevices.getUserMedia`** | WebRTC HTML5 video stream capture for desktop webcams and mobile cameras |
| **`HTMLCanvasElement`** | Canvas frame buffer for encoding captured frames into Base64 DataURLs (`image/jpeg`) |
| **`lucide-react`** | UI icons for camera state, scanning indicators, and face detection frame boxes |
| **`axios` / `apiClient`** | Sends captured frame payloads to Node.js backend (`/attendance/biometric/verify-punch`) |

---

## 2. Project Modules & File Architecture

The biometric face recognition architecture is divided into three isolated module layers:

```
apponexthrms/
├── biometric/                           # 🐍 Python FastAPI Biometric Microservice (Port 8000)
│   ├── config.py                        # Service settings, quality thresholds & env vars
│   ├── face_engine.py                   # OpenCV & Dlib 128-d encoding, quality guard & 1:N match engine
│   ├── main.py                          # FastAPI endpoints (/health, /v1/embeddings/enroll, /v1/faces/identify)
│   ├── calibrate.py                     # Threshold calibration utility script
│   ├── run.py                           # Uvicorn entry point runner
│   ├── setup-windows.ps1                # One-click Windows PowerShell installer script
│   ├── requirements.txt                 # Python dependencies manifest
│   └── Dockerfile                       # Container deployment manifest
│
├── server/                              # 🟢 Node.js Express API Backend (Port 5000)
│   └── src/modules/attendance/
│       ├── services/BiometricService.ts # Orchestration: Communicates with Python API & MySQL DB
│       ├── controllers/BiometricController.ts # HTTP request handlers & error formatting
│       ├── attendance.routes.ts         # Routes: /biometric/enroll, /biometric/verify-punch, etc.
│       └── services/GeoFenceService.ts  # Combined GPS geofencing validator
│
└── client/                              # ⚛️ React 18 Web & Kiosk Client (Port 3000)
    └── src/
        ├── features/employee/portal-pages/
        │   └── FaceAttendancePage.tsx   # Employee mobile/web camera punch interface
        ├── features/attendance/components/
        │   └── AttendanceMethodDesk.tsx # Kiosk / Desk multi-employee camera scanner
        └── features/employee/components/
            └── ProfilePhotoUploadModal.tsx # Profile photo & biometric enrollment modal
```

---

## 3. Connections, Inter-Service Networking & Data Flow

```
┌────────────────────────────────┐                 ┌────────────────────────────────┐
│   React Frontend (Port 3000)   │                 │   Express Backend (Port 5000)  │
│                                │  POST Base64    │                                │
│   [ Camera WebRTC Capture ]    │ ──────────────> │   [ BiometricService.ts ]      │
│   (1 to 3 JPEG Base64 Frames)  │                 │                                │
└────────────────────────────────┘                 └────────────────────────────────┘
                                                                   │
                                                                   │ POST /v1/faces/identify
                                                                   │ Header: X-Biometric-Key
                                                                   ▼
┌────────────────────────────────┐                 ┌────────────────────────────────┐
│  MySQL Database (Port 3306)    │                 │   Python Bio Engine (Port 8000) │
│                                │  Read Candidates│                                │
│ `employee_biometric_profiles`  │ <────────────── │   [ FaceEngine.identify() ]    │
│  (Loads 128-d JSON Vectors)    │                 │   (Dlib ResNet-34 1:N Search)  │
└────────────────────────────────┘                 └────────────────────────────────┘
```

### 3.1 Network Endpoints & Connection Configuration

#### Environment Variables Config (`.env` files)

##### **Node.js Express Server (`server/.env`)**:
```ini
# Address of the Python Biometric Microservice
BIOMETRIC_SERVICE_URL=http://127.0.0.1:8000

# Optional Shared Secret API Key for microservice security
BIOMETRIC_SERVICE_API_KEY=local-biometric-key

# Request timeout for computer vision processing (milliseconds)
BIOMETRIC_REQUEST_TIMEOUT_MS=20000
```

##### **Python Biometric Service (`biometric/.env` or Docker env)**:
```ini
BIOMETRIC_HOST=127.0.0.1
BIOMETRIC_PORT=8000
BIOMETRIC_API_KEY=local-biometric-key
BIOMETRIC_CORS_ORIGINS=http://localhost:3000,http://localhost:5000
BIOMETRIC_MATCH_THRESHOLD=0.48
BIOMETRIC_AMBIGUITY_MARGIN=0.055
```

---

### 3.2 Inter-Service Security Connection
To ensure the Python microservice is not publicly accessible to unauthorized external callers:
1. **`X-Biometric-Key` Header Verification**: Express backend includes `X-Biometric-Key: <BIOMETRIC_SERVICE_API_KEY>` on every request. FastAPI evaluates this using constant-time comparison (`hmac.compare_digest`).
2. **Network Isolation**: In production, the Python service binds to internal localhost (`127.0.0.1`) or an unexposed internal Docker container network (`apponexthrms_biometric`).

---

### 3.3 Database Storage Connection Schema
Facial templates are persisted in MySQL using a JSON vector field scoped by tenant `organization_id`:

```sql
CREATE TABLE IF NOT EXISTS `employee_biometric_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT UNSIGNED NOT NULL,
  `employee_id` INT UNSIGNED NOT NULL,
  `face_vector` JSON NOT NULL COMMENT '128-dimensional float array: [0.012, -0.098, ...]',
  `profile_photo` LONGTEXT NULL COMMENT 'Base64 DataURL or URL path',
  `model_version` VARCHAR(50) NOT NULL DEFAULT 'dlib_resnet_v1_128',
  `embedding_dimension` INT NOT NULL DEFAULT 128,
  `sample_count` INT NOT NULL DEFAULT 1,
  `quality_score` FLOAT DEFAULT 0.0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_org_employee` (`organization_id`, `employee_id`),
  CONSTRAINT `fk_bio_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bio_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 4. Step-by-Step Implementation Walkthrough

Follow these steps to set up and run the entire face recognition pipeline from scratch:

### Step 1: Initialize the Python Biometric Service

#### Windows Setup:
```powershell
cd biometric
.\setup-windows.ps1
```

#### Linux Setup:
```bash
cd biometric
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Verification:
Start the service:
```bash
python run.py
```
Open your browser or run curl to test health:
```bash
curl http://127.0.0.1:8000/health
```
*Expected Response:* `{"status":"ok","service":"apponext-biometric","model_version":"dlib_resnet_v1_128", ...}`

---

### Step 2: Database Migration
Ensure the database migration table is created in MySQL:
```bash
cd server
npm run db:migrate
```

---

### Step 3: Connect Express Backend to Biometric Service

In `server/src/modules/attendance/services/BiometricService.ts`:
1. Verify `BIOMETRIC_SERVICE_URL` points to `http://127.0.0.1:8000`.
2. When an employee uploads a profile photo or enrolls biometrics, `enrollFace()` sends Base64 camera images to `POST http://127.0.0.1:8000/v1/embeddings/enroll`.
3. The returned 128-d float array is stored in `employee_biometric_profiles.face_vector`.

---

### Step 4: Live Attendance Punch Verification Flow

When an employee opens [FaceAttendancePage.tsx](file:///d:/Kosqu%20Projects/apponexthrms/client/src/features/employee/portal-pages/FaceAttendancePage.tsx):
1. **WebRTC Capture**: The browser accesses webcam stream via HTML5 canvas, capturing a clear JPEG frame ($640 \times 480$).
2. **Client Post**: Client sends frame to `POST /api/v1/attendance/biometric/verify-punch`.
3. **Backend Identification**:
   - `BiometricService.ts` fetches all enrolled employee templates for that tenant organization (`SELECT employee_id, face_vector FROM employee_biometric_profiles WHERE organization_id = ? AND is_active = 1`).
   - Backend sends candidate pool + live frame to Python API `POST http://127.0.0.1:8000/v1/faces/identify`.
4. **Python Match Evaluation**:
   - Quality Guard validates blur score ($\ge 45.0$), brightness ($35 \le \bar{I} \le 220$), and single face.
   - Calculates live 128-d embedding vector.
   - Measures L2 Euclidean distances across candidate pool.
   - If best distance $d_1 \le 0.48$ AND separation $(d_2 - d_1) \ge 0.055$, returns `matched: true` with `employee_id`.
5. **Punch Execution**: Backend records check-in/out in `attendance_records` and creates a device audit log entry.

---

## 5. Summary Checklist for Verification

- [x] **Python Microservice**: Running on port `8000` with `dlib_resnet_v1_128` model loaded.
- [x] **Express Backend**: Connected to `http://127.0.0.1:8000` via `BiometricService.ts`.
- [x] **MySQL Database**: `employee_biometric_profiles` table active with JSON vector storage.
- [x] **React Frontend**: WebRTC camera stream integrated in `FaceAttendancePage.tsx` & `AttendanceMethodDesk.tsx`.
- [x] **Security**: Inter-service API key authentication (`X-Biometric-Key`) enabled.
