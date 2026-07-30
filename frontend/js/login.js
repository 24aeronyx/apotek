const API_URL = "http://127.0.0.1:8000"; // Sesuaikan URL backend Anda

async function prosesLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const pesanDiv = document.getElementById('pesanLogin');

    pesanDiv.style.display = 'block';
    pesanDiv.style.background = '#fef3c7';
    pesanDiv.style.color = '#92400e';
    pesanDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi akun...';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        const result = await response.json();

        if (response.ok) {
            pesanDiv.style.background = '#d4edda';
            pesanDiv.style.color = '#155724';
            pesanDiv.innerHTML = '<i class="fa-solid fa-circle-check"></i> Login Sukses! Mengalihkan...';

            localStorage.setItem('user_apotek', result.username);

            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            pesanDiv.style.background = '#f8d7da';
            pesanDiv.style.color = '#721c24';
            pesanDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Gagal: ${result.detail || 'Username atau password salah'}`;
        }
    } catch (error) {
        pesanDiv.style.background = '#f8d7da';
        pesanDiv.style.color = '#721c24';
        pesanDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error server: Pastikan API backend aktif!';
    }
}