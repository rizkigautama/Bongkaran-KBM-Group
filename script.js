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
}

async function loadDashboardStats() {
    try {
        const res = await fetch(STATS_URL);
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
    } catch (err) {
        console.error('Gagal memuat statistik:', err);
    }
}

async function loadRiwayat() {
    const branches = [
        { id: 'tableBody_JaksaAgung', name: 'KBM Jaksa Agung' },
        { id: 'tableBody_Panjaitan', name: 'KBM Panjaitan' },
        { id: 'tableBody_Pajajaran', name: 'KBM Pajajaran' },
        { id: 'tableBody_Pasuruan', name: 'KBM Pasuruan' }
    ];

    try {
        const response = await fetch(RIWAYAT_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();

        branches.forEach(branch => {
            const tableBody = document.getElementById(branch.id);
            if (!tableBody) return;

            const filteredData = data.filter(item => item.lokasi === branch.name);
            tableBody.innerHTML = '';

            if (filteredData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 15px; color: #6c757d;">Belum ada dokumen laporan.</td></tr>';
                return;
            }

            filteredData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #dee2e6';
                row.innerHTML = `
                    <td style="padding: 10px;">${index + 1}</td>
                    <td style="padding: 10px;"><strong>${item.petugas}</strong><br><small style="color:#6c757d;">${item.jabatan}</small></td>
                    <td style="padding: 10px;"><code>${item.filename}</code></td>
                    <td style="padding: 10px;">${item.created_at}</td>
                    <td style="padding: 10px; text-align: center;">
                        <a href="${item.download_url}" target="_blank" download style="background-color: #0d6efd; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 0.85rem; display: inline-block;">
                            📥 Download
                        </a>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        });
    } catch (error) {
        console.error('Gagal mengambil data:', error);
    }
}

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

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

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
        state.capturedFiles = { before: [], proses: [], after: [] };
        ['Before', 'Proses', 'After'].forEach(c => document.getElementById(`previewContainer${c}`).innerHTML = '');
        
        switchTab('dashboard');
    } catch (err) {
        alert(err.message);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    document.getElementById('currentDateBadge').innerText = new Date().toLocaleDateString('id-ID', options);
    loadDashboardStats();
});