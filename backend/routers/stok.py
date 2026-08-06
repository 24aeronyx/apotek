from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import KartuStok, Medicine, InventoryBatch
from pydantic import BaseModel

router = APIRouter(prefix="/stok", tags=["Stok Opname & Kartu Stok"])

class OpnameRequest(BaseModel):
    batch_id: int  # Opname berdasarkan Batch obat
    stok_fisik_baru: int
    keterangan: str  # Contoh: "Opname bulanan", "Pemusnahan barang rusak"

# Dependency helper session database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
        
@router.get("/kartu-stok/{obat_id}")
def get_kartu_stok(obat_id: int, tanggal: str = None):
    db = SessionLocal()
    try:
        query = db.query(KartuStok).filter(KartuStok.obat_id == obat_id)
        
        if tanggal:
            # Filter berdasarkan tanggal (YYYY-MM-DD)
            query = query.filter(KartuStok.tanggal.like(f"{tanggal}%"))
            
        riwayat = query.order_by(KartuStok.id.asc()).all()
        
        result = []
        for r in riwayat:
            nama_obat = r.medicine.nama if r.medicine else "Obat"
            # Menentukan apakah mutasi masuk atau keluar berdasarkan jenis transaksi
            is_masuk = "PEMBELIAN" in r.jenis_transaksi or "RETUR-MASUK" in r.jenis_transaksi or (r.jumlah > 0 and "OPNAME" in r.jenis_transaksi)
            
            result.append({
                "id": r.id,
                "tanggal": str(r.tanggal),
                "nama_obat": nama_obat,
                "jenis_transaksi": r.jenis_transaksi,
                "masuk": abs(r.jumlah) if is_masuk else 0,
                "keluar": abs(r.jumlah) if not is_masuk else 0,
                "stok_sisa": r.stok_sisa,
                "keterangan": r.keterangan
            })
        return result
    finally:
        db.close()