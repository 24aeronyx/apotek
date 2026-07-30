window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";

if (!localStorage.getItem("user_apotek")) {
  window.location.href = "login.html";
}

let keranjang = [];
let daftarObatMaster = [];

async function muatDaftarObat() {
  try {
    // Diubah menyesuaikan endpoint get_all_medicines /obat yang baru
    const response = await fetch(`${window.API_URL}/obat`);
    const dataBackend = await response.json();
    
    // Mapping agar properti backend (harga_jual & total_stok) 
    // tetap cocok dengan fungsi renderGrid frontend yang memakai (harga & stok)
    daftarObatMaster = dataBackend.map(item => ({
      id: item.id,
      nama: item.nama,
      kategori: item.kategori,
      harga: item.harga_jual,
      stok: item.total_stok,
      gambar: item.gambar
    }));

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

    // Handle jika data produk kosong / belum ada sama sekali
    if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px solid #ecf0f1;">
                <i class="fa-solid fa-box-open" style="font-size: 48px; color: #94a3b8; margin-bottom: 15px;"></i>
                <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px;">Belum Ada Produk Tersedia</h4>
                <p style="margin: 0; color: #7f8c8d; font-size: 14px;">Silakan tambahkan data obat melalui menu <strong>Master Obat</strong> atau input stok terlebih dahulu.</p>
            </div>
        `;
        return;
    }

    // Urutkan data: yang stoknya habis (0) akan ditaruh di bawah
    data.sort((a, b) => {
        const habisA = a.stok === 0 ? 1 : 0;
        const habisB = b.stok === 0 ? 1 : 0;
        return habisA - habisB;
    });

    data.forEach((obat) => {
        const itemDiKeranjang = keranjang.find((item) => item.id_obat === obat.id);
        const qtySekarang = itemDiKeranjang ? itemDiKeranjang.jumlah : 0;
        const stokTersedia = obat.stok - qtySekarang;
        const isHabis = obat.stok === 0;

        const card = document.createElement("div");
        card.className = "card";

        let bagianGambar = "";
        if (obat.gambar && obat.gambar.trim() !== "" && obat.gambar !== "null" && obat.gambar !== "undefined") {
            bagianGambar = `
                <div class="product-img-container" style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 8px 8px 0 0;">
                    <img src="${obat.gambar}" alt="${obat.nama}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px 8px 0 0;"
                         onerror="this.parentElement.innerHTML='<div style=&quot;width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 8px 8px 0 0;&quot;><i class=&quot;fa-solid fa-pills&quot; style=&quot;color: #94a3b8; font-size: 32px;&quot;></i></div>'">
                </div>
            `;
        } else {
            bagianGambar = `
                <div class="product-img-container" style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 8px 8px 0 0;">
                    <div class="fallback-icon">
                        <i class="fa-solid fa-pills" style="color: #94a3b8; font-size: 32px;"></i>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            ${bagianGambar}
            <h4>${obat.nama}</h4>
            <p style="color: #27ae60; font-weight: bold; margin: 5px 0;">${formatRupiah(obat.harga)}</p>
            <p class="stok ${isHabis ? "stok-habis" : ""}">
                ${isHabis ? 'Stok Kosong' : 'Sisa Stok: ' + obat.stok}
            </p>
            
            <div class="qty-control">
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, -1, ${obat.stok})" ${qtySekarang === 0 ? "disabled" : ""}><i class="fa-solid fa-minus"></i></button>
                
                <input type="number" class="qty-input-custom" value="${qtySekarang}" min="0" max="${obat.stok}" 
                       oninput="ketikQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, this.value, ${obat.stok})">
                       
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, 1, ${obat.stok})" ${stokTersedia <= 0 ? "disabled" : ""}><i class="fa-solid fa-plus"></i></button>
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

function ketikQtyCard(id, nama, harga, nilaiBaru, maxStok) {
  const indexAda = keranjang.findIndex((item) => item.id_obat === id);

  // Jika dikosongkan sementara (sedang mengetik / menghapus)
  if (nilaiBaru === "" || nilaiBaru === null) {
    if (indexAda > -1) {
      keranjang.splice(indexAda, 1);
    }
    updateNotifikasiKeranjang();
    renderTabelKeranjang();
    return;
  }

  let jumlahBaru = parseInt(nilaiBaru);
  if (isNaN(jumlahBaru) || jumlahBaru < 0) jumlahBaru = 0;

  // Validasi agar tidak melebihi sisa stok
  if (jumlahBaru > maxStok) {
    alert("Jumlah melebihi sisa stok yang tersedia!");
    jumlahBaru = maxStok;
    event.target.value = maxStok;
  }

  if (jumlahBaru === 0) {
    if (indexAda > -1) {
      keranjang.splice(indexAda, 1);
    }
  } else {
    if (indexAda > -1) {
      keranjang[indexAda].jumlah = jumlahBaru;
    } else {
      keranjang.push({ id_obat: id, nama: nama, harga: harga, jumlah: jumlahBaru });
    }
  }

  updateNotifikasiKeranjang();
  renderTabelKeranjang();
}

// Tambahkan fungsi pendukung ini agar saat kotak input diklik lalu dikosongkan/ditinggal (blur), otomatis berubah jadi angka 0
document.addEventListener("blur", function(event) {
  if (event.target.classList.contains("qty-input-custom")) {
    if (event.target.value === "") {
      event.target.value = "0";
    }
  }
}, true);

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
                <!-- Gunakan oninput agar setiap ketikan langsung merespon tanpa harus kehilangan fokus -->
                <input type="number" value="${item.jumlah}" min="1" 
                       style="width: 60px; padding: 6px; text-align: center; border: 1px solid #ccc; border-radius: 4px;"
                       oninput="ubahJumlahModal(${index}, this.value)">
            </td>
            <td>${formatRupiah(subtotal)}</td>
            <td><button class="btn-hapus" onclick="hapusItem(${index})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button></td>
        </tr>
    `;
  });

  document.getElementById("grandTotal").innerText = formatRupiah(grandTotal);
}

// Dan pastikan fungsi ubahJumlahModal menanganinya dengan aman seperti ini:
function ubahJumlahModal(index, nilaiBaru) {
  // Jika input dikosongkan sementara oleh kasir, jangan langsung di-reset atau di-block
  if (nilaiBaru === "") return;

  const jml = parseInt(nilaiBaru);
  
  if (!isNaN(jml) && jml > 0) {
    keranjang[index].jumlah = jml;
    updateNotifikasiKeranjang();
    
    // Update subtotal teks secara langsung pada baris tersebut agar reaktif 
    // atau render ulang tabel dengan aman
    const subtotalCell = document.querySelectorAll("#tabelKeranjang tbody tr")[index]?.querySelectorAll("td")[2];
    if (subtotalCell) {
      subtotalCell.innerText = formatRupiah(keranjang[index].harga * jml);
    }
    
    document.getElementById("grandTotal").innerText = formatRupiah(
      keranjang.reduce((total, item) => total + (item.harga * item.jumlah), 0)
    );
  }
}

function hapusItem(index) {
  keranjang.splice(index, 1);
  updateNotifikasiKeranjang();
  renderTabelKeranjang();
  filterObat();
}

async function prosesTransaksi() {
  const pesanDiv = document.getElementById("pesan");
  pesanDiv.style.display = "block";

  if (keranjang.length === 0) {
    pesanDiv.style.background = "#f8d7da";
    pesanDiv.style.color = "#721c24";
    pesanDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Keranjang masih kosong!';
    return;
  }

  const kasirAktif = localStorage.getItem("user_apotek") || "admin";

  pesanDiv.style.background = "#f1c40f";
  pesanDiv.style.color = "black";
  pesanDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses transaksi...';

  try {
    const response = await fetch(`${window.API_URL}/transaksi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kasir: kasirAktif,
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
      pesanDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Transaksi Sukses! (ID Nota: #${result.id_nota})`;

      document.getElementById("strukId").innerText = "#" + result.id_nota;
      document.getElementById("strukWaktu").innerText = new Date().toLocaleString("id-ID");

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
      document.getElementById("strukTotal").innerText = formatRupiah(grandTotalStruk);

      cetakNotaStruk(result.id_nota, keranjang, grandTotalStruk);

      keranjang = [];
      updateNotifikasiKeranjang();
      renderTabelKeranjang();
      await muatDaftarObat();

      setTimeout(() => toggleModal(false), 1200);
    } else {
      pesanDiv.style.background = "#f8d7da";
      pesanDiv.style.color = "#721c24";
      pesanDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Gagal: ${result.detail}`;
    }
  } catch (error) {
    pesanDiv.style.background = "#f8d7da";
    pesanDiv.style.color = "#721c24";
    pesanDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error server: Pastikan API berjalan!`;
  }
}

// --- FITUR RIWAYAT TRANSAKSI ---

async function bukaRiwayat() {
  const modal = document.getElementById("riwayatModal");
  modal.style.display = "flex";

  const tbody = document.querySelector("#tabelRiwayat tbody");
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</td></tr>';

  try {
    const response = await fetch(`${window.API_URL}/laporan/harian`);
    const data = await response.json();

    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada riwayat transaksi.</td></tr>';
      return;
    }

    data.forEach((transaksi) => {
      tbody.innerHTML += `
        <tr>
            <td>#${transaksi.id_nota}</td>
            <td><i class="fa-solid fa-user-tie" style="margin-right: 4px; color: #64748b;"></i> ${transaksi.kasir}</td>
            <td>${transaksi.waktu}</td>
            <td>${transaksi.total_item} Item</td>
            <td>
                <button style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;" 
                        onclick="cetakUlang(${transaksi.id_nota})">
                    <i class="fa-solid fa-print"></i> Cetak
                </button>
            </td>
        </tr>
      `;
    });
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat riwayat dari server.</td></tr>';
  }
}

function tutupRiwayat() {
  document.getElementById("riwayatModal").style.display = "none";
}

async function cetakUlang(idNota) {
  try {
    const response = await fetch(
      `${window.API_URL}/laporan/detail/${idNota}`,
    );
    if (!response.ok) throw new Error("Gagal mengambil detail transaksi.");

    const data = await response.json();
    cetakNotaStruk(data.id_nota, data.keranjang, data.grand_total);
  } catch (error) {
    alert("Terjadi kesalahan saat mencetak ulang nota: " + error.message);
  }
}

function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

function initKasir() {
  if (document.getElementById("productGrid")) {
    muatDaftarObat();
  }
}

window.addEventListener('load', initKasir);