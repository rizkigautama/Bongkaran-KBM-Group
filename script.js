let capturedFiles = {
    before: [],
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
    const previewContainer = document.getElementById(category === 'before' ? 'previewContainerBefore' : 'previewContainerAfter');
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

const uploadForm = document.getElementById('uploadForm');
const successAlert = document.getElementById('successAlert');

uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validasi Foto: Memaksa HANYA BISA KIRIM JIKA KEDUA FOTO (Before & After) ADA
    if (capturedFiles.before.length === 0 || capturedFiles.after.length === 0) {
        alert('Laporan Ditolak: Harap lengkapi KEDUA dokumentasi foto (Before DAN After).');
        return;
    }

    // Jika sampai di sini, artinya semua teks/dropdown sudah diisi (karena tag HTML 'required' menahan proses jika kosong)
    // dan kedua foto juga sudah terisi.
    
    successAlert.style.display = 'block';
    uploadForm.reset();
    
    capturedFiles.before = [];
    capturedFiles.after = [];
    document.getElementById('previewContainerBefore').innerHTML = '';
    document.getElementById('previewContainerAfter').innerHTML = '';

    setTimeout(() => {
        successAlert.style.display = 'none';
    }, 5000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
})
function doPost(e) {
  try {
    // Membaca data yang dikirim dari form web
    var data = JSON.parse(e.postData.contents);
    var fileData = data.fileData; 
    var fileName = data.fileName;
    var mimeType = data.mimeType;
    
    // FOLDER ID DARI DRIVE BERSAMA KLINIK BUNGA MELATI
    var folderId = "18K8b_9dNK3v158SHhT7hkxv7jMwjDX-i";
    var folder = DriveApp.getFolderById(folderId);
    
    // Memproses data foto (Base64) kembali menjadi file asli
    var base64 = fileData.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    
    // Menyimpan file ke dalam folder Drive Bersama
    var file = folder.createFile(blob);
    
    // Mengembalikan respons berhasil ke web
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success", 
      "message": "Foto berhasil diunggah ke Drive Bersama",
      "url": file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
};