// Fungsi bantuan untuk mengubah file (Blob) menjadi format Base64 agar bisa dikirim via internet
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
    
    // Validasi Foto: Wajib ada Before dan After
    if (capturedFiles.before.length === 0 || capturedFiles.after.length === 0) {
        alert('Laporan Ditolak: Harap lengkapi KEDUA dokumentasi foto (Before DAN After).');
        return;
    }

    // GANTI URL INI DENGAN URL WEB APP DARI GOOGLE APPS SCRIPT KAMU
    const scriptUrl = 'MASUKKAN_URL_WEB_APP_GOOGLE_APPS_SCRIPT_DI_SINI';
    
    // Ubah tombol submit menjadi status loading agar user tidak klik 2 kali
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Mengunggah Foto... Mohon Tunggu';
    submitBtn.disabled = true;

    try {
        // Gabungkan semua foto Before dan After untuk dikirim
        const allFiles = [
            ...capturedFiles.before.map(blob => ({blob: blob, type: 'Before'})),
            ...capturedFiles.after.map(blob => ({blob: blob, type: 'After'}))
        ];

        const lokasi = document.getElementById('lokasi').value.replace(/\s+/g, '_');

        // Loop untuk mengirim setiap foto satu per satu ke Google Drive
        for (let i = 0; i < allFiles.length; i++) {
            const base64Data = await blobToBase64(allFiles[i].blob);
            const timestamp = Date.now();
            
            const payload = {
                fileName: `Bongkaran_${lokasi}_${allFiles[i].type}_${timestamp}.jpg`,
                mimeType: 'image/jpeg',
                fileData: base64Data
            };

            // Mengirim data ke Google Apps Script
            await fetch(scriptUrl, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        // Jika semua foto berhasil terkirim
        successAlert.style.display = 'block';
        uploadForm.reset();
        
        // Bersihkan variabel dan tampilan preview
        capturedFiles.before = [];
        capturedFiles.after = [];
        document.getElementById('previewContainerBefore').innerHTML = '';
        document.getElementById('previewContainerAfter').innerHTML = '';

        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error saat upload:', error);
        alert('Terjadi kesalahan saat mengunggah foto ke server. Pastikan koneksi internet stabil.');
    } finally {
        // Kembalikan tombol submit ke kondisi semula
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});