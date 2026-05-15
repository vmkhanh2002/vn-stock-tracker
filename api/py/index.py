"""
FastAPI app — deployed as Vercel Serverless Function
All routes are prefixed /api/py/ by vercel.json rewrites
"""
import os
import sys
os.environ.setdefault("HOME", "/tmp")
os.environ.setdefault("TMPDIR", "/tmp")
os.makedirs("/tmp/.vnstock", exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import warnings
from datetime import date

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="vnstock")

os.environ["VNSTOCK_SHOW_ADS"] = "0"
os.environ["VNSTOCK_DISABLE_NOTICE"] = "1"

app = FastAPI(title="VN Stock API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("NEXT_PUBLIC_APP_URL", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

from routers.stock import router as stock_router
from routers.indicators import router as ind_router
from routers.ai_context import router as ai_router

app.include_router(stock_router, prefix="/stock")
app.include_router(ind_router,   prefix="/indicators")
app.include_router(ai_router,    prefix="/ai-context")


@app.get("/health")
def health():
    return {"status": "ok", "date": str(date.today())}


# Vercel routes /api/py/* → this file, so FastAPI receives the full path
# e.g. /api/py/indicators. Strip /api/py prefix so FastAPI routing works.
class _StripPrefix:
    def __init__(self, asgi_app, prefix: str):
        self.app = asgi_app
        self.prefix = prefix.rstrip("/")

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path.startswith(self.prefix):
                stripped = path[len(self.prefix):] or "/"
                scope = {**scope, "path": stripped,
                         "raw_path": stripped.encode()}
        await self.app(scope, receive, send)


app = _StripPrefix(app, "/api/py")
