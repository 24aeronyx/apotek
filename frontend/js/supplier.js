window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let listSupplier = [];

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
                    </div>
                </td>
            </tr>
        `;
    });
}

function filterSupplier() {
    const keyword = document.getElementById('inputCariSupplier').value.toLowerCase();
    const filtered = listSupplier.filter(s => s.nama_supplier.toLowerCase().includes(keyword) || (s.kontak && s.kontak.toLowerCase().includes(keyword)));
    renderTabelSupplier(filtered);
}

function bukaModalTambahSupplier() {
    document.getElementById('modalSupplierTitle').innerText = "Tambah Supplier Baru";
    document.getElementById('supplierId').value = "";
    document.getElementById('namaSupplier').value = "";
    document.getElementById('kontakSupplier').value = "";
    document.getElementById('teleponSupplier').value = "";
    document.getElementById('alamatSupplier').value = "";
    document.getElementById('modalSupplier').style.display = 'flex';
}

function editSupplier(id, nama, kontak, telepon, alamat) {
    document.getElementById('modalSupplierTitle').innerText = "Edit Data Supplier";
    document.getElementById('supplierId').value = id;
    document.getElementById('namaSupplier').value = nama;
    document.getElementById('kontakSupplier').value = kontak;
    document.getElementById('teleponSupplier').value = telepon;
    document.getElementById('alamatSupplier').value = alamat;
    document.getElementById('modalSupplier').style.display = 'flex';
}

function tutupModalSupplier() {
    document.getElementById('modalSupplier').style.display = 'none';
}

async function simpanSupplier(event) {
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
        } else {
            const err = await response.json();
            alert("Gagal menyimpan: " + (err.detail || "Terjadi kesalahan"));
        }
    } catch (e) {
        alert("Gagal terhubung ke server.");
    }
}

muatSupplier();