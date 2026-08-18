const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
require("dotenv").config();
const {
  gradeDeterministically,
  buildEssayGradingPrompt,
  parseAIGrade,
} = require("./lib/essayGrader");

const app = express();

app.set("trust proxy", 1);
const allowedOrigin = process.env.AI_ALLOWED_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin.split(",").map((item) => item.trim()) }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

const requestBuckets = new Map();
app.use("/api", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > 60) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba kembali sebentar lagi." });
  next();
});

const phpAuthUrl = String(process.env.PHP_AUTH_URL || "").trim();
const internalApiKey = String(process.env.INTERNAL_API_KEY || "").trim();

async function requireAuthenticatedUser(req, res, next) {
  const authorization = String(req.get("authorization") || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Sesi login diperlukan." });
  }
  if (!phpAuthUrl || !internalApiKey) {
    return res.status(503).json({ error: "Validasi sesi AI belum dikonfigurasi pada server." });
  }
  try {
    const response = await axios.post(phpAuthUrl, {}, {
      headers: {
        Authorization: authorization,
        "X-Internal-Key": internalApiKey,
        "Content-Type": "application/json",
      },
      timeout: 5000,
      validateStatus: () => true,
    });
    if (response.status !== 200 || response.data?.status !== "success") {
      return res.status(401).json({ error: "Sesi login tidak valid atau telah berakhir." });
    }
    req.authUser = response.data.user;
    return next();
  } catch {
    return res.status(503).json({ error: "Layanan validasi sesi sedang tidak tersedia." });
  }
}

app.use(["/api/chat", "/api/jawaban", "/api/check-answer"], requireAuthenticatedUser);

// ===== GOOGLE GEMINI CONFIG =====
const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_MODELS = String(process.env.GEMINI_MODELS || "gemini-2.5-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const geminiHttp = axios.create({
  baseURL: "https://generativelanguage.googleapis.com/v1beta",
  timeout: Number(process.env.GEMINI_TIMEOUT_MS || 45000),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 20 }),
  transitional: { clarifyTimeoutError: true },
});
let geminiStatus = {
  reachable: null,
  checkedAt: null,
  model: null,
  reason: null,
};

const AI_PROMPT = `Anda adalah tutor matematika bernama AskMatheal yang membantu mahasiswa Indonesia. 
Jawab pertanyaan dengan ramah, jelas, dan berikan langkah-langkah penyelesaian secara detail.
Gunakan bahasa Indonesia yang baik. Jika soal berisi rumus matematika, tuliskan dengan format yang mudah dibaca.
Gunakan Markdown yang rapi: judul singkat, daftar bernomor untuk langkah, dan cetak tebal untuk istilah penting.
Semua notasi matematika wajib memakai LaTeX: gunakan $...$ untuk rumus sebaris dan $$...$$ untuk persamaan terpisah.
Jangan membungkus rumus LaTeX dalam blok kode atau tanda backtick.
Selalu akhiri dengan kesimpulan atau jawaban akhir.`;

const AI_GRADING_INSTRUCTION = `Anda adalah penilai matematika MatHeal yang objektif dan konsisten.
Nilai kebenaran jawaban akhir serta validitas metode secara terpisah.
Terima metode alternatif yang sah secara matematika meskipun berbeda dari referensi.
Ikuti format JSON yang diminta dan jangan menambahkan teks di luar JSON.`;

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

function setGeminiStatus(update) {
  geminiStatus = { ...geminiStatus, ...update, checkedAt: new Date().toISOString() };
}

function retryDelay(error, attempt) {
  const retryAfter = Number(error.response?.headers?.["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 10000);
  return Math.min(600 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250), 3000);
}

function isRetryableGeminiError(error) {
  const status = Number(error.response?.status || 0);
  return !status || status === 408 || status === 429 || status >= 500;
}

/** Memanggil Google Gemini dengan koneksi persisten dan pemulihan gangguan sementara. */
async function callGemini(message, instruction = AI_PROMPT) {
  if (!GEMINI_KEY || GEMINI_KEY === "your_gemini_api_key_here") return null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await geminiHttp.post(
          `/models/${encodeURIComponent(model)}:generateContent`,
          {
            contents: [{ parts: [{ text: `${instruction}\n\n${message}` }] }],
          },
          {
            headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
          }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setGeminiStatus({ reachable: true, model, reason: null });
          return text;
        }
        const finishReason = response.data.candidates?.[0]?.finishReason || "tanpa kandidat";
        const blockReason = response.data.promptFeedback?.blockReason || "tidak diblokir";
        setGeminiStatus({ reachable: true, model, reason: `${finishReason}; ${blockReason}` });
        console.warn(`Gemini ${model} mengembalikan respons kosong (${finishReason}; ${blockReason}).`);
      } catch (e) {
        const status = e.response?.status || 0;
        const detail = e.response?.data?.error?.message || e.code || e.message;
        setGeminiStatus({ reachable: false, model, reason: String(detail) });
        console.error(`Gemini ${model} percobaan ${attempt} gagal (${status || 'network'}):`, detail);
        if (!isRetryableGeminiError(e)) break;
        if (attempt < 3) await wait(retryDelay(e, attempt));
      }
    }
  }
  return null;
}

// ===== SIMULATED (OFFLINE) REPLY =====
function getSimulatedReply(message) {
  return `AskMatheal belum dapat memberikan jawaban otomatis karena layanan tutor sedang tidak tersedia.

Sambil menunggu, gunakan langkah belajar berikut untuk pertanyaan **${message}**:
1. Tentukan konsep utama yang sedang diuji.
2. Catat informasi yang diketahui dan yang ditanyakan.
3. Pilih rumus atau definisi yang relevan.
4. Kerjakan secara bertahap lalu periksa kembali hasilnya.

Silakan coba lagi beberapa saat lagi atau buka modul Materi yang sesuai.`;
}

// ===== MAIN CHAT ENDPOINT =====
app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({ error: "Message wajib diisi" });
  }
  if (message.length > 4000) return res.status(422).json({ error: "Pertanyaan terlalu panjang. Maksimal 4.000 karakter." });

  const hasGeminiKey = GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here";

  if (!hasGeminiKey) {
    return res.json({ reply: getSimulatedReply(message), ai_available: false });
  }

  let reply = null;
  try {
    reply = await callGemini(message);
  } catch (e) {
    console.warn("Gemini error:", e.message);
  }

  if (!reply) {
    reply = `Maaf, layanan Google Gemini sedang tidak tersedia. Silakan coba lagi nanti.\n\n${getSimulatedReply(message)}`;
  }

  res.json({ reply, ai_available: !!reply && geminiStatus.reachable === true });
});

// ===== AI GRADING ENDPOINT =====
app.post("/api/jawaban", async (req, res) => {
  const { id_soal, jawaban_user, pertanyaan, kunci_jawaban } = req.body;

  if (!jawaban_user) {
    return res.status(400).json({ error: "Jawaban wajib diisi" });
  }

  // AI Prompt formatting
  const prompt = `Anda adalah asisten dosen matematika yang bertugas menilai jawaban esai mahasiswa secara universal dan adil.
  
  Soal: "${pertanyaan || 'Selesaikan soal matematika yang diberikan.'}"
  Kunci Jawaban / Solusi Referensi: "${kunci_jawaban || 'Tidak ada kunci jawaban.'}"
  Jawaban Mahasiswa: "${jawaban_user}"
  
  Tugas Anda:
  1. Nilailah jawaban mahasiswa berdasarkan inti pemahaman dan langkah-langkah logisnya, BUKAN hanya dengan mencocokkan teks dengan Kunci Jawaban. Jika inti jawabannya sama atau cara penyelesaiannya masuk akal dan benar, berikan skor penuh. Kunci jawaban di atas hanya sebagai referensi, bukan patokan mutlak.
  2. Berikan skor numerik (berupa angka bulat) dari 0 (salah total/kosong) hingga 100 (sempurna/benar).
  3. Berikan feedback singkat (1-2 kalimat) yang ramah dalam bahasa Indonesia yang menjelaskan mengapa skor tersebut diberikan.
  
  Format output wajib berupa JSON objek dengan kunci "skor" (integer) dan "feedback" (string) seperti ini:
  {
    "skor": 100,
    "feedback": "Jawaban Anda sudah benar dan konsep yang digunakan tepat meskipun sedikit berbeda dari referensi."
  }
  
  PENTING: Jangan sertakan kata pengantar, penjelasan tambahan, atau teks lain di luar format JSON tersebut. Kembalikan HANYA objek JSON.`;

  const hasGeminiKey = GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here";

  if (!hasGeminiKey) {
    // Simulated offline grading
    const isCorrect = kunci_jawaban && jawaban_user.toLowerCase().trim() === kunci_jawaban.toLowerCase().trim();
    const isPartiallyCorrect = kunci_jawaban && jawaban_user.toLowerCase().includes(kunci_jawaban.toLowerCase().split(' ')[0]);
    const score = isCorrect ? 100 : (isPartiallyCorrect ? 70 : 40);
    return res.json({
      skor: score,
      feedback: `(Mode Offline) Jawaban Anda telah diterima. Kecocokan kunci: ${isCorrect ? "Sempurna" : (isPartiallyCorrect ? "Sebagian" : "Kurang cocok")}. Kunci jawaban: ${kunci_jawaban}`
    });
  }

  let reply = null;

  try {
    reply = await callGemini(prompt, AI_GRADING_INSTRUCTION);
  } catch (e) {
    console.warn("Gemini error in grading:", e.message);
  }

  if (!reply) {
    return res.json({
      skor: 0,
      feedback: "Maaf, layanan Google Gemini sedang tidak tersedia. Silakan coba lagi nanti."
    });
  }

  // Parse JSON response
  try {
    const startIdx = reply.indexOf("{");
    const endIdx = reply.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = reply.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.skor !== "undefined") {
        return res.json({
          skor: Number(parsed.skor),
          feedback: parsed.feedback || "Evaluasi selesai."
        });
      }
    }
  } catch (err) {
    console.error("Grade grading error:", reply, err);
  }

  // Fallback
  res.json({
    skor: 75,
    feedback: "Jawaban Anda telah dievaluasi oleh sistem."
  });
});

// ===== CHECK ANSWER (proses + jawaban akhir) =====
app.post("/api/check-answer", async (req, res) => {
  const { pertanyaan, proses, jawaban, kunci_jawaban } = req.body || {};

  if (!jawaban || !String(jawaban).trim()) {
    return res.status(400).json({ error: "Jawaban wajib diisi" });
  }
  if (!proses || !String(proses).trim()) {
    return res.status(400).json({ error: "Proses pengerjaan wajib diisi" });
  }
  if (!kunci_jawaban || !String(kunci_jawaban).trim()) {
    return res.status(422).json({ error: "Kunci jawaban belum tersedia" });
  }

  // Jawaban pasti dan jawaban numerik diperiksa tanpa AI agar hasil konsisten.
  const deterministic = gradeDeterministically({ jawaban, kunci_jawaban });
  if (deterministic.decided && !deterministic.correct) {
    return res.json({
      correct: false,
      score: deterministic.score,
      source: deterministic.reason,
      feedback: "Jawaban akhir tidak sesuai dengan kunci referensi.",
    });
  }

  const hasGeminiKey = GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here";

  if (!hasGeminiKey) {
    if (deterministic.decided && deterministic.correct) {
      return res.json({
        correct: true,
        score: deterministic.score,
        source: deterministic.reason,
        feedback: "Jawaban akhir sesuai dengan kunci referensi. Proses hanya diperiksa kelengkapannya karena layanan AI tidak aktif.",
      });
    }
    return res.json({
      correct: false,
      score: 0,
      source: "offline_fallback",
      feedback: "Jawaban tidak sama persis dengan kunci dan layanan AI belum tersedia untuk memeriksa bentuk alternatif.",
    });
  }

  const prompt = buildEssayGradingPrompt({ pertanyaan, proses, jawaban, kunci_jawaban });

  let reply = null;
  try { reply = await callGemini(prompt, AI_GRADING_INSTRUCTION); } catch (error) {
    console.warn("Gemini gagal menilai esai:", error.message);
  }

  if (!reply) {
    return res.json({
      correct: false,
      score: 0,
      source: "ai_unavailable",
      feedback: "Layanan AI sedang tidak tersedia sehingga jawaban alternatif belum dapat dinyatakan benar.",
    });
  }

  const grade = parseAIGrade(reply);
  if (grade) return res.json({ ...grade, source: "ai_rubric" });

  return res.json({
    correct: false,
    score: 0,
    source: "invalid_ai_response",
    feedback: "Format penilaian AI tidak valid sehingga jawaban belum dapat dinyatakan benar.",
  });
});

// ===== HEALTH CHECK =====
app.get("/api/health", async (req, res) => {
  const configured = !!(GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here");
  if (configured && req.query.live === "1") {
    await callGemini("Balas hanya dengan kata OK.", "Ini pemeriksaan koneksi layanan.");
  }
  res.json({
    status: configured && geminiStatus.reachable !== false ? "ok" : "degraded",
    provider: "google-gemini",
    configured,
    reachable: geminiStatus.reachable,
    checked_at: geminiStatus.checkedAt,
    model: geminiStatus.model,
    reason: geminiStatus.reason,
  });
});

const PORT = Number(process.env.PORT || 5000);
const httpServer = app.listen(PORT, () => {
  if (GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here") {
    console.log(`✅ AI Tutor berjalan di http://localhost:${PORT}`);
    console.log("   Provider: Google Gemini");
  } else {
    console.log("⚠️  Mode simulasi — tambahkan GEMINI_KEY di backend/.env untuk AI sungguhan");
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  }

  // Uji koneksi sekali saat server hidup agar status kesiapan bukan sekadar
  // berdasarkan keberadaan API key. Kegagalan tidak menghentikan server.
  if (GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key_here") {
    callGemini("Balas hanya dengan kata OK.", "Ini pemeriksaan koneksi layanan.")
      .then((reply) => console.log(reply ? "   Gemini siap menerima pertanyaan" : "   Gemini belum dapat dijangkau"))
      .catch((error) => console.warn("Pemeriksaan awal Gemini gagal:", error.message));
  }
});

httpServer.on("error", (error) => {
  console.error("Server AskMatheal gagal dijalankan:", error.message);
});
