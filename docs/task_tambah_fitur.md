Ubah fitur "Defect Intake" yang SUDAH ADA. Jangan membuat fitur atau modul baru dari awal.

Sebelum melakukan perubahan, analisis terlebih dahulu implementasi Defect Intake saat ini dan struktur database existing.

Pahami terutama:

- tabel/entitas Defect
- Defect List
- Test Script / Test Case
- relasi Defect dengan Test Script/Test Case
- Module dan Sub-Module
- Project
- Status Workflow
- Defect History
- Fixing / Review Status
- Fixing Status by Vendor

PENTING:
Data defect SUDAH ADA di database.
Jangan membuat tabel defect baru.
Jangan menduplikasi data defect.
Jangan mengubah relasi existing antara Defect dan Test Script/Test Case.
Gunakan data dan relasi yang sudah digunakan oleh Defect List.

UBAH KONSEP DEFECT INTAKE MENJADI:

Database Existing
→ Defect List
→ Filter Status Workflow = Open
→ Defect Intake
→ Export Report Excel

Fitur Defect Intake cukup mengambil data defect existing yang memiliki:

Status Workflow = Open

Kemudian tampilkan data tersebut pada halaman Defect Intake.

Kolom yang ditampilkan:

| Defect ID | Nama File Import | Modul | Sheet Name | Summary | Priority of Defect Fixing | Status Workflow | Date Created | Fixing / Review Status | Fixing Status by Vendor | Keterangan | Note |

Untuk setiap kolom, gunakan data existing dari database/relasi yang sudah tersedia.

Jangan melakukan import Excel lagi jika fitur existing sebelumnya menggunakan mekanisme import.
Fokus utama fitur sekarang adalah membaca data defect existing dan membuat report.

Tambahkan fitur:

"Export Report Excel"

Ketika user melakukan export:

- hanya export defect dengan Status Workflow = Open
- gunakan data yang sedang ditampilkan pada Defect Intake
- gunakan filter yang dipilih user jika filtering sudah tersedia
- jangan membuat data baru
- jangan mengubah data defect

Format Excel harus mengikuti kolom:

Defect ID
Nama File Import
Modul
Sheet Name
Summary
Priority of Defect Fixing
Status Workflow
Date Created
Fixing / Review Status
Fixing Status by Vendor
Keterangan
Note

Buat Excel dengan formatting sederhana dan profesional:

- header bold
- auto filter
- freeze header
- border
- wrap text
- column width yang sesuai
- format tanggal DD/MM/YYYY
- status mudah dibaca

SEBELUM CODING:

1. Analisis implementasi Defect Intake yang sekarang.
2. Analisis tabel dan relasi database.
3. Cari bagaimana Defect List mengambil data.
4. Cari relasi Defect → Test Script/Test Case.
5. Reuse query/model/service existing jika memungkinkan.
6. Tentukan field database yang sesuai untuk setiap kolom report.

Setelah analisis, langsung ubah implementasi existing.

Jangan melakukan redesign besar.
Jangan membuat database baru kecuali benar-benar diperlukan.
Prioritaskan reuse existing architecture dan component.

Setelah selesai, berikan:

- ringkasan perubahan
- tabel/database yang digunakan
- relasi yang digunakan
- file yang diubah
- endpoint/API yang diubah atau dibuat
- cara kerja filter Status Workflow = Open
- cara kerja Export Excel
- hasil testing
