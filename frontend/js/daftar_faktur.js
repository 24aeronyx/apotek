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

window.detailFaktur = function(id) {
    // Bisa diarahkan ke modal detail atau halaman detail item obat dalam faktur tersebut
    alert("Fitur detail item untuk faktur ID: " + id);
};

muatDaftarFaktur();