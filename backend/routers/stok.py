from fastapi import APIRouter, status, HTTPException
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session, joinedload
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
        # Pastikan obatnya aktif
        medicine = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.is_active == True).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Obat tidak ditemukan atau sudah non-aktif")

        riwayat = db.query(KartuStok).filter(KartuStok.obat_id == medicine_id).order_by(KartuStok.tanggal.desc()).all()
        return riwayat
    finally:
        db.close()

@router.post("/opname")
def proses_stok_opname(data: OpnameRequest):
    db = SessionLocal()
    try:
        # Cari batch spesifik dan pastikan obat induknya berstatus aktif
        batch = db.query(InventoryBatch).options(joinedload(InventoryBatch.medicine)).filter(InventoryBatch.id == data.batch_id).first()
        if not batch or not batch.medicine or batch.medicine.is_active == False:
            raise HTTPException(status_code=404, detail="Batch obat tidak ditemukan atau obat sudah non-aktif")
        
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
        # Validasi apakah obat aktif
        medicine = db.query(Medicine).filter(Medicine.id == obat_id, Medicine.is_active == True).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Obat tidak ditemukan atau sudah non-aktif")

        query = db.query(KartuStok).filter(KartuStok.obat_id == obat_id)
        
        if tanggal:
            query = query.filter(KartuStok.tanggal.startswith(tanggal))
            
        # URUTAN WAJIB ASC (Dari yang terlama ke terbaru) agar akumulasi stok benar
        riwayat = query.order_by(KartuStok.id.asc()).all()
        
        result = []
        stok_berjalan = 0  # Variabel untuk menghitung akumulasi (running balance)
        
        for r in riwayat:
            nama_obat = r.medicine.nama if r.medicine else "Obat"
            jenis = (r.jenis_transaksi or "").upper()
            
            # Deteksi apakah transaksi ini sifatnya menambah stok (Masuk) atau mengurangi (Keluar)
            is_masuk = any(keyword in jenis for keyword in ["PEMBELIAN", "RETUR-MASUK", "OPNAME-MASUK"]) or (r.jumlah > 0 and "OPNAME" in jenis)
            
            # Tentukan nilai murni masuk dan keluar
            jumlah_mutasi = abs(r.jumlah)
            masuk = jumlah_mutasi if is_masuk else 0
            keluar = jumlah_mutasi if not is_masuk else 0
            
            # Hitung running balance secara matematis berurutan
            stok_berjalan = stok_berjalan + masuk - keluar
            
            result.append({
                "id": r.id,
                "tanggal": str(r.tanggal),
                "nama_obat": nama_obat,
                "jenis_transaksi": r.jenis_transaksi,
                "masuk": masuk,
                "keluar": keluar,
                "stok_sisa": stok_berjalan,  # Menggunakan hasil akumulasi yang dijamin akurat
                "keterangan": r.keterangan
            })
            
        return result
    finally:
        db.close()

# --- ENDPOINT PERINGATAN STOK MENIPIS & EXPIRED (Hanya Obat Aktif) ---
@router.get("/peringatan/stok-expired")
def get_peringatan_stok_expired():
    db = SessionLocal()
    try:
        # 1. Peringatan Stok Menipis (Hanya untuk obat aktif)
        medicines = db.query(Medicine).options(joinedload(Medicine.batches)).filter(Medicine.is_active == True).all()
        
        stok_menipis = []
        for m in medicines:
            total_stok = sum(b.jumlah_stok for b in m.batches) if m.batches else 0
            if total_stok <= m.stok_minimum:
                stok_menipis.append({
                    "id": m.id,
                    "nama": m.nama,
                    "kategori": m.kategori,
                    "total_stok": total_stok,
                    "stok_minimum": m.stok_minimum
                })

        # 2. Peringatan Batch Hampir / Sudah Kedaluwarsa (Hanya untuk obat aktif, rentang 90 hari)
        batas_expired = date.today() + timedelta(days=90)
        batches_kritis = db.query(InventoryBatch).join(InventoryBatch.medicine).filter(
            InventoryBatch.tanggal_kedaluwarsa <= batas_expired,
            InventoryBatch.jumlah_stok > 0,
            Medicine.is_active == True  # <--- Mengabaikan obat yang tidak aktif
        ).all()

        list_batch_expired = []
        for b in batches_kritis:
            list_batch_expired.append({
                "batch_id": b.id,
                "nomor_batch": b.nomor_batch,
                "nama_obat": b.medicine.nama if b.medicine else "-",
                "jumlah_stok": b.jumlah_stok,
                "tanggal_kedaluwarsa": str(b.tanggal_kedaluwarsa)
            })

        return {
            "stok_menipis": stok_menipis,
            "batch_expired": list_batch_expired
        }
    finally:
        db.close()