let capturedFiles = {
    before: [],
    proses: [],
    after: []
};

let currentCategory = '';
let mediaStream = null;

const modal = document.getElementById('cameraModal');
const videoElement = document.getElementById('cameraStream');
const captureBtn = document.getElementById('captureBtn');

async function openCamera(category) {
    // Validasi: Wajib pilih lokasi dulu sebelum buka kamera agar watermark lokasi valid
    const lokasiDropdown = document.getElementById('lokasi');
    if (!lokasiDropdown.value) {
        alert('Harap pilih "Cabang Klinik (Lokasi Bongkaran)" terlebih dahulu sebelum mengambil foto!');
        lokasiDropdown.focus();
        return;
    }

    currentCategory = category;
    modal.style.display = 'flex';
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        videoElement.srcObject = mediaStream;
    } catch (err) {
        alert('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
        closeCamera();
    }
}

function closeCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    modal.style.display = 'none';
}

// Konversi Desimal Derajat ke DDM (Degrees Decimal Minutes)
function convertToDDM(decimal, isLatitude) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    let direction = '';
    if (isLatitude) {
        direction = decimal >= 0 ? 'N' : 'S';
    } else {
        direction = decimal >= 0 ? 'E' : 'W';
    }
    return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

// Ambil Koordinat GPS lalu cetak ke Canvas dengan Timemark, DDM, dan Lokasi
captureBtn.addEventListener('click', () => {
    if (!mediaStream) return;

    navigator.geolocation.getCurrentPosition((position) => {
        const latDDM = convertToDDM(position.coords.latitude, true);
        const lonDDM = convertToDDM(position.coords.longitude, false);
        processSnapshot(latDDM, lonDDM);
    }, (error) => {
        // Fallback jika GPS tidak aktif/izin ditolak
        processSnapshot("07° 00.000' S", "112° 00.000' E");
    }, { enableHighAccuracy: true });
});

function processSnapshot(latText, lonText) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 960;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Ambil data Lokasi yang dipilih
    const lokasiDropdown = document.getElementById('lokasi');
    const selectedLokasi = lokasiDropdown.value;

    // Format Tanggal MM/DD/YYYY & Waktu 24-hour
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${mm}/${dd}/${yyyy}`;

    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hh}:${min}:${ss}`;

    const timestampText = `${dateStr} ${timeStr}`;
    const coordText = `${latText}, ${lonText}`;
    const lokasiText = `Lokasi: ${selectedLokasi}`;

    // Styling Watermark di Foto
    const fontSize = Math.max(28, Math.floor(canvas.width * 0.035));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, fontSize * 0.1);

    const padding = fontSize * 0.8;
    const lineSpacing = fontSize + 8;
    
    // Perhitungan sumbu Y agar 3 baris teks muat di bawah
    const x = padding;
    let currentY = canvas.height - padding - (lineSpacing * 2); 

    // Render baris 1: Timestamp
    ctx.strokeText(timestampText, x, currentY);
    ctx.fillText(timestampText, x, currentY);

    // Render baris 2: Koordinat DDM
    currentY += lineSpacing;
    ctx.strokeText(coordText, x, currentY);
    ctx.fillText(coordText, x, currentY);

    // Render baris 3: Lokasi Cabang
    currentY += lineSpacing;
    ctx.strokeText(lokasiText, x, currentY);
    ctx.fillText(lokasiText, x, currentY);

    canvas.toBlob((blob) => {
        capturedFiles[currentCategory].push(blob);
        updatePreview(currentCategory);
        closeCamera();
    }, 'image/jpeg', 0.9);
}

function updatePreview(category) {
    let containerId = '';
    if (category === 'before') {
        containerId = 'previewContainerBefore';
    } else if (category === 'proses') {
        containerId = 'previewContainerProses';
    } else {
        containerId = 'previewContainerAfter';
    }
    
    const previewContainer = document.getElementById(containerId);
    
    if (!previewContainer) {
        console.error("Preview container tidak ditemukan untuk kategori:", category);
        return; 
    }
    
    previewContainer.innerHTML = '';
    
    capturedFiles[category].forEach((blob, index) => {
        const url = URL.createObjectURL(blob);
        const previewItem = document.createElement('div');
        previewItem.classList.add('preview-item');
        previewItem.innerHTML = `
            <img src="${url}" alt="Preview">
            <button type="button" class="remove-btn" onclick="removeFile('${category}', ${index})">&times;</button>
        `;
        previewContainer.appendChild(previewItem);
    });
}

window.removeFile = function(category, index) {
    capturedFiles[category].splice(index, 1);
    updatePreview(category);
}

// =======================================================================
// FUNGSI UPLOAD & BUAT DOKUMEN KE GOOGLE DRIVE
// =======================================================================

// Fungsi bantuan untuk mengubah file (Blob) menjadi format Base64
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const uploadForm = document.getElementById('uploadForm');
const successAlert = document.getElementById('successAlert');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validasi Foto: Wajib ada Before, Proses, dan After
    if (capturedFiles.before.length === 0 || capturedFiles.proses.length === 0 || capturedFiles.after.length === 0) {
        alert('Laporan Ditolak: Harap lengkapi KETIGA dokumentasi foto (Before, Proses, DAN After).');
        return;
    }

    // ⚠️ URL Web App
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwB1s5v1tpW-z-6-Ij34LEwkE0SxYU1ycnKuIXNaCsEpDFRMdtwzTLHt8fBtR50VCUk/exec';
    
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Menyusun Laporan Dokumen... Mohon Tunggu';
    submitBtn.disabled = true;

    try {
        // 1. Ambil semua teks dari input HTML
        const dataPetugas = document.getElementById('petugas').value;
        const dataJabatan = document.getElementById('jabatan').value;
        const dataTanggal = document.getElementById('tanggal').value;
        const dataLokasi = document.getElementById('lokasi').value;
        const dataKeterangan = document.getElementById('keterangan').value;

        // 2. Ubah semua gambar menjadi format Base64 Array
        const beforeB64 = await Promise.all(capturedFiles.before.map(blob => blobToBase64(blob)));
        const prosesB64 = await Promise.all(capturedFiles.proses.map(blob => blobToBase64(blob)));
        const afterB64 = await Promise.all(capturedFiles.after.map(blob => blobToBase64(blob)));

        // 3. Susun semua data (Teks & Gambar) menjadi 1 paket pengiriman (Payload)
        const payload = {
            petugas: dataPetugas,
            jabatan: dataJabatan,
            tanggal: dataTanggal,
            lokasi: dataLokasi,
            keterangan: dataKeterangan,
            beforeImages: beforeB64,
            prosesImages: prosesB64,
            afterImages: afterB64
        };

        // 4. Kirim paket laporan ke Google Apps Script (Satu kali klik, langsung jadi 1 dokumen)
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                "Content-Type": "text/plain", 
            },
            body: JSON.stringify(payload)
        });

        // 5. Bersihkan form jika selesai
        successAlert.style.display = 'block';
        uploadForm.reset();
        
        capturedFiles.before = [];
        capturedFiles.proses = [];
        capturedFiles.after = [];
        document.getElementById('previewContainerBefore').innerHTML = '';
        document.getElementById('previewContainerProses').innerHTML = '';
        document.getElementById('previewContainerAfter').innerHTML = '';

        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error saat upload:', error);
        alert('Terjadi kesalahan saat menyusun laporan dokumen. Silakan cek koneksi atau console browser (F12).');
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});