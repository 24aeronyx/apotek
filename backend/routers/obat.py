from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import func
from backend.database import SessionLocal
from backend.models import User, Medicine, InventoryBatch
from backend.routers.user import require_permission


router = APIRouter(tags=["Obat"])

@router.get("/obat/cari")
def cari_obat(user: User = Depends(require_permission("akses_kasir"))):
    db = SessionLocal()
    try:
        hasil = []
        obat_list = db.query(Medicine).all()
        for o in obat_list:
            total_stok = db.query(func.sum(InventoryBatch.jumlah_stok)).filter(
                InventoryBatch.medicine_id == o.id
            ).scalar() or 0
            
            hasil.append({
                "id": o.id, 
                "nama": o.nama, 
                "stok": total_stok,
                "harga": o.harga_jual, # <-- Kirim harga ke frontend
                "gambar": "https://placehold.co/150x100?text=Obat" 
            })
        return hasil
    finally:
        db.close()