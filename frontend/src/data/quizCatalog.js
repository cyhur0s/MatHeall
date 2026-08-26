export const QUIZ_LEVELS = ["mudah", "sedang", "sulit"];

export const QUIZ_CATEGORIES = [
  { key: "Limit", title: "Limit", type: "Kuis Limit", tingkat: "mudah" },
  { key: "Turunan", title: "Turunan", type: "Kuis Turunan", tingkat: "mudah" },
  { key: "Himpunan", title: "Himpunan & Fungsi Komposisi", type: "Fungsi Komposisi", tingkat: "mudah" },
  { key: "Boolean", title: "Logika Proposisi & Fungsi Invers", type: "Logika Proposisi & Fungsi Invers", tingkat: "mudah" },
  { key: "Aljabar Boolean", title: "Aljabar Boolean & Peta Karnaugh", type: "Peta Karnaugh", tingkat: "mudah" },
  { key: "Bilangan Kompleks", title: "Bilangan Kompleks & Koordinat Polar", type: "Koordinat Polar", tingkat: "mudah" },
  { key: "Matriks", title: "Determinan & Invers Matriks", type: "Kuis Matriks", tingkat: "sedang" },
  { key: "Transformasi Linier", title: "Transformasi Linier", type: "Pemetaan Linear", tingkat: "sedang" },
  { key: "Biner", title: "Bilangan Biner", type: "Aljabar Biner", tingkat: "sedang" },
  { key: "Rekursi Linier", title: "Relasi Rekurensi Linier", type: "Kuis Rekursi", tingkat: "sedang" },
  { key: "Operasi Graf", title: "Operasi Pada Graf", type: "Teori Graf", tingkat: "sedang" },
  { key: "Analisis Algoritma", title: "Analisis Algoritma", type: "Kompleksitas Algoritma", tingkat: "sedang" },
  { key: "Integral", title: "Integral Lanjut", type: "Teknik Integrasi", tingkat: "sedang" },
  { key: "Persamaan Linear", title: "Persamaan Linear", type: "Sistem Persamaan Linear", tingkat: "sulit" },
  { key: "geometri-dasar", title: "Geometri Dasar", type: "Kuis Geometri", tingkat: "sulit" },
  { key: "logika-matematika", title: "Logika Matematika", type: "Penalaran Logis", tingkat: "sulit" },
  { key: "Trigonometri", title: "Trigonometri Lanjut", type: "Pembuktian & Persamaan", tingkat: "sulit" },
];

// Pemetaan ini menjadi acuan tunggal hubungan kuis dengan berkas materi.
// `key` tetap dipertahankan karena digunakan oleh data soal di database,
// sedangkan `title` adalah nama yang ditampilkan kepada pengguna.
export const MATERIAL_TOPIC_MAP = Object.freeze({
  Limit: "01 Limit",
  Turunan: "02 Turunan",
  Himpunan: "03 Himpunan",
  Boolean: "04 Logika Proposisi Fungsi Invers",
  "Aljabar Boolean": "05 Aljabar Boolean Peta Karnaugh",
  "Bilangan Kompleks": "06 Bilangan Kompleks",
  Matriks: "07 Determinan Invers Matriks",
  "Transformasi Linier": "08 Transformasi Linier",
  Biner: "09 Bilangan Biner",
  "Rekursi Linier": "10 Relasi Rekurensi Linier",
  "Operasi Graf": "11 Operasi Pada Graf",
  "Analisis Algoritma": "12 Analisis Algoritma",
  Integral: "13 Integral",
  "Persamaan Linear": "14 Persamaan Linear",
  "geometri-dasar": "15 Geometri Dasar",
  "logika-matematika": "16 Logika Matematika",
  Trigonometri: "17 Trigonometri",
});

const MATERIAL_ALIASES = Object.freeze({
  "Boolean & Logika Proposisi": "Boolean",
  "Boolean": "Boolean",
  "Himpunan": "Himpunan",
  "Bilangan Biner": "Biner",
  "Biner": "Biner",
  "Bilangan Kompleks": "Bilangan Kompleks",
  "Geometri Dasar": "geometri-dasar",
  "Logika Matematika": "logika-matematika",
});

const normalizeCatalogText = (value = "") => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

// Nama pada database lama tetap didukung, tetapi antarmuka selalu dapat
// memakai judul modul resmi yang sama dengan halaman materi dan kuis.
export const findQuizCategoryForMaterial = (materialName = "") => {
  const directKey = MATERIAL_ALIASES[materialName] || materialName;
  const directMatch = QUIZ_CATEGORIES.find((item) => item.key === directKey);
  if (directMatch) return directMatch;

  const normalized = normalizeCatalogText(materialName);
  return QUIZ_CATEGORIES.find((item) => {
    const key = normalizeCatalogText(item.key);
    const title = normalizeCatalogText(item.title);
    return normalized === key || normalized === title || normalized.includes(key) || key.includes(normalized);
  }) || null;
};
