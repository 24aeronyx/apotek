window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let masterObatKartuList = [];

// Memuat data master obat saat halaman dibuka
window.muatMasterObatKartu = async function() {
    try {
        const resObat = await fetch(`${window.API_URL}/obat`);
        masterObatKartuList = await resObat.json();
    } catch (e) {
        console.error("Gagal memuat master obat untuk kartu stok:", e);
    }
};

window.filterDropdownObatKartu = function() {
    const keyword = document.getElementById('inputCariObatKartu').value.toLowerCase();
    const dropdown = document.getElementById('dropdownHasilObatKartu');
    
    if (!keyword.trim()) {
        dropdown.style.display = 'none';
        return;
    }

    const filtered = masterObatKartuList.filter(m => m.nama.toLowerCase().includes(keyword) || m.kategori.toLowerCase().includes(keyword));
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px; color: #7f8c8d; font-size: 13px;">Obat tidak ditemukan</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = '';
    filtered.forEach(m => {
        dropdown.innerHTML += `
            <div onclick="pilihObatKartu(${m.id}, '${m.nama.replace(/'/g, "\\'")}')" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 14px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <strong>${m.nama}</strong> <span style="font-size: 12px; color: #7f8c8d;">(${m.kategori})</span>
            </div>
        `;
    });
    dropdown.style.display = 'block';
};

window.pilihObatKartu = function(id, nama) {
    document.getElementById('selectedObatKartuId').value = id;
    document.getElementById('inputCariObatKartu').value = nama;
    document.getElementById('dropdownHasilObatKartu').style.display = 'none';
    
    // Panggil fungsi muat data kartu stok setelah obat dipilih
    window.muatDataKartuStok();
};

window.muatDataKartuStok = async function() {
    const obatId = document.getElementById('selectedObatKartuId').value;
    const tanggal = document.getElementById('filterTanggal').value;
    const tbody = document.querySelector('#tabelKartuStok tbody');

    if (!obatId) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #7f8c8d;">Silakan pilih obat terlebih dahulu dari hasil pencarian.</td></tr>';
        return;
    }

    try {
        let url = `${window.API_URL}/stok/kartu-stok/${obatId}`;
        if (tanggal) {
            url += `?tanggal=${tanggal}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        tbody.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #7f8c8d;">Tidak ada riwayat mutasi stok untuk filter ini.</td></tr>';
            return;
        }

        data.forEach(row => {
            let badgeWarna = '#3498db';
            if (row.jenis_transaksi.includes('PEMBELIAN')) badgeWarna = '#27ae60';
            else if (row.jenis_transaksi.includes('PENJUALAN')) badgeWarna = '#e67e22';
            else if (row.jenis_transaksi.includes('OPNAME')) badgeWarna = '#8e44ad';

            tbody.innerHTML += `
                <tr>
                    <td>${row.tanggal}</td>
                    <td><strong>${row.nama_obat}</strong></td>
                    <td><span style="background: ${badgeWarna}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${row.jenis_transaksi}</span></td>
                    <td style="text-align: center; color: #27ae60; font-weight: bold;">${row.masuk > 0 ? '+' + row.masuk : '-'}</td>
                    <td style="text-align: center; color: #c0392b; font-weight: bold;">${row.keluar > 0 ? '-' + row.keluar : '-'}</td>
                    <td style="text-align: center; font-weight: bold; background: #e8f8f5; color: #16a085;">${row.stok_sisa}</td>
                    <td style="color: #555;">${row.keterangan || '-'}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red; padding: 25px;">Gagal memuat data kartu stok.</td></tr>';
    }
};

// Panggil fungsi inisialisasi master obat saat script dimuat
muatMasterObatKartu();