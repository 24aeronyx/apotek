window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";

function tampilkanAlert(judul, pesan, tipe = "sukses") {
    document.getElementById('alertTitle').innerText = judul;
    document.getElementById('alertMessage').innerText = pesan;
    
    const iconDiv = document.getElementById('alertIcon');
    if (tipe === "sukses") {
        iconDiv.style.color = "#2ecc71";
        iconDiv.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        iconDiv.style.color = "#e67e22";
        iconDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    }

    document.getElementById('modalAlert').style.display = 'flex';
}

function tutupModalAlert() {
    document.getElementById('modalAlert').style.display = 'none';
}

// 1. Muat daftar obat ke dropdown saat halaman dibuka
async function muatDropdownObat() {
    const select = document.getElementById('selectObat');
    if (!select) {
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/obat`);
        const data = await response.json();
        
        select.innerHTML = '<option value="">-- Pilih Obat --</option>';
        data.forEach(obat => {
            select.innerHTML += `<option value="${obat.id}">${obat.nama} (Kategori: ${obat.kategori})</option>`;
        });
    } catch (error) {
        console.error("Gagal memuat master obat:", error);
        tampilkanAlert("Kesalahan Koneksi", "Gagal terhubung ke server untuk memuat master obat.", "error");
    }
}

// 2. Kirim data pembelian stok baru ke backend
async function simpanPembelian(event) {
    event.preventDefault();

    const payload = {
        medicine_id: parseInt(document.getElementById('selectObat').value),
        nomor_batch: document.getElementById('nomorBatch').value,
        jumlah_stok: parseInt(document.getElementById('jumlahStok').value),
        harga_beli: parseInt(document.getElementById('hargaBeli').value),
        tanggal_kedaluwarsa: document.getElementById('tglExpired').value
    };

    try {
        const response = await fetch(`${window.API_URL}/pembelian`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            tampilkanAlert("Berhasil", "Stok berhasil ditambahkan ke batch baru!", "sukses");
            document.getElementById('formPembelian').reset();
        } else {
            tampilkanAlert("Gagal Menyimpan", result.detail || 'Terjadi kesalahan pada sistem.', "error");
        }
    } catch (error) {
        tampilkanAlert("Kesalahan Koneksi", "Gagal terhubung ke server backend!", "error");
    }
}