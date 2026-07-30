window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let listMasterObat = [];

async function muatMasterObat() {
    const tabel = document.querySelector('#tabelMaster tbody');
    if (!tabel) {
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/obat`);
        listMasterObat = await response.json();
        renderTabelMaster(listMasterObat);
    } catch (error) {
        console.error("Gagal memuat master obat:", error);
        tabel.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 20px;">Gagal terhubung ke server backend.</td></tr>';
    }
}

function renderTabelMaster(data) {
    const tbody = document.querySelector('#tabelMaster tbody');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada data di master obat.</td></tr>';
        return;
    }

    data.forEach(obat => {
        let tampilanGambar = `<div class="img-thumb"><i class="fa-solid fa-prescription-bottle-medical" style="color: #94a3b8;"></i></div>`;
        if (obat.gambar && obat.gambar.trim() !== "" && obat.gambar !== "null") {
            tampilanGambar = `<img src="${obat.gambar}" class="img-thumb" alt="${obat.nama}">`;
        }

        let stokBadge = `<span style="font-weight: bold; color: ${obat.total_stok > 0 ? '#27ae60' : '#e74c3c'};">${obat.total_stok || 0}</span>`;

        const batchesJSON = encodeURIComponent(JSON.stringify(obat.batches || []));

        tbody.innerHTML += `
            <tr>
                <td>${tampilanGambar}</td>
                <td><strong>${obat.nama}</strong></td>
                <td>${obat.kategori}</td>
                <td>Rp ${(obat.harga_jual || 0).toLocaleString('id-ID')}</td>
                <td style="text-align: center;">${stokBadge}</td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 5px;">
                        <button type="button" onclick="bukaModalBatch('${obat.nama.replace(/'/g, "\\'")}', '${batchesJSON}')" style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" title="Pantau Batch & Expired"><i class="fa-solid fa-eye"></i></button>
                        <button type="button" onclick="editMaster(${obat.id}, '${obat.nama.replace(/'/g, "\\'")}', '${obat.kategori}', ${obat.harga_jual})" style="background: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" onclick="hapusMasterObat(${obat.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Fungsi untuk membuka modal rincian batch obat tertentu
function bukaModalBatch(namaObat, batchesJSON) {
    document.getElementById('judulDetailBatch').innerHTML = `<i class="fa-solid fa-layer-group" style="color: #3498db;"></i> Rincian Batch: ${namaObat}`;
    
    const batches = JSON.parse(decodeURIComponent(batchesJSON));
    const tbody = document.querySelector('#tabelRincianBatch tbody');
    tbody.innerHTML = '';

    if (batches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #7f8c8d;">Belum ada stok batch yang masuk untuk obat ini.</td></tr>';
    } else {
        batches.forEach(b => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${b.nomor_batch || '-'}</strong></td>
                    <td><span style="color: #27ae60; font-weight: bold;">${b.jumlah_stok} Unit</span></td>
                    <td>Rp ${(b.harga_beli || 0).toLocaleString('id-ID')}</td>
                    <td><span style="background: #fdf2f2; color: #c0392b; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 13px;"><i class="fa-regular fa-calendar-days"></i> ${b.tanggal_kedaluwarsa}</span></td>
                </tr>
            `;
        });
    }
    document.getElementById('modalBatch').style.display = 'flex';
}

function tutupModalBatch() {
    document.getElementById('modalBatch').style.display = 'none';
}

function hapusMasterObat(id) {
    document.getElementById('idObatDihapus').value = id;
    document.getElementById('modalHapus').style.display = 'flex';
}

function tampilkanAlert(judul, pesan) {
    document.getElementById('alertTitle').innerText = judul;
    document.getElementById('alertMessage').innerText = pesan;
    document.getElementById('modalAlert').style.display = 'flex';
}

function tutupModalAlert() {
    document.getElementById('modalAlert').style.display = 'none';
}

async function eksekusiHapus() {
    const id = document.getElementById('idObatDihapus').value;
    if (!id) return;
    tutupModalHapus();

    try {
        const response = await fetch(`${window.API_URL}/obat/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (response.ok) {
            muatMasterObat();
        } else {
            tampilkanAlert("Gagal Menghapus", result.detail || 'Obat masih terikat dengan data batch atau transaksi.');
        }
    } catch (error) {
        tampilkanAlert("Kesalahan Koneksi", "Gagal terhubung ke server backend!");
    }
}

function tutupModalHapus() {
    document.getElementById('modalHapus').style.display = 'none';
}

function filterMaster() {
    const keyword = document.getElementById('inputCari').value.toLowerCase();
    const filtered = listMasterObat.filter(o => o.nama.toLowerCase().includes(keyword) || o.kategori.toLowerCase().includes(keyword));
    renderTabelMaster(filtered);
}

function bukaModalTambah() {
    document.getElementById('modalTitle').innerText = "Tambah Obat Baru";
    document.getElementById('obatId').value = "";
    document.getElementById('namaObat').value = "";
    document.getElementById('kategoriObat').value = "Umum";
    document.getElementById('hargaJual').value = "0";
    document.getElementById('fileGambar').value = "";
    document.getElementById('modalMaster').style.display = 'flex';
}

function editMaster(id, nama, kategori, harga) {
    document.getElementById('modalTitle').innerText = "Edit Master Obat";
    document.getElementById('obatId').value = id;
    document.getElementById('namaObat').value = nama;
    document.getElementById('kategoriObat').value = kategori;
    document.getElementById('hargaJual').value = harga;
    document.getElementById('fileGambar').value = "";
    document.getElementById('modalMaster').style.display = 'flex';
}

function tutupModal() {
    document.getElementById('modalMaster').style.display = 'none';
}

async function simpanMasterObat(event) {
    event.preventDefault();
    const id = document.getElementById('obatId').value;
    const nama = document.getElementById('namaObat').value;
    const kategori = document.getElementById('kategoriObat').value;
    const harga_jual = parseInt(document.getElementById('hargaJual').value) || 0;
    const fileInput = document.getElementById('fileGambar');

    let urlGambarFinal = "";
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        const uploadRes = await fetch(`${window.API_URL}/upload-gambar`, { method: 'POST', body: formData });
        const uploadResJson = await uploadRes.json();
        if (uploadRes.ok) {
            urlGambarFinal = uploadResJson.url_gambar;
        }
    }

    const payload = {
        nama: nama,
        kategori: kategori,
        harga_jual: harga_jual,
        ...(urlGambarFinal && { gambar: urlGambarFinal })
    };

    let endpoint = `${window.API_URL}/obat`;
    let method = 'POST';

    if (id) {
        endpoint = `${window.API_URL}/obat/${id}`;
        method = 'PUT';
    }

    const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        tutupModal();
        muatMasterObat();
    } else {
        const errJson = await response.json().catch(() => ({}));
        tampilkanAlert("Gagal Menyimpan", errJson.detail || "Gagal menyimpan master obat.");
    }
}