from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import func
from backend.database import SessionLocal
from backend.models import User, Medicine, InventoryBatch
from backend.routers.user import require_permission


router = APIRouter(tags=["Obat"])

@router.get("/obat/cari")
def cari_obat():
    db = SessionLocal()
    try:
        medicines = db.query(Medicine).all()
        hasil = []
        for m in medicines:
            # Hitung total stok dari semua batch yang dimiliki obat ini
            total_stok = sum(batch.jumlah_stok for batch in m.batches)
            
            hasil.append({
                "id": m.id,
                "nama": m.nama,
                "kategori": m.kategori,
                "harga": m.harga_jual,
                "stok": total_stok, # <-- Total stok gabungan dari inventory_batches
                "gambar": m.gambar if m.gambar else "https://via.placeholder.com/150" # <-- Kirim URL gambar
            })
        return hasil
    finally:
        db.close()