const API_URL = "http://127.0.0.1:8000"; // Sesuaikan URL backend Anda
let chartInstance = null;

// Eksekusi kode saat HTML selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
    const sekarang = new Date();
    document.getElementById('filterBulan').value = sekarang.getMonth() + 1;
    document.getElementById('filterTahun').value = sekarang.getFullYear();
    muatDashboard();
});

function tampilkanAlert(judul, pesan) {
    document.getElementById('alertTitle').innerText = judul;
    document.getElementById('alertMessage').innerText = pesan;
    document.getElementById('modalAlert').style.display = 'flex';
}

function tutupModalAlert() {
    document.getElementById('modalAlert').style.display = 'none';
}

async function muatDashboard() {
    try {
        const response = await fetch(`${API_URL}/laporan/harian`);
        const data = await response.json();

        const tbody = document.querySelector('#tabelLaporan tbody');
        tbody.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada data transaksi tercatat.</td></tr>';
            return;
        }

        const bulanAktif = parseInt(document.getElementById('filterBulan').value);
        const tahunAktif = parseInt(document.getElementById('filterTahun').value);

        const namaBulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        const dataBulanIni = data.filter(item => {
            if (!item.waktu) return false;
            const parts = item.waktu.split(' ')[0].split('-');
            if (parts.length === 3) {
                const tahunData = parseInt(parts[0]);
                const bulanData = parseInt(parts[1]);
                return tahunData === tahunAktif && bulanData === bulanAktif;
            }
            return false;
        });

        if (dataBulanIni.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada transaksi pada periode ${namaBulanList[bulanAktif - 1]} ${tahunAktif}.</td></tr>`;
            document.getElementById('statTotalTransaksi').innerText = 0;
            document.getElementById('statTotalItem').innerText = 0;
            document.getElementById('statTotalOmzet').innerText = 'Rp 0';
            document.getElementById('statTotalLaba').innerText = 'Rp 0';
            renderGrafikOmzet([], []);
            return;
        }

        let totalTransaksi = dataBulanIni.length;
        let totalItemTerjual = 0;
        let totalOmzet = 0;
        let totalLabaBersih = 0;
        let groupedDataPerHari = {};

        dataBulanIni.forEach(item => {
            totalItemTerjual += item.total_item;
            totalOmzet += item.grand_total || 0;
            let labaTransaksi = item.estimasi_laba || 0; 
            totalLabaBersih += labaTransaksi;

            let tanggalSaja = item.waktu.split(' ')[0];
            if (!groupedDataPerHari[tanggalSaja]) {
                groupedDataPerHari[tanggalSaja] = 0;
            }
            groupedDataPerHari[tanggalSaja] += (item.grand_total || 0);

            tbody.innerHTML += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;"><strong>#${item.id_nota}</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${item.kasir}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${item.waktu}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${item.total_item} Item</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right;">Rp ${(item.grand_total || 0).toLocaleString('id-ID')}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; color: #27ae60; font-weight: bold;">Rp ${labaTransaksi.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });

        document.getElementById('statTotalTransaksi').innerText = totalTransaksi;
        document.getElementById('statTotalItem').innerText = totalItemTerjual;
        document.getElementById('statTotalOmzet').innerText = 'Rp ' + totalOmzet.toLocaleString('id-ID');
        document.getElementById('statTotalLaba').innerText = 'Rp ' + totalLabaBersih.toLocaleString('id-ID');

        let sortedDates = Object.keys(groupedDataPerHari).sort((a, b) => new Date(a) - new Date(b));
        renderGrafikOmzet(sortedDates, sortedDates.map(date => groupedDataPerHari[date]));

    } catch (error) {
        console.error("Gagal memuat dashboard:", error);
        document.querySelector('#tabelLaporan tbody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 20px;">Gagal terhubung ke server backend.</td></tr>';
    }
}

function renderGrafikOmzet(labels, dataOmzet) {
    const ctx = document.getElementById('chartOmzet').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendapatan Harian (Rp)',
                data: dataOmzet,
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderColor: '#2ecc71',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function exportKeExcel() {
    let tableHTML = document.getElementById('tabelLaporan').outerHTML;
    let blob = new Blob(['\ufeff' + tableHTML], { type: 'application/vnd.ms-excel' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'Laporan_Keuangan_Apotek.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportKePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- 1. KOP SURAT / BRANDING PROFESIONAL ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(41, 128, 185);
    doc.text("APOTEK SEHAT MANDIRI", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(127, 140, 141);
    doc.text("Jl. Kesehatan Raya No. 88, Telp: (021) 555-8989", 14, 24);
    doc.text("Email: support@apoteksehatmandiri.com | Website: www.apoteksehatmandiri.com", 14, 29);

    // Garis Pembatas Kop Surat
    doc.setLineWidth(0.8);
    doc.setDrawColor(41, 128, 185);
    doc.line(14, 33, 196, 33);

    // --- 2. JUDUL LAPORAN & PERIODE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text("LAPORAN RINGKASAN KEUANGAN & PENJUALAN", 14, 42);

    const bulanPilih = document.getElementById('filterBulan').options[document.getElementById('filterBulan').selectedIndex].text;
    const tahunPilih = document.getElementById('filterTahun').value;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text(`Periode Laporan : ${bulanPilih} ${tahunPilih}`, 14, 48);
    doc.text(`Waktu Cetak       : ${new Date().toLocaleString('id-ID')}`, 14, 54);

    // --- 3. AMBIL DATA DARI TABEL HTML ---
    const headers = [["ID Nota", "Kasir", "Waktu Transaksi", "Jumlah Item", "Grand Total", "Perkiraan Laba"]];
    const data = [];

    const rows = document.querySelectorAll("#tabelLaporan tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 6) {
            data.push([
                cols[0].innerText.trim(),
                cols[1].innerText.trim(),
                cols[2].innerText.trim(),
                cols[3].innerText.trim(),
                cols[4].innerText.trim(),
                cols[5].innerText.trim()
            ]);
        }
    });

    if (data.length === 0 || data[0][0] === "Belum ada transaksi") {
        tampilkanAlert("Informasi Ekspor", "Tidak ada data riwayat penjualan pada periode ini untuk diexport ke PDF.");
        return;
    }

    // --- 4. TABEL UTAMA DENGAN AUTOTABLE ---
    doc.autoTable({
        head: headers,
        body: data,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5, textColor: [44, 62, 80] },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' },
            5: { halign: 'right', fontStyle: 'bold', textColor: [39, 174, 96] }
        }
    });

    // --- 5. TANDA TANGAN / OTORISASI DI BAGIAN BAWAH ---
    let finalY = doc.lastAutoTable.finalY + 15;
    
    if (finalY > 240) {
        doc.addPage();
        finalY = 20;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    doc.text("Mengetahui,", pageWidth - 50, finalY, { align: "center" });
    doc.text("Penanggung Jawab / Apoteker", pageWidth - 50, finalY + 5, { align: "center" });
    
    doc.line(pageWidth - 75, finalY + 28, pageWidth - 25, finalY + 28);
    
    doc.text("( .......................................... )", pageWidth - 50, finalY + 33, { align: "center" });

    // --- 6. PREVIEW PDF DI TAB BARU ---
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
}