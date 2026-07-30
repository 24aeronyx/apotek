const API_URL = "http://127.0.0.1:8000"; // Sesuaikan URL backend Anda
let modalOpname;

document.addEventListener("DOMContentLoaded", () => {
    modalOpname = new bootstrap.Modal(document.getElementById("modalOpname"));
    loadBatches();

    // Listener Submit Form Opname
    document.getElementById("formOpname").addEventListener("submit", handleOpnameSubmit);
});

// 1. Fetch data Batch Obat dari Backend
// 1. Fetch data langsung dari endpoint /obat yang sudah Anda miliki
async function loadBatches() {
    try {
        const response = await fetch(`${API_URL}/obat`); 
        const medicines = await response.json();
        
        // Karena endpoint /obat mengembalikan list obat yang di dalamnya ada array "batches",
        // kita perlu meratakan (flatten) data tersebut agar tabel menampilkan per batch.
        let allBatches = [];
        medicines.forEach(m => {
            if (m.batches && m.batches.length > 0) {
                m.batches.forEach(b => {
                    allBatches.push({
                        id: b.id,
                        medicine_id: m.id,
                        nomor_batch: b.nomor_batch,
                        jumlah_stok: b.jumlah_stok,
                        harga_beli: b.harga_beli,
                        tanggal_kedaluwarsa: b.tanggal_kedaluwarsa,
                        medicine: { nama: m.nama }
                    });
                });
            }
        });

        renderTable(allBatches);
    } catch (error) {
        console.error("Gagal mengambil data batch obat:", error);
    }
}

// 2. Tampilkan Data ke Tabel
function renderTable(batches) {
    const tbody = document.getElementById("batchTableBody");
    tbody.innerHTML = "";

    if (!batches || batches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Belum ada data batch obat.</td></tr>`;
        return;
    }

    batches.forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="badge bg-secondary">${b.nomor_batch || '-'}</span></td>
            <td class="fw-bold">${b.medicine ? b.medicine.nama : 'Obat ID: ' + b.medicine_id}</td>
            <td>Rp ${b.harga_beli.toLocaleString('id-ID')}</td>
            <td><span class="badge bg-outline text-dark border">${b.tanggal_kedaluwarsa || '-'}</span></td>
            <td><span class="badge bg-info text-dark fs-6">${b.jumlah_stok}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-success fw-bold" onclick="openOpnameModal(${b.id}, '${b.medicine ? b.medicine.nama : 'Obat'} (Batch ${b.nomor_batch})', ${b.jumlah_stok})">
                    <i class="fa-solid fa-pen-to-square me-1"></i> Opname / Adjust
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Buka Modal Form Opname
function openOpnameModal(batchId, namaObat, stokLama) {
    document.getElementById("opnameBatchId").value = batchId;
    document.getElementById("opnameNamaObat").value = namaObat;
    document.getElementById("opnameStokLama").value = stokLama;
    document.getElementById("opnameStokBaru").value = stokLama; // Default disamakan
    document.getElementById("opnameCatatan").value = "";
    
    modalOpname.show();
}

// 4. Kirim Data Penyesuaian ke Backend FastAPI
async function handleOpnameSubmit(e) {
    e.preventDefault();

    const batchId = parseInt(document.getElementById("opnameBatchId").value);
    const stokBaru = parseInt(document.getElementById("opnameStokBaru").value);
    const alasan = document.getElementById("opnameKeterangan").value;
    const catatan = document.getElementById("opnameCatatan").value;

    const keteranganLengkap = catatan ? `${alasan} - Note: ${catatan}` : alasan;

    const payload = {
        batch_id: batchId,
        stok_fisik_baru: stokBaru,
        keterangan: keteranganLengkap
    };

    try {
        const response = await fetch(`${API_URL}/stok/opname`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Stok Berhasil Disesuaikan!\nSelisih: ${result.selisih}`);
            modalOpname.hide();
            loadBatches(); // Refresh tabel
        } else {
            const err = await response.json();
            alert(`Gagal: ${err.detail}`);
        }
    } catch (error) {
        console.error("Error opname:", error);
        alert("Terjadi kesalahan koneksi server!");
    }
}