window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let keranjangBeli = [];
let masterObatList = [];

// Fungsi helper penampil modal kustom
function tampilkanAlertPembelian(judul, pesan, tipe = "success") {
    const titleEl = document.getElementById('alertTitlePembelian');
    const msgEl = document.getElementById('alertMessagePembelian');
    const iconEl = document.getElementById('alertIconContainer');
    const modalEl = document.getElementById('modalAlertPembelian');

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

window.tutupModalAlertPembelian = function() {
    const modalEl = document.getElementById('modalAlertPembelian');
    if (modalEl) modalEl.style.display = 'none';
};

window.muatDropdownObat = async function() {
    try {
        const resSup = await fetch(`${window.API_URL}/suppliers`);
        const suppliers = await resSup.json();
        const selectSup = document.getElementById('selectSupplier');
        if (selectSup) {
            selectSup.innerHTML = '';
            suppliers.forEach(s => {
                selectSup.innerHTML += `<option value="${s.id}">${s.nama_supplier}</option>`;
            });
        }

        const resObat = await fetch(`${window.API_URL}/obat`);
        masterObatList = await resObat.json();
    } catch (e) {
        console.error("Gagal memuat data pembelian:", e);
    }
};

window.filterDropdownObat = function() {
    const keyword = document.getElementById('inputCariObatBeli').value.toLowerCase();
    const dropdown = document.getElementById('dropdownHasilObat');
    
    if (!keyword.trim()) {
        dropdown.style.display = 'none';
        return;
    }

    const filtered = masterObatList.filter(m => m.nama.toLowerCase().includes(keyword) || m.kategori.toLowerCase().includes(keyword));
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #7f8c8d; font-size: 13px;">Obat tidak ditemukan</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = '';
    filtered.forEach(m => {
        dropdown.innerHTML += `
            <div onclick="pilihObatFaktur(${m.id}, '${m.nama.replace(/'/g, "\\'")}')" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 14px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <strong>${m.nama}</strong> <span style="font-size: 12px; color: #7f8c8d;">(${m.kategori})</span>
            </div>
        `;
    });
    dropdown.style.display = 'block';
};

window.pilihObatFaktur = function(id, nama) {
    document.getElementById('selectedMedicineId').value = id;
    document.getElementById('inputCariObatBeli').value = nama;
    document.getElementById('dropdownHasilObat').style.display = 'none';
};

window.tambahItemKeranjangBeli = function() {
    const obatIdVal = document.getElementById('selectedMedicineId').value;
    const obatId = parseInt(obatIdVal);
    const obatObj = masterObatList.find(m => m.id === obatId);
    const nomorBatch = document.getElementById('inputBatch').value;
    const jumlah = parseInt(document.getElementById('inputJumlah').value);
    const hargaBeli = parseInt(document.getElementById('inputHargaBeli').value);
    const tanggalEd = document.getElementById('inputEd').value;

    if (!obatObj || !obatIdVal || !nomorBatch || !tanggalEd || jumlah <= 0 || hargaBeli <= 0) {
        tampilkanAlertPembelian("Peringatan", "Mohon pilih obat dari daftar pencarian, serta lengkapi Nomor Batch, Jumlah, Harga Beli, dan Tgl ED dengan benar!", "error");
        return;
    }

    keranjangBeli.push({
        medicine_id: obatId,
        nama_obat: obatObj.nama,
        nomor_batch: nomorBatch,
        jumlah: jumlah,
        harga_beli_satuan: hargaBeli,
        tanggal_kedaluwarsa: tanggalEd,
        subtotal: jumlah * hargaBeli
    });

    renderDrafPembelian();
    
    // Reset kolom input obat setelah ditambah
    document.getElementById('selectedMedicineId').value = '';
    document.getElementById('inputCariObatBeli').value = '';
    document.getElementById('inputBatch').value = '';
    document.getElementById('inputJumlah').value = '1';
    document.getElementById('inputHargaBeli').value = '0';
    document.getElementById('inputEd').value = '';
};

function renderDrafPembelian() {
    const tbody = document.querySelector('#tabelDrafPembelian tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (keranjangBeli.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Belum ada item ditambahkan.</td></tr>';
        return;
    }

    keranjangBeli.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.nama_obat}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.nomor_batch}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.jumlah}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">Rp ${item.harga_beli_satuan.toLocaleString('id-ID')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.tanggal_kedaluwarsa}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ecf0f1; text-align: center;"><button onclick="hapusItemBeli(${index})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });
}

window.hapusItemBeli = function(index) {
    keranjangBeli.splice(index, 1);
    renderDrafPembelian();
};

window.prosesSimpanPembelian = async function() {
    if (keranjangBeli.length === 0) {
        tampilkanAlertPembelian("Peringatan", "Keranjang pembelian masih kosong!", "error");
        return;
    }

    const supplierEl = document.getElementById('selectSupplier');
    if (!supplierEl || !supplierEl.value) {
        tampilkanAlertPembelian("Peringatan", "Silakan pilih supplier terlebih dahulu!", "error");
        return;
    }

    const supplierId = parseInt(supplierEl.value);
    const nomorFaktur = document.getElementById('nomorFaktur').value;

    if (!nomorFaktur) {
        tampilkanAlertPembelian("Peringatan", "Nomor faktur wajib diisi!", "error");
        return;
    }

    const userLogin = localStorage.getItem('user_apotek') || "Admin";

    const payload = {
        supplier_id: supplierId,
        nomor_faktur: nomorFaktur,
        user_pembuat: userLogin,
        items: keranjangBeli
    };

    try {
        const res = await fetch(`${window.API_URL}/pembelian`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            tampilkanAlertPembelian("Berhasil", "Faktur pembelian berhasil disimpan dan stok batch otomatis bertambah!", "success");
            keranjangBeli = [];
            renderDrafPembelian();
            document.getElementById('nomorFaktur').value = '';
        } else {
            tampilkanAlertPembelian("Gagal Menyimpan", result.detail || "Terjadi kesalahan pada server.", "error");
        }
    } catch (e) {
        console.error(e);
        tampilkanAlertPembelian("Kesalahan Koneksi", "Gagal terhubung ke server backend.", "error");
    }
};

window.muatDropdownObat();