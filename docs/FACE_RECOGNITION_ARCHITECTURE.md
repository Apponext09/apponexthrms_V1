# Apponext HRMS — Face Recognition AI Architecture & Model Technical Guide

This document details the design, mathematical model, computer vision pipeline, quality validation, multi-sample enrollment, 1:N identification algorithm, and backend integration for the **Apponext HRMS Biometric Face Recognition System**.

---

## 1. System Overview & Technology Stack

The Apponext HRMS Face Recognition module is a high-accuracy, low-latency biometric microservice built to perform multi-frame face template extraction, quality validation, and strict 1:N (One-to-Many) employee identification for mobile, web, and kiosk attendance punch points.

```
┌─────────────────────────┐         ┌───────────────────────────────┐         ┌──────────────────────────────┐
│  React Web / Mobile UI  │         │  Node.js Express API Backend  │         │  Python FastAPI Bio Engine   │
│ (Camera capture, canvas │ ──────> │  (Tenant auth, Geofencing,    │ ──────> │ (Dlib HOG/CNN, OpenCV,       │
│  rendering & preview)   │         │   Attendance punch DB logic)  │         │  dlib_resnet_v1_128 128-d)   │
└─────────────────────────┘         └───────────────────────────────┘         └──────────────────────────────┘
                                                    │                                         │
                                                    ▼                                         │
                                   ┌─────────────────────────────────┐                        │
                                   │       MySQL 8.0 Database        │                        │
                                   │ (`employee_biometric_profiles`) │ <──────────────────────┘
                                   └─────────────────────────────────┘ (JSON 128-d vectors)
```

### Core Technologies
- **Biometric Microservice**: Python 3.12, FastAPI, Uvicorn (runs on `http://127.0.0.1:8000`).
- **Computer Vision & AI Frameworks**:
  - `dlib`: Facial landmark detection (68-point shape predictor) and deep residual neural network face recognition engine (`dlib_resnet_v1_128`).
  - `face_recognition`: High-level face detection & encoding wrapper built on Dlib.
  - `OpenCV` (`cv2`): Image decoding, color space transformation, Laplacian variance blur calculation, and intensity distribution analysis.
  - `NumPy`: High-performance vector operations, L2 norm calculations, pairwise distance matrices, and medoid selection.
- **Node.js Express Service**: `BiometricService.ts` for tenant isolation, profile synchronization, attendance punch logging, and optional GPS geofencing.
- **Frontend**: React 18 with HTML5 WebRTC `navigator.mediaDevices.getUserMedia` for multi-frame live stream captures.

---

## 2. Deep Learning Models & Feature Extraction

### 2.1 Face Detection & Alignment Model
- **Detection Algorithm**: Histogram of Oriented Gradients (HOG) + Linear SVM (or optional CNN detector when GPU acceleration is enabled).
- **Upsampling**: 1-level image pyramid upsampling (`number_of_times_to_upsample = 1`) to detect faces as small as $32 \times 32$ pixels in a frame.
- **Landmark Alignment**: 68 2D facial landmarks (eyes, eyebrows, nose bridge, nostrils, jawline, lips) are identified to estimate head pose (yaw, pitch, roll) and geometrically transform (rotate & scale) the face before feature extraction.

### 2.2 Deep Embedding Network (`dlib_resnet_v1_128`)
- **Network Architecture**: ResNet-34 derivative deep neural network trained on over 3,000,000 face images.
- **Output Vector**: 128-dimensional continuous real-valued feature vector (embedding):
  $$\mathbf{v} = [v_1, v_2, \dots, v_{128}]^T \in \mathbb{R}^{128}$$
- **Normalization**: Vector is normalized such that its L2 Euclidean norm is bounded, preserving facial structural invariants regardless of minor lighting variations or aging.

---

## 3. Image Quality & Anti-Spoofing Pre-Validation Pipeline

Before an image frame is sent to the deep neural network for encoding, it passes through a 5-stage automated quality guard to ensure reliable biometric accuracy:

```
Raw Camera Frame (Base64 JPEG/PNG)
       │
       ▼
 1. Image Format & Minimum Resolution Check (>= 320x240, <= 6MB)
       │
       ▼
 2. Face Detection & Count Validation (Exactly 1 Face Required)
       │
       ▼
 3. Face Bounding Box Coverage Ratio Check (Area >= 3.5% of Frame)
       │
       ▼
 4. OpenCV Laplacian Variance Blur Score Check (Score >= 45.0)
       │
       ▼
 5. Mean Grayscale Brightness & Overexposure Check (35 <= Intensity <= 220)
       │
       ▼
  Proceed to 128-d Feature Extraction & Encoding
```

### Stage Details & Thresholds

| Quality Test | Metric / Algorithm | Threshold / Rule | Failure Error Message |
| :--- | :--- | :--- | :--- |
| **Image Resolution** | Image dimensions in pixels | Min Width: $320\text{px}$, Min Height: $240\text{px}$ | *"Camera resolution must be at least 320x240."* |
| **Face Count** | Dlib bounding box count | $\text{Count} == 1$ | *"No face detected"* or *"More than one face is visible."* |
| **Face Frame Ratio** | $\frac{(Right - Left) \times (Bottom - Top)}{Width \times Height}$ | $\ge 0.035$ ($3.5\%$ of total frame) | *"Face is too small in the frame. Move closer."* |
| **Sharpness / Blur** | Variance of Laplacian $\text{Var}(\nabla^2 I)$ | $\ge 45.0$ | *"Image is too blurry. Hold still and clean camera lens."* |
| **Brightness Level** | Grayscale pixel mean $\bar{I}$ | $35.0 \le \bar{I} \le 220.0$ | *"Face is too dark"* or *"Face is overexposed."* |

---

## 4. Biometric Enrollment Workflow (Template Registration)

Employee face templates are registered using multi-frame capture to avoid saving outliers or transient expressions.

```
       [ Client Camera Capture (1 to 5 Frames) ]
                           │
                           ▼
     [ Process & Validate Quality for Each Frame ]
                           │
                           ▼
 [ Generate 128-d Embeddings with Jittering (num_jitters = 2) ]
                           │
                           ▼
 [ Pairwise Distance Consistency Check: Max Pair Dist <= 0.38 ]
                           │
                           ▼
 [ Compute Medoid Embedding Vector (Representative Template) ]
                           │
                           ▼
[ Store JSON Vector in `employee_biometric_profiles` Database ]
```

### 4.1 Jittered Encoding
During enrollment, each image is encoded with $N=2$ random sub-pixel jitter transformations (`num_jitters=2`) to average out camera noise and sub-pixel quantization artifacts.

### 4.2 Inter-Frame Consistency Check
To guarantee all captured enrollment images belong to the same person and face orientation:
$$\text{Pairwise Distance } d_{i,j} = \|\mathbf{v}_i - \mathbf{v}_j\|_2 = \sqrt{\sum_{k=1}^{128} (v_{i,k} - v_{j,k})^2}$$
If $\max_{i,j} d_{i,j} > 0.38$ (`BIOMETRIC_ENROLLMENT_CONSISTENCY_DISTANCE`), enrollment is rejected with:
> *"Enrollment photos are inconsistent. Keep the same person in all captures and face the camera directly."*

### 4.3 Medoid Template Calculation
Instead of a simple arithmetic mean (which can distort normalized spherical embeddings), the engine selects the **geometric medoid**:
$$\mathbf{v}_{\text{template}} = \arg\min_{\mathbf{v}_i} \sum_{j=1}^{M} \|\mathbf{v}_i - \mathbf{v}_j\|_2$$
The medoid remains on Dlib's native distance scale while ensuring robust protection against noisy frame outliers.

---

## 5. 1:N Face Identification & Verification Engine

When an employee checks in/out via face recognition, the system performs a 1:N search against all enrolled biometric templates in their organization.

### 5.1 Identification Algorithm Steps
1. **Live Frame Capture**: Captures 1 to 3 live camera frames.
2. **Quality Validation & Live Medoid**: Validates frames and computes the live feature vector $\mathbf{v}_{\text{live}}$.
3. **Candidate Pool Retrieval**: Loads active 128-d templates $\{\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_K\}$ for the tenant organization ($K \le 5000$).
4. **Euclidean Distance Ranking**: Calculates $d_k = \|\mathbf{v}_{\text{live}} - \mathbf{v}_k\|_2$ for all candidates and sorts them in ascending order ($d_1 < d_2 < \dots < d_K$).

### 5.2 Match Criteria & Thresholds
A match is accepted **ONLY** when two condition gates are met simultaneously:

$$\begin{cases}
d_1 \le \theta_{\text{match}} & \text{(Match Threshold Gate)} \\
d_2 - d_1 \ge \Delta_{\text{margin}} & \text{(Ambiguity Margin Gate)}
\end{cases}$$

- **Default Match Threshold ($\theta_{\text{match}}$)**: `0.48`
- **Default Ambiguity Margin ($\Delta_{\text{margin}}$)**: `0.055`

#### Decision Table:
| Condition | Identification Result | Status Message |
| :--- | :--- | :--- |
| $d_1 \le 0.48$ AND $(d_2 - d_1) \ge 0.055$ | **MATCH SUCCESSFUL** | *"Face matched an enrolled employee."* |
| $d_1 \le 0.48$ BUT $(d_2 - d_1) < 0.055$ | **AMBIGUOUS MATCH** | *"Face match is ambiguous between employees. Capture a clearer image."* |
| $d_1 > 0.48$ | **NO MATCH** | *"Face did not match any enrolled employee."* |

### 5.3 Operator Confidence Score Calculation
To display a user-friendly percentage score in HR dashboards and logs, distance is mapped using:
$$\text{Score} = \text{clamp}\left( \left(1.0 - \frac{d_1}{1.5 \times \theta_{\text{match}}}\right) \times 100, \, 0.0, \, 100.0 \right)$$

*Example Score Values ($\theta_{\text{match}} = 0.48$):*
- Distance $0.15 \implies \mathbf{79.2\%}$ match score (High confidence)
- Distance $0.35 \implies \mathbf{51.4\%}$ match score (Moderate confidence)
- Distance $0.48 \implies \mathbf{33.3\%}$ match score (Threshold limit)
- Distance $> 0.72 \implies \mathbf{0.0\%}$ match score

---

## 6. End-to-End Database Schema & Data Persistence

Biometric profile templates are stored in MySQL in the `employee_biometric_profiles` table:

```sql
CREATE TABLE `employee_biometric_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT UNSIGNED NOT NULL,
  `employee_id` INT UNSIGNED NOT NULL,
  `face_vector` JSON NOT NULL COMMENT '128-dimensional floating point array',
  `profile_photo` LONGTEXT NULL COMMENT 'Base64 DataURL or URL path of registered face photo',
  `model_version` VARCHAR(50) NOT NULL DEFAULT 'dlib_resnet_v1_128',
  `embedding_dimension` INT NOT NULL DEFAULT 128,
  `sample_count` INT NOT NULL DEFAULT 1,
  `quality_score` FLOAT DEFAULT 0.0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_org_employee` (`organization_id`, `employee_id`),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 7. Model Calibration & Threshold Optimization Utility

The service includes `biometric/calibrate.py` to evaluate local face datasets and calculate optimal thresholds for specific hardware setups:

```bash
python calibrate.py /path/to/dataset_folder
```

### Calibration Metric & Weighted Error Formula
In HR attendance, misidentifying employee A as employee B (False Acceptance) is far more critical than asking employee A to retry (False Rejection). Therefore, calibration uses a **5:1 Weighted Error Penalty**:

$$\text{Weighted Error} = 5.0 \times \text{FAR} + 1.0 \times \text{FRR}$$

Where:
- $\text{FAR}$ (False Accept Rate): Percentage of different employees matched as the same person.
- $\text{FRR}$ (False Reject Rate): Percentage of genuine employee photos rejected.

The threshold that minimizes $\text{Weighted Error}$ is selected as the recommended `BIOMETRIC_MATCH_THRESHOLD`.

---

## 8. Configuration Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `BIOMETRIC_HOST` | `127.0.0.1` | FastAPI service host address |
| `BIOMETRIC_PORT` | `8000` | FastAPI service port |
| `BIOMETRIC_API_KEY` | `""` | Optional shared secret for `X-Biometric-Key` header |
| `BIOMETRIC_MATCH_THRESHOLD` | `0.48` | Maximum L2 distance for 1:N match |
| `BIOMETRIC_AMBIGUITY_MARGIN` | `0.055` | Required separation distance between 1st and 2nd closest candidate |
| `BIOMETRIC_MIN_BLUR_SCORE` | `45.0` | Minimum OpenCV Laplacian variance |
| `BIOMETRIC_MIN_BRIGHTNESS` | `35.0` | Minimum mean grayscale pixel brightness |
| `BIOMETRIC_MAX_BRIGHTNESS` | `220.0` | Maximum mean grayscale pixel brightness |
| `BIOMETRIC_MIN_FACE_RATIO` | `0.035` | Minimum ratio of face bounding box to full image area |
| `BIOMETRIC_ENROLLMENT_CONSISTENCY_DISTANCE` | `0.38` | Max distance between multi-frame enrollment samples |

---

## 9. Security, Privacy & Data Compliance

1. **Irreversible Biometric Templates**: Facial feature vectors stored in `face_vector` are non-invertible 128-dimensional floating-point embeddings. Raw facial images cannot be reconstructed from embedding vectors.
2. **Tenant Isolation**: Multi-tenant database queries strictly enforce `organization_id` filtering at the backend ORM level before candidate vectors are dispatched to the microservice.
3. **API Authentication**: Inter-service communications between Express server and Python service use API Key authentication (`X-Biometric-Key`) and internal network loopback interfaces (`127.0.0.1` or isolated Docker networks).
