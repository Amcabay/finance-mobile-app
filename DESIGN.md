# DESIGN.md - Hyper-Detailed Page UI Specification

> **Global Typography & Core Rules:** 
> * Default Font Family: `SF Pro Display` (atau fallback `Inter` jika di Android).
> * Global Screen Padding: `paddingHorizontal: 20px`, `paddingTop: 16px`.
> * Latar Belakang Dasar Aplikasi: Putih Bersih (`#FFFFFF`).

---

## 1. GLOBAL NAVIGATION (Floating Tab Bar)
*   **Container Layout:** Melayang (*floating*) di bawah layar, `height: 64px`, `borderRadius: 24px`, `backgroundColor: '#F1F5F9'`, `marginHorizontal: 20px`, `position: 'absolute'`, `bottom: 16px`. Sumbu horizontal disusun menggunakan `flexDirection: 'row'`, `justifyContent: 'space-around'`, `alignItems: 'center'`.
*   **Active State Component (Pill Shape):** 
    *   Background Kapsul: `backgroundColor: '#E2E8F0'` atau `#FFFFFF`, `paddingVertical: 8px`, `paddingHorizontal: 16px`, `borderRadius: 16px`.
    *   Elemen di Dalam: Ikon aktif + Teks Judul berjarak `gap: 6px`.
    *   Warna Teks & Ikon: `#2F95F6` (Biru Elektrik), Font: `SF Pro Display Semibold 12px`.
*   **Inactive State Component (Icon Only):** 
    *   Komponen teks judul di-render `display: 'none'` (disembunyikan sepenuhnya).
    *   Warna Ikon: `#64748B` (Abu-abu redup), tanpa background kapsul.

---

## 2. HOME PAGE (Dashboard & Cost Analyst)
*   **Header Section:**
    *   Tata Letak: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginBottom: 24px`.
    *   Sisi Kiri: Foto profil bulat (`width: 32px`, `height: 32px`, `borderRadius: 16px`) berjarak `marginRight: 8px` dengan tombol teks `"Edit your account"` bertipe `SF Pro Display Regular 14px`, warna teks `#64748B`.
    *   Sisi Kanan: Ikon *settings* (roda gigi) minimalis, ukuran `24px`, warna `#1E293B`.
*   **Ringkasan Saldo (Mini Cards Layout):**
    *   Tata Letak: Dua kartu berjejer horizontal (`flexDirection: 'row'`, `gap: 12px`, `marginBottom: 20px`), masing-masing kartu memiliki `flex: 1`, `borderRadius: 16px`, `padding: 12px`.
    *   **Kartu "Income":** Latar belakang kontainer `#E8F5E9` (Hijau Pastel tipis). Label teks `"Income"` menggunakan `SF Pro Display Regular 12px` warna `#2E7D32`. Di bawahnya berjarak `marginTop: 4px` terdapat angka nominal (`Rp 2.500.000`) dengan warna hijau `#D9FFEA` (atau warna kontras gelap `#1B5E20`), menggunakan font `SF Pro Display Semibold 14px`.
    *   **Kartu "Outcome":** Latar belakang kontainer `#FFEBEE` (Merah Pastel tipis). Label teks `"Outcome"` menggunakan `SF Pro Display Regular 12px` warna `#C62828`. Di bawahnya berjarak `marginTop: 4px` terdapat angka nominal (`Rp 2.500.000 / Month`) dengan warna merah `#FED9D9` (atau warna kontras gelap `#B71C1C`), menggunakan font `SF Pro Display Semibold 14px`.
*   **Cost Analyst Section (Pie Chart):**
    *   Container: `borderRadius: 24px`, `backgroundColor: '#FFFFFF'`, `padding: 16px`, `marginBottom: 20px`.
    *   Header Bagian: Teks `"Cost Analyst"` menggunakan `SF Pro Display Bold 16px`, warna `#1E293B`. Di sebelah kanan ada tombol kapsul `"Read more"` berwarna biru `#2F95F6` dengan teks putih `SF Pro Display Medium 12px`.
    *   Layout Grafik & Legenda: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginTop: 16px`.
    *   Sisi Kiri (Pie Chart): Diameter `140px` tipe donat. Rasio warna: Orange/Warning (`30%` -> `#F59E0B`), Merah/Danger (`45%` -> `#EF4444`), Biru/Primary (`26%` -> `#2F95F6`).
    *   Sisi Kanan (Legend): `flexDirection: 'column'`, `gap: 12px`. Setiap baris memiliki dot indikator bulat kecil (`width: 8px`, `height: 8px`, `borderRadius: 4px`) sewarna kategorinya, berjarak `marginRight: 6px` dengan teks nama kategori (`SF Pro Display Regular 12px`, `#64748B`). Di bawah nama kategori terdapat teks nominal uang menggunakan font hitam tebal `SF Pro Display Bold 14px`, warna `#000000`.
*   **Daily Limits Card:**
    *   Container: `borderRadius: 24px`, `backgroundColor: '#F1F5F9'`, `padding: 16px`, `position: 'relative'`.
    *   Header Kartu: Teks `"Daily Limits"` (`SF Pro Display Semibold 14px`, `#1E293B`). Di bawahnya ada tombol dropdown kecil bertuliskan `"By weeks"` dengan background putih bulat, font `SF Pro Display Regular 11px`, warna `#2F95F6`.
    *   Progress Bar: `height: 8px`, `borderRadius: 4px`, `backgroundColor: '#E2E8F0'`, `marginVertical: 12px`. Jalur aktif (*filled bar*) berwarna biru elektrik cerah `#2F95F6` sesuai rasio penggunaan. Di bawah bar terdapat teks rasio anggaran (`Rp. 250.000 / 350.000`) dengan font `SF Pro Display Semibold 12px`, warna `#1E293B`.
    *   Action Button: Tombol kecil `"Edit"` di sudut kanan bawah kartu, `paddingVertical: 4px`, `paddingHorizontal: 12px`, `borderRadius: 8px`, `backgroundColor: '#2F95F6'`, teks di dalamnya menggunakan `SF Pro Display Medium 11px` berwarna putih.

---

## 3. SPENDS PAGE (Cash Wallet & History)
*   **Total Wealth Display:**
    *   Tata Letak: `alignItems: 'center'`, `marginVertical: 24px`.
    *   Teks Angka: Saldo utama (`- IDR 1.600.000`) dicetak sangat besar menggunakan `SF Pro Display Bold 28px`, warna `#1E293B`.
    *   Sub-label: Di bawah angka berjarak `marginTop: 4px` terdapat teks `"Total Wealth"` menggunakan `SF Pro Display Regular 12px`, warna `#64748B`.
*   **Interactive Line Graph:**
    *   Komponen: Area Chart berukuran `height: 160px`, `marginBottom: 20px`.
    *   Warna: Garis utama berwarna merah muda tajam (`#FF4A4A`) dengan gradasi *fill opacity* ke bawah memudar halus menghampiri putih. Sumbu X menampilkan deretan teks bulan (`Jan 2026` sampai `Mei 2026`) menggunakan `SF Pro Display Regular 10px`, warna `#94A3B8`. Grid horizontal putus-putus tipis warna `#E2E8F0`.
*   **Search & Filter Bar:**
    *   Tata Letak: `flexDirection: 'row'`, `gap: 10px`, `marginBottom: 16px`.
    *   Input Kolom: `flex: 1`, `height: 40px`, `borderRadius: 12px`, `backgroundColor: '#F1F5F9'`, `paddingHorizontal: 12px`, font `SF Pro Display Regular 13px`, placeholder warna `#94A3B8` (`"Search your spending"`).
    *   Tombol Filter: `height: 40px`, `paddingHorizontal: 14px`, `borderRadius: 12px`, `backgroundColor: '#2F95F6'`, `justifyContent: 'center'`, teks di dalamnya `"Filters"` ditulis dengan `SF Pro Display Medium 12px` warna putih.
*   **Daftar Riwayat Transaksi (Spending List):**
    *   Struktur: Menggunakan `SectionList` terkelompok berdasarkan tanggal.
    *   Header Tanggal: Teks tanggal (misal: `"Today"`, `"7 Mar 2026"`) bertipe `SF Pro Display Semibold 12px`, warna `#64748B`, `marginVertical: 8px`.
    *   Item Row: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `paddingVertical: 10px`.
    *   Sisi Kiri: Ikon lingkaran kategori (`width: 36px`, `height: 36px`, `borderRadius: 18px`). Warna background: Orange (`#FFEDD5` untuk Shopping), Ungu (`#F3E8FF` untuk Food), Biru (`#E0F2FE` untuk Transport). Di sebelah ikon terdapat `flexDirection: 'column'`, teks nama item (`SF Pro Display Medium 14px`, `#1E293B`) dan sub-teks lokasi/metode di bawahnya berjarak `2px` (`SF Pro Display Regular 11px`, `#94A3B8`).
    *   Sisi Kanan: Nominal uang wajib dicetak tebal dengan warna merah minus (`#EF4444`), menggunakan font `SF Pro Display Bold 14px` (contoh: `-IDR 600.000`).
*   **Floating Action Button (FAB):** 
    *   Komponen: Bulat solid, `width: 50px`, `height: 50px`, `borderRadius: 25px`, `backgroundColor: '#2F95F6'`, `position: 'absolute'`, `bottom: 90px`, `right: 20px`, `justifyContent: 'center'`, `alignItems: 'center'`. Ikon plus (`+`) berwarna putih ukuran `24px`.

---

## 4. SCHEDULES PAGE (Calendar & Events)
*   **Header Bulan:**
    *   Tata Letak: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginVertical: 16px`.
    *   Komponen: Teks tengah `"June 2026"` berukuran `SF Pro Display Bold 18px`, warna `#1E293B`. Diapit tombol panah minimalis kiri-kanan berukuran `20px` warna `#64748B`.
*   **Custom Calendar Grid:**
    *   Container: `borderRadius: 20px`, `borderWidth: 1px`, `borderColor: '#E2E8F0'`, `padding: 12px`, `backgroundColor: '#FFFFFF'`, `marginBottom: 16px`.
    *   Grid Header: Nama hari (`Sun`, `Mon`, dst) berjarak seimbang menggunakan `SF Pro Display Medium 11px`, warna `#94A3B8`, `marginBottom: 8px`.
    *   Days Cell: Setiap angka tanggal berukuran `SF Pro Display Regular 13px`, warna `#1E293B`, terbagi rata dalam kisi grid 7 kolom.
    *   Active Today Cell: Angka dibungkus lingkaran penuh `backgroundColor: '#2F95F6'`, teks angka berubah menjadi warna putih solid `SF Pro Display Bold 13px`.
    *   Event Marker: Tanggal yang memiliki agenda ditandai badge kotak mini tumpul tepat di bawah baris angka tanggalnya, misalnya persegi oranye mini bertuliskan teks micro `"Bill"` berwarna putih.
*   **Schedules & Notes Section:**
    *   Header Seksi: Teks `"Schedules"` (`SF Pro Display Bold 14px`, `#1E293B`) berdampingan di bawahnya dengan teks interaktif `"Tap to add new schedules"` (`SF Pro Display Regular 12px`, `#2F95F6`, `textDecorationLine: 'underline'`, `marginTop: 4px`).
    *   Empty State Component: Jika tidak ada data, render kontainer kartu besar `borderRadius: 16px`, `backgroundColor: '#F1F5F9'`, `height: 100px`, `justifyContent: 'center'`, `alignItems: 'center'`, teks di dalam `"No Event added"` (`SF Pro Display Regular 13px`, `#94A3B8`).
    *   Active State Row: Kontainer memanjang, `borderRadius: 12px`, `backgroundColor: '#F1F5F9'`, `padding: 12px`, `marginBottom: 8px`, `flexDirection: 'row'`, `alignItems: 'center'`. Teks catatan (contoh: `"Buy something for mom's birthday"`) menggunakan font `SF Pro Display Medium 13px`, warna `#1E293B`.

---

## 5. BILLS PAGE (Management & Split Bills)
*   **Welcome Banner:**
    *   Container: `borderRadius: 16px`, `backgroundColor: '#E0F2FE'`, `padding: 16px`, `marginBottom: 20px`, `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`.
    *   Sisi Kiri: Teks judul `"Welcome back!"` (`SF Pro Display Bold 14px`, `#0369A1`) dan sub-teks di bawahnya `"You didn't have any late payment!"` (`SF Pro Display Regular 11px`, `#0284C7`).
    *   Sisi Kanan: Tombol kecil kapsul `"Add now"`, `backgroundColor: '#2F95F6'`, `paddingVertical: 6px`, `paddingHorizontal: 12px`, `borderRadius: 12px`, teks putih `SF Pro Display Medium 11px`.
*   **Recent Bills List:**
    *   Header Seksi: Teks `"Recent Bills"` (`SF Pro Display Bold 16px`, `#1E293B`) di kiri, dan teks interaktif `"See all"` (`SF Pro Display Regular 12px`, `#2F95F6`) di kanan. `marginBottom: 12px`.
    *   Card Component: `borderRadius: 16px`, `backgroundColor: '#F1F5F9'`, `padding: 14px`, `marginBottom: 12px`.
    *   Card Header: Ikon persegi tumpul kategori warna orange/kuning di kiri berjarak `8px` dengan judul tagihan (misal: `"Monthly Spending"`) bertipe `SF Pro Display Semibold 13px`, `#1E293B`.
    *   Card Data Rows: Tersusun vertikal berurutan ke bawah dengan `gap: 6px`, `marginTop: 10px`. Setiap baris menggunakan layout `flexDirection: 'row'`, `justifyContent: 'space-between'`.
        *   Baris Label (Amount, Installment, Billing, End Date) menggunakan font `SF Pro Display Regular 12px` warna `#64748B`.
        *   Nilai nominal Amount dicetak tebal warna biru elektrik (`IDR 600.000`) dengan font `SF Pro Display Bold 13px`, `#2F95F6`. Nilai lainnya menggunakan warna kontras `#1E293B`.
*   **Split Bills Container:**
    *   Container: `borderRadius: 20px`, `backgroundColor: '#F1F5F9'`, `padding: 16px`, `alignItems: 'center'`, `position: 'relative'`, `marginTop: 12px`.
    *   Header: Posisi kiri atas kartu bertuliskan `"Split Bills"` (`SF Pro Display Bold 14px`, `#1E293B`).
    *   Content Area: Di tengah kartu tertera teks `"No Split Bills yet"` (`SF Pro Display Semibold 13px`, `#64748B`) dan sub-deskripsi tipis di bawahnya berjarak `2px` (`"You can now split bill by using camera"` dengan font `SF Pro Display Regular 11px`, `#94A3B8`).
    *   Action FAB Mini: Tombol bulat biru besar bertanda plus putih (`+`) melayang di sudut kanan kartu untuk memicu aksi split bill.

---

## 6. DATA ENTRY SUB-PAGES (Forms Layout)

### Form A: New Transactions
*   **Header Form:** Judul tengah `"New Transactions"` menggunakan `SF Pro Display Bold 16px`, warna `#1E293B`. Tombol kembali (`<`) bulat minimalis di kiri atas.
*   **Input Nama Transaksi (Top Field):** Menggunakan gaya minimalis tanpa kotak, hanya berupa garis bawah solid (`borderBottomWidth: 1px`, `borderBottomColor: '#CBD5E1'`). Di sebelah kiri terdapat ikon penanda bulat abu-abu tanda tanya (`?`). Font input: `SF Pro Display Regular 14px`, placeholder `"Enter transaction name"`.
*   **Form Fields Stack:** `flexDirection: 'column'`, `gap: 14px`, `marginTop: 20px`.
    *   Setiap input field dibungkus kontainer kapsul tumpul: `height: 44px`, `borderRadius: 16px`, `backgroundColor: '#F1F5F9'`, `paddingHorizontal: 16px`, `justifyContent: 'center'`. Teks ketikan menggunakan `SF Pro Display Regular 13px`, warna `#1E293B`.
    *   Urutan field: `Amount (IDR)`, `Description`, `Category Selection`.
*   **Reminder Banner Card:** Kartu penanda ungu/abu-abu lembut di atas tombol, bertuliskan `"Hey Forget Something? Check any late payment on your Bill tabs"`, teks utama menggunakan `SF Pro Display Medium 12px`, dilengkapi tombol action kapsul biru kecil di tengah bawahnya `"Check now"`.
*   **Submit Button:** Melekat di posisi terbawah layar (*bottom-anchored*), lebar penuh mengikuti padding screen, `height: 48px`, `borderRadius: 16px`, `backgroundColor: '#2F95F6'`, `justifyContent: 'center'`, `alignItems: 'center'`. Teks `"Confirm"` dicetak menggunakan `SF Pro Display Bold 14px` warna putih bersih.

### Form B: New Bill
*   **Top Suggestion Banner:** Kartu kapsul memanjang abu-abu terang `#F1F5F9`, `padding: 12px`, `borderRadius: 16px`, `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginBottom: 16px`. Teks `"Have receipts photo? Say less"` (`SF Pro Display Medium 12px`, `#64748B`) dipasangkan dengan tombol biru kecil `"Try Now"`.
*   **Form Fields Flow:** Struktur input vertikal berjarak `gap: 12px`.
    *   Field 1 (Bill name): Gaya garis bawah minimalis dengan placeholder `"Enter bills name"`.
    *   Field 2 (Bill type): Dropdown berkapsul tumpul dengan penanda panah bawah (`v`) di ujung kanan, teks pilihan menggunakan `SF Pro Display Regular 13px`.
    *   Field Stack Selanjutnya: `Amount (IDR)`, `Installment` (kotak field abu-abu polos).
    *   Field Tanggal & Waktu (`Billing day`, `Start Date`, `End Date`): Menggunakan struktur kapsul abu-abu `#F1F5F9`. Khusus field tanggal, di ujung kanan dipasangkan komponen ikon kalender grid mini abu-abu ukuran `18px` sebagai pemicu *date picker native*.
*   **Submit Button:** Lebar penuh di posisi paling bawah layar, `height: 48px`, `borderRadius: 16px`, `backgroundColor: '#2F95F6'`, `justifyContent: 'center'`, `alignItems: 'center'`. Teks `"Confirm"` ditulis dengan font `SF Pro Display Bold 14px` warna putih solid.