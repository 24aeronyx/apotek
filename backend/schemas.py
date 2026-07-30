from pydantic import BaseModel
from datetime import date
from typing import List, Optional
    
class ItemKeranjang(BaseModel):
    id_obat: int
    jumlah: int

class TransaksiKasir(BaseModel):
    kasir: str
    keranjang: List[ItemKeranjang]
    
class LoginRequest(BaseModel):
    username: str
    password: str
    
class RegisterRequest(BaseModel):
    username: str
    password: str
    permissions: dict = {"akses_kasir": True, "akses_stok": False, "akses_laporan": False}
    
class MedicineCreate(BaseModel):
    nama: str
    kategori: str
    harga_jual: float
    gambar: Optional[str] = None

class MedicineUpdate(BaseModel):
    nama: Optional[str] = None
    kategori: Optional[str] = None
    harga_jual: Optional[float] = None
    gambar: Optional[str] = None
    
class PembelianCreate(BaseModel):
    medicine_id: int
    nomor_batch: str
    jumlah_stok: int
    harga_beli: float
    tanggal_kedaluwarsa: date
    
class ItemBeliSchema(BaseModel):
    medicine_id: int
    nomor_batch: str
    jumlah: int
    harga_beli_satuan: int
    tanggal_kedaluwarsa: str  # Format: "YYYY-MM-DD"

class PembelianRequest(BaseModel):
    supplier_id: int
    nomor_faktur: str
    user_pembuat: str
    items: List[ItemBeliSchema]

class SupplierCreate(BaseModel):
    nama_supplier: str
    kontak: str = None
    telepon: str = None
    alamat: str = None