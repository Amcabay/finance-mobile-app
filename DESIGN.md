# Finance Flow Mobile - Design System & UI/UX Guidelines

Ini adalah pedoman visual tunggal dan resmi untuk **Finance Flow Mobile**. Seluruh elemen antarmuka dikunci menggunakan tema **Premium Deep Dark** yang berfokus pada kontras tinggi, fungsionalitas visual yang bersih, dan kenyamanan mata.

Seluruh Agent wajib mematuhi token dan aturan ini untuk menjaga kualitas antarmuka pixel-perfect standar nasional (Juara 1 Gemastik).

---

## 🎨 1. COLOR TOKENS
Aplikasi menggunakan satu tema gelap yang konsisten. Fungsi interaksi hanya dipicu oleh satu warna aksen biru elektrik yang universal.

### Brand & Accent
* **`colors.primary`** (`#3897f0`): **Electric Action Blue**. Satu-satunya warna penanda interaksi utama. Digunakan untuk tombol aktif, laci tab login yang terpilih, dan link krusial seperti "Forgot Password?".
* **`colors.primary-pressed`** (`#007dd4`): Warna tombol utama saat ditekan (*active press state*).

### Surface & Canvas
* **`colors.canvas-bg`** (`#000000`): **Pure Black**. Background dasar mutlak untuk seluruh layar agar data keuangan terlihat kontras dan mewah.
* **`colors.surface-card`** (`#121214`): **Dark Charcoal Container**. Background laci utama tempat menampung form input login/register.
* **`colors.input-bg`** (`#16161a`): Background dalam kotak *field* input text agar terpisah secara visual dari warna kartu.

### Text & Typography Colors
* **`colors.text-main`** (`#ffffff`): Putih murni untuk seluruh headline, label input (Email/Password), dan teks di dalam tombol utama.
* **`colors.text-muted`** (`#8e8e93`): Abu-abu medium untuk tulisan pembantu (seperti teks "Version 1.1", "Remember me", atau "Already have account?").
* **`colors.text-placeholder`** (`#444446`): Abu-abu gelap untuk teks petunjuk di dalam input box (*Enter your email...*).

### Borders & Lines
* **`colors.border-field`** (`#303030`): Garis tepi tipis 1px di sekeliling kotak input field dan pembatas segmented control.

---

## 📐 2. TYPOGRAPHY (REACT NATIVE SCALE)
*Font family menggunakan SF Pro System bawaan iOS/Android. Semua ukuran di bawah ini ditulis dalam nilai numerik React Native.*

| Token | Size | Weight | Line Height Multiplier | Letter Spacing | Penggunaan |
|---|---|---|---|---|---|
| `typography.display-hero` | 32 | `600` | 1.1 | -0.5 | Angka nominal saldo utama di Dashboard |
| `typography.display-lg` | 24 | `600` | 1.2 | -0.3 | Headline halaman / Judul Menu |
| `typography.section-header`| 20 | `600` | 1.3 | 0 | Judul kelompok data (e.g., "Recent Bills") |
| `typography.body-strong` | 16 | `600` | 1.4 | 0 | Label Input (Email, Password), Nama Merchant |
| `typography.body` | 16 | `400` | 1.4 | 0 | Teks isi default, deskripsi catatan, link |
| `typography.caption` | 13 | `400` | 1.2 | 0 | Catatan kaki kecil, info versi, sub-informasi |
| `typography.button` | 16 | `600` | 1.0 | 0 | Teks di dalam tombol aksi utama (Login/Register) |

> 📌 **Aturan Tipografi:** Untuk teks berukuran besar (`display-hero` dan `display-lg`), wajib menyertakan `letterSpacing` bernilai negatif untuk menciptakan impresi tulisan yang rapat dan elegan (*Apple tight cadence*).

---

## 📦 3. SHAPES & SPACING
Sistem layout menganut grid disiplin tinggi berbasis kelipatan **8 unit**.

### Border Radius Scale
* `rounded.none`: `0` (Untuk komponen yang menempel penuh di ujung layar kiri-kanan).
* `rounded.sm`: `8` (Untuk kotak input text field).
* `rounded.md`: `12` (Untuk komponen list item transaksi atau badge status).
* `rounded.lg`: `24` (Untuk kelengkungan laci utama pembungkus form / `component.auth-form-card`).
* `rounded.pill`: `9999` (Untuk tombol aksi utama berbentuk kapsul lurus dan wadah segmented control toggle).

### Spacing System
* `spacing.xs`: `8` (Padding internal elemen kecil/jarak teks ke input).
* `spacing.md`: `16` (Padding standar horizontal pembatas screen kiri-kanan).
* `spacing.lg`: `24` (Padding internal di dalam kartu utama / laci form).

---

## 🧱 4. COMPONENT ARCHITECTURE SPECIFICATIONS

### Tombol (`Buttons`)
* **`component.button-primary`**: 
  * Bentuk: Full Pill (`rounded.pill`).
  * Desain: Background `colors.primary`, Teks `colors.text-main`.
  * Interaksi: Wajib menerapkan `transform: [{ scale: 0.96 }]` saat ditekan (`Pressable` active state).
* **`component.segmented-control`**:
  * Bentuk: Kapsul panjang (`rounded.pill`) dengan border 1px `colors.border-field`.
  * Selected Switch: Background `colors.primary`, Teks `colors.text-main`.
  * Unselected Switch: Background transparan, Teks `colors.text-placeholder`.

### Input Box (`Input Fields`)
* **`component.input-text-box`**:
  * Desain: Background `colors.input-bg`, border 1px `colors.border-field`.
  * Kelengkungan: `rounded.sm` (8).
  * Text: Warna ketikan `colors.text-main`, warna placeholder `colors.text-placeholder`.

---

## 🚫 5. UI/UX STRICT DO'S & DON'TS (MIKE KOWALSKI DESIGN DISCIPLINE)

### DO:
1. **Biarkan UI Bernapas:** Gunakan ruang kosong vertikal (`spacing.lg`) sebagai pemisah antar kelompok informasi sebelum terburu-buru menambahkan garis pembatas.
2. **Gunakan Single Shadow Hanya Pada Renders:** Dilarang memberikan efek shadow/bayangan pada teks, tombol, ataupun input box. Shadow hanya diizinkan berupa drop-shadow super halus pada komponen chart grafis keuangan untuk memberikan efek elevasi fisik yang alami.
3. **Sejajarkan Kontrol Operasional:** Tempatkan baris kontrol filter, navigasi, dan tombol aksi utama secara horizontal sejajar agar mudah dijangkau oleh jempol pengguna.

### DON'T:
1. **Dilarang Keras Menggunakan Elemen Ganda:** Jika sebuah tombol sudah menggunakan ikon penanda yang jelas (misal ikon panah kembali `<-`), jangan menambah teks label "Kembali" lagi secara mubazir di sampingnya. Tegaskan estetika minimalis.
2. **Dilarang Menggunakan Gradasi Linear Murahan:** Seluruh background komponen wajib menggunakan warna padat paduan dari token `colors.canvas-bg` dan `colors.surface-card`. Atmosfer kedalaman visual murni diciptakan dari kontras warna solid tersebut.
3. **Dilarang Memakai Weight Font 500:** Batasan ketebalan font dikunci mutlak hanya pada `400` (Regular) dan `600` (Semi-Bold). Ketebalan `500` dilarang digunakan agar tingkat hierarki teks terlihat tegas dan kontras.