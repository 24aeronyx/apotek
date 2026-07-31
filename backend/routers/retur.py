from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from pydantic import BaseModel
from typing import List
from backend.database import SessionLocal
from backend.models import ReturPenjualan, ItemReturPenjualan, InventoryBatch, KartuStok
from backend.schemas import ReturPenjualanCreate

router = APIRouter(tags=["Retur"])

@router.post("/retur-penjualan", status_code=status.HTTP_201_CREATED)
def buat_retur_penjualan(data: ReturPenjualanCreate):
    db = SessionLocal()
    try:
        # 1. Buat header retur
        retur_baru = ReturPenjualan(
            nomor_faktur_penjualan=data.nomor_faktur_penjualan,
            tanggal_retur=datetime.now(),
            alasan=data.alasan,
            user_penerima=data.user_penerima
        )
        db.add(retur_baru)
        db.flush()

        for item in data.items:
            # 2. Simpan rincian item retur
            r_item = ItemReturPenjualan(
                retur_id=retur_baru.id,
                medicine_id=item.medicine_id,
                jumlah=item.jumlah,
                kondisi=item.kondisi
            )
            db.add(r_item)

            # 3. Jika kondisi obat masih layak jual, kembalikan stok ke batch/inventaris
            if item.kondisi.lower() == "layak" and item.nomor_batch:
                batch = db.query(InventoryBatch).filter(
                    InventoryBatch.medicine_id == item.medicine_id,
                    InventoryBatch.nomor_batch == item.nomor_batch
                ).first()

                if batch:
                    batch.jumlah_stok += item.jumlah
                    stok_sisa_terkini = batch.jumlah_stok
                else:
                    # Buat batch baru penampung retur jika batch aslinya tidak ditemukan
                    new_batch = InventoryBatch(
                        medicine_id=item.medicine_id,
                        nomor_batch=f"RETUR-{data.nomor_faktur_penjualan}",
                        jumlah_stok=item.jumlah,
                        harga_beli=0,
                        tanggal_kedaluwarsa=datetime.now().date()
                    )
                    db.add(new_batch)
                    stok_sisa_terkini = item.jumlah

                # 4. Catat ke kartu stok
                kartu = KartuStok(
                    obat_id=item.medicine_id,
                    tanggal=datetime.utcnow(),
                    jenis_transaksi="RETUR PENJUALAN",
                    jumlah=item.jumlah,
                    stok_sisa=stok_sisa_terkini,
                    keterangan=f"Retur dari Faktur {data.nomor_faktur_penjualan} ({data.alasan})"
                )
                db.add(kartu)

        db.commit()
        return {"message": "Retur penjualan berhasil diproses dan stok dikembalikan ke sistem.", "retur_id": retur_baru.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()
        
@router.get("/obat/{medicine_id}/batches")
def get_batches_by_obat(medicine_id: int):
    db = SessionLocal()
    try:
        from backend.models import InventoryBatch
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.medicine_id == medicine_id,
            InventoryBatch.jumlah_stok > 0
        ).all()
        return [{"nomor_batch": b.nomor_batch, "jumlah_stok": b.jumlah_stok, "tanggal_kedaluwarsa": str(b.tanggal_kedaluwarsa)} for b in batches]
    finally:
        db.close()