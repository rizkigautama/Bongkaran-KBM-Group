// =======================================================================
// KONFIGURASI BACKEND & STATE APLIKASI
// =======================================================================
// Ganti URL ini sesuai tempat backend kamu berjalan:
// - Pengujian Lokal: 'http://127.0.0.1:8000/api/laporan'
// - Online (Render):  'https://backend-klinik.onrender.com/api/laporan'
const API_URL = 'http://127.0.0.1:8000/api/laporan';

// Pengelolaan State Terpusat
const state = {
    capturedFiles: {
        before: [],
        proses: [],
        after: []
    },
    currentCategory: '',
    mediaStream: null
};

// Elemen DOM
const modal = document.getElementById('cameraModal');
const videoElement = document.getElementById('cameraStream');
const captureBtn = document.getElementById('captureBtn');
const uploadForm = document.getElementById('uploadForm');
const successAlert = document.getElementById('successAlert');

// =======================================================================
// MANAJEMEN KAMERA
// =======================================================================

/**
 * Membuka kamera perangkat
 */
async function openCamera(category) {
    const lokasiDropdown = document.getElementById('lokasi');
    if (!lokasiDropdown || !lokasiDropdown.value) {
        alert('Harap pilih "Cabang Klinik (Lokasi Bongkaran)" terlebih dahulu sebelum mengambil foto!');
        if (lokasiDropdown) lokasiDropdown.focus();
        return;
    }

    state.currentCategory = category;
    modal.style.display = 'flex';

    try {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        videoElement.srcObject = state.mediaStream;
    } catch (err) {
        console.error('Akses kamera gagal:', err);
        alert('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
        closeCamera();
    }
}

/**
 * Mematikan kamera dan menutup modal
 */
function closeCamera() {
    if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
        state.mediaStream = null;
    }
    modal.style.display = 'none';
}

// =======================================================================
// GEOLOKASI & WATERMARK CANVAS
// =======================================================================

/**
 * Konversi Desimal Derajat ke DDM (Degrees Decimal Minutes)
 */
function convertToDDM(decimal, isLatitude) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    const direction = isLatitude 
        ? (decimal >= 0 ? 'N' : 'S') 
        : (decimal >= 0 ? 'E' : 'W');
    return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

/**
 * Listener Tombol Ambil Foto
 */
captureBtn.addEventListener('click', () => {
    if (!state.mediaStream) return;

    captureBtn.disabled = true;
    const originalText = captureBtn.innerText;
    captureBtn.innerText = 'Mendapatkan Lokasi...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latDDM = convertToDDM(position.coords.latitude, true);
            const lonDDM = convertToDDM(position.coords.longitude, false);
            processSnapshot(latDDM, lonDDM);
            resetCaptureBtn(originalText);
        },
        (error) => {
            console.warn('GPS gagal/ditolak, menggunakan koordinat default:', error);
            processSnapshot("07° 00.000' S", "112° 00.000' E");
            resetCaptureBtn(originalText);
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
});

function resetCaptureBtn(text) {
    captureBtn.innerText = text;
    captureBtn.disabled = false;
}

/**
 * Mengambil snapshot dari video canvas & memberi watermark
 */
function processSnapshot(latText, lonText) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 960;
    const ctx = canvas.getContext('2d');

    // Gambar frame dari video ke canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const selectedLokasi = document.getElementById('lokasi').value;

    // Format Tanggal (MM/DD/YYYY) & Waktu (HH:mm:ss)
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const lines = [
        `${dateStr} ${timeStr}`,
        `${latText}, ${lonText}`,
        `Lokasi: ${selectedLokasi}`
    ];

    // Styling Watermark Teks
    const fontSize = Math.max(28, Math.floor(canvas.width * 0.035));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, fontSize * 0.1);

    const padding = fontSize * 0.8;
    const lineSpacing = fontSize + 8;
    let currentY = canvas.height - padding - (lineSpacing * (lines.length - 1));

    // Render baris watermark secara berurutan
    lines.forEach(text => {
        ctx.strokeText(text, padding, currentY);
        ctx.fillText(text, padding, currentY);
        currentY += lineSpacing;
    });

    // Simpan hasil ke format JPEG Blob
    canvas.toBlob((blob) => {
        if (blob) {
            state.capturedFiles[state.currentCategory].push(blob);
            updatePreview(state.currentCategory);
            closeCamera();
        }
    }, 'image/jpeg', 0.9);
}

// =======================================================================
// MANAJEMEN PREVIEW & HAPUS FOTO
// =======================================================================

/**
 * Memperbarui UI preview foto berdasarkan kategori
 */
function updatePreview(category) {
    const containerId = `previewContainer${category.charAt(0).toUpperCase() + category.slice(1)}`;
    const previewContainer = document.getElementById(containerId);

    if (!previewContainer) {
        console.error("Container preview tidak ditemukan:", containerId);
        return;
    }

    previewContainer.innerHTML = '';

    state.capturedFiles[category].forEach((blob, index) => {
        const url = URL.createObjectURL(blob);
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        previewItem.innerHTML = `
            <img src="${url}" alt="Preview ${category}">
            <button type="button" class="remove-btn" onclick="removeFile('${category}', ${index})">&times;</button>
        `;
        previewContainer.appendChild(previewItem);
    });
}

/**
 * Menghapus foto tertentu dari state
 */
window.removeFile = function(category, index) {
    state.capturedFiles[category].splice(index, 1);
    updatePreview(category);
};

// =======================================================================
// PENGIRIMAN DATA KE REST API BACKEND
// =======================================================================

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { before, proses, after } = state.capturedFiles;

    // Validasi Kelengkapan Foto
    if (before.length === 0 || proses.length === 0 || after.length === 0) {
        alert('Laporan Ditolak: Harap lengkapi KETIGA dokumentasi foto (Before, Proses, dan After).');
        return;
    }

    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Menyusun & Mengirim Laporan... Mohon Tunggu';
    submitBtn.disabled = true;

    try {
        // Menggunakan FormData untuk pengiriman data & berkas gambar
        const formData = new FormData();
        formData.append('petugas', document.getElementById('petugas').value);
        formData.append('jabatan', document.getElementById('jabatan').value);
        formData.append('tanggal', document.getElementById('tanggal').value);
        formData.append('lokasi', document.getElementById('lokasi').value);
        formData.append('keterangan', document.getElementById('keterangan').value);

        // Masukkan berkas gambar Blob langsung ke FormData
        before.forEach((blob, idx) => formData.append('before_images', blob, `before_${idx + 1}.jpg`));
        proses.forEach((blob, idx) => formData.append('proses_images', blob, `proses_${idx + 1}.jpg`));
        after.forEach((blob, idx) => formData.append('after_images', blob, `after_${idx + 1}.jpg`));

        // Kirim permintaan HTTP POST ke Backend
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Gagal mengirim data. Status HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('Respon Backend:', result);

        // Tampilkan Notifikasi Berhasil
        if (successAlert) {
            successAlert.style.display = 'block';
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, 5000);
        } else {
            alert('Laporan berhasil dikirim!');
        }

        // Reset Formulir dan Tampilan Preview
        uploadForm.reset();
        state.capturedFiles.before = [];
        state.capturedFiles.proses = [];
        state.capturedFiles.after = [];

        ['Before', 'Proses', 'After'].forEach(cat => {
            const container = document.getElementById(`previewContainer${cat}`);
            if (container) container.innerHTML = '';
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error saat upload:', error);
        alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});