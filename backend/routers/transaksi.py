from fastapi import APIRouter, Depends, HTTPException, FastAPI
from sqlalchemy import func
from backend.database import SessionLocal
# Tambahkan KartuStok di import model Anda
from backend.models import User, Sale, InventoryBatch, SaleItem, Medicine, KartuStok
from backend.schemas import TransaksiKasir
from datetime import datetime

router = APIRouter(tags=["Transaksi"])

@router.post("/transaksi")
def proses_transaksi(data: TransaksiKasir):
    db = SessionLocal()
    
    try:
        # 1. Buat nota transaksi baru
        nota_baru = Sale(kasir=data.kasir, total_item=0, grand_total=0, total_laba=0)
        db.add(nota_baru)
        db.flush() 
        
        total_item_dibeli = 0
        grand_total_transaksi = 0
        total_laba_transaksi = 0

        # 2. Proses setiap obat di keranjang belanja
        for item in data.keranjang:
            jumlah_dibutuhkan = item.jumlah
            
            obat = db.query(Medicine).filter(Medicine.id == item.id_obat).first()
            if not obat:
                raise HTTPException(status_code=404, detail=f"Data obat dengan ID {item.id_obat} tidak ditemukan.")
            
            harga_jual_satuan = obat.harga_jual or 0

            # Cari stok berdasarkan FEFO (Kedaluwarsa terdekat)
            batches = db.query(InventoryBatch).filter(
                InventoryBatch.medicine_id == item.id_obat,
                InventoryBatch.jumlah_stok > 0
            ).order_by(InventoryBatch.tanggal_kedaluwarsa.asc()).all()

            total_stok_tersedia = sum(b.jumlah_stok for b in batches)
            if total_stok_tersedia < jumlah_dibutuhkan:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stok tidak cukup untuk obat {obat.nama}. Tersedia: {total_stok_tersedia}"
                )

            # 3. Logika pemotongan FEFO
            jumlah_sisa_dibutuhkan = jumlah_dibutuhkan
            subtotal_jual_item = 0
            subtotal_modal_item = 0

            for batch in batches:
                if jumlah_sisa_dibutuhkan == 0:
                    break 
                
                harga_beli_satuan = batch.harga_beli or 0

                if batch.jumlah_stok >= jumlah_sisa_dibutuhkan:
                    qty_diambil = jumlah_sisa_dibutuhkan
                    batch.jumlah_stok -= qty_diambil
                    
                    subtotal_jual_item += qty_diambil * harga_jual_satuan
                    subtotal_modal_item += qty_diambil * harga_beli_satuan
                    
                    jumlah_sisa_dibutuhkan = 0
                else:
                    qty_diambil = batch.jumlah_stok
                    jumlah_sisa_dibutuhkan -= qty_diambil
                    batch.jumlah_stok = 0
                    
                    subtotal_jual_item += qty_diambil * harga_jual_satuan
                    subtotal_modal_item += qty_diambil * harga_beli_satuan
                
                # ==========================================
                # TAMBAHAN UTAMA: Catat mutasi KELUAR ke Kartu Stok
                # ==========================================
                # Hitung sisa stok global obat ini setelah dipotong
                stok_global_sisa = db.query(func.sum(InventoryBatch.jumlah_stok)).filter(
                    InventoryBatch.medicine_id == item.id_obat
                ).scalar() or 0

                catatan_kartu = KartuStok(
                    obat_id=item.id_obat,
                    tanggal=datetime.now(),
                    jenis_transaksi="PENJUALAN",
                    jumlah=-qty_diambil, # Negatif menandakan barang keluar
                    stok_sisa=stok_global_sisa,
                    keterangan=f"Penjualan Nota #{nota_baru.id} (Batch: {batch.id})"
                )
                db.add(catatan_kartu)

            # Hitung laba untuk item ini
            laba_item = subtotal_jual_item - subtotal_modal_item

            grand_total_transaksi += subtotal_jual_item
            total_laba_transaksi += laba_item

            # Catat ke rincian nota (SaleItem)
            rincian = SaleItem(
                sale_id=nota_baru.id,
                medicine_id=item.id_obat,
                jumlah=item.jumlah,
                harga_jual=harga_jual_satuan,
                harga_beli=(subtotal_modal_item / item.jumlah) if item.jumlah > 0 else 0,
                subtotal=subtotal_jual_item
            )
            db.add(rincian)
            total_item_dibeli += item.jumlah

        # 4. Selesaikan transaksi
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
        db.rollback() 
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()