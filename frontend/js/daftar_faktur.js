window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";
let listFakturGlobal = [];

async function muatDaftarFaktur() {
    try {
        const res = await fetch(`${window.API_URL}/pembelian`); // Endpoint backend list pembelian
        listFakturGlobal = await res.json();
        renderTabelFaktur(listFakturGlobal);
    } catch (e) {
        console.error("Gagal memuat daftar faktur:", e);
        document.querySelector('#tabelDaftarFaktur tbody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 20px;">Gagal terhubung ke server.</td></tr>';
    }
}

function renderTabelFaktur(data) {
    const tbody = document.querySelector('#tabelDaftarFaktur tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada faktur pembelian tercatat.</td></tr>';
        return;
    }

    data.forEach(faktur => {
        tbody.innerHTML += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;"><strong>${faktur.nomor_faktur}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${faktur.nama_supplier || 'Supplier #' + faktur.supplier_id}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${faktur.tanggal_faktur || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; color: #c0392b; font-weight: bold;">${faktur.tanggal_jatuh_tempo || '-'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; font-weight: bold; color: #27ae60;">Rp ${(faktur.total_pembayaran || 0).toLocaleString('id-ID')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center;">
                    <button onclick="detailFaktur(${faktur.id})" style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"><i class="fa-solid fa-eye"></i> Detail</button>
                </td>
            </tr>
        `;
    });
}

function filterDaftarFaktur() {
    const keyword = document.getElementById('cariFaktur').value.toLowerCase();
    const filtered = listFakturGlobal.filter(f => 
        f.nomor_faktur.toLowerCase().includes(keyword) || 
        (f.nama_supplier && f.nama_supplier.toLowerCase().includes(keyword))
    );
    renderTabelFaktur(filtered);
}

// Fungsi membuka modal detail rincian item faktur gaya nota profesional
window.detailFaktur = async function(id) {
    try {
        const res = await fetch(`${window.API_URL}/pembelian/${id}`);
        const data = await res.json();
        
        if (!res.ok) {
            alert("Gagal memuat rincian faktur.");
            return;
        }

        // Isi data ke elemen modal nota
        document.getElementById('modalNoFakturText').innerText = data.nomor_faktur || '-';
        document.getElementById('modalNamaSupplier').innerText = `Supplier: ${data.nama_supplier || '-'}`;
        document.getElementById('modalTglFakturText').innerText = data.tanggal_faktur || '-';
        document.getElementById('modalTglJatuhTempoText').innerText = data.tanggal_jatuh_tempo || '-';
        document.getElementById('modalTglInputText').innerText = data.tanggal_pembelian || '-';
        
        const tbody = document.querySelector('#tabelItemFakturDetail tbody');
        tbody.innerHTML = '';

        let subtotalKeseluruhan = 0;

        if (!data.items || data.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 15px;">Tidak ada item dalam faktur ini.</td></tr>';
        } else {
            data.items.forEach((item, index) => {
                subtotalKeseluruhan += item.subtotal;
                tbody.innerHTML += `
                    <tr>
                        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd;"><strong>${item.nama_obat}</strong></td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd;">${item.nomor_batch || '-'}</td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${item.tanggal_kedaluwarsa || '-'}</td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${item.jumlah}</td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: right;">Rp ${item.harga_beli_satuan.toLocaleString('id-ID')}</td>
                        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
        }

        let diskonFaktur = data.diskon_nominal || 0;
        let setelahDiskon = Math.max(0, subtotalKeseluruhan - diskonFaktur);
        
        // Logika PPN: Jika termasuk_ppn True, PPN = 0 (karena sudah di dalam harga). 
        // Jika False, PPN = 11% dari setelahDiskon.
        let nilaiPpn = data.termasuk_ppn ? 0 : setelahDiskon * 0.11;
        let grandTotal = data.total_pembayaran || (setelahDiskon + nilaiPpn);

        document.getElementById('summaryTotalHarga').innerText = `Rp ${subtotalKeseluruhan.toLocaleString('id-ID')}`;
        document.getElementById('summaryDiskon').innerText = `Rp ${diskonFaktur.toLocaleString('id-ID')}`;
        document.getElementById('summaryPpn').innerText = `Rp ${Math.round(nilaiPpn).toLocaleString('id-ID')}`;
        document.getElementById('summaryNilaiAkhir').innerText = `Rp ${Math.round(grandTotal).toLocaleString('id-ID')}`;

        document.getElementById('modalDetailFaktur').style.display = 'flex';
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan saat mengambil data detail.");
    }
};

window.tutupModalDetailFaktur = function() {
    document.getElementById('modalDetailFaktur').style.display = 'none';
};

muatDaftarFaktur();