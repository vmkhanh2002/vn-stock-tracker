"""
FastAPI app — deployed as separate Vercel Python project
All routes served from root, e.g. /health, /stock/history, /indicators, /ai-context
"""
import os
import warnings
from datetime import date

# Vercel sandbox has read-only home dir; redirect all writes to /tmp
os.environ.setdefault("HOME", "/tmp")
os.environ.setdefault("TMPDIR", "/tmp")
os.makedirs("/tmp/.vnstock", exist_ok=True)

import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="vnstock")

os.environ["VNSTOCK_SHOW_ADS"] = "0"
os.environ["VNSTOCK_DISABLE_NOTICE"] = "1"

app = FastAPI(title="VN Stock API", version="2.0.0")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

import sys
sys.path.insert(0, os.path.dirname(__file__))

from routers.stock import router as stock_router
from routers.indicators import router as ind_router
from routers.ai_context import router as ai_router

app.include_router(stock_router, prefix="/stock")
app.include_router(ind_router,   prefix="/indicators")
app.include_router(ai_router,    prefix="/ai-context")


@app.get("/health")
def health():
    return {"status": "ok", "date": str(date.today())}
