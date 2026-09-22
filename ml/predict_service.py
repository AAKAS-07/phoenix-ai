"""
Phoenix AI – Long-running prediction worker for the Node.js backend.

The Node backend spawns this process ONCE and talks to it over stdin/stdout
using newline-delimited JSON. The trained model is loaded a single time at
startup (not per request).

Protocol
--------
- first stdout line:  {"status": "ready"}  handshake
- each stdin line:    a JSON payload with the farmer's inputs
- each stdout line:   {"ok": true, "advisory": {...}}
                      or {"ok": false, "error": "message"}

Usage:
    python ml/predict_service.py [--model-dir ml/saved_models]
"""

from __future__ import annotations

import warnings
warnings.filterwarnings('ignore')

import argparse
import json
import os
import sys
import traceback

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

try:
    from predict import AdvisoryService, InputValidationError
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(BASE, "..")))
    from predict import AdvisoryService, InputValidationError


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=None)
    args = ap.parse_args()

    model_dir = args.model_dir
    try:
        service = AdvisoryService.load(model_dir) if model_dir else AdvisoryService.load()
    except FileNotFoundError as e:
        print(json.dumps({"status": "error", "message": str(e)}), flush=True)
        sys.exit(1)

    print(json.dumps({"status": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            payload = json.loads(line)
            req_id = payload.pop("_requestId", None)
            advisory = service.predict(payload)
            reply = {"ok": True, "advisory": advisory}
            if req_id is not None:
                reply["id"] = req_id
            print(json.dumps(reply), flush=True)
        except InputValidationError as e:
            reply = {"ok": False, "error": str(e), "code": "VALIDATION_ERROR"}
            if req_id is not None:
                reply["id"] = req_id
            print(json.dumps(reply), flush=True)
        except Exception:
            reply = {
                "ok": False,
                "error": "Prediction failed on the server.",
                "code": "PREDICTION_ERROR",
            }
            if req_id is not None:
                reply["id"] = req_id
            print(json.dumps(reply), flush=True)
            traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()
