from datetime import datetime, timedelta
from io import BytesIO
import os
import sqlite3
from typing import List

from docx import Document
from docx.shared import Inches
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_DIR = "laporan_docx"
DB_NAME = "laporan.db"
os.makedirs(DOCS_DIR, exist_ok=True)

app.mount("/download", StaticFiles(directory=DOCS_DIR), name="download")


def init_db():
  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()
  cursor.execute("""
        CREATE TABLE IF NOT EXISTS laporan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            petugas TEXT,
            jabatan TEXT,
            tanggal TEXT,
            lokasi TEXT,
            keterangan TEXT,
            filename TEXT,
            download_url TEXT,
            created_at TEXT,
            status TEXT DEFAULT 'Menunggu'
        )
    """)

  # Migrasi otomatis jika kolom status belum ada
  cursor.execute("PRAGMA table_info(laporan)")
  columns = [col[1] for col in cursor.fetchall()]
  if "status" not in columns:
    cursor.execute(
        "ALTER TABLE laporan ADD COLUMN status TEXT DEFAULT 'Menunggu'"
    )

  conn.commit()
  conn.close()


init_db()


@app.get("/api/dashboard-stats")
def get_dashboard_stats():
  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()

  today_str = datetime.now().strftime("%Y-%m-%d")
  month_str = datetime.now().strftime("%Y-%m")

  cursor.execute(
      "SELECT COUNT(*) FROM laporan WHERE tanggal = ?", (today_str,)
  )
  hari_ini = cursor.fetchone()[0]

  cursor.execute(
      "SELECT COUNT(*) FROM laporan WHERE tanggal LIKE ?", (f"{month_str}%",)
  )
  bulan_ini = cursor.fetchone()[0]

  cursor.execute("SELECT COUNT(*) FROM laporan")
  total_dokumen = cursor.fetchone()[0]

  labels, counts = [], []
  for i in range(6, -1, -1):
    d = datetime.now() - timedelta(days=i)
    d_str = d.strftime("%Y-%m-%d")
    labels.append(d.strftime("%d %b"))

    cursor.execute("SELECT COUNT(*) FROM laporan WHERE tanggal = ?", (d_str,))
    counts.append(cursor.fetchone()[0])

  conn.close()

  return {
      "hari_ini": hari_ini,
      "bulan_ini": bulan_ini,
      "total_cabang": 4,
      "total_dokumen": total_dokumen,
      "chart_labels": labels,
      "chart_data": counts,
  }


@app.get("/api/riwayat")
def get_riwayat():
  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()
  cursor.execute(
      "SELECT id, petugas, jabatan, tanggal, lokasi, filename, download_url,"
      " created_at, status FROM laporan ORDER BY id DESC"
  )
  rows = cursor.fetchall()
  conn.close()

  return [
      {
          "id": r[0],
          "petugas": r[1],
          "jabatan": r[2],
          "tanggal": r[3],
          "lokasi": r[4],
          "filename": r[5],
          "download_url": r[6],
          "created_at": r[7],
          "status": r[8] if len(r) > 8 and r[8] else "Menunggu",
      }
      for r in rows
  ]


# --- ENDPOINT VERIFIKASI PEKERJAAN (ADMIN ONLY) ---
@app.put("/api/laporan/{laporan_id}/verifikasi")
def verifikasi_laporan(laporan_id: int):
  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()
  cursor.execute(
      "UPDATE laporan SET status = 'Terverifikasi' WHERE id = ?", (laporan_id,)
  )
  conn.commit()
  conn.close()
  return {"status": "sukses", "message": "Laporan berhasil diverifikasi!"}


# --- ENDPOINT HAPUS LAPORAN & BERKAS (ADMIN ONLY) ---
@app.delete("/api/laporan/{laporan_id}")
def hapus_laporan(laporan_id: int):
  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()
  cursor.execute("SELECT filename FROM laporan WHERE id = ?", (laporan_id,))
  row = cursor.fetchone()
  if row:
    path_file = os.path.join(DOCS_DIR, row[0])
    if os.path.exists(path_file):
      os.remove(path_file)
    cursor.execute("DELETE FROM laporan WHERE id = ?", (laporan_id,))
    conn.commit()
    conn.close()
    return {"status": "sukses", "message": "Laporan berhasil dihapus!"}
  conn.close()
  return {"status": "error", "message": "Dokumen tidak ditemukan"}


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
  doc = Document()
  heading = doc.add_heading("LAPORAN DOKUMENTASI PEKERJAAN", level=0)
  heading.alignment = 1

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

  doc.add_paragraph()

  async def tambah_kategori_foto(judul: str, daftar_foto: List[UploadFile]):
    doc.add_heading(judul, level=1)
    for img in daftar_foto:
      content = await img.read()
      doc.add_picture(BytesIO(content), width=Inches(3.5))
      doc.add_paragraph()

  await tambah_kategori_foto("1. Dokumentasi Before", before_images)
  await tambah_kategori_foto("2. Dokumentasi Proses", proses_images)
  await tambah_kategori_foto("3. Dokumentasi After", after_images)

  nama_file_raw = f"{tanggal}_{petugas}_{lokasi}.docx"
  nama_file = (
      nama_file_raw.replace(" ", "_").replace("/", "-").replace("\\", "-")
  )
  path_file = os.path.join(DOCS_DIR, nama_file)
  doc.save(path_file)

  download_url = f"http://127.0.0.1:8000/download/{nama_file}"
  created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

  conn = sqlite3.connect(DB_NAME)
  cursor = conn.cursor()
  cursor.execute(
      """
        INSERT INTO laporan (petugas, jabatan, tanggal, lokasi, keterangan, filename, download_url, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')
    """,
      (
          petugas,
          jabatan,
          tanggal,
          lokasi,
          keterangan,
          nama_file,
          download_url,
          created_at,
      ),
  )
  conn.commit()
  conn.close()

  return {
      "status": "sukses",
      "message": "Laporan & Database berhasil disimpan!",
      "file_name": nama_file,
      "download_url": download_url,
  }