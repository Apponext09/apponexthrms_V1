from __future__ import annotations

import argparse
import base64
import json
from itertools import combinations
from pathlib import Path

import numpy as np

from face_engine import face_engine


def as_data_url(path: Path) -> str:
    suffix = path.suffix.lower()
    mime = "image/png" if suffix == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Measure genuine/impostor face distances for local threshold calibration."
    )
    parser.add_argument(
        "dataset",
        type=Path,
        help="Folder containing one subfolder per employee and at least two images each.",
    )
    args = parser.parse_args()

    samples: dict[str, list[np.ndarray]] = {}
    rejected: list[dict[str, str]] = []
    for employee_dir in sorted(path for path in args.dataset.iterdir() if path.is_dir()):
        for image_path in sorted(employee_dir.iterdir()):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            try:
                processed = face_engine.process_image(as_data_url(image_path))
                samples.setdefault(employee_dir.name, []).append(processed.embedding)
            except ValueError as error:
                rejected.append({"file": str(image_path), "reason": str(error)})

    genuine: list[float] = []
    for employee_samples in samples.values():
        genuine.extend(
            face_engine.distance(first, second)
            for first, second in combinations(employee_samples, 2)
        )

    employee_templates = {
        employee: face_engine._medoid(employee_samples)
        for employee, employee_samples in samples.items()
        if employee_samples
    }
    impostor = [
        face_engine.distance(employee_templates[first], employee_templates[second])
        for first, second in combinations(employee_templates, 2)
    ]
    if not genuine or not impostor:
        raise SystemExit(
            "Calibration requires at least two accepted images per employee and "
            "at least two different employees."
        )

    rows = []
    for threshold in np.arange(0.35, 0.605, 0.005):
        false_accept_rate = sum(distance <= threshold for distance in impostor) / len(impostor)
        false_reject_rate = sum(distance > threshold for distance in genuine) / len(genuine)
        rows.append(
            {
                "threshold": round(float(threshold), 3),
                "false_accept_rate": round(false_accept_rate, 6),
                "false_reject_rate": round(false_reject_rate, 6),
                # Attendance should penalize the wrong employee more than a retry.
                "weighted_error": false_accept_rate * 5.0 + false_reject_rate,
            }
        )

    recommended = min(rows, key=lambda row: row["weighted_error"])
    print(
        json.dumps(
            {
                "employees": {name: len(values) for name, values in samples.items()},
                "genuine_pairs": len(genuine),
                "impostor_pairs": len(impostor),
                "genuine_distance": {
                    "min": round(min(genuine), 4),
                    "median": round(float(np.median(genuine)), 4),
                    "max": round(max(genuine), 4),
                },
                "impostor_distance": {
                    "min": round(min(impostor), 4),
                    "median": round(float(np.median(impostor)), 4),
                    "max": round(max(impostor), 4),
                },
                "recommended": recommended,
                "rejected_images": rejected,
                "all_thresholds": rows,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

