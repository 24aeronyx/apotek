from fastapi import APIRouter, HTTPException
from datetime import datetime
from backend.database import SessionLocal
from backend.models import KartuStok, Medicine, InventoryBatch
from pydantic import BaseModel

router = APIRouter(prefix="/stok", tags=["Stok Opname & Kartu Stok"])

class OpnameRequest(BaseModel):
    batch_id: int  # Opname berdasarkan Batch obat
    stok_fisik_baru: int
    keterangan: str  # Contoh: "Opname bulanan", "Pemusnahan barang rusak"

@router.get("/riwayat/{medicine_id}")
def get_riwayat_stok(medicine_id: int):
    db = SessionLocal()
    try:
        riwayat = db.query(KartuStok).filter(KartuStok.obat_id == medicine_id).order_by(KartuStok.tanggal.desc()).all()
        return riwayat
    finally:
        db.close()

@router.post("/opname")
def proses_stok_opname(data: OpnameRequest):
    db = SessionLocal()
    try:
        # Cari batch spesifik yang ingin di-opname
        batch = db.query(InventoryBatch).filter(InventoryBatch.id == data.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch obat tidak ditemukan")
        
        stok_lama = batch.jumlah_stok
        selisih = data.stok_fisik_baru - stok_lama
        
        # Update stok pada batch tersebut
        batch.jumlah_stok = data.stok_fisik_baru
        
        # Catat ke kartu stok
        catatan = KartuStok(
            obat_id=batch.medicine_id,
            tanggal=datetime.utcnow(),
            jenis_transaksi="OPNAME/PENYESUAIAN",
            jumlah=selisih,
            stok_sisa=data.stok_fisik_baru,
            keterangan=f"Batch {batch.nomor_batch}: {data.keterangan}"
        )
        db.add(catatan)
        db.commit()
        
        return {
            "message": "Stok opname berhasil disimpan",
            "batch_id": batch.id,
            "nomor_batch": batch.nomor_batch,
            "stok_lama": stok_lama,
            "stok_baru": data.stok_fisik_baru,
            "selisih": selisih
        }
    finally:
        db.close()