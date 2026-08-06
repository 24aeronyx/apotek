from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import InventoryBatch, Medicine, Purchase, PurchaseItem, KartuStok
from backend.schemas import PembelianRequest  # Pastikan skema Pydantic sudah menyesuaikan field baru

router = APIRouter(tags=["Pembelian"])

# Dependency helper session database jika diperlukan
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/pembelian", status_code=status.HTTP_201_CREATED)
def tambah_pembelian_stok(data: PembelianRequest):
    db = SessionLocal()
    try:
        subtotal_keseluruhan = 0
        
        # 1. Buat header nota pembelian (faktur masuk) dengan atribut lengkap baru
        purchase_baru = Purchase(
            supplier_id=data.supplier_id,
            nomor_faktur=data.nomor_faktur,
            tanggal_faktur=data.tanggal_faktur,            # Tanggal fisik faktur
            tanggal_jatuh_tempo=data.tanggal_jatuh_tempo,   # Tanggal jatuh tempo
            tanggal_pembelian=datetime.now(),               # Waktu input sistem
            diskon_nominal=data.diskon_nominal or 0,        # Diskon faktur (Rp)
            termasuk_ppn=data.termasuk_ppn or False,        # Flag PPN 11%
            user_pembuat=data.user_pembuat
        )
        db.add(purchase_baru)
        db.flush() # Mendapatkan ID purchase

        for item in data.items:
            # Pastikan obat terdaftar di master
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if not medicine:
                raise HTTPException(status_code=404, detail=f"Obat dengan ID {item.medicine_id} tidak ditemukan di master data")

            subtotal_item = item.jumlah * item.harga_beli_satuan
            subtotal_keseluruhan += subtotal_item

            # 2. Simpan ke rincian item pembelian
            p_item = PurchaseItem(
                purchase_id=purchase_baru.id,
                medicine_id=item.medicine_id,
                nomor_batch=item.nomor_batch,
                jumlah=item.jumlah,
                harga_beli_satuan=item.harga_beli_satuan,
                tanggal_kedaluwarsa=item.tanggal_kedaluwarsa,
                subtotal=subtotal_item
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

        # 5. Hitung Grand Total (Subtotal - Diskon. Jika termasuk_ppn True, harga tetap karena sudah include. Jika False, ditambah PPN 11%)
        setelah_diskon = max(0, subtotal_keseluruhan - (data.diskon_nominal or 0))
        if data.termasuk_ppn:
            grand_total = setelah_diskon
        else:
            grand_total = setelah_diskon * 1.11

        purchase_baru.total_pembayaran = round(grand_total)
        db.commit()
        
        return {
            "message": "Pembelian berhasil disimpan dan stok batch otomatis bertambah!", 
            "purchase_id": purchase_baru.id,
            "total_pembayaran": purchase_baru.total_pembayaran
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@router.get("/pembelian")
def get_daftar_pembelian(db: Session = Depends(get_db)):
    purchases = db.query(Purchase).all()
    result = []
    for p in purchases:
        nama_sup = p.supplier.nama_supplier if p.supplier else "Supplier Tidak Diketahui"
        result.append({
            "id": p.id,
            "nomor_faktur": p.nomor_faktur,
            "nama_supplier": nama_sup,
            "tanggal_faktur": str(p.tanggal_faktur) if p.tanggal_faktur else "-",
            "tanggal_jatuh_tempo": str(p.tanggal_jatuh_tempo) if p.tanggal_jatuh_tempo else "-",
            "total_pembayaran": p.total_pembayaran or 0
        })
    return result

@router.get("/pembelian/{pembelian_id}")
def get_detail_pembelian(pembelian_id: int, db: Session = Depends(get_db)):
    purchase = db.query(Purchase).filter(Purchase.id == pembelian_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Faktur pembelian tidak ditemukan")
    
    items_result = []
    for item in purchase.items:
        nama_obat = item.medicine.nama if item.medicine else "Obat Tidak Dikenal"
        items_result.append({
            "id": item.id,
            "nama_obat": nama_obat,
            "nomor_batch": item.nomor_batch,
            "jumlah": item.jumlah,
            "harga_beli_satuan": item.harga_beli_satuan,
            "tanggal_kedaluwarsa": str(item.tanggal_kedaluwarsa) if item.tanggal_kedaluwarsa else "-",
            "subtotal": item.subtotal
        })

    return {
        "id": purchase.id,
        "nomor_faktur": purchase.nomor_faktur,
        "nama_supplier": purchase.supplier.nama_supplier if purchase.supplier else "-",
        "tanggal_faktur": str(purchase.tanggal_faktur) if purchase.tanggal_faktur else "-",
        "tanggal_jatuh_tempo": str(purchase.tanggal_jatuh_tempo) if purchase.tanggal_jatuh_tempo else "-",
        "tanggal_pembelian": str(purchase.tanggal_pembelian) if purchase.tanggal_pembelian else "-",
        "diskon_nominal": purchase.diskon_nominal or 0,
        "termasuk_ppn": purchase.termasuk_ppn or False,
        "total_pembayaran": purchase.total_pembayaran or 0,
        "items": items_result
    }