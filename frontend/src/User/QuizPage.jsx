import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import UserSidebar from "../UserSidebar";
import { aiFetch, apiFetch } from "../config/api";
import { syncCurrentUserProgress } from "../utils/userProgress";
import { recordQuizCompletion } from "../utils/streak";
import { formatHeartCountdown, getHeartState, spendHeart } from "../utils/hearts";
import { recordDailyQuiz } from "../utils/dailyMissions";
import { QUIZ_CATEGORIES as QUIZ_CATALOG } from "../data/quizCatalog";

// Keep user-facing quiz symbols in one UTF-8-safe source of truth.
const QUIZ_UI_ICONS = Object.freeze({
  celebration: "🎉",
  disappointed: "😓",
  correct: "✅",
  incorrect: "❌",
  unlocked: "🔓",
  trophy: "🏆",
  retry: "🔄",
  heart: "♥",
  emptyHeart: "♡",
  notes: "📝",
  target: "🎯",
});

// Setiap level memakai paket soal yang sama agar batas lulus konsisten:
// 7 jawaban benar dari 10 soal (70%). Jangan menghitung kelulusan dari
// sejumlah soal yang kebetulan tersedia di database.
const QUIZ_QUESTION_COUNT = 10;
const PASSING_CORRECT_ANSWERS = 7;

const hasPassedQuiz = (totalQuestions, correctCount) => (
  totalQuestions === QUIZ_QUESTION_COUNT && correctCount >= PASSING_CORRECT_ANSWERS
);

// ── QUIZ MAPPING ─────────────────────────────────────────────────
const QUIZ_MAPPING = {
  "Limit":                        { title: "Limit" },
  "Turunan":                      { title: "Turunan" },
  "Integral":                     { title: "Integral Lanjut" },
  "Matriks":                      { title: "Determinan & Invers Matriks" },
  "Persamaan Linear":             { title: "Persamaan Linear" },
  "Trigonometri":                 { title: "Trigonometri Lanjut" },
  "Transformasi Linier":          { title: "Transformasi Linier" },
  "Linier":                       { title: "Transformasi Linier" },
  "Himpunan & Fungsi Komposisi":  { title: "Himpunan & Fungsi Komposisi" },
  "Himpunan":                     { title: "Himpunan & Fungsi Komposisi" },
  "Boolean & Logika Proposisi":   { title: "Logika Proposisi & Fungsi Invers" },
  "Boolean":                      { title: "Logika Proposisi & Fungsi Invers" },
  "Aljabar Boolean":              { title: "Aljabar Boolean & Peta Karnaugh" },
  "Bilangan Kompleks":            { title: "Bilangan Kompleks & Koordinat Polar" },
  "Bilangan Biner":               { title: "Bilangan Biner" },
  "Biner":                        { title: "Bilangan Biner" },
  "Rekursi Linier":               { title: "Relasi Rekurensi Linier" },
  "Analisis Algoritma":           { title: "Analisis Algoritma" },
  "Geometri Dasar":               { title: "Geometri Dasar" },
  "geometri-dasar":               { title: "Geometri Dasar" },
  "Logika Matematika":            { title: "Logika Matematika" },
  "logika-matematika":            { title: "Logika Matematika" },
  "Operasi Graf":                 { title: "Operasi Pada Graf" },
};

const QUIZ_THEMES = [
  { keys: ["limit"], icon: "∞", accent: "#247b78", accentDark: "#185e5c", soft: "#e5f4f1", glow: "rgba(36,123,120,.18)" },
  { keys: ["turunan"], icon: "f′", accent: "#3976a8", accentDark: "#285b85", soft: "#e9f2f8", glow: "rgba(57,118,168,.18)" },
  { keys: ["integral"], icon: "∫", accent: "#7966a5", accentDark: "#59477f", soft: "#f0edf7", glow: "rgba(121,102,165,.18)" },
  { keys: ["matriks"], icon: "▦", accent: "#397866", accentDark: "#285b4c", soft: "#e8f3ee", glow: "rgba(57,120,102,.18)" },
  { keys: ["persamaan linear"], icon: "x+y", accent: "#b66b4b", accentDark: "#8c4e34", soft: "#f8ece6", glow: "rgba(182,107,75,.18)" },
  { keys: ["trigonometri"], icon: "△", accent: "#b57931", accentDark: "#89591f", soft: "#f9f0df", glow: "rgba(181,121,49,.18)" },
  { keys: ["transformasi"], icon: "↗", accent: "#347b8c", accentDark: "#255d6b", soft: "#e7f2f4", glow: "rgba(52,123,140,.18)" },
  { keys: ["himpunan"], icon: "∪", accent: "#526da5", accentDark: "#3b5080", soft: "#ebeff7", glow: "rgba(82,109,165,.18)" },
  { keys: ["aljabar boolean"], icon: "01", accent: "#4b8062", accentDark: "#345f47", soft: "#eaf3ed", glow: "rgba(75,128,98,.18)" },
  { keys: ["boolean", "logika proposisi"], icon: "✓", accent: "#78659a", accentDark: "#574775", soft: "#f0edf5", glow: "rgba(120,101,154,.18)" },
  { keys: ["bilangan kompleks"], icon: "i", accent: "#3b7199", accentDark: "#285675", soft: "#e9f1f6", glow: "rgba(59,113,153,.18)" },
  { keys: ["biner"], icon: "01", accent: "#397567", accentDark: "#28594e", soft: "#e7f2ee", glow: "rgba(57,117,103,.18)" },
  { keys: ["rekursi"], icon: "↻", accent: "#806493", accentDark: "#60466f", soft: "#f1ecf4", glow: "rgba(128,100,147,.18)" },
  { keys: ["analisis algoritma"], icon: "O(n)", accent: "#9a6f32", accentDark: "#735022", soft: "#f6efe2", glow: "rgba(154,111,50,.18)" },
  { keys: ["geometri"], icon: "◇", accent: "#a55f68", accentDark: "#7c444c", soft: "#f7eaec", glow: "rgba(165,95,104,.18)" },
  { keys: ["logika matematika"], icon: "∴", accent: "#5c69a0", accentDark: "#414d7b", soft: "#eceef7", glow: "rgba(92,105,160,.18)" },
  { keys: ["operasi graf", "graf"], icon: "⬡", accent: "#2f7a78", accentDark: "#215c5a", soft: "#e5f3f1", glow: "rgba(47,122,120,.18)" },
];

const DEFAULT_QUIZ_THEME = { icon: "∑", accent: "#397582", accentDark: "#285b66", soft: "#e7f1f3", glow: "rgba(57,117,130,.18)" };

const getQuizTheme = (levelId, title) => {
  const identity = `${levelId || ""} ${title || ""}`.toLowerCase();
  if ((levelId || "").toLowerCase() === "linier") return QUIZ_THEMES.find((theme) => theme.keys.includes("transformasi"));
  return QUIZ_THEMES.find((theme) => theme.keys.some((key) => identity.includes(key))) || DEFAULT_QUIZ_THEME;
};

const getQuizThemeStyle = (theme) => ({
  "--quiz-accent": theme.accent,
  "--quiz-accent-dark": theme.accentDark,
  "--quiz-soft": theme.soft,
  "--quiz-glow": theme.glow,
});

// Daftar semua quiz (sama seperti di HomePage) — untuk tahu "next level"
const QUIZ_CATEGORIES = QUIZ_CATALOG;

// ── AI CHECK ──────────────────────────────────────────────────────
async function checkAnswerWithAI({ pertanyaan, proses, jawaban, kunci_jawaban }) {
  try {
    const res = await aiFetch("check-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pertanyaan, proses, jawaban, kunci_jawaban }),
    });
    if (!res.ok) throw new Error("AI server error");
    return await res.json(); // { correct, feedback }
  } catch {
    // Fallback konservatif: tetap mengenali label fungsi dan pecahan ekuivalen.
    const normalize = (value) => String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,;:!?]+$/g, "")
      .trim();
    const comparableExpression = (value) => {
      const normalized = String(value || "")
        .normalize("NFKC").toLowerCase().replace(/[−–—]/g, "-")
        .replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
        .replace(/\\left|\\right|\$|\s+/g, "");
      const equalsCount = (normalized.match(/=/g) || []).length;
      if (equalsCount > 1) return "";
      return equalsCount === 1 ? normalized.slice(normalized.lastIndexOf("=") + 1) : normalized;
    };
    const singleNumber = (value) => {
      const expression = comparableExpression(value).replace(/,/g, ".");
      const fraction = /^([-+]?(?:\d+(?:\.\d+)?|\.\d+))\/([-+]?(?:\d+(?:\.\d+)?|\.\d+))$/.exec(expression);
      if (/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(expression)) return Number(expression);
      if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
      return null;
    };
    const normalizedAnswer = normalize(jawaban);
    const normalizedKey = normalize(kunci_jawaban);
    const expressionAnswer = comparableExpression(jawaban);
    const expressionKey = comparableExpression(kunci_jawaban);
    const answerNumber = singleNumber(jawaban);
    const keyNumber = singleNumber(kunci_jawaban);
    const correct = Boolean(normalizedAnswer && normalizedKey) && (
      normalizedAnswer === normalizedKey ||
      (expressionAnswer && expressionAnswer === expressionKey) ||
      (answerNumber !== null && keyNumber !== null && Math.abs(answerNumber - keyNumber) < 0.001)
    );
    return {
      correct: correct ? true : null,
      verification: correct ? "verified" : "unavailable",
      feedback: correct
        ? "Jawaban tepat!"
        : "Jawaban belum dapat diverifikasi karena layanan penilai tidak tersedia. Jawaban ini tidak dinyatakan salah; silakan periksa kembali.",
    };
  }
}

// ── HINT PANEL ────────────────────────────────────────────────────

function WrongAnswerPanel({ feedback, correctAnswer, onContinue }) {
  return (
    <div className="quiz-wrong-panel">
      <div className="quiz-wrong-header">
        <span className="quiz-wrong-icon" aria-hidden="true">×</span>
        <div>
          <div className="quiz-wrong-title">Jawaban Belum Tepat</div>
          <div className="quiz-wrong-sub">Pelajari jawaban yang benar, lalu lanjutkan ke soal berikutnya.</div>
        </div>
      </div>
      <div className="quiz-correct-answer">
        <small>Jawaban yang benar</small>
        <strong>{correctAnswer}</strong>
      </div>
      {feedback && <div className="quiz-wrong-feedback">{feedback}</div>}
      <div className="quiz-wrong-actions">
        <button className="submit-btn quiz-wrong-next" onClick={onContinue}>
          Lanjut ke Soal Berikutnya →
        </button>
      </div>
    </div>
  );
}

function VerificationPendingPanel({ feedback, onRetry }) {
  return (
    <div className="quiz-wrong-panel quiz-verification-pending" role="status">
      <div className="quiz-wrong-header">
        <span className="quiz-wrong-icon" aria-hidden="true">?</span>
        <div>
          <div className="quiz-wrong-title">Jawaban Belum Diverifikasi</div>
          <div className="quiz-wrong-sub">Jawaban tidak dianggap salah dan belum memengaruhi nilai kuis.</div>
        </div>
      </div>
      <div className="quiz-wrong-feedback">{feedback}</div>
      <div className="quiz-wrong-actions">
        <button className="submit-btn quiz-wrong-next" onClick={onRetry}>
          Periksa Kembali
        </button>
      </div>
    </div>
  );
}

// ── RESULT PAGE ───────────────────────────────────────────────────
function ResultPage({ totalQuestions, results, levelId, quizInfo, paramTingkat, onRetry, quizTheme, heartState, missionRewarded }) {
  const navigate = useNavigate();
  const correctCount = results.filter(r => r.correct).length;
  const isPassed = hasPassedQuiz(totalQuestions, correctCount);

  // Tingkat berikutnya tetap berada pada materi yang sama, selaras dengan Bank Soal admin.
  const levelSequence = ["mudah", "sedang", "sulit"];
  const currentIdx = levelSequence.indexOf(paramTingkat || "mudah");
  const nextQuiz = currentIdx >= 0 && currentIdx < levelSequence.length - 1
    ? { key: levelId, title: quizInfo.title || levelId, tingkat: levelSequence[currentIdx + 1] }
    : null;

  // Confetti particles for pass
  const confetti = isPassed
    ? Array.from({ length: 18 }, (_, i) => ({
        left: `${5 + i * 5.5}%`,
        color: ["#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#ef4444"][i % 6],
        delay: `${(i * 0.12).toFixed(2)}s`,
      }))
    : [];

  return (
    <>
      <UserSidebar />
      <div className="usb-page-content quiz-game-page" style={getQuizThemeStyle(quizTheme)}>
        <main className="quiz-wrapper quiz-game-shell">
          {/* Confetti */}
          {isPassed && (
            <div className="quiz-confetti-wrap" aria-hidden="true">
              {confetti.map((c, i) => (
                <div key={i} className="quiz-confetti-piece"
                  style={{ left: c.left, background: c.color, animationDelay: c.delay }} />
              ))}
            </div>
          )}

          <div className="quiz-result-card quiz-game-result">
            <div className="quiz-result-mission">
              <span>{quizTheme.icon}</span>
              <div>
                <small>Misi {quizInfo.title || levelId}</small>
                <strong>Tingkat {paramTingkat}</strong>
              </div>
            </div>
            {/* Emoji & title */}
            <div className="quiz-result-emoji">{isPassed ? QUIZ_UI_ICONS.celebration : QUIZ_UI_ICONS.disappointed}</div>
            <h1 className="quiz-result-title">
              {isPassed ? "Selamat! Kamu LULUS!" : "Belum Lulus — Semangat!"}
            </h1>

            {/* Score circle */}
            <div className={`quiz-result-score-ring ${isPassed ? "pass" : "fail"}`}>
              <span className="quiz-result-score-num">{correctCount}</span>
              <span className="quiz-result-score-den">/ {totalQuestions}</span>
              <span className="quiz-result-score-lbl">Benar</span>
            </div>

            {/* Progress bar */}
            <div className="quiz-result-bar-wrap">
              <div className="quiz-result-bar-fill"
                style={{
                  width: `${(correctCount / totalQuestions) * 100}%`,
                  background: isPassed ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#f87171,#ef4444)"
                }} />
            </div>
            <div className="quiz-result-target">Target kelulusan: {PASSING_CORRECT_ANSWERS} / {QUIZ_QUESTION_COUNT}</div>

            {!isPassed && (
              <div className="quiz-heart-loss">
                <span>{QUIZ_UI_ICONS.heart} −1</span>
                <div>
                  <strong>Heart berkurang karena belum lulus</strong>
                  <small>Sisa {heartState.value} Heart{heartState.value < 5 ? ` · pulih lagi dalam ${formatHeartCountdown(heartState.nextHeartInMs)}` : ""}</small>
                </div>
              </div>
            )}
            {missionRewarded && (
              <div className="quiz-mission-rewarded">Misi harian selesai · Bonus +5 Heart</div>
            )}

            {/* Stats row */}
            <div className="quiz-result-stats">
              <div className="quiz-result-stat green">
                <div className="quiz-result-stat-num">{correctCount}</div>
                <div className="quiz-result-stat-lbl">{QUIZ_UI_ICONS.correct} Benar</div>
              </div>
              <div className="quiz-result-stat red">
                <div className="quiz-result-stat-num">{totalQuestions - correctCount}</div>
                <div className="quiz-result-stat-lbl">{QUIZ_UI_ICONS.incorrect} Salah</div>
              </div>
            </div>

            {/* Per-question summary */}
            <div className="quiz-result-summary">
              {results.map((r, i) => (
                <div key={i} className={`quiz-result-row ${r.correct ? "row-correct" : "row-wrong"}`}>
                  <span className="quiz-result-row-num">Soal {i + 1}</span>
                  <span className="quiz-result-row-icon">{r.correct ? QUIZ_UI_ICONS.correct : QUIZ_UI_ICONS.incorrect}</span>
                </div>
              ))}
            </div>

            {/* Next level unlock banner */}
            {isPassed && nextQuiz && (
              <div className="quiz-next-level-banner">
                <div className="quiz-next-level-icon">{QUIZ_UI_ICONS.unlocked}</div>
                <div>
                  <div className="quiz-next-level-title">Level Berikutnya Terbuka!</div>
                  <div className="quiz-next-level-sub">{nextQuiz.title} ({nextQuiz.tingkat})</div>
                </div>
                <button
                  className="quiz-next-level-btn"
                  onClick={() => navigate(`/quiz/${encodeURIComponent(nextQuiz.key)}?tingkat=${encodeURIComponent(nextQuiz.tingkat)}`)}
                >
                  Mulai →
                </button>
              </div>
            )}
            {isPassed && !nextQuiz && (
              <div className="quiz-next-level-banner" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}>
                <div className="quiz-next-level-icon">{QUIZ_UI_ICONS.trophy}</div>
                <div>
                  <div className="quiz-next-level-title">Semua Level Selesai!</div>
                  <div className="quiz-next-level-sub">Kamu telah menyelesaikan seluruh kuis Matheal!</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="quiz-result-actions">
              <button className="submit-btn" onClick={() => navigate("/home")}>← Kembali ke Home</button>
              <button
                className="submit-btn quiz-retry-btn"
                onClick={onRetry}
                disabled={!isPassed && heartState.value <= 0}
              >
                {!isPassed && heartState.value <= 0 ? "Menunggu Heart" : `${QUIZ_UI_ICONS.retry} Ulangi Quiz`}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ── MAIN QUIZ PAGE ────────────────────────────────────────────────
function QuizPage() {
  const { levelId: rawLevelId } = useParams();
  const location   = useLocation();
  const sp         = new URLSearchParams(location.search);
  const requestedTingkat = (sp.get("tingkat") || "mudah").toLowerCase();
  const paramTingkat = ["mudah", "sedang", "sulit"].includes(requestedTingkat) ? requestedTingkat : "mudah";
  const levelId    = (rawLevelId || "").split("?")[0].trim();
  const progressId = `${levelId}::${paramTingkat || "mudah"}`;
  const quizInfo   = QUIZ_MAPPING[levelId] || { title: levelId };
  const quizTheme  = getQuizTheme(levelId, quizInfo.title);
  const navigate   = useNavigate();

  // ── State ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");
  const [current,   setCurrent]   = useState(0);

  // Input fields
  const [proses,  setProses]  = useState("");
  const [jawaban, setJawaban] = useState("");

  // Per-question state machine: "soal" | "checking" | "benar" | "salah" | "verifikasi"
  const [phase, setPhase]     = useState("soal");
  const [aiFeedback, setAiFeedback] = useState({ feedback: "" });

  // Result tracking
  const [results, setResults]     = useState([]); // [{ correct }]
  const [score,   setScore]       = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [heartState, setHeartState] = useState(getHeartState());
  const [heartBlocked, setHeartBlocked] = useState(false);
  const [missionRewarded, setMissionRewarded] = useState(false);
  const resultProcessedRef = useRef(false);

  useEffect(() => {
    const refreshHeart = () => setHeartState(getHeartState());
    const interval = window.setInterval(refreshHeart, 1000);
    window.addEventListener("matheal:heart-updated", refreshHeart);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("matheal:heart-updated", refreshHeart);
    };
  }, []);


  useEffect(() => { loadQuestions(); }, [levelId, paramTingkat]);

  const loadQuestions = async () => {
    const availableHeart = getHeartState();
    setHeartState(availableHeart);
    if (availableHeart.value <= 0) {
      setHeartBlocked(true);
      setLoading(false);
      return;
    }
    setHeartBlocked(false);
    setLoading(true);
    setLoadError("");
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("quiz_cache_")) localStorage.removeItem(k);
      });
    } catch {}
    let qs = [];
    try {
      const res = await apiFetch(
        `read_quiz.php?levelId=${encodeURIComponent(levelId || "all")}&tingkat=${encodeURIComponent(paramTingkat)}&acak=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server mengembalikan status ${res.status}`);
      const dbData = await res.json();
      if (Array.isArray(dbData) && dbData.length > 0) {
        qs = dbData.map((q, index) => ({
          id_soal:       q.id_soal,
          pertanyaan:    q.pertanyaan,
          kunci_jawaban: q.kunci_jawaban,
          tipe:          q.tipe || "esai",
          opsi:          Array.isArray(q.opsi) ? q.opsi : [],
          originalIndex: index,
        }));

        if (qs.length < QUIZ_QUESTION_COUNT) {
          setLoadError(
            `Bank soal tingkat ${paramTingkat} untuk ${quizInfo.title} belum lengkap. ` +
            `Dibutuhkan ${QUIZ_QUESTION_COUNT} soal unik, tetapi baru tersedia ${qs.length} soal.`
          );
          qs = [];
        }
      } else {
        setLoadError(
          `Bank soal tingkat ${paramTingkat} untuk ${quizInfo.title} belum tersedia. ` +
          `Admin perlu menambahkan ${QUIZ_QUESTION_COUNT} soal unik.`
        );
      }
    } catch (err) {
      console.error("Gagal mengambil soal:", err);
      setLoadError("Soal gagal dimuat. Pastikan Apache dan MySQL aktif, lalu coba kembali.");
    }
    setQuestions(qs);
    setTotalQuestions(qs.length);
    resetState();
    setLoading(false);
  };

  const resetState = () => {
    setCurrent(0);
    setProses("");
    setJawaban("");
    setPhase("soal");
    setAiFeedback({ feedback: "" });
    setResults([]);
    setScore(0);
    setShowResult(false);
    setMissionRewarded(false);
    resultProcessedRef.current = false;
  };

  // ── Submit jawaban → AI Check ──────────────────────────────────
  const handleSubmit = async () => {
    const q = questions[current];
    const isEssay = q.tipe === "esai";
    if (!jawaban.trim() || (isEssay && !proses.trim())) {
      alert(isEssay ? "Tuliskan proses pengerjaan dan jawaban akhir terlebih dahulu!" : "Pilih jawaban terlebih dahulu!");
      return;
    }
    setPhase("checking");

    const normalizedAnswer = jawaban.trim().toLowerCase();
    const normalizedKey = String(q.kunci_jawaban || "").trim().toLowerCase();
    const objectiveCorrect = normalizedAnswer === normalizedKey;
    const result = isEssay
      ? await checkAnswerWithAI({ pertanyaan: q.pertanyaan, proses, jawaban, kunci_jawaban: q.kunci_jawaban })
      : {
          correct: objectiveCorrect,
          feedback: objectiveCorrect ? "Jawaban tepat! Kamu mengenali konsepnya." : `Jawaban yang benar adalah ${q.kunci_jawaban}.`,
        };

    setAiFeedback(result);
    if (result.verification === "unavailable" || result.correct === null) {
      setPhase("verifikasi");
    } else if (result.correct) {
      setScore(prev => prev + 10);
      setPhase("benar");
    } else {
      setPhase("salah");
    }
  };

  // ── Lanjut ke soal berikutnya ──────────────────────────────────
  const handleNext = (correct) => {
    const rec = { correct };
    const newResults = [...results];
    newResults[questions[current].originalIndex] = rec;
    setResults(newResults);

    if (current < questions.length - 1) {
      setCurrent(p => p + 1);
      setProses("");
      setJawaban("");
      setPhase("soal");
      setAiFeedback({ feedback: "" });
    } else {
      setShowResult(true);
    }
  };

  // ── Retry entire quiz ─────────────────────────────────────────
  const handleRetry = () => {
    const availableHeart = getHeartState();
    setHeartState(availableHeart);
    if (availableHeart.value <= 0) {
      setHeartBlocked(true);
      alert(`Heart habis. Heart berikutnya tersedia dalam ${formatHeartCountdown(availableHeart.nextHeartInMs)}.`);
      return;
    }
    loadQuestions();
  };

  // ── Save results when quiz ends ───────────────────────────────
  useEffect(() => {
    if (!showResult || resultProcessedRef.current) return;
    resultProcessedRef.current = true;
    const correctCount = results.filter(r => r.correct).length;
    const isPassed = hasPassedQuiz(totalQuestions, correctCount);

    try {
      const prog = JSON.parse(localStorage.getItem("levelProgress") || "{}");
      const previous = prog[progressId] || {};
      prog[progressId] = {
        completed: isPassed || previous.completed === true,
      };
      localStorage.setItem("levelProgress", JSON.stringify(prog));
      localStorage.removeItem("quizHistory");
    } catch {}

    const dailyResult = recordDailyQuiz({ passed: isPassed, questions: totalQuestions });
    setMissionRewarded(dailyResult.rewardedNow);

    // Streak dihitung ketika satu sesi kuis selesai, terlepas dari hasil lulus.
    try { recordQuizCompletion(); } catch {}

    // Dashboard admin mencatat penyelesaian sesi tanpa menyimpan nilai atau status lulus.
    apiFetch("log_aktivitas.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipe: "kuis",
        deskripsi: `Menyelesaikan kuis ${quizInfo.title || levelId}`,
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== "success") {
        console.warn("Aktivitas kuis belum tersimpan:", result.message || `HTTP ${response.status}`);
      }
    }).catch((error) => {
      console.warn("Aktivitas kuis belum tersimpan:", error);
    });

    if (!isPassed) {
      const updatedHeart = spendHeart();
      setHeartState(getHeartState());
      if (updatedHeart.value <= 0) setHeartBlocked(true);
    } else {
      setHeartState(getHeartState());
    }

    if (isPassed) {
      try {
        const p = JSON.parse(localStorage.getItem("passed_quizzes") || "[]");
        if (!p.includes(progressId)) { p.push(progressId); localStorage.setItem("passed_quizzes", JSON.stringify(p)); }

        syncCurrentUserProgress();

      } catch {}
    }
    syncCurrentUserProgress();
  }, [showResult]);

  // ── LOADING ────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <UserSidebar />
        <div className="usb-page-content quiz-game-page" style={getQuizThemeStyle(quizTheme)}>
          <div className="quiz-game-loading">
            <div className="quiz-game-loading-icon">{quizTheme.icon}</div>
            <div style={{ fontSize:18, fontWeight:600, color:"#475569" }}>Memuat soal kuis...</div>
          </div>
        </div>
      </>
    );
  }

  if (heartBlocked && !showResult) {
    return (
      <>
        <UserSidebar />
        <div className="usb-page-content quiz-game-page" style={getQuizThemeStyle(quizTheme)}>
          <main className="quiz-wrapper quiz-game-shell">
            <div className="question-card quiz-heart-empty">
              <div className="quiz-heart-empty-icon">{QUIZ_UI_ICONS.emptyHeart}</div>
              <h2>Heart sedang habis</h2>
              <p>Heart berikutnya pulih dalam <strong>{formatHeartCountdown(heartState.nextHeartInMs)}</strong>. Kamu tetap dapat membaca materi atau menggunakan AskMatheal.</p>
              <div className="quiz-result-actions">
                <button className="submit-btn" onClick={() => navigate("/materi")}>Pelajari Materi</button>
                <button
                  className="submit-btn quiz-retry-btn"
                  onClick={loadQuestions}
                  disabled={heartState.value <= 0}
                >
                  {heartState.value > 0 ? "Mulai Kuis" : "Menunggu Heart"}
                </button>
                <button className="submit-btn quiz-retry-btn" onClick={() => navigate("/home")}>Kembali ke Beranda</button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <UserSidebar />
        <div className="usb-page-content quiz-game-page" style={getQuizThemeStyle(quizTheme)}>
          <main className="quiz-wrapper quiz-game-shell">
            <div className="question-card" style={{ padding:"40px", textAlign:"center", flexDirection:"column" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>{QUIZ_UI_ICONS.notes}</div>
              <h2>Bank Soal Belum Siap</h2>
              <p style={{ color:"#64748b", margin:"12px 0 24px" }}>
                {loadError || `Belum ada soal di database untuk kuis ${quizInfo.title}.`}
              </p>
              <button className="submit-btn" onClick={() => navigate("/home")}>← Kembali ke Home</button>
            </div>
          </main>
        </div>
      </>
    );
  }

  // ── RESULT PAGE ────────────────────────────────────────────────
  if (showResult) {
    return (
      <ResultPage
        totalQuestions={totalQuestions}
        results={results}
        levelId={levelId}
        quizInfo={quizInfo}
        paramTingkat={paramTingkat}
        onRetry={handleRetry}
        quizTheme={quizTheme}
        heartState={heartState}
        missionRewarded={missionRewarded}
      />
    );
  }

  // ── QUIZ PAGE ──────────────────────────────────────────────────
  const q        = questions[current];
  const progress = ((current + (phase === "benar" || phase === "salah" ? 1 : 0)) / questions.length) * 100;
  const isChecking = phase === "checking";

  return (
    <>
      <UserSidebar />
      <div className="usb-page-content quiz-game-page" style={getQuizThemeStyle(quizTheme)}>
        <main className="quiz-wrapper quiz-game-shell">

          {/* Header */}
          <div className="quiz-header">
            <button className="back-btn" onClick={() => navigate("/home")} aria-label="Kembali ke peta belajar">←</button>
            <div className="quiz-mission-identity">
              <span className="quiz-theme-icon" aria-hidden="true">{quizTheme.icon}</span>
              <div>
                <span className="quiz-mission-kicker">Misi · {paramTingkat}</span>
                <div className="quiz-category">{quizInfo.title || levelId}</div>
              </div>
            </div>
            <div className="quiz-header-status">
              <div className="score-pill quiz-heart-pill"><span>{QUIZ_UI_ICONS.heart}</span> {heartState.value}</div>
              <div className="score-pill"><span>★</span> {score} XP</div>
            </div>
          </div>

          {/* Progress track */}
          <div className="quiz-progress-meta">
            <span>Perjalanan misi</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${progress}%` }} />
          </div>

          {/* Soal card */}
          <div className="question-card">
            <span className="quiz-question-emblem" aria-hidden="true">{quizTheme.icon}</span>
            <div className="quiz-question-topline">
              <div className="quiz-kind-label">
                <span>{q.tipe === "pg" ? "Pilihan Ganda" : q.tipe === "tf" ? "Benar atau Salah" : "Soal Esai"}</span>
              </div>
              <span className="quiz-reward-badge">+10 XP</span>
            </div>
            <p>
              {q.pertanyaan}
            </p>
          </div>

          {/* ── FASE: TULIS JAWABAN ────────────────────────────── */}
          {(phase === "soal" || phase === "checking") && (
            <>
              {q.tipe === "pg" && (
                <div className="quiz-choice-grid">
                  {q.opsi.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return <button type="button" key={`${letter}-${option}`} className={`quiz-choice ${jawaban === letter ? "selected" : ""}`} onClick={() => setJawaban(letter)} disabled={isChecking}><span>{letter}</span><strong>{String(option).replace(/^[A-D]\.\s*/, "")}</strong></button>;
                  })}
                </div>
              )}
              {q.tipe === "tf" && (
                <div className="quiz-boolean-grid">
                  {["Benar", "Salah"].map((option) => <button type="button" key={option} className={`quiz-boolean ${jawaban === option ? "selected" : ""}`} onClick={() => setJawaban(option)} disabled={isChecking}><span>{option === "Benar" ? "✓" : "×"}</span>{option}</button>)}
                </div>
              )}
              {q.tipe === "esai" && <div className="quiz-answer-workspace">
              {/* Proses Pengerjaan */}
              <div className="quiz-field-label">
                <span className="quiz-field-icon">{QUIZ_UI_ICONS.notes}</span>
                <span>Tulis Proses Pengerjaanmu <span style={{ color:"#ef4444", fontWeight:700 }}>*</span></span>
              </div>
              <textarea
                className="answer-input quiz-proses-input"
                rows="4"
                placeholder="Tuliskan langkah-langkah penyelesaian kamu di sini...&#10;Contoh: Diketahui f(x) = ..., maka f'(x) = ..."
                value={proses}
                onChange={e => setProses(e.target.value)}
                disabled={isChecking}
              />

              {/* Jawaban Akhir */}
              <div className="quiz-field-label" style={{ marginTop: 8 }}>
                <span className="quiz-field-icon">{QUIZ_UI_ICONS.target}</span>
                <span>Jawaban Akhir <span style={{ color:"#ef4444", fontWeight:700 }}>*</span></span>
              </div>
              <textarea
                className="answer-input quiz-jawaban-input"
                rows="3"
                placeholder="Tulis jawaban akhirmu di sini..."
                value={jawaban}
                onChange={e => setJawaban(e.target.value)}
                disabled={isChecking}
              />

              </div>}

              <div className="button-row">
                <button
                  className="submit-btn quiz-check-btn"
                  onClick={handleSubmit}
                disabled={isChecking || !jawaban.trim() || (q.tipe === "esai" && !proses.trim())}
                >
                  {isChecking ? (
                    <><span className="quiz-spinner" /> AI sedang memeriksa...</>
                  ) : (
                    <>Periksa Jawaban · +10 XP</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── FASE: BENAR ───────────────────────────────────── */}
          {phase === "benar" && (
            <div className="quiz-feedback-panel quiz-feedback-benar">
              <div className="quiz-feedback-emoji">{QUIZ_UI_ICONS.celebration}</div>
              <div className="quiz-feedback-title">Jawaban Benar!</div>
              <div className="quiz-xp-earned">+10 XP diperoleh</div>
              <div className="quiz-feedback-msg">{aiFeedback.feedback}</div>
              <button
                className="submit-btn quiz-continue-btn"
                onClick={() => handleNext(true)}
              >
                {current < questions.length - 1 ? "Lanjut →" : `Lihat Hasil ${QUIZ_UI_ICONS.trophy}`}
              </button>
            </div>
          )}

          {/* ── FASE: SALAH (belum tepat) ─────────────────────── */}
          {/* ── FASE: HINT ────────────────────────────────────── */}
          {phase === "salah" && (
            <WrongAnswerPanel
              feedback={aiFeedback.feedback}
              correctAnswer={q.kunci_jawaban}
              onContinue={() => handleNext(false)}
            />
          )}

          {/* ── FASE: PENILAI BELUM TERSEDIA ─────────────────── */}
          {phase === "verifikasi" && (
            <VerificationPendingPanel
              feedback={aiFeedback.feedback}
              onRetry={handleSubmit}
            />
          )}

        </main>
      </div>
    </>
  );
}

export default QuizPage;
