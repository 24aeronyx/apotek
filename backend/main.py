import shutil
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import laporan, obat, transaksi, user, pembelian
from backend.database import engine, SessionLocal
from backend.models import Base

Base.metadata.create_all(bind=engine)
app = FastAPI()

# 1. Pastikan folder gambar tersedia
os.makedirs("backend/static/images", exist_ok=True)

# 2. Mount folder static backend (khusus untuk gambar dan aset backend) dengan awalan /media atau /backend-static
app.mount("/backend-static", StaticFiles(directory="backend/static"), name="backend_static")

# 3. Mount folder frontend ke /static agar style.css, app.js, dll terbaca
app.mount("/static", StaticFiles(directory="frontend"), name="frontend_static")

# Tambahkan baris ini di bawah mount static frontend Anda
app.mount("/static/images", StaticFiles(directory="backend/static/images"), name="old_images_fix")

@app.get("/")
def baca_index():
    return FileResponse("frontend/index.html")

@app.get("/dashboard.html")
def halaman_dashboard():
    return FileResponse("frontend/dashboard.html")

@app.get("/master_obat.html")
def halaman_master():
    return FileResponse("frontend/master_obat.html")

@app.get("/pembelian.html")
def halaman_pembelian():
    return FileResponse("frontend/pembelian.html")

@app.get("/login.html")
def halaman_login():
    return FileResponse("frontend/login.html")

@app.get("/index.html")
def halaman_index():
    return FileResponse("frontend/index.html")

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

@app.post("/upload-gambar")
def upload_gambar(file: UploadFile = File(...)):
    try:
        file_path = f"backend/static/images/{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # PASTIKAN MENGGUNAKAN /backend-static/
        return {"url_gambar": f"http://127.0.0.1:8000/backend-static/images/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))