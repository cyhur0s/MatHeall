import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../UserSidebar";
import { QUIZ_CATEGORIES } from "../data/quizCatalog";
import { syncCurrentUserProgress } from "../utils/userProgress";
import { getStoredStreak } from "../utils/streak";
import { formatHeartCountdown, getHeartState } from "../utils/hearts";
import { getDailyMissionStatus } from "../utils/dailyMissions";
import CertificateModal, { ensureCertificateRecord } from "./CertificateModal";

const LEVEL_META = {
  mudah:  { emoji: "🌱", color: "#2f7372", bg: "#eaf4f0", label: "Mudah",  gradient: "linear-gradient(135deg, #4f968b, #2f7372)" },
  sedang: { emoji: "🚀", color: "#a76531", bg: "#fff1e3", label: "Sedang", gradient: "linear-gradient(135deg, #e5a361, #c7793d)" },
  sulit:  { emoji: "🔥", color: "#a84f46", bg: "#fff0ed", label: "Sulit",  gradient: "linear-gradient(135deg, #dd786c, #b9554d)" },
};

// Kata Kunci & Rumus per topik kuis
const LEVEL_FORMULAS = {
  "Limit": [
    { label: "Limit dasar", formula: "lim[x→a] f(x) = L" },
    { label: "L'Hôpital", formula: "lim f(x)/g(x) = lim f'(x)/g'(x)" },
    { label: "Limit tak hingga", formula: "lim[x→∞] 1/x = 0" },
    { label: "Limit eksponen", formula: "lim[x→0] (eˣ - 1)/x = 1" },
  ],
  "Turunan": [
    { label: "Aturan pangkat", formula: "d/dx [xⁿ] = nxⁿ⁻¹" },
    { label: "Aturan rantai", formula: "d/dx [f(g(x))] = f'(g(x))·g'(x)" },
    { label: "Produk", formula: "d/dx [uv] = u'v + uv'" },
    { label: "Hasil bagi", formula: "d/dx [u/v] = (u'v − uv') / v²" },
  ],
  "Himpunan": [
    { label: "Himpunan semesta", formula: "A ⊆ U, B ⊆ U" },
    { label: "Fungsi komposisi", formula: "(f∘g)(x) = f(g(x))" },
    { label: "Invers", formula: "(f∘f⁻¹)(x) = x" },
    { label: "Gabungan", formula: "A ∪ B = {x | x ∈ A atau x ∈ B}" },
  ],
  "Boolean": [
    { label: "AND", formula: "A · B" },
    { label: "OR", formula: "A + B" },
    { label: "NOT", formula: "Ā (komplemen)" },
    { label: "De Morgan", formula: "(A·B)' = A' + B'" },
  ],
  "Aljabar Boolean": [
    { label: "Identitas", formula: "A + 0 = A, A · 1 = A" },
    { label: "Komplemen", formula: "A + A' = 1, A · A' = 0" },
    { label: "Peta Karnaugh", formula: "Kelompokkan 1s berdekatan" },
  ],
  "Bilangan Kompleks": [
    { label: "Bentuk", formula: "z = a + bi, i² = -1" },
    { label: "Modulus", formula: "|z| = √(a² + b²)" },
    { label: "Polar", formula: "z = r(cos θ + i sin θ) = re^(iθ)" },
    { label: "Euler", formula: "e^(iπ) + 1 = 0" },
  ],
  "Matriks": [
    { label: "Determinan 2×2", formula: "det(A) = ad − bc" },
    { label: "Invers 2×2", formula: "A⁻¹ = 1/det(A) · [d  -b; -c  a]" },
    { label: "Syarat invers", formula: "det(A) ≠ 0" },
  ],
  "Transformasi Linier": [
    { label: "Kernel", formula: "ker(T) = {v | T(v) = 0}" },
    { label: "Range", formula: "Im(T) = {T(v) | v ∈ V}" },
    { label: "Dimensi", formula: "dim(ker T) + dim(Im T) = dim(V)" },
  ],
  "Biner": [
    { label: "Desimal→Biner", formula: "Bagi berulang dengan 2, ambil sisa" },
    { label: "Biner→Desimal", formula: "∑ bᵢ · 2ⁱ" },
    { label: "Tambah biner", formula: "0+0=0, 0+1=1, 1+1=10" },
  ],
  "Rekursi Linier": [
    { label: "Fibonacci", formula: "F(n) = F(n-1) + F(n-2)" },
    { label: "Bentuk umum", formula: "aₙ = c₁r₁ⁿ + c₂r₂ⁿ" },
    { label: "Persamaan karakteristik", formula: "r² − pr − q = 0" },
  ],
  "Operasi Graf": [
    { label: "Derajat simpul", formula: "deg(v) = jumlah sisi yang terhubung" },
    { label: "握手(handshaking)", formula: "∑ deg(v) = 2|E|" },
    { label: "Euler path", formula: "Tepat 0 atau 2 simpul berderajat ganjil" },
  ],
  "Analisis Algoritma": [
    { label: "Big-O", formula: "O(1) < O(log n) < O(n) < O(n log n) < O(n²)" },
    { label: "T(n) rekursif", formula: "T(n) = aT(n/b) + f(n)" },
    { label: "Master theorem", formula: "Bandingkan f(n) dengan n^log_b(a)" },
  ],
  "Integral": [
    { label: "Pangkat", formula: "∫ xⁿ dx = xⁿ⁺¹/(n+1) + C" },
    { label: "Substitusi", formula: "∫ f(g(x))g'(x) dx = F(g(x)) + C" },
    { label: "Parsial", formula: "∫ u dv = uv − ∫ v du" },
    { label: "Tentu", formula: "∫[a,b] f(x) dx = F(b) − F(a)" },
  ],
  "Persamaan Linear": [
    { label: "Eliminasi Gauss", formula: "Eselonkan matriks augmentasi" },
    { label: "Cramer", formula: "xᵢ = det(Aᵢ) / det(A)" },
    { label: "n persamaan", formula: "Ax = b, solusi: x = A⁻¹b" },
  ],
  "geometri-dasar": [
    { label: "Luas segitiga", formula: "A = ½ · a · t" },
    { label: "Teorema Pythagoras", formula: "a² + b² = c²" },
    { label: "Lingkaran", formula: "A = πr², K = 2πr" },
    { label: "Bola", formula: "V = 4/3 πr³, L = 4πr²" },
  ],
  "logika-matematika": [
    { label: "Implikasi", formula: "p → q ≡ ¬p ∨ q" },
    { label: "Biimplikasi", formula: "p ↔ q ≡ (p→q) ∧ (q→p)" },
    { label: "Kontrapositif", formula: "p→q ≡ ¬q→¬p" },
    { label: "De Morgan", formula: "¬(p∧q) ≡ ¬p ∨ ¬q" },
  ],
  "Trigonometri": [
    { label: "Identitas dasar", formula: "sin²θ + cos²θ = 1" },
    { label: "Tan", formula: "tan θ = sin θ / cos θ" },
    { label: "Jumlah sudut", formula: "sin(A+B) = sinA cosB + cosA sinB" },
    { label: "Persamaan", formula: "sin θ = sin α → θ = α + 360°n" },
  ],
};

// Panduan modal steps
const GUIDE_STEPS = [
  {
    icon: "📝",
    title: "Cara Mengakses dan Mengerjakan Kuis",
    steps: [
      "Buka menu Beranda untuk melihat Peta Belajar Matheal",
      "Pilih kartu materi yang ingin kamu pelajari",
      "Pilih tingkat Mudah, Sedang, atau Sulit yang sudah terbuka",
      "Tekan Mulai Quiz pada kartu materi yang dipilih",
      "Pilih Pelajari Materi Dulu atau Langsung Mulai Quiz",
      "Jawab 10 soal dan tekan Kirim & AI Check pada setiap soal",
      "Kamu perlu menjawab benar minimal 7 dari 10 soal untuk lulus",
      "Jika belum lulus, satu Heart berkurang dan kuis diulang dari awal dengan paket soal baru",
      "Heart pulih satu setiap 30 menit hingga lima; misi harian memberi bonus lima Heart",
      "Setelah lulus, tingkat berikutnya akan terbuka secara otomatis",
    ],
  },
  {
    icon: "📚",
    title: "Mengakses Materi",
    steps: [
      "Klik menu Materi di sidebar kiri",
      "Daftar materi matematika tersedia dalam berbagai topik",
      "Klik kartu materi untuk membaca isi lengkapnya",
      "Gunakan materi sebagai referensi sebelum mengerjakan kuis",
      "Materi diperbarui secara berkala oleh admin",
    ],
  },
  {
    icon: "🤖",
    title: "Menggunakan AskMatheal",
    steps: [
      "Klik menu AskMatheal di sidebar kiri",
      "Ketik pertanyaan matematika kamu di kolom chat",
      "AskMatheal akan memberikan penjelasan langkah per langkah",
      "Kamu bisa bertanya tentang konsep, rumus, atau soal latihan",
      "Gunakan AskMatheal sebagai tutor AI 24/7 kapan saja!",
    ],
  },
];

// ── Quiz Confirm Modal (Pilih Materi dulu atau Langsung Quiz) ──
function QuizConfirmModal({ item, onClose, onGoMateri, onStartQuiz }) {
  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="guide-header">
          <span className="guide-header-icon">📋</span>
          <div>
            <div className="guide-header-title">{item?.title}</div>
            <div className="guide-header-sub">Tingkat: {item?.tingkat?.charAt(0).toUpperCase() + item?.tingkat?.slice(1)} • {item?.type}</div>
          </div>
          <button className="guide-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="guide-content" style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
            <p style={{ color: '#475569', lineHeight: 1.6, fontSize: 14, margin: 0 }}>
              Sebelum memulai kuis, kamu bisa membaca materi terlebih dahulu
              atau langsung mengerjakan 10 soal interaktif.
            </p>
          </div>

          {/* Flow visual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '📚', label: 'Baca Materi' },
              { icon: '→', label: '' },
              { icon: '✍️', label: 'Jawab Sesuai Mode' },
              { icon: '→', label: '' },
              { icon: '🤖', label: 'AI Check' },
              { icon: '→', label: '' },
              { icon: '🏆', label: 'Progress' },
            ].map((step, i) => (
              step.icon === '→'
                ? <span key={i} style={{ color: '#94a3b8', fontWeight: 700 }}>→</span>
                : <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 20 }}>{step.icon}</span>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{step.label}</span>
                  </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button
              onClick={onGoMateri}
              style={{
                padding: '14px 20px', borderRadius: 14, border: '2px solid #2563eb',
                background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
            >
              <span style={{ fontSize: 22 }}>📚</span>
              <div style={{ textAlign: 'left' }}>
                <div>Pelajari Materi Dulu</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: '#3b82f6' }}>Baca materi terkait sebelum mengerjakan</div>
              </div>
            </button>

            <button
              onClick={onStartQuiz}
              style={{
                padding: '14px 20px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.18s',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              }}
            >
              <span style={{ fontSize: 22 }}>🚀</span>
              <div style={{ textAlign: 'left' }}>
                <div>Langsung Mulai Quiz</div>
                <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>Jawab 10 soal → lihat hasil akhir</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideModal({ onClose, activeLevel, levelGroups }) {
  const [activeStep, setActiveStep] = useState(0);

  // Build formula tab content based on current level's topics
  const levelTopics = levelGroups?.[activeLevel] || [];
  const hasFormulas = levelTopics.length > 0;

  // Build guide steps + prepend a formula guide for current level

  const STEPS = [...GUIDE_STEPS];

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guide-header">
          <span className="guide-header-icon">📖</span>
          <div>
            <div className="guide-header-title">Buku Panduan Matheal</div>
            <div className="guide-header-sub">Panduan lengkap penggunaan platform</div>
          </div>
          <button className="guide-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="guide-tabs">
          {STEPS.map((s, i) => (
            <button
              key={i}
              className={`guide-tab-btn${activeStep === i ? " active" : ""}`}
              onClick={() => setActiveStep(i)}
            >
              <span>{s.icon}</span>
              <span className="guide-tab-label">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="guide-content">
          <div className="guide-section-title">
            <span className="guide-section-icon">{STEPS[activeStep].icon}</span>
            {STEPS[activeStep].title}
          </div>

          {STEPS[activeStep].isFormula ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
              {STEPS[activeStep].topics.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  Tidak ada rumus tersedia untuk level ini.
                </div>
              ) : STEPS[activeStep].topics.map((topic, ti) => (
                <div key={ti} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>📘 {topic.topicTitle}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {topic.formulas.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '90px', flexShrink: 0 }}>{f.label}:</span>
                        <code style={{ fontSize: '13px', color: '#1e293b', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>{f.formula}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ol className="guide-steps-list">
              {STEPS[activeStep].steps.map((step, i) => (
                <li key={i} className="guide-step-item">
                  <span className="guide-step-num">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="guide-footer">
          <button
            className="guide-nav-btn"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((p) => p - 1)}
          >← Sebelumnya</button>
          <span className="guide-page-indicator">{activeStep + 1} / {STEPS.length}</span>
          {activeStep < STEPS.length - 1 ? (
            <button className="guide-nav-btn primary" onClick={() => setActiveStep((p) => p + 1)}>
              Selanjutnya →
            </button>
          ) : (
            <button className="guide-nav-btn primary" onClick={onClose}>Mulai Belajar 🚀</button>
          )}
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [levelGroups, setLevelGroups] = useState({ mudah: [], sedang: [], sulit: [] });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState("mudah");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState(null); // quiz confirm modal
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [{ streak, streakActive }, setStreakData] = useState(getStoredStreak());
  const [heartState, setHeartState] = useState(getHeartState());
  const [dailyMission, setDailyMission] = useState(getDailyMissionStatus());

  const username = localStorage.getItem("username") || "Pelajar";

  useEffect(() => {
    const interval = setInterval(() => {
      setStreakData(getStoredStreak());
      setHeartState(getHeartState());
      setDailyMission(getDailyMissionStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sinkronkan perubahan dari tab lain dan dari penyelesaian kuis pada tab aktif.
  useEffect(() => {
    const handleStorage = (e) => {
      if (["streak", "streakDate", "lastQuizDate"].includes(e.key)) {
        setStreakData(getStoredStreak());
      }
    };
    const handleStreakUpdate = () => setStreakData(getStoredStreak());
    const handleGamificationUpdate = () => {
      setHeartState(getHeartState());
      setDailyMission(getDailyMissionStatus());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("matheal:streak-updated", handleStreakUpdate);
    window.addEventListener("matheal:heart-updated", handleGamificationUpdate);
    window.addEventListener("matheal:mission-updated", handleGamificationUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("matheal:streak-updated", handleStreakUpdate);
      window.removeEventListener("matheal:heart-updated", handleGamificationUpdate);
      window.removeEventListener("matheal:mission-updated", handleGamificationUpdate);
    };
  }, []);

  const passedQuizzes = (() => {
    try { return JSON.parse(localStorage.getItem("passed_quizzes") || "[]"); } catch { return []; }
  })();

  const progressKey = (materialKey, level) => `${materialKey}::${level}`;
  const totalPassed = passedQuizzes.filter((key) => String(key).includes("::")).length;
  const totalQuiz = QUIZ_CATEGORIES.length * Object.keys(LEVEL_META).length;
  const progressPct = Math.round((totalPassed / totalQuiz) * 100);

  const fetchData = () => {
    const groups = { mudah: [], sedang: [], sulit: [] };
    QUIZ_CATEGORIES.forEach((category) => {
      groups[category.tingkat].push({
        id: category.key,
        title: category.title,
        type: category.type,
        tingkat: category.tingkat,
        displayedSoal: 10,
        routeParam: `${category.key}?tingkat=${category.tingkat}`,
      });
    });
    setLevelGroups(groups);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const levelOrder = ["mudah", "sedang", "sulit"];
  const isLevelPassed = (materialKey, level) => passedQuizzes.includes(progressKey(materialKey, level));
  const isLevelUnlocked = (materialKey, level) => {
    const index = levelOrder.indexOf(level);
    return index <= 0 || isLevelPassed(materialKey, levelOrder[index - 1]);
  };

  const handleLevelChange = (lv) => {
    if (selectedMaterial && !isLevelUnlocked(selectedMaterial.key, lv)) {
      alert("Selesaikan tingkat sebelumnya untuk membuka tingkat ini.");
      return;
    }
    setActiveLevel(lv);
    setAnimKey(k => k + 1);
  };

  const handleQuizClick = (item, isUnlocked) => {
    if (!isUnlocked) {
      alert("Selesaikan tingkat sebelumnya untuk membuka kuis ini.");
      return;
    }
    // Show confirm modal (pilih materi dulu vs langsung quiz)
    setConfirmItem(item);
  };

  const handleStartQuizDirect = (item) => {
    const currentHeart = getHeartState();
    if (currentHeart.value <= 0) {
      setHeartState(currentHeart);
      alert(`Heart habis. Heart berikutnya tersedia dalam ${formatHeartCountdown(currentHeart.nextHeartInMs)}. Kamu tetap dapat mempelajari materi sambil menunggu.`);
      return;
    }
    setConfirmItem(null);
    localStorage.setItem("selectedLearningPath", JSON.stringify({
      materi: item.id,
      tingkat: activeLevel,
      selectedAt: new Date().toISOString(),
    }));
    navigate(`/quiz/${encodeURIComponent(item.id)}?tingkat=${encodeURIComponent(activeLevel)}`);
  };

  const handleGoMateri = () => {
    if (confirmItem) {
      localStorage.setItem("selectedLearningPath", JSON.stringify({
        materi: confirmItem.id,
        tingkat: activeLevel,
        selectedAt: new Date().toISOString(),
      }));
    }
    setConfirmItem(null);
    navigate(confirmItem
      ? `/materi?topik=${encodeURIComponent(confirmItem.id)}&tingkat=${encodeURIComponent(activeLevel)}`
      : "/materi");
  };

  const handleOpenCertificate = (material) => {
    const record = ensureCertificateRecord(material, username);
    syncCurrentUserProgress();
    setSelectedCertificate({ material, record });
  };

  // ── Card Component (path-node style) ────────────────────────────
  const QuizNode = ({ item, index, isUnlocked, isPassed }) => {
    const meta = LEVEL_META[item.tingkat];
    const isNext = false;
    const isLeft = index % 2 === 0;

    return (
      <div className={`qnode-wrapper ${isLeft ? "qnode-left" : "qnode-right"}`}>
        <button
          type="button"
          className={`qnode ${isUnlocked ? "qnode-unlocked" : "qnode-locked"} ${isPassed ? "qnode-passed" : ""} ${isNext ? "qnode-next" : ""}`}
          style={{ background: isUnlocked ? meta.gradient : "#cbd5e1" }}
          onClick={() => handleQuizClick(item, isUnlocked)}
          title={item.title}
          aria-label={`${item.title} - ${isPassed ? "selesai" : isUnlocked ? "dapat dikerjakan" : "terkunci"}`}
          aria-disabled={!isUnlocked}
        >
          {isPassed ? "⭐" : isUnlocked ? meta.emoji : "🔒"}
        </button>
        <div className={`qnode-info ${isLeft ? "qnode-info-right" : "qnode-info-left"}`}>
          <div className="qnode-title">{item.title}</div>
          <div className="qnode-type">{item.type}</div>
          {isPassed && <div className="qnode-passed-tag">✅ Lulus</div>}
          {!isUnlocked && <div className="qnode-locked-tag">🔒 Terkunci</div>}
        </div>
      </div>
    );
  };

  const missions = [dailyMission];

  const renderProgressCard = () => (
    <div className="duo-panel-card duo-progress-card">
      <div className="duo-progress-top">
        <div className="duo-progress-avatar">
          {(() => {
            const av = localStorage.getItem("avatar") || "";
            return av && (av.startsWith("http") || av.startsWith("data:image"))
              ? <img src={av} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : username.slice(0, 2).toUpperCase();
          })()}
        </div>
        <div className="duo-progress-identity">
          <div className="duo-progress-name">{username}</div>
          <div className="duo-progress-sub">🌱 Belajar Matematika</div>
        </div>
      </div>
      <div className="duo-progress-bar-wrap">
        <div className="duo-progress-bar-label">
          <span>Progress Keseluruhan</span>
          <span>{progressPct}%</span>
        </div>
        <div className="duo-progress-track">
          <div className="duo-progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>
        <div className="duo-progress-sub duo-progress-summary">{totalPassed} dari {totalQuiz} kuis selesai</div>
      </div>
    </div>
  );

  return (
    <>
      <UserSidebar />

      {/* ── PAGE SHELL ── */}
      <div className="duo-page">

        {/* Progress ditempatkan paling atas pada layar mobile. */}
        <section className="duo-mobile-progress" aria-label="Progress belajar">
          {renderProgressCard()}
        </section>

        {/* ── CENTER COLUMN ── */}
        <main className="duo-main">

          {/* Unit Banner */}
          <div className="duo-unit-banner">
            <div className="duo-unit-info">
              <div className="duo-unit-label">MATEMATIKA • KUIS INTERAKTIF</div>
              <div className="duo-unit-title">Peta Belajar Matheal</div>
            </div>
            <button className="duo-guide-btn" onClick={() => setGuideOpen(true)}>
              📖 Buku Panduan
            </button>
          </div>

          {/* Level Tabs */}
          {selectedMaterial && (
          <div className="duo-level-tabs">
            {Object.keys(LEVEL_META).map((lv) => {
              const meta = LEVEL_META[lv];
              const unlocked = !selectedMaterial || isLevelUnlocked(selectedMaterial.key, lv);
              return (
                <button
                  key={lv}
                  className={`duo-tab ${activeLevel === lv ? "active" : ""} ${!unlocked ? "locked" : ""}`}
                  style={activeLevel === lv ? { background: meta.gradient, color: "#fff", borderColor: "transparent" } : {}}
                  onClick={() => handleLevelChange(lv)}
                  disabled={!unlocked}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
          )}

          {/* Pilih materi, lalu mulai kuis untuk tingkat aktif */}
          {loading ? (
            <div className="duo-loading">
              <div className="duo-spinner"></div>
              <span>Memuat soal...</span>
            </div>
          ) : (
            <div className="duo-path" key={animKey}>
              {!selectedMaterial ? (
                <div className="user-material-grid">
                  {QUIZ_CATEGORIES.map((item, index) => {
                    const completedLevels = levelOrder.filter((level) => isLevelPassed(item.key, level)).length;
                    const nextLevel = levelOrder.find((level) => isLevelUnlocked(item.key, level) && !isLevelPassed(item.key, level));
                    return (
                      <article
                        key={item.key}
                        className={`user-material-card user-material-quest ${completedLevels === 3 ? "is-complete" : ""}`}
                      >
                        <button
                          type="button"
                          className="user-material-card-main"
                          onClick={() => { setSelectedMaterial(item); setActiveLevel(nextLevel || "mudah"); setAnimKey((key) => key + 1); }}
                        >
                          <span className="user-material-card-top">
                          <span className="user-material-index">Bab {String(index + 1).padStart(2, "0")}</span>
                          <span className={`user-material-status ${completedLevels === 3 ? "complete" : "active"}`}>
                            {completedLevels === 3 ? "✓ Tuntas" : `${completedLevels}/3 selesai`}
                          </span>
                          </span>
                          <strong>{item.title}</strong>
                          <span className="user-material-levels" aria-label={`${completedLevels} dari 3 tingkat selesai`}>
                          {levelOrder.map((level, levelIndex) => {
                            const passed = isLevelPassed(item.key, level);
                            const unlocked = isLevelUnlocked(item.key, level);
                            return (
                              <span key={level} className={`user-level-node ${passed ? "passed" : unlocked ? "unlocked" : "locked"}`}>
                                <span>{passed ? "✓" : unlocked ? levelIndex + 1 : "🔒"}</span>
                                <small>{LEVEL_META[level].label}</small>
                              </span>
                            );
                          })}
                          </span>
                          <span className="user-material-progress" aria-hidden="true">
                            <span style={{ width: `${(completedLevels / 3) * 100}%` }} />
                          </span>
                          <span className="user-material-arrow">{completedLevels === 3 ? "Kerjakan ulang soal" : `Lanjut ${LEVEL_META[nextLevel || "mudah"].label}`} →</span>
                        </button>
                        {completedLevels === 3 && (
                          <button type="button" className="user-material-certificate-btn" onClick={() => handleOpenCertificate(item)}>
                            <span aria-hidden="true">◆</span> Lihat & cetak sertifikat
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="user-quiz-start-card">
                  <button
                    type="button"
                    className="user-change-material"
                    onClick={() => { setSelectedMaterial(null); setActiveLevel("mudah"); setAnimKey((key) => key + 1); }}
                    aria-label="Kembali ke daftar semua materi"
                  >
                    <span aria-hidden="true">←</span> Kembali ke daftar materi
                  </button>
                  <div className="user-quiz-start-icon">{LEVEL_META[activeLevel].emoji}</div>
                  <span className="user-quiz-start-kicker">{LEVEL_META[activeLevel].label}</span>
                  <h2>{selectedMaterial.title}</h2>
                  <p>10 soal interaktif dipilih dari Bank Soal admin untuk materi dan tingkat ini.</p>
                  {isLevelPassed(selectedMaterial.key, activeLevel) && <span className="user-quiz-passed">Tingkat ini sudah lulus</span>}
                  <button
                    type="button"
                    className="btn-add user-start-quiz-btn"
                    onClick={() => setConfirmItem({ ...selectedMaterial, id: selectedMaterial.key, tingkat: activeLevel })}
                  >
                    {isLevelPassed(selectedMaterial.key, activeLevel) ? "Kerjakan Ulang Quiz" : "Mulai Quiz"}
                  </button>
                  {levelOrder.every((level) => isLevelPassed(selectedMaterial.key, level)) && (
                    <button type="button" className="user-detail-certificate-btn" onClick={() => handleOpenCertificate(selectedMaterial)}>
                      ◆ Lihat & cetak sertifikat materi
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="duo-right-panel">

          {/* Progress Card (desktop dan tablet lebar) */}
          <div className="duo-desktop-progress">
            {renderProgressCard()}
          </div>

          {/* Stats Row */}
          <div className="duo-stats-row">
            {/* Streak — menyala jika aktif hari ini */}
            <div className={`duo-stat-chip duo-stat-flame${streakActive ? " duo-stat-streak-active" : ""}`}>
              <span className="duo-stat-icon">🔥</span>
              <div className="duo-stat-copy">
                <div className="duo-stat-val" style={{ color: streakActive ? "#ea580c" : undefined }}>{streak}</div>
                <div className="duo-stat-lbl">Streak</div>
              </div>
              <span className={`duo-stat-state ${streakActive ? "active" : "idle"}`}>{streakActive ? "Aktif" : "Hari ini"}</span>
            </div>

            <div className="duo-stat-chip duo-stat-star">
              <span className="duo-stat-icon">★</span>
              <div className="duo-stat-copy">
                <div className="duo-stat-val">{totalPassed}</div>
                <div className="duo-stat-lbl">Lulus</div>
              </div>
              <span className="duo-stat-state passed">Level</span>
            </div>

            <div className="duo-stat-chip duo-stat-heart">
              <span className="duo-stat-icon">♥</span>
              <div className="duo-stat-copy">
                <div className="duo-stat-val">{heartState.value}</div>
                <div className="duo-stat-lbl">Heart</div>
              </div>
              <span className={`duo-stat-state ${heartState.value > 0 ? "active" : "idle"}`}>
                {heartState.value < 5 ? formatHeartCountdown(heartState.nextHeartInMs) : "Penuh"}
              </span>
            </div>
          </div>

          {/* Misi Harian */}
          <div className="duo-panel-card">
            <div className="duo-panel-header">
              <span>⚡ Misi Harian</span>
              <span className="duo-mission-reward">+5 ♥</span>
            </div>
            <div className="duo-missions">
              {missions.map((m, i) => (
                <div key={i} className="duo-mission-item">
                  <div className="duo-mission-icon">{m.icon}</div>
                  <div className="duo-mission-body">
                    <div className="duo-mission-label">{m.label}</div>
                    <div className="duo-mission-track">
                      <div
                        className="duo-mission-fill"
                        style={{ width: `${Math.min((m.current / m.target) * 100, 100)}%` }}
                      ></div>
                      <span className="duo-mission-count">{m.current}/{m.target}</span>
                    </div>
                  </div>
                  {m.rewarded && <span className="duo-mission-done">Diperoleh</span>}
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>

      {/* ── BUKU PANDUAN MODAL ── */}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} activeLevel={activeLevel} levelGroups={levelGroups} />}

      {/* ── QUIZ CONFIRM MODAL ── */}
      {confirmItem && (
        <QuizConfirmModal
          item={confirmItem}
          onClose={() => setConfirmItem(null)}
          onGoMateri={handleGoMateri}
          onStartQuiz={() => handleStartQuizDirect(confirmItem)}
        />
      )}
      <CertificateModal
        certificate={selectedCertificate}
        username={username}
        onClose={() => setSelectedCertificate(null)}
      />
    </>
  );
}

export default HomePage;
