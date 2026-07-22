from fastapi import APIRouter, Depends, HTTPException, FastAPI
from backend.database import SessionLocal
from backend.routers.user import require_permission
from backend.models import User, Sale, InventoryBatch, SaleItem
from backend.schemas import TransaksiKasir

router = APIRouter(tags=["Transaksi"])

@router.post("/transaksi")
def proses_transaksi(
    data: TransaksiKasir, 
    user: User = Depends(require_permission("akses_kasir"))
):
    db = SessionLocal()
    
    try:
        # 1. Buat nota transaksi baru
        nota_baru = Sale(kasir=user.username, total_item=0)
        db.add(nota_baru)
        db.flush() # flush() untuk mendapatkan nota_baru.id tanpa menyimpannya permanen dulu
        
        total_item_dibeli = 0

        # 2. Proses setiap obat di keranjang belanja
        for item in data.keranjang:
            jumlah_dibutuhkan = item.jumlah
            
            # Cari stok obat ini, urutkan dari tanggal kedaluwarsa TERDEKAT (FEFO)
            batches = db.query(InventoryBatch).filter(
                InventoryBatch.medicine_id == item.id_obat,
                InventoryBatch.jumlah_stok > 0
            ).order_by(InventoryBatch.tanggal_kedaluwarsa.asc()).all()

            # Hitung total ketersediaan stok
            total_stok_tersedia = sum(b.jumlah_stok for b in batches)
            if total_stok_tersedia < jumlah_dibutuhkan:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stok tidak cukup untuk ID Obat {item.id_obat}. Tersedia: {total_stok_tersedia}"
                )

            # 3. Logika pemotongan FEFO
            for batch in batches:
                if jumlah_dibutuhkan == 0:
                    break # Lanjut ke obat berikutnya jika kebutuhan sudah terpenuhi
                
                if batch.jumlah_stok >= jumlah_dibutuhkan:
                    # Stok di batch ini cukup
                    batch.jumlah_stok -= jumlah_dibutuhkan
                    jumlah_dibutuhkan = 0
                else:
                    # Stok di batch ini kurang, habiskan batch ini, cari sisanya di batch selanjutnya
                    jumlah_dibutuhkan -= batch.jumlah_stok
                    batch.jumlah_stok = 0
            
            # Catat ke rincian nota
            rincian = SaleItem(
                sale_id=nota_baru.id,
                medicine_id=item.id_obat,
                jumlah=item.jumlah
            )
            db.add(rincian)
            total_item_dibeli += item.jumlah

        # 4. Selesaikan transaksi
        nota_baru.total_item = total_item_dibeli
        db.commit()
        
        return {
            "message": "Transaksi berhasil", 
            "id_nota": nota_baru.id,
            "kasir": user.username
        }

    except Exception as e:
        db.rollback() # Batalkan semua pemotongan stok jika ada 1 saja yang error
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

