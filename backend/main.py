# main.py
import shutil
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles # <--- Jangan lupa import ini
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import laporan, obat, transaksi, user, pembelian
from backend.database import engine, SessionLocal
from backend.models import Base

Base.metadata.create_all(bind=engine)
app = FastAPI()

# 1. Pastikan folder tersedia
os.makedirs("backend/static/images", exist_ok=True)

# 2. Mount folder static agar bisa diakses publik via URL browser
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obat.router)
app.include_router(laporan.router)
app.include_router(transaksi.router)
app.include_router(user.router)
app.include_router(pembelian.router)

# 3. Gunakan @app.post (bukan @router.post) karena menggunakan instance app
@app.post("/upload-gambar")
def upload_gambar(file: UploadFile = File(...)):
    try:
        file_path = f"backend/static/images/{file.filename}"
        
        # Simpan file secara fisik ke folder server
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url_gambar": f"http://127.0.0.1:8000/static/images/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))