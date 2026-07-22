from pydantic import BaseModel
from datetime import date
from typing import List

class StokObatBaru(BaseModel):
    nama_obat: str
    kategori: str = "Umum"
    jumlah: int
    tanggal_kedaluwarsa: date  # Otomatis tervalidasi ke format YYYY-MM-DD
    
class ItemKeranjang(BaseModel):
    id_obat: int
    jumlah: int

class TransaksiKasir(BaseModel):
    keranjang: List[ItemKeranjang]
    
class ItemObatMasuk(BaseModel):
    nama_obat: str
    kategori: str = "Umum"
    harga_jual: int = 0
    jumlah: int
    tanggal_kedaluwarsa: date
    
class BulkStokObat(BaseModel):
    items: List[ItemObatMasuk]