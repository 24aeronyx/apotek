from fastapi import APIRouter, Depends, HTTPException
from backend.models import User, Medicine, InventoryBatch
from backend.database import SessionLocal
from backend.routers.user import require_permission
from backend.schemas import StokObatBaru, BulkStokObat

router = APIRouter(tags=["Stok"])

# Rute ini hanya untuk karyawan yang dicentang "akses_stok"-nya
@router.post("/stok/tambah")
def tambah_stok_obat(
    data: StokObatBaru, 
    user: User = Depends(require_permission("akses_stok"))
):
    db = SessionLocal()
    
    try:
        # 1. Cek apakah obat sudah ada di Master Data
        obat = db.query(Medicine).filter(Medicine.nama == data.nama_obat).first()
        
        if not obat:
            # Jika belum ada, buat data obat baru
            obat = Medicine(nama=data.nama_obat, kategori=data.kategori)
            db.add(obat)
            db.commit()
            db.refresh(obat) # Ambil ID obat yang baru dibuat
            
        # 2. Masukkan stok ke tabel Batch (FEFO)
        batch_baru = InventoryBatch(
            medicine_id=obat.id,
            jumlah_stok=data.jumlah,
            tanggal_kedaluwarsa=data.tanggal_kedaluwarsa
        )
        db.add(batch_baru)
        db.commit()
        
        return {
            "message": f"Berhasil menyimpan stok {data.nama_obat} ke database!",
            "jumlah_masuk": data.jumlah,
            "tanggal_kedaluwarsa": data.tanggal_kedaluwarsa,
            "petugas": user.username
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
# 3. Endpoint baru untuk input massal
@router.post("/stok/tambah-banyak")
def tambah_banyak_stok_obat(
    data: BulkStokObat, 
    user: User = Depends(require_permission("akses_stok"))
):
    db = SessionLocal()
    try:
        sukses_count = 0
        for item in data.items:
            # Cek apakah obat sudah ada di Master Data
            obat = db.query(Medicine).filter(Medicine.nama == item.nama_obat).first()
            
            if not obat:
                obat = Medicine(
                    nama=item.nama_obat, 
                    kategori=item.kategori, 
                    harga_jual=item.harga_jual
                )
                db.add(obat)
                db.commit()
                db.refresh(obat)
                
            # Masukkan stok ke tabel Batch (FEFO)
            batch_baru = InventoryBatch(
                medicine_id=obat.id,
                jumlah_stok=item.jumlah,
                tanggal_kedaluwarsa=item.tanggal_kedaluwarsa
            )
            db.add(batch_baru)
            sukses_count += 1
            
        db.commit()
        return {
            "message": f"Berhasil memasukkan {sukses_count} jenis data obat ke database!",
            "petugas": user.username
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
