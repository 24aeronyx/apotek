function cetakNotaStruk(idNota, daftarItem, totalBayar, uangTunai = 0, uangKembali = 0) {
    // 1. Masukkan data ke elemen struk tersembunyi
    document.getElementById('strukId').innerText = "#" + idNota;
    document.getElementById('strukWaktu').innerText = new Date().toLocaleString('id-ID');
    
    // Jika elemen kasir ada di struk, isi juga
    const elKasir = document.getElementById('strukKasir');
    if (elKasir) {
        elKasir.innerText = localStorage.getItem("user_apotek") || "admin";
    }
    
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
    
    // Update bagian Tunai dan Kembali di struk jika elemennya ada
    const elTunai = document.getElementById('strukTunai');
    const elKembali = document.getElementById('strukKembali');
    if (elTunai) elTunai.innerText = formatRupiah(uangTunai);
    if (elKembali) elKembali.innerText = formatRupiah(uangKembali);

    // 2. Perintah cetak browser
    window.print();
}

function formatRupiah(angka) {
    return "Rp " + angka.toLocaleString("id-ID");
}