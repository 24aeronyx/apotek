# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import laporan, obat, stok, transaksi
from backend.database import engine, SessionLocal
from backend.models import Base, User

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obat.router)
app.include_router(stok.router)
app.include_router(laporan.router)
app.include_router(transaksi.router)

@app.post("/api/init-admin", tags=["Setup"])
def buat_admin_pertama():
    db = SessionLocal()
    cek_user = db.query(User).filter(User.username == "admin").first()
    if cek_user:
        db.close()
        return {"message": "Admin sudah ada."}

    admin_baru = User(
        username="admin",
        password_hash="rahasia123",
        permissions={"akses_kasir": True, "akses_stok": True, "akses_laporan": True}
    )
    db.add(admin_baru)
    db.commit()
    db.close()
    return {"message": "Sukses! Akun admin berhasil dibuat."}