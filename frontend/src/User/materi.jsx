import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UserSidebar from "../UserSidebar";
import { apiFetch, apiUrl } from "../config/api";

const LEVEL_LABELS = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };
const TOPIC_FILE_HINTS = {
  Limit: "01 Limit",
  Turunan: "02 Turunan",
  Himpunan: "03 Himpunan",
  Boolean: "04 Logika Proposisi",
  "Aljabar Boolean": "05 Aljabar Boolean",
  "Bilangan Kompleks": "06 Bilangan Kompleks",
  Matriks: "07 Determinan",
  "Transformasi Linier": "08 Transformasi Linier",
  Biner: "09 Bilangan Biner",
  "Rekursi Linier": "10 Rekursi Linier",
  "Operasi Graf": "11 Operasi Graf",
  "Analisis Algoritma": "12 Analisis Algoritma",
  Integral: "13 Integral",
  "Persamaan Linear": "14 Persamaan Linear",
  "geometri-dasar": "15 Geometri Dasar",
  "logika-matematika": "16 Logika Matematika",
  Trigonometri: "17 Trigonometri",
};

const normalizeText = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const findMaterialForTopic = (list, topic) => {
  const hint = TOPIC_FILE_HINTS[topic] || topic;
  const normalizedHint = normalizeText(hint);
  return list.find((item) => normalizeText(`${item.title} ${item.filename}`).includes(normalizedHint));
};

const findQuizTopicForMaterial = (material) => {
  const materialText = normalizeText(`${material?.title || ""} ${material?.filename || ""}`);
  return Object.entries(TOPIC_FILE_HINTS).find(([, hint]) => materialText.includes(normalizeText(hint)))?.[0] || material?.title;
};

const resolveMaterialUrl = (material) => {
  const filename = String(material?.filename || "");
  const version = material?.version ? `&v=${encodeURIComponent(material.version)}` : "";
  const fallback = new URL(apiUrl(`material_file.php?file=${encodeURIComponent(filename)}${version}`));
  const resolved = new URL(fallback.href);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  // Saat aplikasi dibuka lewat IP/domain, localhost dari backend harus menunjuk
  // ke host server yang sama, bukan ke perangkat milik pengguna.
  if (localHosts.has(resolved.hostname) && !localHosts.has(window.location.hostname)) {
    resolved.hostname = window.location.hostname;
  }

  return resolved.href;
};

function MateriPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [materiList, setMateriList] = useState([]);
  const [selectedMateri, setSelectedMateri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");

  const queryParams = new URLSearchParams(location.search);
  const requestedTopic = queryParams.get("topik") || "";
  const requestedLevel = ["mudah", "sedang", "sulit"].includes(queryParams.get("tingkat"))
    ? queryParams.get("tingkat")
    : "mudah";

  const fetchMateriFiles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`list_materi_files.php?sync=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        const normalizedMaterials = data.data.map((material) => ({
          ...material,
          url: resolveMaterialUrl(material),
        }));
        setMateriList(normalizedMaterials);
        if (requestedTopic) {
          const matchingMaterial = findMaterialForTopic(normalizedMaterials, requestedTopic);
          if (matchingMaterial) {
            setSearch(matchingMaterial.title);
            handleOpenMateri(matchingMaterial);
          }
        }
      } else {
        setMateriList([]);
      }
    } catch (err) {
      console.error("Failed to fetch materi files:", err);
      setMateriList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriFiles();
  }, [location.search]);

  const handleOpenMateri = (materi) => {
    setSelectedMateri(materi);

    // Log aktivitas user membaca materi
    apiFetch("log_aktivitas.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipe: "materi",
        deskripsi: `Membuka materi '${materi.title}'`,
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== "success") {
        console.warn("Aktivitas materi belum tersimpan:", result.message || `HTTP ${response.status}`);
      }
    }).catch((error) => {
      console.warn("Aktivitas materi belum tersimpan:", error);
    });
  };

  const handleStartQuiz = () => {
    if (!selectedMateri) return;
    const quizTopic = requestedTopic || findQuizTopicForMaterial(selectedMateri);
    localStorage.setItem("selectedLearningPath", JSON.stringify({
      material: quizTopic,
      level: requestedLevel,
      selectedAt: new Date().toISOString(),
    }));
    navigate(`/quiz/${encodeURIComponent(quizTopic)}?tingkat=${requestedLevel}`);
  };

  const getFileIcon = (ext) => {
    switch (ext) {
      case "pdf": return "📄";
      case "pptx":
      case "ppt": return "📊";
      case "docx":
      case "doc": return "📝";
      default: return "📚";
    }
  };

  const filteredMateri = materiList.filter((m) => {
    const matchSearch =
      (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.filename || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(search.toLowerCase());

    if (selectedCategory === "semua") return matchSearch;
    if (selectedCategory === "pdf") return matchSearch && m.extension === "pdf";
    if (selectedCategory === "pptx") return matchSearch && (m.extension === "pptx" || m.extension === "ppt");
    return matchSearch && m.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <>
      <UserSidebar />

      <div className="usb-page-content">
        <div className="mat-container">
          <div className="mat-header">
            <h1>📚 Materi Pembelajaran Matematika</h1>
            <p>Akses {materiList.length} modul & materi lengkap (Diurutkan A-Z)</p>
          </div>

          {requestedTopic && (
            <div className="mat-learning-context">
              <div>
                <span>Jalur belajar aktif</span>
                <strong>{requestedTopic} · Level {LEVEL_LABELS[requestedLevel]}</strong>
                <p>Pelajari modul ini terlebih dahulu. Tombol mulai kuis tersedia di bawah pembaca materi.</p>
              </div>
              <button type="button" onClick={() => selectedMateri && handleStartQuiz()} disabled={!selectedMateri}>
                Mulai Quiz
              </button>
            </div>
          )}

          {/* Controls: Search & Category */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "28px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                placeholder="🔍 Cari topik atau berkas materi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: "14px",
                  border: "1.5px solid #e2e8f0",
                  background: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { id: "semua", label: "🌐 Semua Materi" },
                { id: "Kalkulus", label: "📈 Kalkulus" },
                { id: "Aljabar & Matriks", label: "📐 Aljabar & Matriks" },
                { id: "Matematika Diskrit", label: "🔢 Diskrit" },
                { id: "pdf", label: "📄 PDF" },
                { id: "pptx", label: "📊 PPTX" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "12px",
                    border: selectedCategory === cat.id ? "2px solid #2491ff" : "1.5px solid #e2e8f0",
                    background: selectedCategory === cat.id ? "#eff6ff" : "#ffffff",
                    color: selectedCategory === cat.id ? "#2491ff" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <div className="hp-loading-spinner"></div>
              <span>Memuat berkas materi...</span>
            </div>
          ) : (
            <div className="mat-grid">
              {filteredMateri.map((materi) => (
                <div
                  key={materi.id}
                  className="mat-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Buka materi ${materi.title}`}
                  onClick={() => handleOpenMateri(materi)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenMateri(materi);
                    }
                  }}
                >
                  <div className="mat-card-header">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mat-badge">{materi.category}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: materi.extension === "pdf" ? "#ef4444" : materi.extension === "pptx" ? "#d97706" : "#2563eb",
                          background: materi.extension === "pdf" ? "#fee2e2" : materi.extension === "pptx" ? "#fef3c7" : "#dbeafe",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          textTransform: "uppercase",
                        }}
                      >
                        {materi.extension}
                      </span>
                    </div>

                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                      <span style={{ fontSize: "20px" }}>{getFileIcon(materi.extension)}</span>
                      <span>{materi.title}</span>
                    </h3>
                    <p className="mat-desc">File: <code>{materi.filename}</code> • {materi.size}</p>
                  </div>

                  <div className="mat-body">
                    <div className="mat-preview" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "auto", padding: "10px 14px" }}>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>Ukuran: {materi.size}</span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{materi.mtime}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#2491ff" }}>
                        {materi.extension === "pdf" ? "👁️ Lihat PDF →" : "⬇️ Unduh Berkas →"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredMateri.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📚</div>
              <p style={{ fontWeight: 600, color: "#475569" }}>Materi tidak ditemukan.</p>
              <small>Coba gunakan kata kunci pencarian atau kategori lain.</small>
            </div>
          )}
        </div>
      </div>

      {/* MATERIAL VIEWER MODAL */}
      {selectedMateri && (
        <div className="viewer-overlay" onClick={() => setSelectedMateri(null)}>
          <div className="viewer-box" role="dialog" aria-modal="true" aria-labelledby="material-viewer-title" style={{ width: "92%", maxWidth: "960px", height: "88vh", display: "flex", flexDirection: "column", padding: "20px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "28px" }}>{getFileIcon(selectedMateri.extension)}</span>
                <div>
                  <h2 id="material-viewer-title" style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>{selectedMateri.title}</h2>
                  <small style={{ color: "#64748b" }}>{selectedMateri.filename} • {selectedMateri.size}</small>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={selectedMateri.url}
                  download={selectedMateri.filename}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 16px",
                    background: "#2491ff",
                    color: "white",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "13px",
                    textDecoration: "none"
                  }}
                >
                  ⬇️ Unduh Berkas
                </a>
                <button className="viewer-close" onClick={() => setSelectedMateri(null)} aria-label="Tutup materi">
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {selectedMateri.extension === "pdf" ? (
                <iframe src={selectedMateri.url} title={selectedMateri.title} style={{ width: "100%", height: "100%", border: "none" }} />
              ) : (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "56px", marginBottom: "16px" }}>{getFileIcon(selectedMateri.extension)}</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>{selectedMateri.title}</h3>
                  <p style={{ color: "#64748b", maxWidth: "450px", margin: "10px auto 24px", lineHeight: 1.6 }}>
                    Berkas berformat <strong>{selectedMateri.extension.toUpperCase()}</strong> dapat diunduh langsung untuk dipelajari di perangkat Anda.
                  </p>
                  <a
                    href={selectedMateri.url}
                    download={selectedMateri.filename}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "14px 28px",
                      background: "#2491ff",
                      color: "white",
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: "15px",
                      textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(36,145,255,0.3)"
                    }}
                  >
                    ⬇️ Unduh Berkas ({selectedMateri.size})
                  </a>
                </div>
              )}
            </div>
            <div className="viewer-quiz-footer">
              <div>
                <span>Sudah selesai mempelajari materi?</span>
                <strong>Lanjutkan ke kuis {LEVEL_LABELS[requestedLevel]} untuk {requestedTopic || findQuizTopicForMaterial(selectedMateri)}</strong>
              </div>
              <button type="button" onClick={handleStartQuiz}>Mulai Quiz Sekarang</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MateriPage;
