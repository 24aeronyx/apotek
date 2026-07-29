from fastapi import APIRouter, status, HTTPException
from backend.database import SessionLocal
from backend.models import Medicine
from backend.schemas import MedicineCreate, MedicineUpdate
from sqlalchemy.orm import joinedload

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
        
@router.get("/obat")
def get_all_medicines():
    db = SessionLocal()
    try:
        # Gunakan options(joinedload(Medicine.batches)) agar relasi batch ikut terbawa
        medicines = db.query(Medicine).options(joinedload(Medicine.batches)).all()
        
        hasil = []
        for m in medicines:
            # Sekarang m.batches sudah terisi dengan benar karena joinedload
            total_stok = sum(batch.jumlah_stok for batch in m.batches) if m.batches else 0
            
            hasil.append({
                "id": m.id,
                "nama": m.nama,
                "kategori": m.kategori,
                "harga_jual": m.harga_jual,
                "total_stok": total_stok,
                "gambar": m.gambar if m.gambar else ""
            })
        return hasil
    finally:
        db.close()


# 2. Endpoint untuk menambah Master Obat baru
@router.get("/obat")
def get_all_medicines():
    db = SessionLocal()
    try:
        medicines = db.query(Medicine).all()
        hasil = []
        for m in medicines:
            # Hitung total stok dari seluruh batch yang terikat ke obat ini
            total_stok = sum(batch.jumlah_stok for batch in m.batches)
            
            hasil.append({
                "id": m.id,
                "nama": m.nama,
                "kategori": m.kategori,
                "harga_jual": m.harga_jual,
                "total_stok": total_stok, # <-- Kirim data stok ke frontend
                "gambar": m.gambar if m.gambar else ""
            })
        return hasil
    finally:
        db.close()


# 3. Endpoint untuk mengedit/memperbarui Master Obat berdasarkan ID
@router.put("/obat/{obat_id}")
def update_medicine(obat_id: int, data: MedicineUpdate):
    db = SessionLocal()
    try:
        medicine = db.query(Medicine).filter(Medicine.id == obat_id).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Obat tidak ditemukan di master")

        if data.nama is not None:
            medicine.nama = data.nama
        if data.kategori is not None:
            medicine.kategori = data.kategori
        if data.harga_jual is not None:
            medicine.harga_jual = data.harga_jual
        if data.gambar is not None:
            medicine.gambar = data.gambar

        db.commit()
        return {"message": "Master obat berhasil diperbarui"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()
        
@router.delete("/obat/{obat_id}")
def delete_medicine(obat_id: int):
    db = SessionLocal()
    try:
        medicine = db.query(Medicine).filter(Medicine.id == obat_id).first()
        if not medicine:
            raise HTTPException(status_code=404, detail="Obat tidak ditemukan di master")

        db.delete(medicine)
        db.commit()
        return {"message": "Master obat berhasil dihapus"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Gagal menghapus obat (kemungkinan masih terikat dengan data batch/transaksi).")
    finally:
        db.close()