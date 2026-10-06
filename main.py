import os
from io import BytesIO
from typing import List
from docx import Document
from docx.shared import Inches, Pt
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder tempat menyimpan dokumen Word yang berhasil dibuat
DOCS_DIR = "laporan_docx"
os.makedirs(DOCS_DIR, exist_ok=True)


@app.post("/api/laporan")
async def terima_laporan(
    petugas: str = Form(...),
    jabatan: str = Form(...),
    tanggal: str = Form(...),
    lokasi: str = Form(...),
    keterangan: str = Form(...),
    before_images: List[UploadFile] = File(...),
    proses_images: List[UploadFile] = File(...),
    after_images: List[UploadFile] = File(...),
):
    # 1. Buat Dokumen Word Baru
    doc = Document()

    # Judul Dokumen
    heading = doc.add_heading("LAPORAN DOKUMENTASI PEKERJAAN", level=0)
    heading.alignment = 1  # rata tengah

    # 2. Buat Tabel Detail Laporan
    table = doc.add_table(rows=5, cols=2)
    table.style = "Table Grid"

    data_laporan = [
        ("Nama Petugas", petugas),
        ("Jabatan", jabatan),
        ("Tanggal", tanggal),
        ("Lokasi / Cabang", lokasi),
        ("Keterangan", keterangan),
    ]

    for index, (label, nilai) in enumerate(data_laporan):
        row_cells = table.rows[index].cells
        row_cells[0].text = label
        row_cells[1].text = nilai

    doc.add_paragraph()  # Spasi pemisah

    # 3. Fungsi Bantuan Memasukkan Foto ke Dokumen
    async def tambah_kategori_foto(judul: str, daftar_foto: List[UploadFile]):
        doc.add_heading(judul, level=1)
        for img in daftar_foto:
            content = await img.read()
            # Masukkan gambar dari memori langsung ke file Word
            doc.add_picture(BytesIO(content), width=Inches(3.5))
            doc.add_paragraph()  # Spasi antar foto

    # 4. Masukkan Foto Kategori Before, Proses, dan After
    await tambah_kategori_foto("1. Dokumentasi Before", before_images)
    await tambah_kategori_foto("2. Dokumentasi Proses", proses_images)
    await tambah_kategori_foto("3. Dokumentasi After", after_images)

# 5. Simpan File Dokumen
    # Format: Tanggal Pelaksana_Nama Petugas_Cabang Klinik
    nama_file_raw = f"{tanggal}_{petugas}_{lokasi}.docx"

    # Sanitasi nama file (mengganti spasi dengan underscore dan membersihkan karakter garis miring)
    nama_file = (
        nama_file_raw.replace(" ", "_").replace("/", "-").replace("\\", "-")
    )

    path_file = os.path.join(DOCS_DIR, nama_file)
    doc.save(path_file)