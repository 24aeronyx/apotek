window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let listSupplier = [];

// Fungsi helper modal kustom
function tampilkanAlertSupplier(judul, pesan, tipe = "success") {
    const titleEl = document.getElementById('alertSupplierTitle');
    const msgEl = document.getElementById('alertSupplierMessage');
    const iconEl = document.getElementById('alertSupplierIcon');
    const modalEl = document.getElementById('modalAlertSupplier');

    if (titleEl) titleEl.innerText = judul;
    if (msgEl) msgEl.innerText = pesan;

    if (iconEl) {
        if (tipe === "success") {
            iconEl.style.color = "#2ecc71";
            iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else if (tipe === "error") {
            iconEl.style.color = "#e74c3c";
            iconEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        } else {
            iconEl.style.color = "#3498db";
            iconEl.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        }
    }

    if (modalEl) modalEl.style.display = 'flex';
}

window.tutupModalAlertSupplier = function() {
    const modalEl = document.getElementById('modalAlertSupplier');
    if (modalEl) modalEl.style.display = 'none';
};

window.muatSupplier = async function() {
    const tabel = document.querySelector('#tabelSupplier tbody');
    if (!tabel) return;

    try {
        const response = await fetch(`${window.API_URL}/suppliers`);
        listSupplier = await response.json();
        renderTabelSupplier(listSupplier);
    } catch (error) {
        console.error("Gagal memuat supplier:", error);
        tabel.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red; padding: 20px;">Gagal terhubung ke server backend.</td></tr>';
    }
};

function renderTabelSupplier(data) {
    const tbody = document.querySelector('#tabelSupplier tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Belum ada data supplier tercatat.</td></tr>';
        return;
    }

    data.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.nama_supplier}</strong></td>
                <td>${s.kontak || '-'}</td>
                <td>${s.telepon || '-'}</td>
                <td>${s.alamat || '-'}</td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 5px;">
                        <button type="button" onclick="editSupplier(${s.id}, '${s.nama_supplier.replace(/'/g, "\\'")}', '${(s.kontak || '').replace(/'/g, "\\'")}', '${(s.telepon || '').replace(/'/g, "\\'")}', '${(s.alamat || '').replace(/'/g, "\\'")}')" style="background: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" onclick="konfirmasiHapusSupplier(${s.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

window.filterSupplier = function() {
    const keyword = document.getElementById('inputCariSupplier').value.toLowerCase();
    const filtered = listSupplier.filter(s => s.nama_supplier.toLowerCase().includes(keyword) || (s.kontak && s.kontak.toLowerCase().includes(keyword)));
    renderTabelSupplier(filtered);
};

window.bukaModalTambahSupplier = function() {
    document.getElementById('modalSupplierTitle').innerText = "Tambah Supplier Baru";
    document.getElementById('supplierId').value = "";
    document.getElementById('namaSupplier').value = "";
    document.getElementById('kontakSupplier').value = "";
    document.getElementById('teleponSupplier').value = "";
    document.getElementById('alamatSupplier').value = "";
    document.getElementById('modalSupplier').style.display = 'flex';
};

window.editSupplier = function(id, nama, kontak, telepon, alamat) {
    document.getElementById('modalSupplierTitle').innerText = "Edit Data Supplier";
    document.getElementById('supplierId').value = id;
    document.getElementById('namaSupplier').value = nama;
    document.getElementById('kontakSupplier').value = kontak;
    document.getElementById('teleponSupplier').value = telepon;
    document.getElementById('alamatSupplier').value = alamat;
    document.getElementById('modalSupplier').style.display = 'flex';
};

window.tutupModalSupplier = function() {
    document.getElementById('modalSupplier').style.display = 'none';
};

window.simpanSupplier = async function(event) {
    event.preventDefault();
    const id = document.getElementById('supplierId').value;
    const payload = {
        nama_supplier: document.getElementById('namaSupplier').value,
        kontak: document.getElementById('kontakSupplier').value,
        telepon: document.getElementById('teleponSupplier').value,
        alamat: document.getElementById('alamatSupplier').value
    };

    let endpoint = `${window.API_URL}/suppliers`;
    let method = 'POST';

    if (id) {
        endpoint = `${window.API_URL}/suppliers/${id}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            tutupModalSupplier();
            muatSupplier();
            tampilkanAlertSupplier("Berhasil", id ? "Data supplier berhasil diperbarui!" : "Supplier baru berhasil ditambahkan!", "success");
        } else {
            const err = await response.json();
            let pesanError = err.detail || "Terjadi kesalahan pada server.";
            
            // Ubah pesan error mentah database SQL menjadi bahasa yang rapi
            if (pesanError.toLowerCase().includes("duplicate") || pesanError.toLowerCase().includes("already exists")) {
                pesanError = "Nama supplier atau PBF tersebut sudah terdaftar di sistem. Gunakan nama yang berbeda.";
            }

            tampilkanAlertSupplier("Gagal Menyimpan", pesanError, "error");
        }
    } catch (e) {
        tampilkanAlertSupplier("Kesalahan Koneksi", "Gagal terhubung ke server backend.", "error");
    }
};

window.konfirmasiHapusSupplier = function(id) {
    document.getElementById('supplierIdDihapus').value = id;
    document.getElementById('modalHapusSupplier').style.display = 'flex';
};

window.tutupModalHapusSupplier = function() {
    document.getElementById('modalHapusSupplier').style.display = 'none';
};

window.eksekusiHapusSupplier = async function() {
    const id = document.getElementById('supplierIdDihapus').value;
    if (!id) return;
    tutupModalHapusSupplier();

    try {
        const response = await fetch(`${window.API_URL}/suppliers/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            muatSupplier();
            tampilkanAlertSupplier("Berhasil", "Data supplier berhasil dihapus.", "success");
        } else {
            tampilkanAlertSupplier("Gagal Menghapus", result.detail || "Supplier masih terikat dengan data pembelian/faktur aktif.", "error");
        }
    } catch (e) {
        tampilkanAlertSupplier("Kesalahan Koneksi", "Gagal terhubung ke server backend.", "error");
    }
};

muatSupplier();