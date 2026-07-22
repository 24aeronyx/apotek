from fastapi import APIRouter, Depends, HTTPException, status
from backend.database import SessionLocal
from backend.models import User
from backend.schemas import LoginRequest, RegisterRequest

router = APIRouter(tags=["User"])

# Simulasi mendapatkan user yang sedang login (biasanya dari token JWT)
def get_current_user():
    db = SessionLocal()
    user = db.query(User).filter(User.id == 1).first()
    db.close()
    
    # Tambahkan pengecekan ini:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID 1 tidak ditemukan. Silakan jalankan init-admin terlebih dahulu."
        )
    return user

# Fungsi utama untuk mengecek "centang" akses
def require_permission(required_perm: str):
    def permission_checker(current_user: User = Depends(get_current_user)):
        # Jika permission tidak ada atau bernilai false, tolak akses
        if not current_user.permissions.get(required_perm, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak: Anda tidak memiliki izin untuk '{required_perm}'"
            )
        return current_user
    return permission_checker

@router.post("/login")
def login_user(data: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == data.username).first()
        if not user or user.password_hash != data.password:
            raise HTTPException(status_code=400, detail="Username atau password salah.")
            
        return {
            "message": "Login berhasil",
            "username": user.username,
            "permissions": user.permissions
        }
    finally:
        db.close()
        
@router.post("/register-user")
def buat_user_baru(data: RegisterRequest):
    db = SessionLocal()
    try:
        # Cek apakah username sudah dipakai
        user_ada = db.query(User).filter(User.username == data.username).first()
        if user_ada:
            raise HTTPException(status_code=400, detail="Username sudah digunakan, pilih nama lain.")

        # Buat user baru dengan data dari request
        user_baru = User(
            username=data.username,
            password_hash=data.password, # Catatan: Untuk produksi, pastikan menggunakan hashing seperti bcrypt
            permissions=data.permissions
        )
        db.add(user_baru)
        db.commit()
        db.close()
        
        return {"message": f"Sukses! User '{data.username}' berhasil dibuat."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
