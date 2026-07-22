from fastapi import Depends, HTTPException, status
from backend.database import SessionLocal
from backend.models import User

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
