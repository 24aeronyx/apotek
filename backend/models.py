# models.py
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, TypeDecorator
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Kelas kustom untuk "mengakali" MySQL versi lama
class JSONEncodedDict(TypeDecorator):
    impl = Text

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return '{}'

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return {}

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    
    # Gunakan kelas kustom yang baru saja dibuat
    permissions = Column(JSONEncodedDict, default=lambda: {})
    
class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(100), unique=True, index=True)
    kategori = Column(String(50), default="Umum")
    harga_jual = Column(Integer, default=0)
    gambar = Column(String(255), nullable=True) 
    
    batches = relationship("InventoryBatch", back_populates="medicine")

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    nomor_batch = Column(String(100), nullable=True)  
    jumlah_stok = Column(Integer, default=0)
    harga_beli = Column(Integer, default=0)     
    tanggal_kedaluwarsa = Column(Date)              

    medicine = relationship("Medicine", back_populates="batches")
    
class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    kasir = Column(String(50))
    total_item = Column(Integer)
    waktu_transaksi = Column(DateTime, default=datetime.now)

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    jumlah = Column(Integer)

class KartuStok(Base):
    __tablename__ = "kartu_stok"

    id = Column(Integer, primary_key=True, index=True)
    obat_id = Column(Integer, ForeignKey("medicines.id"))  # Diubah dari "obat.id" ke "medicines.id"
    tanggal = Column(DateTime, default=datetime.utcnow)
    jenis_transaksi = Column(String(256))  # Contoh: "PENJUALAN", "PEMBELIAN", "OPNAME", "PEMUSNAHAN"
    jumlah = Column(Integer)          # Nilai positif (masuk) atau negatif (keluar)
    stok_sisa = Column(Integer)       # Sisa stok setelah transaksi
    keterangan = Column(String(256), nullable=True)

    # Anda juga bisa menambahkan relasi SQLAlchemy agar gampang dipanggil
    medicine = relationship("Medicine")
