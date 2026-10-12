// =======================================================================
// KONFIGURASI BACKEND & STATE APLIKASI
// =======================================================================
const BASE_URL = 'http://127.0.0.1:8000';
const API_URL = `${BASE_URL}/api/laporan`;
const RIWAYAT_URL = `${BASE_URL}/api/riwayat`;
const STATS_URL = `${BASE_URL}/api/dashboard-stats`;

const state = {
    capturedFiles: { before: [], proses: [], after: [] },
    currentCategory: '',
    mediaStream: null,
    selectedUserForPhoto: ''
};

let chartInstance = null;

// =======================================================================
// INITIALIZATION DATABASE USER DALAM LOCAL STORAGE
// =======================================================================
function initUserDatabase() {
    const existingUsers = localStorage.getItem('kbmUserAccounts');
    if (!existingUsers) {
        const defaultAccounts = [
            { email: "admin@bongkaran.com", pass: "admin123", nama: "Rizki Gautama, S.Kom OCNA", role: "admin", cabang: "all" },
            { email: "kbmjaksaagung@klinikbungamelati.com", pass: "kbm123", nama: "Petugas KBM Jaksa Agung", role: "cabang", cabang: "KBM Jaksa Agung" },
            { email: "kbmpanjaitan@klinikbungamelati.com", pass: "kbm123", nama: "Petugas KBM Panjaitan", role: "cabang", cabang: "KBM Panjaitan" },
            { email: "kbmpajajaran@klinikbungamelati.com", pass: "kbm123", nama: "Petugas KBM Pajajaran", role: "cabang", cabang: "KBM Pajajaran" },
            { email: "kbmpasuruan@klinikbungamelati.com", pass: "kbm123", nama: "Petugas KBM Pasuruan", role: "cabang", cabang: "KBM Pasuruan" },
            { email: "dprdita@klinikbungamelati.com", pass: "kbm123", nama: "Petugas DPP dr Dita (Sardo)", role: "cabang", cabang: "DPP dr Dita (Sardo)" },
            { email: "dpreko@klinikbungamelati.com", pass: "kbm123", nama: "Petugas DPP dr Eko (Cakra)", role: "cabang", cabang: "DPP dr Eko (Cakra)" }
        ];
        localStorage.setItem('kbmUserAccounts', JSON.stringify(defaultAccounts));
    }
}

// =======================================================================
// FUNGSI TOGGLE SUBMENU SIDEBAR
// =======================================================================
function toggleSubMenu(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    }
}

// =======================================================================
// FUNGSI JAM DIGITAL LIVE & FORMAT TANGGAL INDONESIA
// =======================================================================
function startLiveClock() {
    function updateClock() {
        const now = new Date();
        const timeElem = document.getElementById('liveClockTime');
        const dateElem = document.getElementById('liveClockDate');
        const subtextDateElem = document.getElementById('subtextDateHariIni');

        if (timeElem) timeElem.innerText = now.toLocaleTimeString('id-ID', { hour12: false });

        const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = now.toLocaleDateString('id-ID', dateOptions);

        if (dateElem) dateElem.innerText = formattedDate;
        if (subtextDateElem) subtextDateElem.innerText = `Monitoring aktivitas tanggal ${formattedDate}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// =======================================================================
// FUNGSI PENCATAT AKTIVITAS USER
// =======================================================================
function recordActivityLog(aksi, detail) {
    const activeUserName = sessionStorage.getItem('userName') || 'Anonim';
    const activeUserEmail = sessionStorage.getItem('userEmail') || '-';
    const activeUserRole = sessionStorage.getItem('userRole') || 'cabang';
    const activeUserCabang = sessionStorage.getItem('userCabang') || 'Umum';

    const currentLogs = JSON.parse(localStorage.getItem('kbmActivityLogs') || '[]');
    const now = new Date();
    const waktuStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                     ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    currentLogs.unshift({
        nama: activeUserName,
        email: activeUserEmail,
        role: activeUserRole === 'admin' ? 'Administrator' : 'Petugas Cabang',
        cabang: activeUserCabang === 'all' ? 'Semua Cabang' : activeUserCabang,
        aksi: aksi,
        detail: detail,
        waktu: waktuStr,
        perangkat: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? '📱 Mobile (HP)' : '💻 Desktop (PC)'
    });

    localStorage.setItem('kbmActivityLogs', JSON.stringify(currentLogs.slice(0, 100)));
}

// =======================================================================
// NAVIGASI TAB DASHBOARD
// =======================================================================
function switchTab(tabName) {
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.sub-nav-item').forEach(item => item.classList.remove('active'));

    if (tabName === 'dashboard') {
        const secDash = document.getElementById('sectionDashboard');
        const navDash = document.getElementById('navDashboard');
        if (secDash) secDash.classList.add('active');
        if (navDash) navDash.classList.add('active');
        loadDashboardStats();
    } else if (tabName === 'form') {
        const secForm = document.getElementById('sectionForm');
        const navForm = document.getElementById('navForm');
        if (secForm) secForm.classList.add('active');
        if (navForm) navForm.classList.add('active');
    } else if (tabName === 'riwayat') {
        const secRiwayat = document.getElementById('sectionRiwayat');
        const navRiwayat = document.getElementById('navRiwayat');
        if (secRiwayat) secRiwayat.classList.add('active');
        if (navRiwayat) navRiwayat.classList.add('active');
        loadRiwayat();
    } else if (tabName === 'profil') {
        const secProfil = document.getElementById('sectionProfil');
        const navProfil = document.getElementById('navProfil');
        if (secProfil) secProfil.classList.add('active');
        if (navProfil) navProfil.classList.add('active');
        loadProfileData();
    } else if (tabName === 'daftar-user') {
        const secKelola = document.getElementById('sectionKelolaUser');
        const navKelola = document.getElementById('navKelolaUser');
        const subUser = document.getElementById('subDaftarUser');
        if (secKelola) secKelola.classList.add('active');
        if (navKelola) navKelola.classList.add('active');
        if (subUser) subUser.classList.add('active');
        loadUserList();
    } else if (tabName === 'tracker') {
        const secTracker = document.getElementById('sectionTracker');
        const navTracker = document.getElementById('navTracker');
        if (secTracker) secTracker.classList.add('active');
        if (navTracker) navTracker.classList.add('active');
        loadLoginTracker();
    }

    const sidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        if (overlay) overlay.classList.remove('active');
    }
}

// =======================================================================
// FUNGSI PROFIL PETUGAS & UNGGAH FOTO PROFIL (FIXED MULTI-UPLOAD)
// =======================================================================
function loadProfileData() {
    const activeUserName = sessionStorage.getItem('userName') || 'Rizki Gautama, S.Kom OCNA';
    const activeUserEmail = sessionStorage.getItem('userEmail') || 'admin@bongkaran.com';
    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

    if (document.getElementById('profileNamaText')) document.getElementById('profileNamaText').innerText = activeUserName;
    if (document.getElementById('profileRoleText')) {
        document.getElementById('profileRoleText').innerText = userRole === 'admin' ? '👑 Administrator Utama' : '👤 Petugas Cabang';
    }
    if (document.getElementById('profileCabangText')) {
        document.getElementById('profileCabangText').innerText = `🏥 ${userCabang === 'all' ? 'Semua Cabang Klinik' : userCabang}`;
    }

    const savedPhoto = localStorage.getItem(`profilePhoto_${activeUserEmail}`);
    if (savedPhoto && document.getElementById('profileAvatarImg')) {
        document.getElementById('profileAvatarImg').src = savedPhoto;
    }
}

function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    const activeUserEmail = sessionStorage.getItem('userEmail') || 'admin@bongkaran.com';

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Img = e.target.result;
            localStorage.setItem(`profilePhoto_${activeUserEmail}`, base64Img);
            if (document.getElementById('profileAvatarImg')) {
                document.getElementById('profileAvatarImg').src = base64Img;
            }
            recordActivityLog('Ganti Foto Profil', 'Memperbarui foto profil pengguna');
            alert('Foto profil berhasil diperbarui!');
            loadUserList();
        };
        reader.readAsDataURL(file);
    }
    // Reset nilai input agar dapat mengganti foto secara berulang kali
    event.target.value = '';
}

// Form Ubah Kata Sandi Mandiri oleh User
document.getElementById('changePasswordForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    initUserDatabase();

    const activeUserEmail = sessionStorage.getItem('userEmail');
    const oldPass = document.getElementById('oldPasswordInput').value;
    const newPass = document.getElementById('newPasswordInput').value;
    const confirmPass = document.getElementById('confirmPasswordInput').value;

    let users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');
    const userIndex = users.findIndex(u => u.email === activeUserEmail);

    if (userIndex === -1) {
        alert('Sesi pengguna tidak ditemukan.');
        return;
    }

    if (users[userIndex].pass !== oldPass) {
        alert('Kata sandi lama Anda salah!');
        return;
    }

    if (newPass !== confirmPass) {
        alert('Konfirmasi kata sandi baru tidak cocok!');
        return;
    }

    users[userIndex].pass = newPass;
    localStorage.setItem('kbmUserAccounts', JSON.stringify(users));

    recordActivityLog('Ubah Sandi', 'Pengguna memperbarui kata sandi akun');
    alert('Kata sandi berhasil diubah! Silakan gunakan kata sandi baru untuk login berikutnya.');
    this.reset();
});

// =======================================================================
// FUNGSI MEMUAT DAFTAR USER & MODAL LIHAT/GANTI FOTO PROFIL USER (FIXED)
// =======================================================================
function loadUserList() {
    const tableBody = document.getElementById('tableBody_DaftarUser');
    if (!tableBody) return;

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    if (userRole !== 'admin') {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:red;">Akses Ditolak.</td></tr>';
        return;
    }

    initUserDatabase();
    const users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');
    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:#6c757d;">Belum ada user terdaftar.</td></tr>';
        return;
    }

    users.forEach((user, idx) => {
        const roleBadge = user.role === 'admin' 
            ? `<span style="background-color:#198754; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">👑 Admin</span>`
            : `<span style="background-color:#0d6efd; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">👤 Cabang</span>`;

        const userPhoto = localStorage.getItem(`profilePhoto_${user.email}`) || 'assets/img/KBM.png';

        let actionBtns = `
            <button type="button" onclick="openProfileModalForUser('${user.email}')" style="background:#0d6efd; color:white; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:0.78rem; font-weight:bold; margin-right:4px;">👁️ Profil</button>
            <button type="button" onclick="resetPasswordUser('${user.email}')" style="background:#ffc107; color:#212529; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:0.78rem; font-weight:bold; margin-right:4px;">🔑 Reset Pass</button>
        `;
        
        if (user.email !== 'admin@bongkaran.com') {
            actionBtns += `<button type="button" onclick="hapusUser('${user.email}')" style="background:#dc3545; color:white; border:none; padding:5px 9px; border-radius:4px; cursor:pointer; font-size:0.78rem; font-weight:bold;">🗑️ Hapus</button>`;
        }

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #dee2e6';
        row.innerHTML = `
            <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${idx + 1}</td>
            <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
                <img src="${userPhoto}" onerror="this.onerror=null; this.src='assets/img/KBM%20.png';" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid #1b5e20;">
            </td>
            <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><strong>${user.nama}</strong></td>
            <td style="padding: 12px 10px; vertical-align: middle;"><code>${user.email}</code></td>
            <td style="padding: 12px 10px; vertical-align: middle;">${roleBadge}</td>
            <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">🏥 ${user.cabang === 'all' ? 'Semua Cabang' : user.cabang}</td>
            <td style="padding: 12px 10px; text-align: center; vertical-align: middle; white-space: nowrap;">${actionBtns}</td>
        `;
        tableBody.appendChild(row);
    });
}

function openProfileModalForUser(email) {
    const users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');
    const user = users.find(u => u.email === email);
    if (!user) return;

    state.selectedUserForPhoto = email;
    const userPhoto = localStorage.getItem(`profilePhoto_${email}`) || 'assets/img/KBM.png';

    if (document.getElementById('adminUserModalAvatar')) document.getElementById('adminUserModalAvatar').src = userPhoto;
    if (document.getElementById('adminUserModalNama')) document.getElementById('adminUserModalNama').innerText = user.nama;
    if (document.getElementById('adminUserModalEmail')) document.getElementById('adminUserModalEmail').innerText = user.email;
    if (document.getElementById('adminUserModalCabang')) {
        document.getElementById('adminUserModalCabang').innerText = `🏥 ${user.cabang === 'all' ? 'Semua Cabang Klinik' : user.cabang}`;
    }

    document.getElementById('adminUserProfileModal').style.display = 'flex';
}

function closeAdminUserProfileModal() {
    document.getElementById('adminUserProfileModal').style.display = 'none';
    state.selectedUserForPhoto = '';
}

function uploadPhotoForSelectedUser(event) {
    const file = event.target.files[0];
    const targetEmail = state.selectedUserForPhoto;

    if (file && targetEmail) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Img = e.target.result;
            localStorage.setItem(`profilePhoto_${targetEmail}`, base64Img);
            if (document.getElementById('adminUserModalAvatar')) {
                document.getElementById('adminUserModalAvatar').src = base64Img;
            }
            recordActivityLog('Ganti Foto User', `Admin mengganti foto profil user (${targetEmail})`);
            alert('Foto profil user berhasil diperbarui!');
            loadUserList();
        };
        reader.readAsDataURL(file);
    }
    // Reset nilai input agar dapat mengganti foto secara berulang kali
    event.target.value = '';
}

function resetPasswordUser(email) {
    const newPass = prompt(`Masukkan Kata Sandi baru untuk user (${email}):`, 'kbm123');
    if (newPass) {
        let users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
            users[idx].pass = newPass;
            localStorage.setItem('kbmUserAccounts', JSON.stringify(users));
            recordActivityLog('Reset Pass User', `Admin mereset kata sandi akun: ${email}`);
            alert(`Kata sandi akun ${email} berhasil direset menjadi: ${newPass}`);
        }
    }
}

function openModalTambahUser() {
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
}

function handleRoleChangeInModal() {
    const roleSelect = document.getElementById('addRole');
    const cabangSelect = document.getElementById('addCabang');
    if (roleSelect.value === 'admin') {
        cabangSelect.value = 'all';
        cabangSelect.disabled = true;
    } else {
        cabangSelect.disabled = false;
    }
}

document.getElementById('addUserForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    initUserDatabase();

    const namaInput = document.getElementById('addNama').value.trim();
    const gelarInput = document.getElementById('addGelar') ? document.getElementById('addGelar').value.trim() : '';
    const email = document.getElementById('addEmail').value.trim().toLowerCase();
    const pass = document.getElementById('addPass').value;
    const role = document.getElementById('addRole').value;
    const cabang = role === 'admin' ? 'all' : document.getElementById('addCabang').value;

    // Gabungkan Nama dan Gelar jika Gelar diisi
    const namaLengkap = gelarInput ? `${namaInput}, ${gelarInput}` : namaInput;

    const users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');

    if (users.some(u => u.email === email)) {
        alert('Email ini sudah terdaftar!');
        return;
    }

    users.push({ email, pass, nama: namaLengkap, role, cabang });
    localStorage.setItem('kbmUserAccounts', JSON.stringify(users));

    recordActivityLog('Tambah User', `Menambahkan user baru: ${namaLengkap} (${email})`);
    alert('User berhasil ditambahkan!');
    closeUserModal();
    loadUserList();
});

function hapusUser(email) {
    if (confirm(`Apakah Anda yakin ingin menghapus user dengan email ${email}?`)) {
        let users = JSON.parse(localStorage.getItem('kbmUserAccounts') || '[]');
        users = users.filter(u => u.email !== email);
        localStorage.setItem('kbmUserAccounts', JSON.stringify(users));

        recordActivityLog('Hapus User', `Menghapus user: ${email}`);
        alert('User berhasil dihapus!');
        loadUserList();
    }
}

// =======================================================================
// MEMUAT STATISTIK KARTU & KOTAK ANALITIK
// =======================================================================
async function loadDashboardStats() {
    try {
        const resStats = await fetch(`${STATS_URL}?_t=${Date.now()}`);
        if (resStats.ok) {
            const dataStats = await resStats.json();

            const chartElem = document.getElementById('laporanChart');
            if (chartElem) {
                const ctx = chartElem.getContext('2d');
                if (chartInstance) chartInstance.destroy();

                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dataStats.chart_labels,
                        datasets: [{
                            label: 'Jumlah Laporan Pekerjaan',
                            data: dataStats.chart_data,
                            borderColor: '#1b5e20',
                            backgroundColor: 'rgba(27, 94, 32, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3,
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        }

        const resRiwayat = await fetch(`${RIWAYAT_URL}?_t=${Date.now()}`);
        if (resRiwayat.ok) {
            const allLaporan = await resRiwayat.json();
            const todayStr = new Date().toISOString().split('T')[0];

            const todayLaporan = allLaporan.filter(item => {
                const tglItem = item.tanggal || item.created_at.split(' ')[0];
                return tglItem === todayStr;
            });

            const todayTotal = todayLaporan.length;
            const todayValid = todayLaporan.filter(i => i.status === 'Terverifikasi').length;
            const todayPending = todayLaporan.filter(i => i.status !== 'Terverifikasi' && i.status !== 'Ditolak').length;
            const todayRejected = todayLaporan.filter(i => i.status === 'Ditolak').length;

            const allTotal = allLaporan.length;
            const allValid = allLaporan.filter(i => i.status === 'Terverifikasi').length;
            const allPending = allLaporan.filter(i => i.status !== 'Terverifikasi' && i.status !== 'Ditolak').length;
            const allRejected = allLaporan.filter(i => i.status === 'Ditolak').length;

            if (document.getElementById('statHariIni')) document.getElementById('statHariIni').innerText = todayTotal;
            if (document.getElementById('statTotalCabang')) document.getElementById('statTotalCabang').innerText = '6';
            if (document.getElementById('statMenunggu')) document.getElementById('statMenunggu').innerText = allPending;
            if (document.getElementById('statTotalDokumen')) document.getElementById('statTotalDokumen').innerText = allTotal;

            if (document.getElementById('metricTodayTotal')) document.getElementById('metricTodayTotal').innerText = todayTotal;
            if (document.getElementById('metricTodayValid')) document.getElementById('metricTodayValid').innerText = todayValid;
            if (document.getElementById('metricTodayPending')) document.getElementById('metricTodayPending').innerText = todayPending;
            if (document.getElementById('metricTodayRejected')) document.getElementById('metricTodayRejected').innerText = todayRejected;

            if (document.getElementById('metricAllTotal')) document.getElementById('metricAllTotal').innerText = allTotal;
            if (document.getElementById('metricAllValid')) document.getElementById('metricAllValid').innerText = allValid;
            if (document.getElementById('metricAllPending')) document.getElementById('metricAllPending').innerText = allPending;
            if (document.getElementById('metricAllRejected')) document.getElementById('metricAllRejected').innerText = allRejected;
        }

        loadRecentDashboardReports();
    } catch (err) {
        console.error('Gagal memuat statistik:', err);
    }
}

async function loadRecentDashboardReports() {
    const tableBody = document.getElementById('tableBody_RecentDashboard');
    if (!tableBody) return;

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

    try {
        const response = await fetch(`${RIWAYAT_URL}?_t=${Date.now()}`, {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });

        if (!response.ok) return;

        const data = await response.json();
        
        let filteredData = data;
        if (userRole === 'cabang' && userCabang !== 'all') {
            filteredData = data.filter(item => item.lokasi === userCabang);
        }

        const recentData = filteredData.slice(0, 5);
        tableBody.innerHTML = '';

        if (recentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 15px; color: #6c757d;">Belum ada aktivitas laporan terbaru.</td></tr>';
            return;
        }

        recentData.forEach((item, index) => {
            const statusBadge = item.status === 'Terverifikasi'
                ? `<span style="background-color: #198754; color: #ffffff; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">✅ Terverifikasi</span>`
                : `<span style="background-color: #ffc107; color: #212529; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">⏳ Menunggu</span>`;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #dee2e6';
            row.innerHTML = `
                <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${index + 1}</td>
                <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><strong>${item.petugas}</strong><br><small style="color:#6c757d;">${item.jabatan}</small></td>
                <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><span style="background:#e8f5e9; color:#1b5e20; padding:5px 10px; border-radius:6px; font-weight:600; font-size:0.82rem; white-space:nowrap; display:inline-block;">🏥 ${item.lokasi}</span></td>
                <td style="padding: 12px 10px; vertical-align: middle; word-break: break-all;"><code>${item.filename}</code></td>
                <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">${item.created_at}</td>
                <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${statusBadge}</td>
                <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
                    <button type="button" onclick="previewDokumen('${item.download_url}', '${item.filename}')" style="background-color: #0d6efd; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap;">
                        👁️ Preview
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Gagal memuat laporan terbaru dashboard:', err);
    }
}

// =======================================================================
// MEMUAT TABEL RIWAYAT SEMUA CABANG
// =======================================================================
async function loadRiwayat() {
    const btnRefresh = document.querySelector("button[onclick='loadRiwayat()']");
    if (btnRefresh) {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '⌛ Memuat...';
    }

    const branches = [
        { id: 'tableBody_JaksaAgung', name: 'KBM Jaksa Agung' },
        { id: 'tableBody_Panjaitan', name: 'KBM Panjaitan' },
        { id: 'tableBody_Pajajaran', name: 'KBM Pajajaran' },
        { id: 'tableBody_Pasuruan', name: 'KBM Pasuruan' },
        { id: 'tableBody_DitaSardo', name: 'DPP dr Dita (Sardo)' },
        { id: 'tableBody_EkoCakra', name: 'DPP dr Eko (Cakra)' }
    ];

    branches.forEach(b => {
        const tb = document.getElementById(b.id);
        if (tb && tb.rows.length === 0) {
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 15px; color: #6c757d;">Mengambil data terbaru...</td></tr>';
        }
    });

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

    const tglMulai = document.getElementById('filterTanggalMulai')?.value;
    const tglSelesai = document.getElementById('filterTanggalSelesai')?.value;
    const searchKey = document.getElementById('filterSearchKey')?.value.toLowerCase().trim();

    try {
        const response = await fetch(`${RIWAYAT_URL}?_t=${Date.now()}`, {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();

        branches.forEach(branch => {
            const tableBody = document.getElementById(branch.id);
            if (!tableBody) return;

            const cardBox = tableBody.closest('.card-box');

            if (userRole === 'cabang' && userCabang !== 'all' && branch.name !== userCabang) {
                if (cardBox) cardBox.style.display = 'none';
                return;
            } else {
                if (cardBox) cardBox.style.display = 'block';
            }

            let filteredData = data.filter(item => item.lokasi === branch.name);

            if (tglMulai) {
                filteredData = filteredData.filter(item => {
                    const itemDate = item.tanggal || item.created_at.split(' ')[0];
                    return itemDate >= tglMulai;
                });
            }
            if (tglSelesai) {
                filteredData = filteredData.filter(item => {
                    const itemDate = item.tanggal || item.created_at.split(' ')[0];
                    return itemDate <= tglSelesai;
                });
            }

            if (searchKey) {
                filteredData = filteredData.filter(item => 
                    (item.petugas && item.petugas.toLowerCase().includes(searchKey)) ||
                    (item.jabatan && item.jabatan.toLowerCase().includes(searchKey)) ||
                    (item.filename && item.filename.toLowerCase().includes(searchKey))
                );
            }

            tableBody.innerHTML = '';

            if (filteredData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 15px; color: #6c757d;">Belum ada dokumen laporan yang sesuai kriteria.</td></tr>';
                return;
            }

            filteredData.forEach((item, index) => {
                const statusBadge = item.status === 'Terverifikasi'
                    ? `<span style="background-color: #198754; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; line-height: 1;">
                        ✅ Terverifikasi
                       </span>`
                    : `<span style="background-color: #ffc107; color: #212529; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; line-height: 1;">
                        ⏳ Menunggu
                       </span>`;

                let actionButtons = `
                    <button type="button" onclick="previewDokumen('${item.download_url}', '${item.filename}')" style="background-color: #0d6efd; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer;">
                        👁️ Preview
                    </button>
                `;

                if (userRole === 'admin') {
                    if (item.status !== 'Terverifikasi') {
                        actionButtons += `
                            <button type="button" onclick="verifikasiLaporan(${item.id})" style="background-color: #198754; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                                ✔ Verifikasi
                            </button>
                        `;
                    }
                    actionButtons += `
                        <button type="button" onclick="hapusLaporan(${item.id})" style="background-color: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                            🗑 Hapus
                        </button>
                    `;
                }

                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #dee2e6';
                row.innerHTML = `
                    <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${index + 1}</td>
                    <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><strong>${item.petugas}</strong><br><small style="color:#6c757d;">${item.jabatan}</small></td>
                    <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">${item.tanggal || '-'}</td>
                    <td style="padding: 12px 10px; vertical-align: middle; word-break: break-all;"><code>${item.filename}</code></td>
                    <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">${item.created_at}</td>
                    <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${statusBadge}</td>
                    <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: nowrap; width: 100%;">
                            ${actionButtons}
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        });
    } catch (error) {
        console.error('Gagal mengambil data:', error);
        alert('Gagal memperbarui tabel. Pastikan server backend FastAPI (http://127.0.0.1:8000) aktif!');
    } finally {
        if (btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '🔄 Refresh Tabel';
        }
    }
}

function resetFilterTanggal() {
    if (document.getElementById('filterTanggalMulai')) document.getElementById('filterTanggalMulai').value = '';
    if (document.getElementById('filterTanggalSelesai')) document.getElementById('filterTanggalSelesai').value = '';
    if (document.getElementById('filterSearchKey')) document.getElementById('filterSearchKey').value = '';
    loadRiwayat();
}

// =======================================================================
// FUNGSI MEMUAT LOG TRACKER LOGIN & AKTIVITAS
// =======================================================================
function loadLoginTracker() {
    const btnRefresh = document.querySelector("button[onclick='loadLoginTracker()']");
    if (btnRefresh) {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '⌛ Memuat...';
    }

    const tableLoginBody = document.getElementById('tableBody_LoginTracker');
    const tableActivityBody = document.getElementById('tableBody_ActivityTracker');

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    if (userRole !== 'admin') {
        if (tableLoginBody) tableLoginBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:red;">Akses Ditolak. Halaman ini hanya untuk Administrator.</td></tr>';
        if (btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '🔄 Refresh Log';
        }
        return;
    }

    try {
        const loginLogs = JSON.parse(localStorage.getItem('kbmLoginLogs') || '[]');
        if (tableLoginBody) {
            tableLoginBody.innerHTML = '';
            if (loginLogs.length === 0) {
                tableLoginBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:#6c757d;">Belum ada riwayat aktivitas login.</td></tr>';
            } else {
                loginLogs.forEach((log, idx) => {
                    const roleBadge = log.role === 'Administrator' 
                        ? `<span style="background-color:#198754; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">👑 Admin</span>`
                        : `<span style="background-color:#0d6efd; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">👤 Cabang</span>`;

                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #dee2e6';
                    row.innerHTML = `
                        <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${idx + 1}</td>
                        <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><strong>${log.nama}</strong></td>
                        <td style="padding: 12px 10px; vertical-align: middle;"><code>${log.email}</code></td>
                        <td style="padding: 12px 10px; vertical-align: middle;">${roleBadge}</td>
                        <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">🏥 ${log.cabang}</td>
                        <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">${log.waktu}</td>
                        <td style="padding: 12px 10px; text-align: center; vertical-align: middle; white-space: nowrap;">${log.perangkat}</td>
                    `;
                    tableLoginBody.appendChild(row);
                });
            }
        }

        const actLogs = JSON.parse(localStorage.getItem('kbmActivityLogs') || '[]');
        if (tableActivityBody) {
            tableActivityBody.innerHTML = '';
            if (actLogs.length === 0) {
                tableActivityBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#6c757d;">Belum ada riwayat aktivitas user.</td></tr>';
            } else {
                actLogs.forEach((log, idx) => {
                    let badgeColor = '#6c757d';
                    if (log.aksi === 'Kirim Laporan') badgeColor = '#198754';
                    else if (log.aksi === 'Verifikasi Laporan') badgeColor = '#0d6efd';
                    else if (log.aksi === 'Hapus Laporan') badgeColor = '#dc3545';
                    else if (log.aksi === 'Preview Dokumen') badgeColor = '#0dcaf0';

                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #dee2e6';
                    row.innerHTML = `
                        <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">${idx + 1}</td>
                        <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;"><strong>${log.nama}</strong><br><small style="color:#6c757d;">${log.cabang}</small></td>
                        <td style="padding: 12px 10px; vertical-align: middle;"><span style="background-color:${badgeColor}; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">${log.aksi}</span></td>
                        <td style="padding: 12px 10px; vertical-align: middle;">${log.detail}</td>
                        <td style="padding: 12px 10px; vertical-align: middle; white-space: nowrap;">${log.waktu}</td>
                        <td style="padding: 12px 10px; text-align: center; vertical-align: middle; white-space: nowrap;">${log.perangkat}</td>
                    `;
                    tableActivityBody.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error('Gagal memuat log tracker:', err);
    } finally {
        if (btnRefresh) {
            setTimeout(() => {
                btnRefresh.disabled = false;
                btnRefresh.innerHTML = '🔄 Refresh Log';
            }, 300);
        }
    }
}

function clearLoginTracker() {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat log login & aktivitas user?')) {
        localStorage.removeItem('kbmLoginLogs');
        localStorage.removeItem('kbmActivityLogs');
        loadLoginTracker();
    }
}

// =======================================================================
// FUNGSI PRATINJAU DOKUMEN (.DOCX) DENGAN MODAL
// =======================================================================
async function previewDokumen(fileUrl, fileName) {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('docxPreviewContainer');
    const downloadBtn = document.getElementById('previewDownloadBtn');
    
    if (!modal || !container) return;

    recordActivityLog('Preview Dokumen', `Melihat berkas: ${fileName}`);

    modal.style.display = 'flex';
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#6c757d; font-size:1rem;">⌛ Memuat pratinjau dokumen .docx...</div>';
    downloadBtn.href = fileUrl;

    try {
        const response = await fetch(`${fileUrl}?_t=${Date.now()}`);
        if (!response.ok) throw new Error('Gagal mengambil berkas dokumen.');

        const blob = await response.blob();
        container.innerHTML = '';

        await docx.renderAsync(blob, container, null, {
            className: 'docx-preview-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:#dc3545; text-align:center; padding:30px;">Gagal menampilkan pratinjau dokumen.<br><br><a href="${fileUrl}" download style="color:#0d6efd; font-weight:bold;">Unduh langsung berkas ${fileName}</a></div>`;
    }
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.style.display = 'none';
}

// =======================================================================
// FUNGSI AKSI KHUSUS ADMIN: VERIFIKASI & HAPUS
// =======================================================================
async function verifikasiLaporan(id) {
    if (confirm('Apakah Anda yakin ingin memverifikasi hasil pekerjaan ini?')) {
        try {
            const res = await fetch(`${BASE_URL}/api/laporan/${id}/verifikasi`, { method: 'PUT' });
            if (!res.ok) throw new Error('Gagal memverifikasi laporan.');
            
            recordActivityLog('Verifikasi Laporan', `Memverifikasi Laporan ID #${id}`);
            alert('Hasil pekerjaan berhasil diverifikasi!');
            loadRiwayat();
            loadDashboardStats();
        } catch (err) {
            alert(`Terjadi kesalahan: ${err.message}`);
        }
    }
}

async function hapusLaporan(id) {
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini secara permanen? File dokumen juga akan dihapus dari server.')) {
        try {
            const res = await fetch(`${BASE_URL}/api/laporan/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus laporan.');
            
            recordActivityLog('Hapus Laporan', `Menghapus Laporan ID #${id}`);
            alert('Laporan berhasil dihapus!');
            loadRiwayat();
            loadDashboardStats();
        } catch (err) {
            alert(`Terjadi kesalahan: ${err.message}`);
        }
    }
}

// =======================================================================
// MANAJEMEN KAMERA & GEOLOKASI WATERMARK
// =======================================================================
async function openCamera(category) {
    const lokasiDropdown = document.getElementById('lokasi');
    if (!lokasiDropdown || !lokasiDropdown.value) {
        alert('Harap pilih "Cabang Klinik (Lokasi Bongkaran)" terlebih dahulu!');
        return;
    }
    state.currentCategory = category;
    document.getElementById('cameraModal').style.display = 'flex';

    try {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        document.getElementById('cameraStream').srcObject = state.mediaStream;
    } catch (err) {
        alert('Tidak dapat mengakses kamera.');
        closeCamera();
    }
}

function closeCamera() {
    if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
        state.mediaStream = null;
    }
    document.getElementById('cameraModal').style.display = 'none';
}

function convertToDDM(decimal, isLatitude) {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const dir = isLatitude ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    return `${deg}° ${min.toFixed(3)}' ${dir}`;
}

document.getElementById('captureBtn').addEventListener('click', () => {
    if (!state.mediaStream) return;
    navigator.geolocation.getCurrentPosition(
        (pos) => processSnapshot(convertToDDM(pos.coords.latitude, true), convertToDDM(pos.coords.longitude, false)),
        () => processSnapshot("07° 00.000' S", "112° 00.000' E")
    );
});

function processSnapshot(latText, lonText) {
    const video = document.getElementById('cameraStream');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const selectedLokasi = document.getElementById('lokasi').value;

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const lines = [`${dateStr} ${timeStr}`, `${latText}, ${lonText}`, `Lokasi: ${selectedLokasi}`];
    const fontSize = Math.max(28, Math.floor(canvas.width * 0.035));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, fontSize * 0.1);

    let currentY = canvas.height - (fontSize * 0.8) - ((fontSize + 8) * (lines.length - 1));
    lines.forEach(text => {
        ctx.strokeText(text, fontSize * 0.8, currentY);
        ctx.fillText(text, fontSize * 0.8, currentY);
        currentY += fontSize + 8;
    });

    canvas.toBlob((blob) => {
        if (blob) {
            state.capturedFiles[state.currentCategory].push(blob);
            updatePreview(state.currentCategory);
            closeCamera();
        }
    }, 'image/jpeg', 0.9);
}

function updatePreview(category) {
    const container = document.getElementById(`previewContainer${category.charAt(0).toUpperCase() + category.slice(1)}`);
    if (!container) return;
    container.innerHTML = '';
    state.capturedFiles[category].forEach((blob, idx) => {
        const url = URL.createObjectURL(blob);
        const item = document.createElement('div');
        item.style.position = 'relative';
        item.innerHTML = `
            <img src="${url}" style="width:80px; height:80px; object-fit:cover; border-radius:6px;">
            <button type="button" onclick="removeFile('${category}', ${idx})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
        `;
        container.appendChild(item);
    });
}

window.removeFile = function(category, index) {
    state.capturedFiles[category].splice(index, 1);
    updatePreview(category);
};

// =======================================================================
// PENGIRIMAN FORM LAPORAN DENGAN GELAR
// =======================================================================
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { before, proses, after } = state.capturedFiles;
    if (before.length === 0 || proses.length === 0 || after.length === 0) {
        alert('Harap lengkapi foto Before, Proses, dan After.');
        return;
    }

    const petugasVal = document.getElementById('petugas').value.trim();
    const gelarVal = document.getElementById('gelar') ? document.getElementById('gelar').value.trim() : '';
    const divisiVal = document.getElementById('divisi').value;
    const lokasiVal = document.getElementById('lokasi').value;

    const namaLengkapPetugas = gelarVal ? `${petugasVal}, ${gelarVal}` : petugasVal;

    const formData = new FormData();
    formData.append('petugas', namaLengkapPetugas);
    formData.append('gelar', gelarVal);
    formData.append('divisi', divisiVal);
    formData.append('jabatan', divisiVal);
    formData.append('tanggal', document.getElementById('tanggal').value);
    formData.append('lokasi', lokasiVal);
    formData.append('keterangan', document.getElementById('keterangan').value);

    before.forEach((blob, idx) => formData.append('before_images', blob, `before_${idx + 1}.jpg`));
    proses.forEach((blob, idx) => formData.append('proses_images', blob, `proses_${idx + 1}.jpg`));
    after.forEach((blob, idx) => formData.append('after_images', blob, `after_${idx + 1}.jpg`));

    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Gagal menyimpan laporan.');

        recordActivityLog('Kirim Laporan', `Petugas: ${namaLengkapPetugas}, Divisi: ${divisiVal}, Lokasi: ${lokasiVal}`);

        document.getElementById('successAlert').style.display = 'block';
        setTimeout(() => document.getElementById('successAlert').style.display = 'none', 5000);

        document.getElementById('uploadForm').reset();
        
        const userRole = sessionStorage.getItem('userRole');
        const userCabang = sessionStorage.getItem('userCabang');
        if (userRole === 'cabang' && userCabang !== 'all') {
            document.getElementById('lokasi').value = userCabang;
        }

        state.capturedFiles = { before: [], proses: [], after: [] };
        ['Before', 'Proses', 'After'].forEach(c => document.getElementById(`previewContainer${c}`).innerHTML = '');
        
        switchTab('riwayat');
    } catch (err) {
        alert(err.message);
    }
});

// =======================================================================
// INISIALISASI HALAMAN & JAM DIGITAL LIVE
// =======================================================================
document.addEventListener('DOMContentLoaded', () => {
    initUserDatabase();

    const activeUserName = sessionStorage.getItem('userName') || 'Rizki Gautama, S.Kom OCNA';
    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

    const roleLabel = userRole === 'admin' ? '(Administrator)' : '(Petugas Cabang)';

    const userNameElement = document.getElementById('userNameDisplay');
    if (userNameElement) {
        userNameElement.innerText = `${activeUserName} ${roleLabel}`;
    }

    const welcomeNameElement = document.getElementById('welcomeUserName');
    if (welcomeNameElement) {
        welcomeNameElement.innerText = activeUserName;
    }

    const roleBadgeElement = document.getElementById('dashRoleBadge');
    if (roleBadgeElement) {
        roleBadgeElement.innerText = userRole === 'admin' ? 'ADMINISTRATOR' : 'PETUGAS CABANG';
    }

    startLiveClock();

    // VISIBILITAS MENU UNTUK ADMIN DAN PETUGAS CABANG
    const navDashboard = document.getElementById('navDashboard');
    const navForm = document.getElementById('navForm');
    const navKelolaUser = document.getElementById('navKelolaUser');
    const navTracker = document.getElementById('navTracker');

    if (userRole === 'admin') {
        if (navDashboard) navDashboard.style.display = 'block';
        if (navForm) navForm.style.display = 'none';
        if (navKelolaUser) navKelolaUser.style.display = 'block';
        if (navTracker) navTracker.style.display = 'block';
        switchTab('dashboard');
    } else {
        if (navDashboard) navDashboard.style.display = 'none';
        if (navForm) navForm.style.display = 'block';
        if (navKelolaUser) navKelolaUser.style.display = 'none';
        if (navTracker) navTracker.style.display = 'none';
        switchTab('form');
    }

    const lokasiDropdown = document.getElementById('lokasi');
    if (lokasiDropdown && userRole === 'cabang' && userCabang !== 'all') {
        lokasiDropdown.value = userCabang;
        lokasiDropdown.style.pointerEvents = 'none';
        lokasiDropdown.style.backgroundColor = '#e9ecef';
    }
});