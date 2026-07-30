import shutil
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import laporan, obat, transaksi, user, pembelian, stok, supplier # <-- Tambahkan supplier di sini
from backend.database import engine, SessionLocal
from backend.models import Base

Base.metadata.create_all(bind=engine)
app = FastAPI()

# 1. Pastikan folder gambar backend tersedia
os.makedirs("backend/static/images", exist_ok=True)

# 2. Mount folder static backend (khusus untuk gambar yang di-upload)
app.mount("/backend-static", StaticFiles(directory="backend/static"), name="backend_static")

# 3. Mount folder frontend utama ke /static
app.mount("/static", StaticFiles(directory="frontend"), name="frontend_static")

# Mount folder pages agar bisa diakses langsung oleh fetch dinamis
app.mount("/pages", StaticFiles(directory="frontend/pages"), name="pages_static")

app.mount("/static/js", StaticFiles(directory="frontend/js"), name="js_static")

# Fix path gambar lama jika diperlukan
app.mount("/static/images", StaticFiles(directory="backend/static/images"), name="old_images_fix")

# --- ROUTE HALAMAN (MENGARAH KE FOLDER FRONTEND) ---

@app.get("/")
def baca_index():
    return FileResponse("frontend/index.html")

@app.get("/index.html")
def halaman_index():
    return FileResponse("frontend/index.html")

@app.get("/pages/kasir.html")
def halaman_kasir():
    return FileResponse("frontend/pages/kasir.html")

@app.get("/pages/dashboard.html")
def halaman_dashboard():
    return FileResponse("frontend/pages/dashboard.html")

@app.get("/pages/master_obat.html")
def halaman_master():
    return FileResponse("frontend/pages/master_obat.html")

@app.get("/pages/pembelian.html")
def halaman_pembelian():
    return FileResponse("frontend/pages/pembelian.html")

# --- ROUTE HALAMAN SUPPLIER BARU ---
@app.get("/pages/supplier.html")
def halaman_supplier():
    return FileResponse("frontend/pages/supplier.html")

@app.get("/pages/login.html")
def halaman_login():
    return FileResponse("frontend/pages/login.html")

@app.get("/pages/stok_opname.html")
def halaman_stok_opname():
    return FileResponse("frontend/pages/stok_opname.html")

# --- MIDDLEWARE & ROUTER BACKEND ---

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
app.include_router(stok.router)
app.include_router(supplier.router) # <-- Daftarkan router supplier agar endpoint /suppliers aktif

@app.post("/upload-gambar")
def upload_gambar(file: UploadFile = File(...)):
    try:
        file_path = f"backend/static/images/{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url_gambar": f"http://127.0.0.1:8000/backend-static/images/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))