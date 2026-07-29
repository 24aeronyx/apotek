from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import date
from backend.database import SessionLocal
from backend.models import InventoryBatch, Medicine
from backend.schemas import PembelianCreate

router = APIRouter(tags=["Pembelian"])

@router.post("/pembelian", status_code=status.HTTP_201_CREATED)
def tambah_pembelian_stok(data: PembelianCreate):
    db = SessionLocal()
    try:
        # Pastikan obat terdaftar di master
        medicine = db.query(Medicine).filter(Medicine.id == data.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Obat tidak ditemukan di master data")

        # Buat batch baru untuk mendukung FEFO
        new_batch = InventoryBatch(
            medicine_id=data.medicine_id,
            jumlah_stok=data.jumlah_stok,
            tanggal_kedaluwarsa=data.tanggal_kedaluwarsa
            # Catatan: Jika model Anda memiliki kolom nomor_batch atau harga_beli, bisa disertakan di sini.
        )
        
        db.add(new_batch)
        db.commit()
        return {"message": "Stok berhasil dimasukkan ke batch baru"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()