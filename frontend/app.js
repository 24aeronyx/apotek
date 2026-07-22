let keranjang = [];
let daftarObatMaster = [];

async function muatDaftarObat() {
  try {
    const response = await fetch("http://127.0.0.1:8000/obat/cari");
    daftarObatMaster = await response.json();
    renderGrid(daftarObatMaster);
  } catch (error) {
    console.error("Gagal terhubung ke API:", error);
    document.getElementById("productGrid").innerHTML =
      "<p>Gagal memuat data dari server.</p>";
  }
}

function renderGrid(data) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  data.forEach((obat) => {
    const itemDiKeranjang = keranjang.find((item) => item.id_obat === obat.id);
    const qtySekarang = itemDiKeranjang ? itemDiKeranjang.jumlah : 0;
    const stokTersedia = obat.stok - qtySekarang;
    const isHabis = obat.stok === 0;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
            <img src="${obat.gambar}" alt="${obat.nama}">
            <h4>${obat.nama}</h4>
            <p style="color: #27ae60; font-weight: bold; margin: 5px 0;">${formatRupiah(obat.harga)}</p>
            <p class="stok ${isHabis ? "stok-habis" : ""}">
                ${isHabis ? "Stok Kosong" : "Sisa Stok: " + obat.stok}
            </p>
            
            <div class="qty-control">
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, -1, ${obat.stok})" ${qtySekarang === 0 ? "disabled" : ""}>-</button>
                <span class="qty-angka">${qtySekarang}</span>
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, 1, ${obat.stok})" ${stokTersedia <= 0 ? "disabled" : ""}>+</button>
            </div>
        `;
    grid.appendChild(card);
  });
}

function filterObat() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const dataTerfilter = daftarObatMaster.filter((obat) =>
    obat.nama.toLowerCase().includes(keyword),
  );
  renderGrid(dataTerfilter);
}

function updateNotifikasiKeranjang() {
  const totalItem = keranjang.reduce((total, item) => total + item.jumlah, 0);
  document.getElementById("cartCount").innerText = totalItem;
}

function toggleModal(buka) {
  const modal = document.getElementById("cartModal");
  modal.style.display = buka ? "flex" : "none";
  if (!buka) document.getElementById("pesan").style.display = "none";
}

function renderTabelKeranjang() {
  const tbody = document.querySelector("#tabelKeranjang tbody");
  tbody.innerHTML = "";

  if (keranjang.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Keranjang kosong</td></tr>';
    document.getElementById("grandTotal").innerText = formatRupiah(0);
    return;
  }

  let grandTotal = 0;

  keranjang.forEach((item, index) => {
    let subtotal = item.harga * item.jumlah;
    grandTotal += subtotal;

    tbody.innerHTML += `
            <tr>
                <td><strong>${item.nama}</strong><br><small>${formatRupiah(item.harga)}</small></td>
                <td>
                    <input type="number" value="${item.jumlah}" min="1" 
                           style="width:50px; padding:5px; text-align:center;"
                           onchange="ubahJumlahModal(${index}, this.value)">
                </td>
                <td>${formatRupiah(subtotal)}</td>
                <td><button class="btn-hapus" onclick="hapusItem(${index})">X</button></td>
            </tr>
        `;
  });

  document.getElementById("grandTotal").innerText = formatRupiah(grandTotal);
}

function ubahQtyCard(id, nama, harga, perubahan, maxStok) {
  const indexAda = keranjang.findIndex((item) => item.id_obat === id);

  if (indexAda > -1) {
    let jumlahBaru = keranjang[indexAda].jumlah + perubahan;
    if (jumlahBaru > maxStok) {
      alert("Maksimal stok tercapai!");
      return;
    }
    if (jumlahBaru <= 0) {
      keranjang.splice(indexAda, 1);
    } else {
      keranjang[indexAda].jumlah = jumlahBaru;
    }
  } else if (perubahan > 0) {
    if (maxStok > 0) {
      keranjang.push({ id_obat: id, nama: nama, harga: harga, jumlah: 1 });
    }
  }

  updateNotifikasiKeranjang();
  renderTabelKeranjang();
  filterObat();
}

function ubahJumlahModal(index, nilaiBaru) {
  const jml = parseInt(nilaiBaru);
  if (jml > 0) {
    keranjang[index].jumlah = jml;
    updateNotifikasiKeranjang();
    renderTabelKeranjang();
    filterObat();
  }
}

function hapusItem(index) {
  keranjang.splice(index, 1);
  updateNotifikasiKeranjang();
  renderTabelKeranjang();
  filterObat();
}

async function prosesTransaksi() {
  if (keranjang.length === 0) return alert("Keranjang masih kosong!");

  const pesanDiv = document.getElementById("pesan");
  pesanDiv.style.display = "block";
  pesanDiv.style.background = "#f1c40f";
  pesanDiv.style.color = "black";
  pesanDiv.innerText = "Memproses transaksi...";

  try {
    const response = await fetch("http://127.0.0.1:8000/transaksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keranjang: keranjang.map((item) => ({
          id_obat: item.id_obat,
          jumlah: item.jumlah,
        })),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      pesanDiv.style.background = "#d4edda";
      pesanDiv.style.color = "#155724";
      pesanDiv.innerText = `✅ Transaksi Sukses! (ID Nota: ${result.id_nota})`;

      // Siapkan data cetak struk
      document.getElementById("strukId").innerText = "#" + result.id_nota;
      document.getElementById("strukWaktu").innerText =
        new Date().toLocaleString("id-ID");

      let strukHtml = "";
      let grandTotalStruk = 0;
      keranjang.forEach((item) => {
        let sub = item.harga * item.jumlah;
        grandTotalStruk += sub;
        strukHtml += `
                    <tr><td colspan="2">${item.nama}</td></tr>
                    <tr><td>${item.jumlah} x ${formatRupiah(item.harga)}</td><td style="text-align: right;">${formatRupiah(sub)}</td></tr>
                `;
      });
      document.getElementById("strukItemBody").innerHTML = strukHtml;
      document.getElementById("strukTotal").innerText =
        formatRupiah(grandTotalStruk);

      cetakNotaStruk(result.id_nota, keranjang, grandTotalStruk);

      keranjang = [];
      updateNotifikasiKeranjang();
      renderTabelKeranjang();
      await muatDaftarObat();

      setTimeout(() => toggleModal(false), 1000);
    } else {
      pesanDiv.style.background = "#f8d7da";
      pesanDiv.style.color = "#721c24";
      pesanDiv.innerText = `❌ Gagal: ${result.detail}`;
    }
  } catch (error) {
    pesanDiv.style.background = "#f8d7da";
    pesanDiv.style.color = "#721c24";
    pesanDiv.innerText = `Error server: Pastikan API berjalan!`;
  }
}

// --- FITUR RIWAYAT TRANSAKSI ---

async function bukaRiwayat() {
  const modal = document.getElementById("riwayatModal");
  modal.style.display = "flex";

  const tbody = document.querySelector("#tabelRiwayat tbody");
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;">Memuat data...</td></tr>';

  try {
    // Mengambil data dari endpoint laporan/transaksi backend Anda
    const response = await fetch("http://127.0.0.1:8000/laporan/harian");
    const data = await response.json();

    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;">Belum ada riwayat transaksi.</td></tr>';
      return;
    }

    // Render data ke tabel riwayat
    data.forEach((transaksi) => {
      tbody.innerHTML += `
                <tr>
                    <td>#${transaksi.id_nota}</td>
                    <td>${transaksi.kasir}</td>
                    <td>${transaksi.waktu}</td>
                    <td>${transaksi.total_item} Item</td>
                    <td>
                        <button style="background: #27ae60; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" 
                                onclick="cetakUlang(${transaksi.id_nota})">🖨 Cetak Struk</button>
                    </td>
                </tr>
            `;
    });
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat riwayat dari server.</td></tr>';
  }
}

function tutupRiwayat() {
  document.getElementById("riwayatModal").style.display = "none";
}

// Fungsi opsional untuk cetak ulang berdasarkan data tersimpan/server
async function cetakUlang(idNota) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/laporan/detail/${idNota}`);
        if (!response.ok) throw new Error("Gagal mengambil detail transaksi.");
        
        const data = await response.json();
        
        // Panggil fungsi cetak dari struk.js yang sudah kita buat sebelumnya
        cetakNotaStruk(data.id_nota, data.keranjang, data.grand_total);
        
    } catch (error) {
        alert("Terjadi kesalahan saat mencetak ulang nota: " + error.message);
    }
}

function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

window.onload = muatDaftarObat;
