# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import laporan, obat, stok, transaksi, user
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
app.include_router(user.router)

@app.post("/init-admin", tags=["Setup"])
def buat_admin_pertama():
    db = SessionLocal()
    # Cek apakah sudah ada user apa pun di dalam database
    cek_user = db.query(User).first()
    if cek_user:
        db.close()
        return {"message": "Sistem sudah memiliki akun pengguna."}

    admin_baru = User(
        username="Ariel",
        password_hash="password",
        permissions={"akses_kasir": True, "akses_stok": True, "akses_laporan": True}
    )
    db.add(admin_baru)
    db.commit()
    db.close()
    return {"message": "Sukses! Akun admin berhasil dibuat."}