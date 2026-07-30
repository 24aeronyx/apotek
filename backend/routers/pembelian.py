from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from backend.database import SessionLocal
from backend.models import InventoryBatch, Medicine, Purchase, PurchaseItem, KartuStok
from backend.schemas import PembelianRequest  # <-- Gunakan PembelianRequest di sini

router = APIRouter(tags=["Pembelian"])

@router.post("/pembelian", status_code=status.HTTP_201_CREATED)
def tambah_pembelian_stok(data: PembelianRequest):  # <-- Ubah dari PembelianCreate ke PembelianRequest
    db = SessionLocal()
    try:
        total_semua = 0
        
        # 1. Buat header nota pembelian (faktur masuk)
        purchase_baru = Purchase(
            supplier_id=data.supplier_id,
            nomor_faktur=data.nomor_faktur,
            tanggal_pembelian=datetime.now(),
            user_pembuat=data.user_pembuat
        )
        db.add(purchase_baru)
        db.flush() # Mendapatkan ID purchase

        for item in data.items:
            # Pastikan obat terdaftar di master
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if not medicine:
                raise HTTPException(status_code=404, detail=f"Obat dengan ID {item.medicine_id} tidak ditemukan di master data")

            subtotal = item.jumlah * item.harga_beli_satuan
            total_semua += subtotal

            # 2. Simpan ke rincian item pembelian
            p_item = PurchaseItem(
                purchase_id=purchase_baru.id,
                medicine_id=item.medicine_id,
                nomor_batch=item.nomor_batch,
                jumlah=item.jumlah,
                harga_beli_satuan=item.harga_beli_satuan,
                tanggal_kedaluwarsa=item.tanggal_kedaluwarsa,
                subtotal=subtotal
            )
            db.add(p_item)

            # 3. Otomatis Tambah / Update ke InventoryBatch (FEFO & Stok Gudang)
            batch_existing = db.query(InventoryBatch).filter(
                InventoryBatch.medicine_id == item.medicine_id,
                InventoryBatch.nomor_batch == item.nomor_batch
            ).first()

            if batch_existing:
                batch_existing.jumlah_stok += item.jumlah
                batch_existing.harga_beli = item.harga_beli_satuan
                stok_terkini = batch_existing.jumlah_stok
            else:
                new_batch = InventoryBatch(
                    medicine_id=item.medicine_id,
                    nomor_batch=item.nomor_batch,
                    jumlah_stok=item.jumlah,
                    harga_beli=item.harga_beli_satuan,
                    tanggal_kedaluwarsa=item.tanggal_kedaluwarsa
                )
                db.add(new_batch)
                stok_terkini = item.jumlah

            # 4. Catat riwayat ke Kartu Stok
            kartu = KartuStok(
                obat_id=item.medicine_id,
                tanggal=datetime.utcnow(),
                jenis_transaksi="PEMBELIAN/FAKTUR",
                jumlah=item.jumlah,
                stok_sisa=stok_terkini,
                keterangan=f"Faktur Masuk #{data.nomor_faktur} (Batch: {item.nomor_batch})"
            )
            db.add(kartu)

        purchase_baru.total_pembayaran = total_semua
        db.commit()
        
        return {
            "message": "Pembelian berhasil disimpan dan stok batch otomatis bertambah!", 
            "purchase_id": purchase_baru.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()