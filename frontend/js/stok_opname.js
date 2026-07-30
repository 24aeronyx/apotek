window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";

// 1. Fetch data langsung dari endpoint /obat
async function loadBatches() {
    const tbody = document.getElementById("batchTableBody");
    if (!tbody) {
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/obat`); 
        const medicines = await response.json();
        
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
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px; text-align: center;">Belum ada data batch obat.</td></tr>`;
        return;
    }

    batches.forEach(b => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #dee2e6";
        tr.innerHTML = `
            <td style="padding: 12px;"><span style="background: #6c757d; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${b.nomor_batch || '-'}</span></td>
            <td style="padding: 12px; font-weight: bold;">${b.medicine ? b.medicine.nama : 'Obat ID: ' + b.medicine_id}</td>
            <td style="padding: 12px;">Rp ${b.harga_beli.toLocaleString('id-ID')}</td>
            <td style="padding: 12px;">${b.tanggal_kedaluwarsa || '-'}</td>
            <td style="padding: 12px;"><span style="background: #17a2b8; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${b.jumlah_stok}</span></td>
            <td style="padding: 12px; text-align: center;">
                <button type="button" style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;" onclick="openOpnameModal(${b.id}, '${b.medicine ? b.medicine.nama : 'Obat'} (Batch ${b.nomor_batch})', ${b.jumlah_stok})">
                    <i class="fa-solid fa-pen-to-square me-1"></i> Opname / Adjust
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Buka Modal Form Opname (Murni CSS Display Flex)
function openOpnameModal(batchId, namaObat, stokLama) {
    document.getElementById("opnameBatchId").value = batchId;
    document.getElementById("opnameNamaObat").value = namaObat;
    document.getElementById("opnameStokLama").value = stokLama;
    document.getElementById("opnameStokBaru").value = stokLama; 
    document.getElementById("opnameCatatan").value = "";
    
    document.getElementById("modalOpname").style.display = "flex";
}

// Tutup Modal
function tutupOpnameModal() {
    document.getElementById("modalOpname").style.display = "none";
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
        const response = await fetch(`${window.API_URL}/stok/opname`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Stok Berhasil Disesuaikan!\nSelisih: ${result.selisih}`);
            tutupOpnameModal();
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