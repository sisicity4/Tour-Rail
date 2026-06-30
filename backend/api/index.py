# Vercel Python serverless entrypoint.
# backend/ ルートを import パスに通し、FastAPI アプリ (app) をそのまま公開する。
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402,F401
