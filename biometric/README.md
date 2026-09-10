# Apponext HRMS biometric backend

This service is the isolated face-processing backend used by the HRMS server.
It follows the supplied reference project's OpenCV/`face_recognition` flow, but
adds strict image validation, real 128-dimensional dlib face embeddings,
multi-capture enrollment, tenant-safe matching in the HRMS server, and an
ambiguity margin so a close second candidate is rejected.

## Run locally

Use Python 3.10 or 3.11:

```powershell
cd biometric
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

On Windows with Python 3.12, the included setup uses the prebuilt `dlib-bin`
wheel and avoids requiring Visual C++/CMake:

```powershell
cd biometric
.\setup-windows.ps1
cd ..
npm run dev:biometric:native
```

Or run the `biometric` service from the root `docker-compose.yml`.

The service listens on `http://127.0.0.1:8000`. The Node server calls it; the
browser never receives employee face vectors.

## Accuracy and calibration

Defaults are intentionally conservative:

- one face must be visible;
- blur, lighting, resolution, and face-size checks must pass;
- enrollment captures must be mutually consistent;
- dlib ResNet distance must be at most `0.48`;
- the best candidate must beat the second-best candidate by at least `0.055`.

These values reduce false acceptances but can increase retries. Before
production, evaluate genuine and impostor captures from the actual cameras and
lighting, then set `BIOMETRIC_MATCH_THRESHOLD` and
`BIOMETRIC_AMBIGUITY_MARGIN` from the measured false-accept/false-reject tradeoff.
The displayed match score is not a probability.

For a local calibration set arranged as
`calibration/<employee-code>/*.jpg`, run:

```powershell
python calibrate.py calibration
```

The report prioritizes avoiding false acceptance over avoiding a retry. Do not
calibrate on the same images used as production enrollment templates.

Profile photos and embeddings are sensitive biometric data. Restrict database
access, use TLS in production, define a retention/deletion policy, and obtain
the employee consent required by the applicable jurisdiction.
