-- ============================================================
--  BANK SOAL MATHEAL - bank_soal.sql
--  Simpan file ini di: d:/XAMPP/htdocs/matheal/backend/
--  Import via: http://localhost/matheal/backend/import_soal.php
--  atau via phpMyAdmin > Database matheal > Import
-- ============================================================

-- Pastikan tabel ai_materi dan ai_soal sudah ada
-- Jika belum, jalankan CREATE TABLE di bawah ini:

CREATE TABLE IF NOT EXISTS `ai_materi` (
  `id_materi` int(11) NOT NULL AUTO_INCREMENT,
  `nama_materi` varchar(255) NOT NULL,
  `deskripsi` text,
  `isi_materi` text,
  PRIMARY KEY (`id_materi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ai_soal` (
  `id_soal` int(11) NOT NULL AUTO_INCREMENT,
  `id_materi` int(11) NOT NULL,
  `pertanyaan` text NOT NULL,
  `kunci_jawaban` text,
  `tingkat` enum('mudah','sedang','sulit') DEFAULT 'mudah',
  PRIMARY KEY (`id_soal`),
  KEY `fk_materi` (`id_materi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INSERT MATERI (jika belum ada, sesuaikan id_materi)
-- ============================================================

INSERT INTO `ai_materi` (`nama_materi`, `deskripsi`, `isi_materi`) VALUES
('Limit',           'Konsep limit fungsi dalam kalkulus', 'Limit adalah nilai yang didekati suatu fungsi ketika variabel bebasnya mendekati suatu titik tertentu.'),
('Turunan',         'Diferensiasi fungsi matematika',      'Turunan adalah laju perubahan suatu fungsi terhadap variabelnya, didefinisikan sebagai limit dari rasio selisih.'),
('Integral',        'Antidiferensiasi dan luas daerah',    'Integral adalah operasi kebalikan dari turunan yang digunakan untuk menghitung luas, volume, dan nilai akumulasi.'),
('Matriks',         'Operasi dan sifat matriks',           'Matriks adalah susunan bilangan dalam baris dan kolom yang dapat dijumlahkan, dikurangkan, dan dikalikan.'),
('Persamaan Linear','Sistem persamaan linear dan solusinya','Persamaan linear adalah persamaan polinomial derajat satu yang dapat diselesaikan dengan berbagai metode.'),
('Trigonometri',    'Fungsi trigonometri dan identitasnya','Trigonometri mempelajari hubungan antara sudut dan sisi segitiga serta fungsi-fungsi periodik.'),
('Transformasi Linier', 'Pemetaan linear antar ruang vektor', 'Transformasi linear adalah pemetaan antara dua ruang vektor yang mempertahankan operasi penjumlahan dan perkalian skalar.');

-- ============================================================
-- BANK SOAL - LIMIT (id_materi = 1)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(1, 'Hitunglah nilai dari lim(x→2) (x² - 4) / (x - 2).', '4', 'mudah'),
(1, 'Tentukan nilai lim(x→3) (x² - 9) / (x - 3).', '6', 'mudah'),
(1, 'Hitunglah lim(x→0) (sin x) / x.', '1', 'mudah'),
(1, 'Tentukan lim(x→5) (x² - 25) / (x - 5).', '10', 'mudah'),
(1, 'Hitung lim(x→1) (x³ - 1) / (x - 1).', '3', 'mudah'),
(1, 'Tentukan lim(x→∞) (3x + 5) / (x + 1).', '3', 'mudah'),
(1, 'Hitunglah lim(x→0) (1 - cos x) / x.', '0', 'mudah'),

-- SEDANG
(1, 'Hitunglah lim(x→0) (tan x - sin x) / x³.', '1/2', 'sedang'),
(1, 'Tentukan lim(x→∞) (2x² + 3x - 1) / (x² - 5x + 2).', '2', 'sedang'),
(1, 'Hitung lim(x→0) (eˣ - 1) / x menggunakan definisi limit.', '1', 'sedang'),
(1, 'Tentukan lim(x→4) (√x - 2) / (x - 4).', '1/4', 'sedang'),
(1, 'Hitunglah lim(x→0) sin(3x) / sin(5x).', '3/5', 'sedang'),
(1, 'Tentukan nilai lim(x→∞) (√(x²+x) - x).', '1/2', 'sedang'),

-- SULIT
(1, 'Hitunglah lim(x→0) (1 + 2x)^(1/x) menggunakan logaritma natural.', 'e²', 'sulit'),
(1, 'Tentukan lim(x→0) (sin x - x cos x) / x³ menggunakan deret Taylor.', '1/3', 'sulit'),
(1, 'Buktikan bahwa lim(x→0) x sin(1/x) = 0 menggunakan teorema apit (sandwich theorem).', 'Menggunakan -|x| ≤ x·sin(1/x) ≤ |x|, karena lim|x|=0 maka lim x·sin(1/x) = 0', 'sulit'),
(1, 'Hitung lim(n→∞) (1 + 1/n)^n. Jelaskan hubungannya dengan bilangan e.', 'e ≈ 2,71828. Ini adalah definisi dari bilangan Euler e.', 'sulit');

-- ============================================================
-- BANK SOAL - TURUNAN (id_materi = 2)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(2, 'Tentukan turunan pertama dari f(x) = x³ + 2x² - 5x + 7.', "f'(x) = 3x² + 4x - 5", 'mudah'),
(2, 'Hitunglah f''(x) jika f(x) = sin x.', "f'(x) = cos x", 'mudah'),
(2, 'Tentukan turunan dari f(x) = eˣ.', "f'(x) = eˣ", 'mudah'),
(2, 'Hitunglah d/dx [ln x].', "1/x", 'mudah'),
(2, 'Tentukan turunan dari f(x) = 5x⁴ - 3x² + 2.', "f'(x) = 20x³ - 6x", 'mudah'),
(2, 'Hitunglah turunan dari f(x) = cos x.', "f'(x) = -sin x", 'mudah'),
(2, 'Tentukan f''(x) jika f(x) = √x = x^(1/2).', "f'(x) = 1/(2√x)", 'mudah'),

-- SEDANG
(2, 'Gunakan aturan rantai untuk mencari turunan f(x) = sin(x²).', "f'(x) = 2x · cos(x²)", 'sedang'),
(2, 'Tentukan turunan f(x) = x · eˣ menggunakan aturan perkalian (product rule).', "f'(x) = eˣ + x·eˣ = eˣ(1 + x)", 'sedang'),
(2, 'Hitunglah turunan dari f(x) = (x² + 1) / (x - 1) menggunakan aturan hasil bagi (quotient rule).', "f'(x) = (x² - 2x - 1) / (x - 1)²", 'sedang'),
(2, 'Tentukan persamaan garis singgung kurva y = x² - 3x + 2 di titik x = 2.', 'y = x - 2. Gradien m = 2(2)-3 = 1, titik (2,0), sehingga y - 0 = 1(x - 2)', 'sedang'),
(2, 'Cari titik kritis dari f(x) = x³ - 6x² + 9x + 2.', "f'(x) = 3x² - 12x + 9 = 0 → x = 1 dan x = 3", 'sedang'),
(2, 'Tentukan turunan implisit dari x² + y² = 25.', "dy/dx = -x/y", 'sedang'),

-- SULIT
(2, 'Tentukan nilai maksimum dan minimum lokal dari f(x) = 2x³ - 9x² + 12x - 4. Gunakan uji turunan kedua.', 'Maks lokal di x=1: f(1)=1; Min lokal di x=2: f(2)=0. f''(x)=12x-18, f''(1)=-6<0 (maks), f''(2)=6>0 (min)', 'sulit'),
(2, 'Sebuah kotak tanpa tutup dibuat dari karton berukuran 30cm×30cm dengan cara memotong persegi di setiap sudut. Tentukan ukuran potongan agar volume maksimum.', 'Misalkan panjang potongan = x. V = x(30-2x)². dV/dx = 0 → x = 5. Volume maks = 5·20·20 = 2000 cm³', 'sulit'),
(2, 'Hitunglah turunan dari f(x) = x^x menggunakan logaritmik diferensiasi.', "y = x^x, ln y = x·ln x, (1/y)·y' = ln x + 1, y' = x^x·(ln x + 1)", 'sulit');

-- ============================================================
-- BANK SOAL - INTEGRAL (id_materi = 3)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(3, 'Hitunglah ∫ x³ dx.', 'x⁴/4 + C', 'mudah'),
(3, 'Tentukan ∫ sin x dx.', '-cos x + C', 'mudah'),
(3, 'Hitunglah ∫ eˣ dx.', 'eˣ + C', 'mudah'),
(3, 'Tentukan ∫ (3x² + 2x - 5) dx.', 'x³ + x² - 5x + C', 'mudah'),
(3, 'Hitunglah ∫₀¹ x² dx (integral tertentu).', '1/3', 'mudah'),
(3, 'Tentukan ∫ 1/x dx.', 'ln|x| + C', 'mudah'),
(3, 'Hitunglah ∫ cos x dx.', 'sin x + C', 'mudah'),

-- SEDANG
(3, 'Gunakan substitusi u = x² + 1 untuk menghitung ∫ 2x(x²+1)⁵ dx.', '(x²+1)⁶/6 + C', 'sedang'),
(3, 'Tentukan ∫ x·eˣ dx menggunakan integrasi parsial.', 'x·eˣ - eˣ + C = eˣ(x-1) + C', 'sedang'),
(3, 'Hitunglah luas daerah di antara kurva y = x² dan y = x.', 'Luas = ∫₀¹ (x - x²)dx = [x²/2 - x³/3]₀¹ = 1/2 - 1/3 = 1/6', 'sedang'),
(3, 'Tentukan ∫ sin²x dx.', 'x/2 - sin(2x)/4 + C', 'sedang'),
(3, 'Hitunglah ∫₀^(π/2) sin x dx.', '1', 'sedang'),
(3, 'Gunakan integrasi parsial untuk menghitung ∫ ln x dx.', 'x·ln x - x + C', 'sedang'),

-- SULIT
(3, 'Hitunglah ∫ x²/(x²+1) dx.', 'x - arctan(x) + C', 'sulit'),
(3, 'Tentukan volume benda putar yang terbentuk jika daerah di bawah y = √x dari x=0 sampai x=4 diputar terhadap sumbu-x.', 'V = π∫₀⁴ x dx = π[x²/2]₀⁴ = 8π satuan volume', 'sulit'),
(3, 'Hitunglah ∫ 1/(x²-1) dx menggunakan pecahan parsial.', '(1/2)·ln|x-1| - (1/2)·ln|x+1| + C = (1/2)·ln|(x-1)/(x+1)| + C', 'sulit');

-- ============================================================
-- BANK SOAL - MATRIKS (id_materi = 4)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(4, 'Diketahui A = [[1,2],[3,4]] dan B = [[5,6],[7,8]]. Hitunglah A + B.', '[[6,8],[10,12]]', 'mudah'),
(4, 'Tentukan transpose dari matriks A = [[1,2,3],[4,5,6]].', 'A^T = [[1,4],[2,5],[3,6]]', 'mudah'),
(4, 'Hitunglah determinan matriks A = [[3,1],[2,4]].', 'det(A) = 3·4 - 1·2 = 10', 'mudah'),
(4, 'Diketahui A = [[2,0],[0,3]]. Hitunglah 2A.', '[[4,0],[0,6]]', 'mudah'),
(4, 'Tentukan hasil perkalian A = [[1,2],[3,4]] dan B = [[1,0],[0,1]] (matriks identitas).', '[[1,2],[3,4]] (hasil sama dengan A)', 'mudah'),
(4, 'Apakah matriks A = [[1,0],[0,1]] termasuk matriks identitas? Jelaskan.', 'Ya, karena memiliki angka 1 pada diagonal utama dan 0 di semua elemen lainnya', 'mudah'),

-- SEDANG
(4, 'Hitunglah perkalian matriks A = [[1,2],[3,4]] × B = [[5,6],[7,8]].', '[[1·5+2·7, 1·6+2·8],[3·5+4·7, 3·6+4·8]] = [[19,22],[43,50]]', 'sedang'),
(4, 'Tentukan invers dari matriks A = [[2,1],[5,3]].', 'det=1, A⁻¹ = [[3,-1],[-5,2]]', 'sedang'),
(4, 'Selesaikan sistem persamaan menggunakan matriks: 2x + y = 5 dan 5x + 3y = 13.', 'x=2, y=1 (menggunakan matriks invers atau eliminasi Gauss)', 'sedang'),
(4, 'Hitunglah determinan matriks 3×3: A = [[1,2,3],[4,5,6],[7,8,9]].', 'det(A) = 0 (matriks singular)', 'sedang'),
(4, 'Tentukan rank dari matriks A = [[1,2,3],[2,4,6],[3,6,9]].', 'Rank = 1 (semua baris adalah kelipatan baris pertama)', 'sedang'),

-- SULIT
(4, 'Buktikan bahwa (AB)^T = B^T · A^T untuk sembarang matriks A (m×n) dan B (n×p).', 'Ambil elemen (i,j) dari (AB)^T = elemen (j,i) dari AB = Σ a_jk·b_ki = elemen (i,j) dari B^T·A^T. Terbukti.', 'sulit'),
(4, 'Hitunglah nilai eigen dan vektor eigen dari A = [[4,1],[2,3]].', 'Persamaan karakteristik: (4-λ)(3-λ)-2=0 → λ²-7λ+10=0 → λ₁=5, λ₂=2. Vektor eigen: untuk λ=5: [1,1], untuk λ=2: [1,-2]', 'sulit'),
(4, 'Gunakan metode eliminasi Gauss-Jordan untuk mencari invers dari A = [[1,2,3],[0,1,4],[5,6,0]].', 'A⁻¹ = [[-24,18,5],[20,-15,-4],[-5,4,1]]', 'sulit');

-- ============================================================
-- BANK SOAL - PERSAMAAN LINEAR (id_materi = 5)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(5, 'Selesaikan persamaan linear: 2x + 6 = 14.', 'x = 4', 'mudah'),
(5, 'Tentukan nilai x dari: 3x - 9 = 0.', 'x = 3', 'mudah'),
(5, 'Selesaikan: 5x + 2 = 3x + 10.', 'x = 4', 'mudah'),
(5, 'Tentukan nilai x dan y dari sistem: x + y = 5 dan x - y = 1.', 'x = 3, y = 2', 'mudah'),
(5, 'Selesaikan sistem: 2x + y = 7 dan x + y = 4.', 'x = 3, y = 1', 'mudah'),

-- SEDANG
(5, 'Selesaikan sistem 3 variabel: x+y+z=6, 2x+y+z=8, x+2y+z=7.', 'x=2, y=1, z=3', 'sedang'),
(5, 'Tentukan himpunan penyelesaian: 3x + 4y = 12 dan 6x + 8y = 24.', 'Sistem memiliki banyak solusi (persamaan kedua = 2× persamaan pertama). Solusi: y = (12-3x)/4 untuk semua x.', 'sedang'),
(5, 'Selesaikan SPL menggunakan eliminasi Gauss: 2x + 3y = 5 dan 4x - y = 3.', 'x=1, y=1', 'sedang'),
(5, 'Diketahui harga 3 buku + 2 pensil = Rp 17.000 dan harga 1 buku + 4 pensil = Rp 13.000. Tentukan harga masing-masing.', 'Harga buku = Rp 4.000, harga pensil = Rp 2.500', 'sedang'),

-- SULIT
(5, 'Selesaikan SPL berikut menggunakan metode Cramer: 2x+y-z=3, x-y+2z=1, 3x+2y-z=5.', 'D=1, Dx=1, Dy=-1, Dz=-1. Solusi: x=1, y=-1, z=-1', 'sulit'),
(5, 'Tentukan apakah sistem persamaan x+2y-z=1, 2x+4y-2z=3, 3x+y+z=2 memiliki solusi.', 'Tidak ada solusi (inkonsisten). Persamaan 2 = 2× persamaan 1, tetapi ruas kanannya berbeda (3≠2×1=2).', 'sulit');

-- ============================================================
-- BANK SOAL - TRIGONOMETRI (id_materi = 6)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(6, 'Tentukan nilai sin 30°, cos 60°, dan tan 45°.', 'sin 30° = 1/2, cos 60° = 1/2, tan 45° = 1', 'mudah'),
(6, 'Hitunglah nilai sin²(45°) + cos²(45°).', '1 (identitas Pythagoras)', 'mudah'),
(6, 'Nyatakan sin 120° dalam bentuk eksak.', 'sin 120° = sin(180°-60°) = sin 60° = √3/2', 'mudah'),
(6, 'Tentukan nilai cos 0°, sin 90°, dan tan 0°.', 'cos 0° = 1, sin 90° = 1, tan 0° = 0', 'mudah'),
(6, 'Hitunglah cos²(30°) - sin²(30°).', 'cos²30° - sin²30° = (√3/2)² - (1/2)² = 3/4 - 1/4 = 1/2 = cos 60°', 'mudah'),

-- SEDANG
(6, 'Buktikan identitas: tan²x + 1 = sec²x.', 'sin²x/cos²x + 1 = (sin²x + cos²x)/cos²x = 1/cos²x = sec²x. Terbukti.', 'sedang'),
(6, 'Selesaikan persamaan trigonometri: sin x = √3/2 untuk 0° ≤ x ≤ 360°.', 'x = 60° atau x = 120°', 'sedang'),
(6, 'Hitunglah sin(75°) = sin(45° + 30°) menggunakan rumus penjumlahan sudut.', 'sin(A+B) = sinA·cosB + cosA·sinB = (√2/2)(√3/2) + (√2/2)(1/2) = (√6+√2)/4', 'sedang'),
(6, 'Tentukan nilai x dari: 2cos x - 1 = 0 untuk 0 ≤ x ≤ 2π.', 'cos x = 1/2 → x = π/3 atau x = 5π/3', 'sedang'),

-- SULIT
(6, 'Hitunglah ∫₀^(π/4) tan x dx.', '∫ tan x dx = -ln|cos x| + C. Hasilnya = -ln(cos π/4) + ln(cos 0) = -ln(√2/2) + 0 = (1/2)ln 2', 'sulit'),
(6, 'Buktikan rumus cosinus ganda: cos(2x) = cos²x - sin²x menggunakan rumus penjumlahan sudut.', 'cos(2x) = cos(x+x) = cos x·cos x - sin x·sin x = cos²x - sin²x. Terbukti.', 'sulit'),
(6, 'Selesaikan persamaan: 2sin²x - sin x - 1 = 0 untuk 0° ≤ x < 360°.', 'Faktorkan: (2sin x + 1)(sin x - 1) = 0. sin x = 1 → x = 90°; sin x = -1/2 → x = 210° atau x = 330°', 'sulit');

-- ============================================================
-- BANK SOAL - TRANSFORMASI LINIER (id_materi = 7)
-- ============================================================

INSERT INTO `ai_soal` (`id_materi`, `pertanyaan`, `kunci_jawaban`, `tingkat`) VALUES

-- MUDAH
(7, 'Apakah T: ℝ² → ℝ² dengan T(x,y) = (2x, 3y) merupakan transformasi linear? Jelaskan.', 'Ya. T(u+v) = T(u)+T(v) dan T(αu) = αT(u) terpenuhi.', 'mudah'),
(7, 'Tentukan bayangan dari vektor (1, 2) oleh transformasi T(x, y) = (x + y, x - y).', 'T(1,2) = (1+2, 1-2) = (3, -1)', 'mudah'),
(7, 'Nyatakan transformasi T(x,y) = (3x, 2y) dalam bentuk matriks.', '[[3,0],[0,2]]', 'mudah'),

-- SEDANG
(7, 'Tentukan kernel (null space) dari T: ℝ² → ℝ² dengan matriks A = [[1,2],[2,4]].', 'Ax = 0 → x + 2y = 0 → ker(T) = {t(-2,1) | t ∈ ℝ}', 'sedang'),
(7, 'Tentukan range dari T: ℝ² → ℝ³ dengan T(x,y) = (x+y, x-y, 2x).', 'Range = span{(1,1,2),(1,-1,0)}. Dimensi range = 2.', 'sedang'),
(7, 'Hitunglah komposisi transformasi jika T₁(x,y) = (x+y, x) dan T₂(x,y) = (2x, x+y). Tentukan (T₂∘T₁)(x,y).', 'T₁(x,y) = (x+y, x), kemudian T₂(x+y, x) = (2(x+y), (x+y)+x) = (2x+2y, 2x+y)', 'sedang'),
(7, 'Buktikan bahwa T: ℝ² → ℝ² dengan T(x,y) = (x+1, y) BUKAN transformasi linear.', 'T(0,0) = (1,0) ≠ (0,0). Transformasi linear harus memetakan vektor nol ke vektor nol.', 'sedang'),

-- SULIT
(7, 'Tentukan matriks representasi dari T: P₂ → P₂ (polinom derajat ≤ 2) yang didefinisikan T(p(x)) = p''(x) + p(x) terhadap basis standar {1, x, x²}.', 'T(1)=1, T(x)=x+1, T(x²)=2+x². Matriks: [[1,1,2],[0,1,0],[0,0,1]]', 'sulit'),
(7, 'Tentukan apakah T: ℝ³ → ℝ² dengan matriks A = [[1,2,0],[0,1,3]] bersifat injektif, surjektif, atau bijektif.', 'rank(A)=2=dim(codomain) → surjektif. ker(T): dimensi = 3-2 = 1 ≠ 0 → tidak injektif. Jadi hanya surjektif.', 'sulit');

-- ============================================================
-- SELESAI - Total soal: ~100 soal untuk 7 materi
-- Cara import:
--   1. Buka phpMyAdmin → database matheal → Import → pilih file ini
--   2. Atau akses: http://localhost/matheal/backend/import_soal.php
-- ============================================================
