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
    mediaStream: null
};

let chartInstance = null;

// =======================================================================
// NAVIGASI TAB DASHBOARD
// =======================================================================
function switchTab(tabName) {
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    if (tabName === 'dashboard') {
        document.getElementById('sectionDashboard').classList.add('active');
        document.getElementById('navDashboard').classList.add('active');
        loadDashboardStats();
    } else if (tabName === 'form') {
        document.getElementById('sectionForm').classList.add('active');
        document.getElementById('navForm').classList.add('active');
    } else if (tabName === 'riwayat') {
        document.getElementById('sectionRiwayat').classList.add('active');
        document.getElementById('navRiwayat').classList.add('active');
        loadRiwayat();
    }

    // Otomatis menutup sidebar setelah menu diklik
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
    if (sidebar && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
    }
}

// =======================================================================
// MEMUAT STATISTIK DASHBOARD, CHART.JS, & TABEL LAPORAN TERBARU
// =======================================================================
async function loadDashboardStats() {
    try {
        const res = await fetch(`${STATS_URL}?_t=${Date.now()}`);
        if (!res.ok) return;

        const data = await res.json();
        document.getElementById('statHariIni').innerText = data.hari_ini;
        document.getElementById('statBulanIni').innerText = data.bulan_ini;
        document.getElementById('statTotalCabang').innerText = data.total_cabang;
        document.getElementById('statTotalDokumen').innerText = data.total_dokumen;

        const ctx = document.getElementById('laporanChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.chart_labels,
                datasets: [{
                    label: 'Jumlah Laporan Pekerjaan',
                    data: data.chart_data,
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

        // Muat data laporan terbaru untuk tabel pengisi area bawah
        loadRecentDashboardReports();
    } catch (err) {
        console.error('Gagal memuat statistik:', err);
    }
}

// Memuat 5 data laporan paling baru untuk widget bawah grafik
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
                <td style="padding: 12px 10px; vertical-align: middle;"><strong>${item.petugas}</strong><br><small style="color:#6c757d;">${item.jabatan}</small></td>
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
        { id: 'tableBody_Pasuruan', name: 'KBM Pasuruan' }
    ];

    branches.forEach(b => {
        const tb = document.getElementById(b.id);
        if (tb && tb.rows.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px; color: #6c757d;">Mengambil data terbaru...</td></tr>';
        }
    });

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

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

            const filteredData = data.filter(item => item.lokasi === branch.name);
            tableBody.innerHTML = '';

            if (filteredData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px; color: #6c757d;">Belum ada dokumen laporan.</td></tr>';
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
                    <td style="padding: 12px 10px; vertical-align: middle;"><strong>${item.petugas}</strong><br><small style="color:#6c757d;">${item.jabatan}</small></td>
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

// =======================================================================
// FUNGSI PRATINJAU DOKUMEN (.DOCX) DENGAN MODAL
// =======================================================================
async function previewDokumen(fileUrl, fileName) {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('docxPreviewContainer');
    const downloadBtn = document.getElementById('previewDownloadBtn');
    
    if (!modal || !container) return;

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
// PENGIRIMAN FORM LAPORAN
// =======================================================================
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { before, proses, after } = state.capturedFiles;
    if (before.length === 0 || proses.length === 0 || after.length === 0) {
        alert('Harap lengkapi foto Before, Proses, dan After.');
        return;
    }

    const formData = new FormData();
    formData.append('petugas', document.getElementById('petugas').value);
    formData.append('jabatan', document.getElementById('jabatan').value);
    formData.append('tanggal', document.getElementById('tanggal').value);
    formData.append('lokasi', document.getElementById('lokasi').value);
    formData.append('keterangan', document.getElementById('keterangan').value);

    before.forEach((blob, idx) => formData.append('before_images', blob, `before_${idx + 1}.jpg`));
    proses.forEach((blob, idx) => formData.append('proses_images', blob, `proses_${idx + 1}.jpg`));
    after.forEach((blob, idx) => formData.append('after_images', blob, `after_${idx + 1}.jpg`));

    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Gagal menyimpan laporan.');

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
        
        switchTab('dashboard');
    } catch (err) {
        alert(err.message);
    }
});

// =======================================================================
// TOGGLE SIDEBAR & LOGOUT
// =======================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// =======================================================================
// INISIALISASI HALAMAN
// =======================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tampilkan Nama User & Status Peran yang Benar
    const activeUserName = sessionStorage.getItem('userName') || 'Rizki Gautama, S.Kom OCNA';
    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const userCabang = sessionStorage.getItem('userCabang') || 'all';

    const roleLabel = userRole === 'admin' ? '(Administrator)' : '(Petugas Cabang)';

    const userNameElement = document.getElementById('userNameDisplay');
    if (userNameElement) {
        userNameElement.innerText = `${activeUserName} ${roleLabel}`;
    }

    // 2. Kunci Dropdown Lokasi jika Akun Cabang
    const lokasiDropdown = document.getElementById('lokasi');
    if (lokasiDropdown && userRole === 'cabang' && userCabang !== 'all') {
        lokasiDropdown.value = userCabang;
        lokasiDropdown.style.pointerEvents = 'none';
        lokasiDropdown.style.backgroundColor = '#e9ecef';
    }

    // 3. Memuat Statistik Dashboard
    loadDashboardStats();
});