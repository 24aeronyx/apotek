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

        const result = await response.json();

        if (response.ok) {
            tutupOpnameModal();
            // Tampilkan modal alert sukses yang elegan
            tampilkanAlertCustom(
                "Berhasil!", 
                `Stok opname berhasil disimpan.<br>Selisih perubahan: <strong style="color: ${result.selisih >= 0 ? '#27ae60' : '#e74c3c'}">${result.selisih > 0 ? '+' + result.selisih : result.selisih} Unit</strong>`, 
                "success"
            );
            loadBatches(); // Refresh tabel
        } else {
            tampilkanAlertCustom("Gagal", result.detail || "Terjadi kesalahan pada sistem.", "error");
        }
    } catch (error) {
        console.error("Error opname:", error);
        tampilkanAlertCustom("Kesalahan Koneksi", "Gagal terhubung ke server backend!", "error");
    }
}

// Fungsi pendukung untuk memunculkan modal alert kustom
function tampilkanAlertCustom(judul, pesan, tipe = "success") {
    let alertModal = document.getElementById("modalAlertCustom");
    if (!alertModal) {
        // Buat elemen modal secara otomatis jika belum ada di HTML
        const div = document.createElement("div");
        div.id = "modalAlertCustom";
        div.style.cssText = "display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;";
        div.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
                <div id="alertCustomIcon" style="font-size: 45px; margin-bottom: 10px;"></div>
                <h3 id="alertCustomTitle" style="margin-top: 0; color: #2c3e50;"></h3>
                <p id="alertCustomMessage" style="color: #555; font-size: 14px; margin-bottom: 20px;"></p>
                <button type="button" onclick="document.getElementById('modalAlertCustom').style.display='none'" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;">OK</button>
            </div>
        `;
        document.body.appendChild(div);
        alertModal = div;
    }

    const iconEl = document.getElementById("alertCustomIcon");
    const titleEl = document.getElementById("alertCustomTitle");
    const msgEl = document.getElementById("alertCustomMessage");

    titleEl.innerText = judul;
    msgEl.innerHTML = pesan;

    if (tipe === "success") {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #2ecc71;"></i>';
    } else {
        iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #e74c3c;"></i>';
    }

    alertModal.style.display = "flex";
}