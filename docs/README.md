# Apponext HRMS — Face Recognition Model & Biometric Documentation Index

Welcome to the **Biometric Face Recognition AI Documentation** for Apponext HRMS. This folder contains technical manuals, model specifications, computer vision pipelines, mathematical formulas, API guides, and troubleshooting documentation.

---

## 📄 Available Documentation Guides

### 1. 🧬 [FACE_RECOGNITION_ARCHITECTURE.md](./FACE_RECOGNITION_ARCHITECTURE.md)
*Deep technical explanation of the AI face recognition model, network architecture, and algorithm design.*
- **Technology Stack**: Python FastAPI microservice, Dlib, OpenCV, ResNet-34 (`dlib_resnet_v1_128`), MySQL 8.0, Node.js Express.
- **Deep Learning Model**: 128-dimensional continuous vector embeddings ($v \in \mathbb{R}^{128}$).
- **5-Stage Quality Pipeline**: Frame resolution, single face enforcement, face area ratio ($\ge 3.5\%$), OpenCV Laplacian blur score ($\ge 45.0$), grayscale brightness validation ($35 \le \bar{I} \le 220$).
- **Multi-Frame Enrollment**: Pairwise Euclidean consistency check ($d \le 0.38$) and Geometric Medoid selection algorithm.
- **1:N Face Identification Engine**: L2 Euclidean distance matching, dual-gate threshold logic ($d_1 \le 0.48$, $\Delta d \ge 0.055$), and confidence score scaling.
- **Calibration & Tuning**: 5:1 weighted error calibration utility (`calibrate.py`).

---

### 2. 🔌 [FACE_RECOGNITION_API_GUIDE.md](./FACE_RECOGNITION_API_GUIDE.md)
*Complete developer API specification, database schema, local setup commands, and integration troubleshooting.*
- **Microservice REST Endpoints**: `GET /health`, `POST /v1/embeddings/enroll`, `POST /v1/faces/identify`.
- **Express Backend Routes**: `POST /attendance/biometric/enroll`, `POST /attendance/biometric/verify-punch`.
- **Local Development Setup**: PowerShell & Docker execution guides.
- **Troubleshooting Matrix**: Resolution for common camera, lighting, blur, and network offline issues.

---

### 3. 🛠️ [FACE_RECOGNITION_IMPLEMENTATION_GUIDE.md](./FACE_RECOGNITION_IMPLEMENTATION_GUIDE.md)
*Step-by-step implementation blueprint detailing required libraries, modules, inter-service networking, and setup walkthrough.*
- **Required Tech Stack & Libraries**: Python (`fastapi`, `face-recognition`, `dlib-bin`, `opencv-python-headless`, `numpy`, `pydantic`), Node.js (`axios`, `knex`, `mysql2`), React WebRTC HTML5 canvas capture.
- **Module Architecture**: Python microservice (`biometric/`), Express server (`server/src/modules/attendance/`), React UI components (`client/src/features/`).
- **Networking & Security Connections**: HTTP REST endpoints (Port 8000 <-> Port 5000), `X-Biometric-Key` headers, environment variables, and MySQL JSON 128-d vector database schema.
- **Step-by-Step Setup**: Environment setup, database migration, backend integration, frontend camera stream configuration, and verification checklist.

---

## 📁 Key Source Code Locations

| Component | Path | Description |
| :--- | :--- | :--- |
| **Python Biometric Engine** | [`biometric/face_engine.py`](file:///d:/Kosqu%20Projects/apponexthrms/biometric/face_engine.py) | OpenCV & Dlib 128-d encoding, quality filtering, medoid computation, and 1:N match engine |
| **FastAPI Microservice** | [`biometric/main.py`](file:///d:/Kosqu%20Projects/apponexthrms/biometric/main.py) | REST API endpoints for face enrollment & identification |
| **Service Config** | [`biometric/config.py`](file:///d:/Kosqu%20Projects/apponexthrms/biometric/config.py) | Thresholds, quality limits, and environment variable settings |
| **Node.js Attendance Service** | [`server/src/modules/attendance/services/BiometricService.ts`](file:///d:/Kosqu%20Projects/apponexthrms/server/src/modules/attendance/services/BiometricService.ts) | Backend ORM integration, tenant profile database storage, and punch execution |
| **Express Routes** | [`server/src/modules/attendance/attendance.routes.ts`](file:///d:/Kosqu%20Projects/apponexthrms/server/src/modules/attendance/attendance.routes.ts) | `/biometric/*` API routes |
| **React Attendance Page** | [`client/src/features/employee/portal-pages/FaceAttendancePage.tsx`](file:///d:/Kosqu%20Projects/apponexthrms/client/src/features/employee/portal-pages/FaceAttendancePage.tsx) | Live camera capture & web attendance punch UI |
