from pydantic import BaseModel
from datetime import date
from typing import List, Optional

class StokObatBaru(BaseModel):
    nama_obat: str
    kategori: str = "Umum"
    jumlah: int
    tanggal_kedaluwarsa: date  # Otomatis tervalidasi ke format YYYY-MM-DD
    gambar: Optional[str] = ""
    
class ItemKeranjang(BaseModel):
    id_obat: int
    jumlah: int

class TransaksiKasir(BaseModel):
    kasir: str
    keranjang: List[ItemKeranjang]
    
class ItemObatMasuk(BaseModel):
    nama_obat: str
    kategori: str = "Umum"
    harga_jual: int = 0
    jumlah: int
    tanggal_kedaluwarsa: date
    gambar: Optional[str] = ""
    
class BulkStokObat(BaseModel):
    items: List[ItemObatMasuk]
    
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