from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from backend.database import SessionLocal
from backend.models import User, Sale, SaleItem, Medicine
from backend.routers.user import require_permission

router = APIRouter(tags=["Laporan"])

@router.get("/laporan/harian")
def lihat_laporan(user: User = Depends(require_permission("akses_laporan"))):
    db = SessionLocal()
    try:
        # Ambil semua data transaksi penjualan, urutkan dari yang terbaru
        sales = db.query(Sale).order_by(Sale.waktu_transaksi.desc()).all()
        
        hasil = []
        for s in sales:
            # Hitung total jenis/jumlah item dalam nota tersebut
            total_item = db.query(func.sum(SaleItem.jumlah)).filter(SaleItem.sale_id == s.id).scalar() or 0
            
            hasil.append({
                "id_nota": s.id,
                "kasir": s.kasir,
                "waktu": s.waktu_transaksi.strftime("%Y-%m-%d %H:%M:%S"),
                "total_item": int(total_item)
            })
            
        return hasil
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
@router.get("/laporan/detail/{sale_id}")
def detail_transaksi(sale_id: int, user: User = Depends(require_permission("akses_laporan"))):
    db = SessionLocal()
    try:
        # Cari data penjualan utama
        sale = db.query(Sale).filter(Sale.id == sale_id).first()
        if not sale:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")
            
        # Ambil daftar item obat yang dibeli beserta namanya
        items = db.query(SaleItem, Medicine).join(Medicine, SaleItem.medicine_id == Medicine.id).filter(SaleItem.sale_id == sale_id).all()
        
        detail_keranjang = []
        grand_total = 0
        
        for sale_item, medicine in items:
            subtotal = medicine.harga_jual * sale_item.jumlah
            grand_total += subtotal
            detail_keranjang.append({
                "nama": medicine.nama,
                "harga": medicine.harga_jual,
                "jumlah": sale_item.jumlah
            })
            
        return {
            "id_nota": sale.id,
            "kasir": sale.kasir,
            "waktu": sale.waktu_transaksi.strftime("%Y-%m-%d %H:%M:%S"),
            "keranjang": detail_keranjang,
            "grand_total": grand_total
        }
    finally:
        db.close()