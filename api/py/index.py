"""
FastAPI app — deployed as Vercel Serverless Function (Python 3.11)
All routes are prefixed /api/py/ by vercel.json rewrites
"""
import os
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
