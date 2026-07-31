window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let keranjangRetur = [];
let masterObatListRetur = [];

window.muatMasterObatRetur = async function() {
    try {
        const resObat = await fetch(`${window.API_URL}/obat`);
        masterObatListRetur = await resObat.json();
    } catch (e) {
        console.error("Gagal memuat master obat untuk retur:", e);
    }
};

// Fungsi filter pencarian obat secara instan
window.filterDropdownObatRetur = function() {
    const keyword = document.getElementById('inputCariObatRetur').value.toLowerCase();
    const dropdown = document.getElementById('dropdownHasilObatRetur');
    
    if (!keyword.trim()) {
        dropdown.style.display = 'none';
        return;
    }

    const filtered = masterObatListRetur.filter(m => m.nama.toLowerCase().includes(keyword) || m.kategori.toLowerCase().includes(keyword));
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #7f8c8d; font-size: 13px;">Obat tidak ditemukan</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = '';
    filtered.forEach(m => {
        dropdown.innerHTML += `
            <div onclick="pilihObatRetur(${m.id}, '${m.nama.replace(/'/g, "\\'")}')" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 14px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <strong>${m.nama}</strong> <span style="font-size: 12px; color: #7f8c8d;">(${m.kategori})</span>
            </div>
        `;
    });
    dropdown.style.display = 'block';
};

// Saat obat diklik dari hasil pencarian
window.pilihObatRetur = async function(id, nama) {
    document.getElementById('selectedMedicineIdRetur').value = id;
    document.getElementById('inputCariObatRetur').value = nama;
    document.getElementById('dropdownHasilObatRetur').style.display = 'none';

    // Otomatis tarik data batch aktif untuk obat tersebut
    await muatBatchObatTerpilih(id);
};

// Mengambil list batch aktif berdasarkan ID obat
async function muatBatchObatTerpilih(obatId) {
    const selectBatch = document.getElementById('selectBatchRetur');
    if (!selectBatch) return;

    try {
        const res = await fetch(`${window.API_URL}/obat/${obatId}/batches`);
        const batches = await res.json();
        
        selectBatch.innerHTML = '';
        if (batches.length === 0) {
            selectBatch.innerHTML = `<option value="">Tidak ada batch aktif</option>`;
        } else {
            batches.forEach(b => {
                selectBatch.innerHTML += `<option value="${b.nomor_batch}">Batch: #${b.nomor_batch} (Sisa: ${b.jumlah_stok}, ED: ${b.tanggal_kedaluwarsa})</option>`;
            });
        }
    } catch (e) {
        console.error("Gagal memuat batch:", e);
    }
}

window.toggleBatchDropdown = function() {
    const kondisi = document.getElementById('kondisiObat').value;
    const containerBatch = document.getElementById('containerBatchRetur');
    if (kondisi === "rusak") {
        containerBatch.style.display = "none";
    } else {
        containerBatch.style.display = "block";
    }
};

window.tambahItemKeranjangRetur = function() {
    const obatIdVal = document.getElementById('selectedMedicineIdRetur').value;
    const obatId = parseInt(obatIdVal);
    const obatObj = masterObatListRetur.find(m => m.id === obatId);
    const jumlah = parseInt(document.getElementById('jumlahRetur').value);
    const kondisi = document.getElementById('kondisiObat').value;
    const selectBatchEl = document.getElementById('selectBatchRetur');
    const nomorBatch = (kondisi === "layak" && selectBatchEl) ? selectBatchEl.value : null;

    if (!obatObj || !obatIdVal || jumlah <= 0) {
        alert("Silakan ketik dan pilih obat dari hasil pencarian, serta masukkan jumlah retur dengan benar!");
        return;
    }

    if (kondisi === "layak" && !nomorBatch) {
        alert("Pilih nomor batch asal yang valid untuk mengembalikan stok!");
        return;
    }

    keranjangRetur.push({
        medicine_id: obatId,
        nama_obat: obatObj.nama,
        jumlah: jumlah,
        kondisi: kondisi,
        nomor_batch: nomorBatch
    });

    renderDrafRetur();

    // Reset input form kecil setelah ditambah
    document.getElementById('selectedMedicineIdRetur').value = '';
    document.getElementById('inputCariObatRetur').value = '';
    document.getElementById('jumlahRetur').value = '1';
    document.getElementById('selectBatchRetur').innerHTML = '';
};

function renderDrafRetur() {
    const tbody = document.querySelector('#tabelDrafRetur tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (keranjangRetur.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Belum ada item retur ditambahkan.</td></tr>';
        return;
    }

    keranjangRetur.forEach((item, index) => {
        let badgeKondisi = item.kondisi === "layak" 
            ? '<span style="background: #e1f5fe; color: #0288d1; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Layak Jual (Masuk Stok)</span>'
            : '<span style="background: #ffebee; color: #c62828; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">Rusak / Buang</span>';

        tbody.innerHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>${item.nama_obat}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.jumlah} Unit</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${badgeKondisi}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.nomor_batch ? '#' + item.nomor_batch : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1; text-align: center;">
                    <button onclick="hapusItemRetur(${index})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.hapusItemRetur = function(index) {
    keranjangRetur.splice(index, 1);
    renderDrafRetur();
};

window.prosesSimpanRetur = async function() {
    if (keranjangRetur.length === 0) {
        alert("Draf item retur masih kosong!");
        return;
    }

    const fakturAsal = document.getElementById('fakturAsal').value;
    const alasanRetur = document.getElementById('alasanRetur').value;

    if (!fakturAsal || !alasanRetur) {
        alert("Nomor Faktur Penjualan Asal dan Alasan Retur wajib diisi!");
        return;
    }

    const userLogin = localStorage.getItem('user_apotek') || "Admin";

    const payload = {
        nomor_faktur_penjualan: fakturAsal,
        alasan: alasanRetur,
        user_penerima: userLogin,
        items: keranjangRetur
    };

    try {
        const res = await fetch(`${window.API_URL}/retur-penjualan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            alert("Retur penjualan berhasil diproses! Stok batch yang dipilih telah diperbarui.");
            keranjangRetur = [];
            renderDrafRetur();
            document.getElementById('fakturAsal').value = '';
            document.getElementById('alasanRetur').value = '';
        } else {
            alert("Gagal memproses retur: " + (result.detail || "Terjadi kesalahan"));
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan koneksi ke server.");
    }
};

window.muatMasterObatRetur();