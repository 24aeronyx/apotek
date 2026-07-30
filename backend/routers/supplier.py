from fastapi import APIRouter, HTTPException
from backend.database import SessionLocal
from backend.models import Supplier
from backend.schemas import SupplierCreate

router = APIRouter(tags=["Supplier"])

@router.get("/suppliers")
def get_suppliers():
    db = SessionLocal()
    try:
        return db.query(Supplier).all()
    finally:
        db.close()

@router.post("/suppliers")
def create_supplier(data: SupplierCreate):
    db = SessionLocal()
    try:
        sup = Supplier(**data.dict())
        db.add(sup)
        db.commit()
        return {"message": "Supplier berhasil ditambahkan"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()
        
@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int):
    db = SessionLocal()
    try:
        sup = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not sup:
            raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
        
        db.delete(sup)
        db.commit()
        return {"message": "Supplier berhasil dihapus"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Supplier tidak dapat dihapus karena masih terikat dengan riwayat transaksi pembelian.")
    finally:
        db.close()