Buat fitur baru **Dashboard Overview SIT** sebagai halaman utama untuk monitoring dan tracking seluruh aktivitas SIT secara menyeluruh.

Dashboard harus dapat memberikan gambaran kondisi SIT secara **real-time/ter-update**, sekaligus menampilkan histori dan perbandingan progress dari hari ke hari.

### 1. SIT Progress Overview

Tampilkan summary utama:

- Total Test Script
- Total Test Case
- Total Execution
- Passed
- Failed
- Not Run
- Progress SIT (%)
- Total Defect
- Open Defect
- Closed Defect
- Ready to Test
- Fix in Progress / Done Dev
- Defect baru hari ini
- Defect closed hari ini

Gunakan card/KPI yang mudah dibaca dan memiliki indikator kenaikan/penurunan dibandingkan hari sebelumnya.

### 2. Daily SIT Tracking

Buat tracking harian untuk melihat perubahan SIT, minimal:

- Berapa test dilakukan hari ini
- Berapa Passed hari ini
- Berapa Failed hari ini
- Berapa defect baru hari ini
- Berapa defect closed hari ini
- Berapa defect masih Open
- Berapa defect Ready to Test
- Berapa defect yang sudah Done Dev

Tampilkan dalam bentuk grafik/trend agar dapat melihat apakah progress SIT semakin baik atau justru terjadi penumpukan defect.

### 3. Defect Trend & Analysis

Buat grafik histori defect berdasarkan tanggal:

- New Defect
- Closed Defect
- Open Defect
- Ready to Test
- Done Dev

Tampilkan juga **net defect** setiap hari, misalnya:

`New Defect - Closed Defect = Net Defect`

Sehingga dapat terlihat apakah jumlah defect sedang meningkat atau menurun.

### 4. Comparison / Benchmark

Dashboard harus menyediakan perbandingan:

- Hari ini vs kemarin
- Minggu ini vs minggu sebelumnya
- Periode berjalan vs periode sebelumnya
- Target vs actual

Contoh:

- Defect New ↓ 20%
- Defect Closed ↑ 15%
- SIT Progress ↑ 5%
- Open Defect ↓ 12%

Gunakan indikator positif/negatif yang jelas.

### 5. Defect Aging Analysis

Tampilkan berapa lama defect masih terbuka:

- 0–1 hari
- 2–3 hari
- 4–7 hari
- 8–14 hari
- > 14 hari

Tujuannya untuk mengetahui defect mana yang sudah terlalu lama belum diselesaikan.

### 6. Severity Analysis

Analisis defect berdasarkan severity:

- Fatal
- Major
- Minor
- Kosmetik

Tampilkan jumlah Open dan Closed untuk masing-masing severity.

### 7. Module / Sub Module Analysis

Tampilkan performa SIT berdasarkan:

- Module
- Sub Module

Informasi yang ditampilkan:

- Total test
- Passed
- Failed
- Not Run
- Total defect
- Open
- Closed
- Ready to Test
- Progress %

Sehingga dapat diketahui module mana yang paling bermasalah dan module mana yang sudah stabil.

### 8. Tester Performance

Tampilkan tracking berdasarkan tester:

- Total script yang dikerjakan
- Passed
- Failed
- Not Run
- Defect ditemukan
- Defect closed/retest

Tujuannya untuk melihat distribusi dan progress testing setiap tester.

### 9. Vendor / Fixing Status

Tampilkan status penyelesaian defect oleh vendor:

- New
- Fix in Progress
- Done Dev
- Ready to Test
- Retest
- Closed
- Re-open

Berikan visualisasi funnel atau workflow agar terlihat jumlah defect pada setiap tahapan.

### 10. SIT Productivity

Buat analisis produktivitas harian:

- Average test execution per day
- Average defect found per day
- Average defect closed per day
- Average closure rate
- Average fixing time
- Average retest time

Tambahkan estimasi sederhana apakah progress saat ini masih sesuai dengan target penyelesaian SIT.

### 11. Target vs Actual

Sediakan target SIT dan bandingkan dengan actual.

Contoh:

- Target execution: 3.500
- Actual execution: 2.800
- Achievement: 80%

Begitu juga untuk:

- Target defect closure
- Target SIT progress
- Target completion date

Berikan indikator apakah status **On Track / At Risk / Behind Schedule**.

### 12. Daily Activity Timeline

Tambahkan timeline aktivitas SIT, misalnya:

`07 Sep`

- 25 script executed
- 18 Passed
- 7 Failed
- 12 defect new
- 15 defect closed

`06 Sep`

- 30 script executed
- 22 Passed
- 8 Failed
- 10 defect new
- 12 defect closed

Sehingga seluruh aktivitas SIT dapat ditelusuri berdasarkan tanggal.

### 13. Filter

Dashboard harus memiliki filter:

- Project
- Phase
- Module
- Sub Module
- Tester
- Severity
- Defect Status
- Fixing Status
- Date Range

Semua KPI dan grafik harus ikut berubah berdasarkan filter yang dipilih.

### 14. Historical Tracking

Jangan hanya menampilkan kondisi terbaru. Semua perubahan harus dapat ditrack berdasarkan tanggal sehingga dashboard dapat digunakan untuk melihat histori SIT.

Minimal dapat mengetahui:

- Kondisi SIT hari ini
- Kondisi SIT kemarin
- Perubahan dari hari ke hari
- Trend mingguan
- Trend bulanan
- Histori defect
- Histori progress

### 15. Executive Summary

Tambahkan bagian paling atas berupa **SIT Health Overview** yang memberikan kesimpulan kondisi SIT saat ini.

Contoh:

**SIT Progress: 78%**
**Status: AT RISK**

- Progress testing masih sesuai target
- Open defect masih tinggi
- Major/Fatal defect masih perlu perhatian
- Closure rate meningkat dibandingkan minggu sebelumnya
- Terdapat beberapa defect yang aging >14 hari

Dashboard harus membantu user menjawab dengan cepat:

**"Hari ini SIT progress-nya bagaimana?"**
**"Berapa defect baru dan berapa yang berhasil closed?"**
**"Apakah defect semakin banyak atau berkurang?"**
**"Module mana yang paling bermasalah?"**
**"Defect mana yang sudah terlalu lama?"**
**"Apakah progress SIT masih sesuai target?"**
**"Apakah vendor semakin cepat melakukan fixing?"**

Fokus utama dashboard adalah **tracking + comparison + trend + analysis**, bukan hanya menampilkan angka summary.
