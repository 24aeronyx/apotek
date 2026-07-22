// struk.js

function cetakNotaStruk(idNota, daftarItem, totalBayar) {
    // 1. Masukkan data ke elemen struk tersembunyi
    document.getElementById('strukId').innerText = "#" + idNota;
    document.getElementById('strukWaktu').innerText = new Date().toLocaleString('id-ID');
    
    let strukHtml = '';
    daftarItem.forEach(item => {
        let sub = item.harga * item.jumlah;
        strukHtml += `
            <tr><td colspan="2">${item.nama}</td></tr>
            <tr><td>${item.jumlah} x ${formatRupiah(item.harga)}</td><td style="text-align: right;">${formatRupiah(sub)}</td></tr>
        `;
    });
    
    document.getElementById('strukItemBody').innerHTML = strukHtml;
    document.getElementById('strukTotal').innerText = formatRupiah(totalBayar);

    // 2. Perintah cetak browser
    window.print();
}