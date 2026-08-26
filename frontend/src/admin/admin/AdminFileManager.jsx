import { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

// ─── Warna badge per level ──────────────────────────────────────────────────
const LEVEL_CONFIG = {
  mudah: {
    label: "Dasar",
    emoji: "🌱",
    color: "#10b981",
    bg: "#d1fae5",
    folderIcon: "📂",
    desc: "Soal tingkat mudah — cocok untuk pemula",
  },
  sedang: {
    label: "Penerapan",
    emoji: "🚀",
    color: "#f59e0b",
    bg: "#fef3c7",
    folderIcon: "📂",
    desc: "Soal tingkat sedang — untuk yang sudah paham dasar",
  },
  sulit: {
    label: "Challenge",
    emoji: "🔥",
    color: "#ef4444",
    bg: "#fee2e2",
    folderIcon: "📂",
    desc: "Soal tingkat sulit — tantangan untuk yang mahir",
  },
};

const EMPTY_PG_OPTIONS = ["", "", "", ""];

function parseQuestionOptions(rawOptions) {
  if (Array.isArray(rawOptions)) return [...rawOptions, ...EMPTY_PG_OPTIONS].slice(0, 4).map((item) => String(item || ""));
  if (typeof rawOptions === "string" && rawOptions.trim()) {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) return [...parsed, ...EMPTY_PG_OPTIONS].slice(0, 4).map((item) => String(item || ""));
    } catch {
      // Data opsi lama yang tidak valid ditampilkan sebagai kolom kosong agar dapat diperbaiki admin.
    }
  }
  return [...EMPTY_PG_OPTIONS];
}

// ─── Sub-komponen: Daftar soal di dalam satu level ──────────────────────────
const LevelSoalView = ({ tingkat, material, onBack }) => {
  const config = LEVEL_CONFIG[tingkat];
  const [materi, setMateri] = useState([]);
  const [soal, setSoal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMateri, setFilterMateri] = useState(String(material?.id_materi || "all"));
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMateri, setImportMateri] = useState(String(material?.id_materi || ""));
  const [editSoal, setEditSoal] = useState(null);
  const [soalForm, setSoalForm] = useState({
    id_materi: material?.id_materi || "",
    pertanyaan: "",
    kunci_jawaban: "",
    tingkat: tingkat,
    tipe: "esai",
    opsi: [...EMPTY_PG_OPTIONS],
  });
  const [selectedSoal, setSelectedSoal] = useState([]);
  const [expandedMateri, setExpandedMateri] = useState({});

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [soalRes, materiRes] = await Promise.all([
        apiFetch("read_soal.php"),
        apiFetch("read_materi.php"),
      ]);
      const soalData = await soalRes.json();
      const materiData = await materiRes.json();
      setSoal(Array.isArray(soalData) ? soalData : []);
      setMateri(Array.isArray(materiData) ? materiData : []);
      // By default expand all materi
      const exp = {};
      (Array.isArray(materiData) ? materiData : []).forEach(
        (m) => (exp[m.id_materi] = true)
      );
      setExpandedMateri(exp);
    } catch {
      setSoal([]);
      setMateri([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Filter soal by current tingkat + search + materi
  const filteredSoal = soal.filter((s) => {
    const matchTingkat = (s.tingkat || "mudah").toLowerCase() === tingkat;
    const matchSearch = s.pertanyaan
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchMateri =
      filterMateri === "all" || s.id_materi == filterMateri;
    return matchTingkat && matchSearch && matchMateri;
  });

  // Group soal by id_materi
  const grouped = {};
  filteredSoal.forEach((s) => {
    if (!grouped[s.id_materi]) grouped[s.id_materi] = [];
    grouped[s.id_materi].push(s);
  });

  const getMateriName = (id) =>
    materi.find((m) => m.id_materi == id)?.nama_materi || `Materi #${id}`;

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const openAddSoal = (id_materi = material?.id_materi || "") => {
    setEditSoal(null);
    setSoalForm({ id_materi, pertanyaan: "", kunci_jawaban: "", tingkat, tipe: "esai", opsi: [...EMPTY_PG_OPTIONS] });
    setShowModal(true);
  };

  const openEditSoal = (s) => {
    setEditSoal(s);
    setSoalForm({
      id_materi: s.id_materi,
      pertanyaan: s.pertanyaan,
      kunci_jawaban: s.kunci_jawaban,
      tingkat: s.tingkat || tingkat,
      tipe: ["pg", "esai", "tf"].includes(s.tipe) ? s.tipe : "esai",
      opsi: parseQuestionOptions(s.opsi),
    });
    setShowModal(true);
  };

  const handleSaveSoal = async (e) => {
    e.preventDefault();
    if (soalForm.tipe === "pg" && soalForm.opsi.some((option) => !String(option).trim())) {
      alert("Lengkapi keempat opsi pilihan ganda.");
      return;
    }
    const url = editSoal
      ? "update_soal.php"
      : "create_soal.php";
    const body = editSoal
      ? { id_soal: editSoal.id_soal, ...soalForm }
      : { ...soalForm };
    try {
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Soal gagal disimpan.");
      setShowModal(false);
      setEditSoal(null);
      fetchAll();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteSoal = async (id) => {
    if (!window.confirm("Hapus soal ini?")) return;
    try {
      const response = await apiFetch("delete_soal.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_soal: id }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Soal gagal dihapus.");
      setSelectedSoal((prev) => prev.filter((sid) => sid !== id));
      fetchAll();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedSoal.length) return;
    if (
      !window.confirm(
        `Hapus ${selectedSoal.length} soal yang dipilih?`
      )
    )
      return;
    for (const id of selectedSoal) {
      await apiFetch("delete_soal.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_soal: id }),
      });
    }
    setSelectedSoal([]);
    fetchAll();
  };

  const toggleSelect = (id) => {
    setSelectedSoal((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ── Import Docx ────────────────────────────────────────────────────────────
  const handleImportDocx = async (e) => {
    e.preventDefault();
    if (!importFile) return alert("Pilih file Word (.docx) terlebih dahulu!");
    if (!importMateri)
      return alert("Pilih materi tujuan import terlebih dahulu!");

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({
          arrayBuffer: evt.target.result,
        });
        const doc = new DOMParser().parseFromString(
          result.value,
          "text/html"
        );
        const table = doc.querySelector("table");
        if (!table) {
          alert("Tidak ditemukan tabel dalam file docx!");
          setImporting(false);
          return;
        }
        const rows = Array.from(table.querySelectorAll("tr")).slice(1);
        let ok = 0,
          fail = 0;
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll("td, th"));
          if (cells.length < 2) continue;
          let pertanyaan = "",
            kunci_jawaban = "";
          if (cells.length >= 4) {
            pertanyaan = cells[1].textContent.trim();
            kunci_jawaban = cells[2].textContent.trim();
          } else {
            pertanyaan = cells[0].textContent.trim();
            kunci_jawaban = cells[1].textContent.trim();
          }
          if (pertanyaan && kunci_jawaban) {
            try {
              const res = await apiFetch(
                "create_soal.php",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id_materi: importMateri,
                    pertanyaan,
                    kunci_jawaban,
                    tingkat,
                  }),
                }
              );
              res.ok ? ok++ : fail++;
            } catch {
              fail++;
            }
          }
        }
        alert(`Import selesai!\nBerhasil: ${ok}\nGagal: ${fail}`);
        setShowImportModal(false);
        setImportFile(null);
        fetchAll();
      } catch (err) {
        alert("Gagal membaca file Docx.");
        console.error(err);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  const toggleExpandMateri = (id) => {
    setExpandedMateri((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const soalByThisLevel = soal.filter(
    (s) => (s.tingkat || "mudah").toLowerCase() === tingkat &&
      (!material || String(s.id_materi) === String(material.id_materi))
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="afm-level-header" style={{ borderLeftColor: config.color }}>
        <button className="afm-back-btn" onClick={onBack}>
          ← Kembali
        </button>
        <div className="afm-level-icon" style={{ background: config.bg, color: config.color }}>
          {config.emoji}
        </div>
        <div>
          <h2 className="afm-level-title">{config.label} · {material?.nama_materi}</h2>
          <p className="afm-level-desc">{config.desc}</p>
        </div>
        <div className="afm-level-stats" style={{ marginLeft: "auto" }}>
          <span
            className="afm-stat-pill"
            style={{ background: config.bg, color: config.color }}
          >
            📝 {soalByThisLevel.length} total soal
          </span>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="afm-toolbar">
        <input
          className="adm-search"
          placeholder="🔍 Cari soal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="adm-search"
          style={{ width: 180 }}
          value={filterMateri}
          onChange={(e) => setFilterMateri(e.target.value)}
          disabled={Boolean(material)}
        >
          <option value="all">Semua Materi</option>
          {materi.map((m) => (
            <option key={m.id_materi} value={m.id_materi}>
              {m.nama_materi}
            </option>
          ))}
        </select>
        {selectedSoal.length > 0 && (
          <button
            className="btn-del"
            style={{ padding: "8px 16px" }}
            onClick={handleBulkDelete}
          >
            🗑️ Hapus {selectedSoal.length} Soal
          </button>
        )}
        <button
          className="btn-add afm-import-btn"
          onClick={() => setShowImportModal(true)}
        >
          📥 Import Docx
        </button>
        <button className="btn-add" onClick={() => openAddSoal()}>
          + Tambah Soal
        </button>
      </div>

      {/* ── File Tree View ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="empty-state">⏳ Memuat data...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div>📭</div>
          <div>
            Belum ada soal untuk level ini.
            <br />
            <small style={{ color: "#94a3b8" }}>
              Klik "+ Tambah Soal" atau "Import Docx" untuk mulai menambahkan
              soal.
            </small>
          </div>
        </div>
      ) : (
        <div className="afm-tree">
          {/* Root folder = level */}
          <div className="afm-tree-root">
            <span className="afm-folder-icon">📁</span>
            <span
              className="afm-folder-name"
              style={{ color: config.color, fontWeight: 700 }}
            >
              Level_{config.label.replace("Level ", "")}
            </span>
          </div>
          {Object.entries(grouped).map(([idMateri, soalList]) => (
            <div key={idMateri} className="afm-tree-branch">
              {/* Materi folder */}
              <div
                className="afm-tree-folder"
                onClick={() => toggleExpandMateri(idMateri)}
              >
                <span className="afm-folder-toggle">
                  {expandedMateri[idMateri] ? "▾" : "▸"}
                </span>
                <span className="afm-folder-icon">📂</span>
                <span className="afm-folder-name">
                  {getMateriName(idMateri)}
                </span>
                <span
                  className="afm-file-count"
                  style={{ background: config.bg, color: config.color }}
                >
                  {soalList.length} soal
                </span>
                <button
                  className="afm-add-in-folder"
                  style={{ color: config.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddSoal(idMateri);
                  }}
                  title="Tambah soal di materi ini"
                >
                  +
                </button>
              </div>

              {/* Soal files */}
              {expandedMateri[idMateri] && (
                <div className="afm-tree-files">
                  {soalList.map((s, i) => (
                    <div
                      key={s.id_soal}
                      className={`afm-tree-file ${
                        selectedSoal.includes(s.id_soal) ? "selected" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="afm-check"
                        checked={selectedSoal.includes(s.id_soal)}
                        onChange={() => toggleSelect(s.id_soal)}
                      />
                      <span className="afm-file-icon">📄</span>
                      <span className="afm-file-num" style={{ color: "#94a3b8" }}>
                        {String(i + 1).padStart(2, "0")}.
                      </span>
                      <span className="afm-file-text" title={s.pertanyaan}>
                        {s.pertanyaan?.substring(0, 65)}
                        {s.pertanyaan?.length > 65 ? "…" : ""}
                      </span>
                      <span
                        className="afm-file-answer"
                        title={s.kunci_jawaban}
                      >
                        ✅ {s.kunci_jawaban?.substring(0, 25)}
                        {s.kunci_jawaban?.length > 25 ? "…" : ""}
                      </span>
                      <div className="afm-file-actions">
                        <button
                          className="btn-edit"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => openEditSoal(s)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-del"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => handleDeleteSoal(s.id_soal)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Tambah / Edit Soal ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box"
            style={{ width: 620 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">
              {editSoal ? "✏️ Edit Soal" : "➕ Tambah Soal Baru"}
            </div>
            <form onSubmit={handleSaveSoal}>
              <div className="form-group">
                <label className="form-label">Materi / Topik</label>
                <select
                  className="form-select"
                  required
                  value={soalForm.id_materi}
                  onChange={(e) =>
                    setSoalForm({ ...soalForm, id_materi: e.target.value })
                  }
                >
                  <option value="">-- Pilih Materi --</option>
                  {materi.map((m) => (
                    <option key={m.id_materi} value={m.id_materi}>
                      {m.nama_materi}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Level Kesulitan</label>
                <select
                  className="form-select"
                  value={soalForm.tingkat}
                  onChange={(e) =>
                    setSoalForm({ ...soalForm, tingkat: e.target.value })
                  }
                >
                  <option value="mudah">🌱 Mudah</option>
                  <option value="sedang">🚀 Sedang</option>
                  <option value="sulit">🔥 Sulit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipe Soal</label>
                <select
                  className="form-select"
                  value={soalForm.tipe}
                  onChange={(e) => {
                    const tipe = e.target.value;
                    setSoalForm({
                      ...soalForm,
                      tipe,
                      opsi: tipe === "pg" ? parseQuestionOptions(soalForm.opsi) : [...EMPTY_PG_OPTIONS],
                      kunci_jawaban: tipe === "pg"
                        ? (["A", "B", "C", "D"].includes(soalForm.kunci_jawaban) ? soalForm.kunci_jawaban : "A")
                        : tipe === "tf"
                          ? (["Benar", "Salah"].includes(soalForm.kunci_jawaban) ? soalForm.kunci_jawaban : "Benar")
                          : soalForm.kunci_jawaban,
                    });
                  }}
                >
                  <option value="esai">📝 Esai</option>
                  <option value="pg">🔘 Pilihan Ganda</option>
                  <option value="tf">✓✕ Benar / Salah</option>
                </select>
                <small style={{ color: "#64748b", display: "block", marginTop: 6 }}>
                  {soalForm.tipe === "esai" && "Pengguna menulis proses dan jawaban akhir."}
                  {soalForm.tipe === "pg" && "Isi empat opsi, lalu pilih huruf jawaban yang benar."}
                  {soalForm.tipe === "tf" && "Tulis satu pernyataan yang dapat dinilai Benar atau Salah."}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Pertanyaan</label>
                <textarea
                  className="form-input"
                  required
                  rows="4"
                  value={soalForm.pertanyaan}
                  onChange={(e) =>
                    setSoalForm({ ...soalForm, pertanyaan: e.target.value })
                  }
                />
              </div>
              {soalForm.tipe === "pg" && (
                <div className="form-group">
                  <label className="form-label">Opsi Jawaban</label>
                  {soalForm.opsi.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <div key={letter} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <strong style={{ width: 24, color: "#215f6d" }}>{letter}.</strong>
                        <input
                          className="form-input"
                          required
                          value={option}
                          placeholder={`Opsi ${letter}`}
                          onChange={(e) => {
                            const opsi = [...soalForm.opsi];
                            opsi[index] = e.target.value;
                            setSoalForm({ ...soalForm, opsi });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Kunci Jawaban</label>
                {soalForm.tipe === "pg" ? (
                  <select className="form-select" value={soalForm.kunci_jawaban} onChange={(e) => setSoalForm({ ...soalForm, kunci_jawaban: e.target.value })}>
                    {["A", "B", "C", "D"].map((letter) => <option key={letter} value={letter}>{letter} — {soalForm.opsi[letter.charCodeAt(0) - 65] || `Opsi ${letter}`}</option>)}
                  </select>
                ) : soalForm.tipe === "tf" ? (
                  <select className="form-select" value={soalForm.kunci_jawaban} onChange={(e) => setSoalForm({ ...soalForm, kunci_jawaban: e.target.value })}>
                    <option value="Benar">Benar</option>
                    <option value="Salah">Salah</option>
                  </select>
                ) : (
                  <textarea
                    className="form-input"
                    required
                    rows="3"
                    value={soalForm.kunci_jawaban}
                    onChange={(e) => setSoalForm({ ...soalForm, kunci_jawaban: e.target.value })}
                  />
                )}
              </div>
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-save">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Import Docx ──────────────────────────────────────────── */}
      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            className="modal-box"
            style={{ width: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">📥 Import Soal dari Word Docs</div>
            <div
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                border: "1.5px dashed #cbd5e1",
                marginBottom: "20px",
              }}
            >
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 8,
                }}
              >
                Format Tabel (.docx):
              </h4>
              <ul style={{ fontSize: 12, color: "#64748b", marginLeft: 20 }}>
                <li>
                  <b>Pertanyaan</b> — teks soal
                </li>
                <li>
                  <b>Kunci Jawaban</b> — jawaban benar
                </li>
              </ul>
              <p
                style={{ fontSize: 12, color: config.color, marginTop: 8 }}
              >
                Soal akan masuk ke level{" "}
                <b>{config.label}</b>.
              </p>
            </div>
            <form onSubmit={handleImportDocx}>
              <div className="form-group">
                <label className="form-label">Materi Tujuan Import</label>
                <select
                  className="form-select"
                  required
                  value={importMateri}
                  onChange={(e) => setImportMateri(e.target.value)}
                  disabled={importing}
                >
                  <option value="">-- Pilih Materi --</option>
                  {materi.map((m) => (
                    <option key={m.id_materi} value={m.id_materi}>
                      {m.nama_materi}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Upload File (.docx)</label>
                <input
                  type="file"
                  accept=".docx"
                  className="form-input"
                  required
                  onChange={(e) => setImportFile(e.target.files[0])}
                  disabled={importing}
                />
              </div>
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  style={{ background: "#10b981" }}
                  disabled={importing}
                >
                  {importing ? "Mengimpor..." : "Mulai Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Komponen Utama: Admin File Manager ─────────────────────────────────────
const AdminFileManager = () => {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [soalCounts, setSoalCounts] = useState({ mudah: 0, sedang: 0, sulit: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await apiFetch(`read_materi.php?t=${Date.now()}`, { cache: "no-store" });
        const data = await response.json();
        setMaterials(Array.isArray(data) ? data : []);
      } catch {
        setMaterials([]);
      }
    };
    fetchMaterials();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const res = await apiFetch("read_soal.php");
        const data = await res.json();
        const counts = { mudah: 0, sedang: 0, sulit: 0 };
        if (Array.isArray(data)) {
          data.forEach((s) => {
            if (selectedMaterial && String(s.id_materi) !== String(selectedMaterial.id_materi)) return;
            const t = (s.tingkat || "mudah").toLowerCase();
            if (counts[t] !== undefined) counts[t]++;
          });
        }
        setSoalCounts(counts);
      } catch {
        setSoalCounts({ mudah: 0, sedang: 0, sulit: 0 });
      }
      setLoadingCounts(false);
    };
    fetchCounts();
  }, [selectedLevel, selectedMaterial]);

  if (selectedLevel) {
    return (
      <div className="adm-card afm-wrapper afm-level-view">
        <LevelSoalView
          tingkat={selectedLevel}
          material={selectedMaterial}
          onBack={() => setSelectedLevel(null)}
        />
      </div>
    );
  }

  if (!selectedMaterial) {
    return (
      <div className="adm-card afm-wrapper afm-material-view">
        <div className="adm-card-header" style={{ marginBottom: 24 }}>
          <div>
            <span className="adm-card-title">Bank Soal</span>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              Pilih materi terlebih dahulu, lalu kelola soal Dasar, Penerapan, atau Challenge.
            </div>
          </div>
        </div>
        {materials.length ? (
          <div className="afm-folder-grid">
            {materials.map((item) => (
              <button type="button" key={item.id_materi} className="afm-folder-card afm-material-card"
                style={{ borderTopColor: "#2563eb", textAlign: "left", width: "100%" }}
                onClick={() => setSelectedMaterial(item)}>
                <div className="afm-folder-card-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>▤</div>
                <div className="afm-folder-card-name">{item.nama_materi}</div>
                <div className="afm-folder-card-desc">Kelola soal untuk materi ini</div>
                <div className="afm-folder-card-count" style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#dbeafe" }}>
                  {Number(item.jumlah_soal) || 0} soal
                </div>
                <div className="afm-folder-card-arrow" style={{ color: "#2563eb" }}>Pilih Materi →</div>
              </button>
            ))}
          </div>
        ) : <div className="empty-state">Belum ada data materi untuk bank soal.</div>}
      </div>
    );
  }

  return (
    <div className="adm-card afm-wrapper afm-category-view">
      {/* ── Header ── */}
      <div className="adm-card-header" style={{ marginBottom: 24 }}>
        <div>
          <span className="adm-card-title">Bank Soal · {selectedMaterial.nama_materi}</span>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Kelola bank soal berdasarkan level kesulitan — terstruktur seperti
            folder Soal.
          </div>
        </div>
        <button className="afm-back-btn" type="button" onClick={() => setSelectedMaterial(null)}>
          ← Ganti Materi
        </button>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="afm-breadcrumb">
        <span className="afm-bread-root">🏠 Bank Soal</span>
        <span className="afm-bread-sep">/</span>
        <span>{selectedMaterial.nama_materi}</span>
        <span className="afm-bread-sep">/</span>
        <span className="afm-bread-current">Pilih Kategori</span>
      </div>

      {/* ── Folder Grid ── */}
      <div className="afm-folder-grid">
        {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className="afm-folder-card afm-category-card"
            style={{ borderTopColor: cfg.color }}
            onClick={() => setSelectedLevel(key)}
          >
            <div
              className="afm-folder-card-icon"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.emoji}
            </div>
            <div className="afm-folder-card-name">{cfg.label}</div>
            <div className="afm-folder-card-desc">{cfg.desc}</div>
            <div
              className="afm-folder-card-count"
              style={{ color: cfg.color, borderColor: cfg.bg, background: cfg.bg }}
            >
              {loadingCounts ? "..." : soalCounts[key]} soal
            </div>
            <div className="afm-folder-card-arrow" style={{ color: cfg.color }}>
              Buka Folder →
            </div>
          </div>
        ))}
      </div>

      {/* ── Summary bar ── */}
      <div className="afm-summary-bar">
        <span>📊 Total Soal:</span>
        {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
          <span
            key={key}
            className="afm-summary-chip"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.emoji} {cfg.label.replace("Level ", "")}: {loadingCounts ? "..." : soalCounts[key]}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AdminFileManager;
