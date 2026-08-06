window.API_URL = window.API_URL || window.location.origin || "http://127.0.0.1:8000";

if (!localStorage.getItem("user_apotek")) {
  window.location.href = "login.html";
}
let keranjang = JSON.parse(localStorage.getItem("keranjang_apotek")) || [];
let daftarObatMaster = [];
window.selisihKembalian = 0;

async function muatDaftarObat() {
  try {
    const response = await fetch(`${window.API_URL}/obat`);
    const dataBackend = await response.json();
    
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
      "<p style='text-align:center; grid-column: 1/-1; color: red;'>Gagal memuat data dari server.</p>";
  }
}

function simpanKeranjang() {
  localStorage.setItem("keranjang_apotek", JSON.stringify(keranjang));
}

function renderGrid(data) {
    const grid = document.getElementById("productGrid");
    grid.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #f8f9fa; border-radius: 12px; border: 1px solid #ecf0f1;">
                <i class="fa-solid fa-box-open" style="font-size: 40px; color: #94a3b8; margin-bottom: 10px;"></i>
                <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 15px;">Belum Ada Produk</h4>
                <p style="margin: 0; color: #7f8c8d; font-size: 13px;">Tambahkan obat melalui menu Master Obat.</p>
            </div>
        `;
        return;
    }

    data.sort((a, b) => (a.stok === 0 ? 1 : 0) - (b.stok === 0 ? 1 : 0));

    data.forEach((obat) => {
        const itemDiKeranjang = keranjang.find((item) => item.id_obat === obat.id);
        const qtySekarang = itemDiKeranjang ? itemDiKeranjang.jumlah : 0;
        const stokTersedia = obat.stok - qtySekarang;
        const isHabis = obat.stok === 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; height: 210px; box-sizing: border-box; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";

        let bagianGambar = "";
        if (obat.gambar && obat.gambar.trim() !== "" && obat.gambar !== "null" && obat.gambar !== "undefined") {
            bagianGambar = `
                <div class="product-img-container" style="width: 100%; height: 90px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
                    <img src="${obat.gambar}" alt="${obat.nama}" style="width: 100%; height: 90px; object-fit: cover;"
                         onerror="this.parentElement.innerHTML='<i class=&quot;fa-solid fa-pills&quot; style=&quot;color: #94a3b8; font-size: 24px;&quot;></i>'">
                </div>
            `;
        } else {
            bagianGambar = `
                <div class="product-img-container" style="width: 100%; height: 90px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 6px; margin-bottom: 6px;">
                    <i class="fa-solid fa-pills" style="color: #94a3b8; font-size: 24px;"></i>
                </div>
            `;
        }

        card.innerHTML = `
            <div>
                ${bagianGambar}
                <h4 style="margin: 0 0 2px 0; font-size: 13px; color: #1e293b; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${obat.nama}">${obat.nama}</h4>
                <p style="color: #27ae60; font-weight: bold; margin: 0 0 2px 0; font-size: 12px;">${formatRupiah(obat.harga)}</p>
                <p style="margin: 0; font-size: 11px; color: ${isHabis ? '#e74c3c' : '#64748b'}; font-weight: 500;">
                    ${isHabis ? 'Stok Kosong' : 'Sisa: ' + obat.stok}
                </p>
            </div>
            
            <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; padding: 4px; border-radius: 6px;">
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, -1, ${obat.stok})" ${qtySekarang === 0 ? "disabled" : ""} style="background: #fff; border: 1px solid #cbd5e1; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-minus" style="font-size: 9px;"></i></button>
                
                <input type="number" class="qty-input-custom" value="${qtySekarang}" min="0" max="${obat.stok}" style="width: 35px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; padding: 2px;"
                       oninput="ketikQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, this.value, ${obat.stok})">
                       
                <button class="btn-qty" onclick="ubahQtyCard(${obat.id}, '${obat.nama}', ${obat.harga}, 1, ${obat.stok})" ${stokTersedia <= 0 ? "disabled" : ""} style="background: #fff; border: 1px solid #cbd5e1; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-plus" style="font-size: 9px;"></i></button>
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

function hitungKembalian() {
    const elTotal = document.getElementById("grandTotal");
    let grandTotal = 0;
    
    if (elTotal) {
        let rawText = elTotal.innerText.replace(/[^0-9]/g, '');
        grandTotal = parseInt(rawText) || 0;
    }

    const inputUang = document.getElementById("inputUangDiterima").value;
    const uangDiterima = parseFloat(inputUang) || 0;
    const labelKembalian = document.getElementById("labelKembalian");
    const btnProses = document.getElementById("btnProsesPembayaran");

    window.selisihKembalian = uangDiterima - grandTotal;

    if (uangDiterima === 0) {
        labelKembalian.innerText = "Rp 0";
        labelKembalian.style.color = "#7f8c8d";
        if (btnProses) { btnProses.disabled = false; btnProses.style.opacity = "1"; btnProses.style.cursor = "pointer"; }
    } else if (window.selisihKembalian < 0) {
        let kurang = Math.abs(window.selisihKembalian);
        labelKembalian.innerText = "Kurang Rp " + kurang.toLocaleString('id-ID');
        labelKembalian.style.color = "#e74c3c";
        if (btnProses) { btnProses.disabled = true; btnProses.style.opacity = "0.5"; btnProses.style.cursor = "not-allowed"; }
    } else {
        labelKembalian.innerText = "Rp " + window.selisihKembalian.toLocaleString('id-ID');
        labelKembalian.style.color = "#27ae60";
        if (btnProses) { btnProses.disabled = false; btnProses.style.opacity = "1"; btnProses.style.cursor = "pointer"; }
    }
}

function renderTabelKeranjang() {
  const tbody = document.querySelector("#tabelKeranjang tbody");
  tbody.innerHTML = "";

  if (keranjang.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 30px; color: #94a3b8;">Keranjang belanja kosong</td></tr>';
    document.getElementById("grandTotal").innerText = formatRupiah(0);
    hitungKembalian();
    return;
  }

  let grandTotal = 0;

  keranjang.forEach((item, index) => {
    let subtotal = item.harga * item.jumlah;
    grandTotal += subtotal;

    tbody.innerHTML += `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><strong>${item.nama}</strong><br><small style="color:#64748b;">${formatRupiah(item.harga)}</small></td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <input type="number" value="${item.jumlah}" min="1" style="width: 40px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" oninput="ubahJumlahModal(${index}, this.value)">
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 500;">${formatRupiah(subtotal)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <button onclick="hapusItem(${index})" style="background: #fee2e2; color: #ef4444; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `;
  });

  document.getElementById("grandTotal").innerText = formatRupiah(grandTotal);
  hitungKembalian();
}

function ketikQtyCard(id, nama, harga, nilaiBaru, maxStok) {
  const indexAda = keranjang.findIndex((item) => item.id_obat === id);
  if (nilaiBaru === "" || nilaiBaru === null) {
    if (indexAda > -1) keranjang.splice(indexAda, 1);
    renderTabelKeranjang();
    return;
  }
  let jumlahBaru = parseInt(nilaiBaru) || 0;
  if (jumlahBaru > maxStok) { alert("Jumlah melebihi sisa stok!"); jumlahBaru = maxStok; }

  if (jumlahBaru === 0) {
    if (indexAda > -1) keranjang.splice(indexAda, 1);
  } else {
    if (indexAda > -1) { keranjang[indexAda].jumlah = jumlahBaru; }
    else { keranjang.push({ id_obat: id, nama: nama, harga: harga, jumlah: jumlahBaru }); }
  }
  renderTabelKeranjang();
}

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
    if (jumlahBaru > maxStok) { alert("Maksimal stok tercapai!"); return; }
    if (jumlahBaru <= 0) keranjang.splice(indexAda, 1);
    else keranjang[indexAda].jumlah = jumlahBaru;
  } else if (perubahan > 0 && maxStok > 0) {
    keranjang.push({ id_obat: id, nama: nama, harga: harga, jumlah: 1 });
  }
  renderTabelKeranjang();
  filterObat();
}

function ubahJumlahModal(index, nilaiBaru) {
  if (nilaiBaru === "") return;
  const jml = parseInt(nilaiBaru);
  if (!isNaN(jml) && jml > 0) {
    keranjang[index].jumlah = jml;
    renderTabelKeranjang();
  }
}

function hapusItem(index) {
  keranjang.splice(index, 1);
  renderTabelKeranjang();
  filterObat();
}

async function prosesTransaksi() {
  const pesanDiv = document.getElementById("pesan");
  pesanDiv.style.display = "block";

  if (keranjang.length === 0) {
    pesanDiv.style.color = "#e74c3c";
    pesanDiv.innerText = "Keranjang belanja kosong!";
    return;
  }

  if (window.selisihKembalian < 0) {
    pesanDiv.style.color = "#e74c3c";
    pesanDiv.innerText = "Uang pembayaran kurang!";
    return;
  }

  const kasirAktif = localStorage.getItem("user_apotek") || "admin";
  const uangTunaiVal = parseFloat(document.getElementById("inputUangDiterima").value) || 0;

  pesanDiv.style.color = "#f39c12";
  pesanDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses transaksi...';

  try {
    const response = await fetch(`${window.API_URL}/transaksi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kasir: kasirAktif,
        keranjang: keranjang.map((item) => ({ id_obat: item.id_obat, jumlah: item.jumlah })),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      pesanDiv.style.color = "#27ae60";
      pesanDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Transaksi Sukses!`;

      document.getElementById("strukId").innerText = "#" + result.id_nota;
      document.getElementById("strukWaktu").innerText = new Date().toLocaleString("id-ID");
      document.getElementById("strukKasir").innerText = kasirAktif;

      let strukHtml = "";
      let grandTotalStruk = 0;
      keranjang.forEach((item) => {
        let sub = item.harga * item.jumlah;
        grandTotalStruk += sub;
        strukHtml += `<tr><td colspan="2">${item.nama}</td></tr><tr><td>${item.jumlah} x ${formatRupiah(item.harga)}</td><td style="text-align: right;">${formatRupiah(sub)}</td></tr>`;
      });

      document.getElementById("strukItemBody").innerHTML = strukHtml;
      document.getElementById("strukTotal").innerText = formatRupiah(grandTotalStruk);
      document.getElementById("strukTunai").innerText = formatRupiah(uangTunaiVal);
      document.getElementById("strukKembali").innerText = formatRupiah(window.selisihKembalian);

      cetakNotaStruk(result.id_nota, keranjang, grandTotalStruk, uangTunaiVal, window.selisihKembalian);

      // Reset kasir
      keranjang = [];
      localStorage.removeItem("keranjang_apotek");
      document.getElementById("inputUangDiterima").value = "";
      renderTabelKeranjang();
      await muatDaftarObat();
      setTimeout(() => pesanDiv.style.display = "none", 3000);
    } else {
      pesanDiv.style.color = "#e74c3c";
      pesanDiv.innerText = `Gagal: ${result.detail}`;
    }
  } catch (error) {
    pesanDiv.style.color = "#e74c3c";
    pesanDiv.innerText = `Error server: Pastikan API aktif!`;
  }
}

// Riwayat Transaksi
async function bukaRiwayat() {
  document.getElementById("riwayatModal").style.display = "flex";
  const tbody = document.querySelector("#tabelRiwayat tbody");
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat data...</td></tr>';
  try {
    const response = await fetch(`${window.API_URL}/laporan/harian`);
    const data = await response.json();
    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada riwayat.</td></tr>';
      return;
    }
    data.forEach((t) => {
      tbody.innerHTML += `<tr><td>#${t.id_nota}</td><td>${t.kasir}</td><td>${t.waktu}</td><td>${t.total_item} Item</td><td><button onclick="cetakUlang(${t.id_nota})" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-print"></i></button></td></tr>`;
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat riwayat.</td></tr>';
  }
}

function tutupRiwayat() { document.getElementById("riwayatModal").style.display = "none"; }

async function cetakUlang(idNota) {
  try {
    const res = await fetch(`${window.API_URL}/laporan/detail/${idNota}`);
    const data = await res.json();
    cetakNotaStruk(data.id_nota, data.keranjang, data.grand_total);
  } catch (e) { alert("Gagal cetak ulang nota."); }
}

function formatRupiah(angka) { return "Rp " + angka.toLocaleString("id-ID"); }
window.addEventListener('load', () => { if (document.getElementById("productGrid")) muatDaftarObat(); });

function initKasir() {
  if (document.getElementById("productGrid")) {
    muatDaftarObat();
    renderTabelKeranjang(); // Memuat kembali keranjang dari localStorage jika ada
  }
}

window.addEventListener('load', initKasir);

// Ekspos fungsi ke objek window agar router/sidebar aplikasi Anda bisa memanggilnya saat pindah menu
window.initKasir = initKasir;