from fastapi import APIRouter, Depends, HTTPException, FastAPI
from backend.database import SessionLocal
from backend.models import User, Sale, InventoryBatch, SaleItem, Medicine
from backend.schemas import TransaksiKasir

router = APIRouter(tags=["Transaksi"])

@router.post("/transaksi")
def proses_transaksi(
    data: TransaksiKasir, 
    # user: User = Depends(require_permission("akses_kasir"))
):
    db = SessionLocal()
    
    try:
        # 1. Buat nota transaksi baru (grand_total & total_laba diinisialisasi 0 dulu)
        nota_baru = Sale(kasir=data.kasir, total_item=0, grand_total=0, total_laba=0)
        db.add(nota_baru)
        db.flush() # flush() untuk mendapatkan nota_baru.id tanpa menyimpannya permanen dulu
        
        total_item_dibeli = 0
        grand_total_transaksi = 0
        total_laba_transaksi = 0

        # 2. Proses setiap obat di keranjang belanja
        for item in data.keranjang:
            jumlah_dibutuhkan = item.jumlah
            
            # Ambil data master obat untuk mengetahui harga jual standar
            obat = db.query(Medicine).filter(Medicine.id == item.id_obat).first()
            if not obat:
                raise HTTPException(status_code=404, detail=f"Data obat dengan ID {item.id_obat} tidak ditemukan.")
            
            harga_jual_satuan = obat.harga_jual or 0

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
                    detail=f"Stok tidak cukup untuk obat {obat.nama}. Tersedia: {total_stok_tersedia}"
                )

            # 3. Logika pemotongan FEFO dan perhitungan modal (harga beli)
            jumlah_sisa_dibutuhkan = jumlah_dibutuhkan
            subtotal_jual_item = 0
            subtotal_modal_item = 0

            for batch in batches:
                if jumlah_sisa_dibutuhkan == 0:
                    break # Lanjut ke obat berikutnya jika kebutuhan sudah terpenuhi
                
                # Ambil harga beli (modal) dari batch yang sedang dipotong
                harga_beli_satuan = batch.harga_beli or 0

                if batch.jumlah_stok >= jumlah_sisa_dibutuhkan:
                    # Stok di batch ini cukup untuk mencukupi sisa kebutuhan
                    qty_diambil = jumlah_sisa_dibutuhkan
                    batch.jumlah_stok -= qty_diambil
                    
                    subtotal_jual_item += qty_diambil * harga_jual_satuan
                    subtotal_modal_item += qty_diambil * harga_beli_satuan
                    
                    jumlah_sisa_dibutuhkan = 0
                else:
                    # Stok di batch ini kurang, habiskan batch ini, cari sisanya di batch selanjutnya
                    qty_diambil = batch.jumlah_stok
                    jumlah_sisa_dibutuhkan -= qty_diambil
                    batch.jumlah_stok = 0
                    
                    subtotal_jual_item += qty_diambil * harga_jual_satuan
                    subtotal_modal_item += qty_diambil * harga_beli_satuan
            
            # Hitung laba untuk item ini
            laba_item = subtotal_jual_item - subtotal_modal_item

            grand_total_transaksi += subtotal_jual_item
            total_laba_transaksi += laba_item

            # Catat ke rincian nota (SaleItem) — pastikan model SaleItem Anda memiliki kolom harga_jual, harga_beli, dan subtotal
            rincian = SaleItem(
                sale_id=nota_baru.id,
                medicine_id=item.id_obat,
                jumlah=item.jumlah,
                harga_jual=harga_jual_satuan,
                harga_beli=(subtotal_modal_item / item.jumlah) if item.jumlah > 0 else 0, # Rata-rata modal per item jika ambil dari multi-batch
                subtotal=subtotal_jual_item
            )
            db.add(rincian)
            total_item_dibeli += item.jumlah

        # 4. Selesaikan transaksi & simpan ringkasan finansial ke tabel nota
        nota_baru.total_item = total_item_dibeli
        nota_baru.grand_total = grand_total_transaksi
        nota_baru.total_laba = total_laba_transaksi
        
        db.commit()
        
        return {
            "message": "Transaksi berhasil", 
            "id_nota": nota_baru.id,
            "kasir": data.kasir,
            "grand_total": grand_total_transaksi,
            "total_laba": total_laba_transaksi
        }
        
    except Exception as e:
        db.rollback() # Batalkan semua pemotongan stok jika ada 1 saja yang error
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()