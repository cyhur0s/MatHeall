import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEVELOPER_UPDATE_EVENT,
  fetchDeveloperProfiles,
  getDeveloperFallback,
  normalizeDeveloper,
} from "./utils/developerStore";
import { apiFetch } from "./config/api";

const FEATURES = [
  { icon: "01", title: "Materi Ringkas", desc: "Pelajari konsep, rumus, contoh, dan latihan singkat sebelum memulai kuis." },
  { icon: "02", title: "Kuis Interaktif", desc: "Latih pemahaman melalui pilihan ganda, benar-salah, dan soal esai bertahap." },
  { icon: "03", title: "Pemeriksaan AI", desc: "Jawaban diperiksa berdasarkan hasil akhir sekaligus langkah penyelesaiannya." },
  { icon: "04", title: "Koreksi Langsung", desc: "Saat jawaban belum tepat, jawaban yang benar langsung ditampilkan untuk dipelajari." },
  { icon: "05", title: "Peta Belajar", desc: "Selesaikan kuis secara berurutan untuk membuka materi dan tingkat berikutnya." },
  { icon: "06", title: "Progres Tersimpan", desc: "Hasil, akurasi, streak, dan riwayat belajar tetap tersedia setelah logout." },
];

const STEPS = [
  { num: "01", title: "Pilih materi", desc: "Buka peta belajar, pilih tingkat yang tersedia, lalu baca modul ringkas topik tersebut." },
  { num: "02", title: "Kerjakan kuis", desc: "Jawab sepuluh soal interaktif sesuai tingkat kesulitan yang sedang terbuka." },
  { num: "03", title: "Tinjau dan lanjutkan", desc: "Pelajari koreksi saat salah. Nilai yang memenuhi target akan tersimpan dan membuka tingkat berikutnya." },
];

const WORKFLOW_STEPS = [
  { num: "01", eyebrow: "Mulai", title: "Pilih materi", desc: "Tentukan topik yang ingin dipelajari dari peta belajar." },
  { num: "02", eyebrow: "Pelajari", title: "Baca modul", desc: "Pahami teori, rumus, dan contoh soal sebelum berlatih." },
  { num: "03", eyebrow: "Berlatih", title: "Kerjakan kuis", desc: "Selesaikan pilihan ganda, benar-salah, dan esai." },
  { num: "04", eyebrow: "Evaluasi", title: "Periksa jawaban", desc: "Dapatkan hasil benar atau salah beserta koreksi langsung." },
  { num: "05", eyebrow: "Bertumbuh", title: "Simpan progres", desc: "Capai target untuk membuka tingkat berikutnya." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [developers, setDevelopers] = useState(() => getDeveloperFallback());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 760) setMobileNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, []);

  useEffect(() => {
    apiFetch("read_video.php")
      .then(r => r.json())
      .then(data => { setVideos(Array.isArray(data) ? data : []); })
      .catch(() => setVideos([]))
      .finally(() => setVideoLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    const refreshDevelopers = async () => {
      try {
        const result = await fetchDeveloperProfiles();
        if (!active) return;
        const next = result.configured ? result.developers : getDeveloperFallback();
        setDevelopers(next);
        localStorage.setItem("developers", JSON.stringify(next));
      } catch {
        if (active) setDevelopers(getDeveloperFallback());
      }
    };
    const handleDeveloperUpdate = (event) => {
      const next = Array.isArray(event.detail)
        ? event.detail.map(normalizeDeveloper)
        : getDeveloperFallback();
      setDevelopers(next);
    };
    const handleStorage = (event) => {
      if (event.key === "developers") setDevelopers(getDeveloperFallback());
    };

    refreshDevelopers();
    const interval = setInterval(refreshDevelopers, 5000);
    window.addEventListener("focus", refreshDevelopers);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DEVELOPER_UPDATE_EVENT, handleDeveloperUpdate);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", refreshDevelopers);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DEVELOPER_UPDATE_EVENT, handleDeveloperUpdate);
    };
  }, []);

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('/embed/')) return url;
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    return url;
  };

  const categories = ["Semua", ...new Set(videos.map(v => v.kategori).filter(Boolean))];
  const filteredVideos = activeCategory === "Semua" ? videos : videos.filter(v => v.kategori === activeCategory);

  return (
    <>
      

      {/* NAVBAR */}
      <nav className="lp-nav">
        <div className="lp-nav-start">
          <a className="lp-brand" href="#home" aria-label="Kembali ke bagian awal Matheal">
            <div className="lp-brand-icon">M</div>
            Matheal
          </a>
          <button
            type="button"
            className={`lp-mobile-toggle${mobileNavOpen ? " is-open" : ""}`}
            aria-label={mobileNavOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-controls="landing-navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
        <div id="landing-navigation" className={`lp-navlinks${mobileNavOpen ? " is-open" : ""}`}>
          <a href="#home" onClick={() => setMobileNavOpen(false)}>Beranda</a>
          <a href="#workflow" onClick={() => setMobileNavOpen(false)}>Alur Belajar</a>
          <a href="#features" onClick={() => setMobileNavOpen(false)}>Fitur</a>
          <a href="#how" onClick={() => setMobileNavOpen(false)}>Cara Kerja</a>
          <a href="#demo" onClick={() => setMobileNavOpen(false)}>Contoh</a>
          <a href="#contact" onClick={() => setMobileNavOpen(false)}>Tentang</a>
          <button type="button" className="lp-mobile-login" onClick={() => navigate("/login")}>Login</button>
        </div>
        <div className="lp-nav-btns">
          <button className="btn-ghost" onClick={() => navigate("/login")}>Login</button>
      </div>
      </nav>

      {/* HERO */}
      <section id="home" className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-copy">
            <div className="lp-badge">Belajar matematika dengan proses yang jelas</div>
            <h1>Pahami cara menyelesaikan soal, bukan hanya jawabannya.</h1>
            <p>MatHeal menggabungkan materi terstruktur, kuis interaktif, pemeriksaan AI, dan pencatatan progres dalam satu pengalaman belajar yang terukur.</p>
            <div className="lp-hero-btns">
              <button className="btn-white" onClick={() => navigate("/login")}>Mulai belajar</button>
              <button className="btn-outline-white" onClick={() => setShowVideoModal(true)}>Lihat video materi</button>
            </div>
          </div>
        </div>
      </section>

      {/* LEARNING WORKFLOW */}
      <section id="workflow" className="lp-workflow-section">
        <div className="lp-section lp-workflow-inner">
          <div className="lp-section-header">
            <span className="lp-section-tag">Alur Belajar</span>
            <h2 className="lp-section-title">Dari memahami materi sampai progres tersimpan</h2>
            <p className="lp-section-sub">Ikuti tahapan belajar secara berurutan agar setiap konsep dipahami sebelum membuka tingkat selanjutnya.</p>
          </div>
          <div className="lp-workflow-grid" aria-label="Alur belajar MatHeal">
            {WORKFLOW_STEPS.map((item) => (
              <div className="lp-workflow-item" key={item.num}>
                <div className="lp-workflow-topline">
                  <span className="lp-workflow-num">{item.num}</span>
                  <small>{item.eyebrow}</small>
                </div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
                <i aria-hidden="true">&#8594;</i>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <span className="lp-section-tag">Yang tersedia di MatHeal</span>
          <h2 className="lp-section-title">Satu alur belajar dari materi sampai progres</h2>
          <p className="lp-section-sub">Setiap fitur membantu pengguna memahami konsep, mencoba penyelesaian, memperbaiki kesalahan, dan melanjutkan level.</p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-alt-bg">
        <div className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-tag">Cara Kerja</span>
            <h2 className="lp-section-title">Belajar dalam tiga tahap yang jelas</h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className={`lp-step ${i === 1 ? "lp-step-active" : ""}`}>
                <div className="lp-step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="lp-section">
        <div className="lp-demo-wrap">
          <div className="lp-demo-card">
            <div className="lp-demo-header">
              <h3>Contoh pemeriksaan jawaban</h3>
              <span className="lp-demo-badge">AI Check</span>
            </div>
            <div className="lp-demo-problem">
              <small>Soal</small>
              <span>x² + 5x + 6 = 0</span>
            </div>
            {[
              ["Proses 1 - Faktorisasi","(x + 2)(x + 3) = 0"],
              ["Proses 2 - Tentukan akar","x = -2 atau x = -3"],
              ["AI Check - Benar","Proses runtut dan kedua akar sesuai."],
            ].map(([label, val]) => (
              <div key={label} className="lp-demo-step">
                <small>{label}</small>
                <span>{val}</span>
              </div>
            ))}
            <div className="lp-demo-progress-label">
              <span>Progres Keseluruhan</span>
              <span style={{color:"#2491ff",fontWeight:700}}>78%</span>
            </div>
            <div className="lp-demo-progress-bar">
              <div className="lp-demo-progress-fill" />
            </div>
          </div>
          <div className="lp-demo-text">
            <h2>Feedback langsung pada proses pengerjaan</h2>
            <p>AskMatheal memeriksa jawaban akhir dan langkah yang ditulis. Jika belum tepat, pengguna langsung melihat jawaban yang benar sebelum melanjutkan.</p>
            <div className="lp-demo-chips">
              {["Kalkulus","Aljabar","Matematika Diskrit","Geometri","Logika"].map(c => (
                <span key={c} className="lp-chip">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* CONTACT / DEVELOPER SECTION */}
      <section id="contact" className="lp-contact">
        <div className="lp-contact-inner">
          <div className="lp-contact-header">
            <h2 className="lp-section-title">Tentang pengembangan MatHeal</h2>
            <p className="lp-section-sub">MatHeal dikembangkan sebagai pendamping belajar matematika yang menempatkan proses berpikir, latihan, dan perbaikan jawaban sebagai inti pengalaman.</p>
          </div>

          {/* Developer Cards */}
          <div className="lp-dev-grid">
            {developers.map((dev, index) => (
              <div key={dev.id || `${dev.name}-${index}`} className="lp-dev-grid-item">
                <div className="lp-dev-card">
                  <div 
                    className="lp-dev-avatar" 
                    style={dev.photo ? { overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" } : { background: `linear-gradient(135deg, ${dev.color}, ${dev.color}cc)` }}
                  >
                    {dev.photo ? (
                      <img src={dev.photo} alt={dev.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      dev.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="lp-dev-name">{dev.name}</div>
                  <div className="lp-dev-role">{dev.role}</div>
                  <div className="lp-dev-socials">
                    {dev.github && <a
                      className="lp-dev-social-link"
                      href={dev.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GitHub"
                    >GH</a>}
                    {dev.linkedin && <a
                      className="lp-dev-social-link"
                      href={dev.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn"
                    >in</a>}
                    {dev.email && <a
                      className="lp-dev-social-link"
                      href={`mailto:${dev.email}`}
                      title="Email"
                    >Mail</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div className="lp-vmodal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="lp-vmodal-bar" onClick={e => e.stopPropagation()}>
            <div className="lp-vmodal-title">Video Tutorial</div>
            <button className="lp-vmodal-close" onClick={() => setShowVideoModal(false)} aria-label="Tutup">×</button>
          </div>
          <div className="lp-vmodal-body" onClick={e => e.stopPropagation()}>
            <div className="lp-vmodal-inner">
              {categories.length > 1 && (
                <div className="lp-video-cats">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`lp-video-cat-btn ${activeCategory === cat ? "active" : ""}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {videoLoading ? (
                <div className="lp-video-empty">
                  <div className="lp-video-empty-icon">⏳</div>
                  <p style={{color:"#94a3b8"}}>Memuat video...</p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="lp-video-empty">
                  <div className="lp-video-empty-icon">🎬</div>
                  <p style={{color:"#94a3b8"}}>Video tutor segera hadir. Nantikan konten terbaik dari kami!</p>
                </div>
              ) : (
                <div className="lp-video-grid">
                  {filteredVideos.map(v => (
                    <div key={v.id_video} className="lp-video-card">
                      <div className="lp-video-thumb">
                        <iframe
                          src={getYoutubeEmbedUrl(v.url_video)}
                          title={v.judul}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="lp-video-info">
                        <span className="lp-video-badge">{v.kategori || "Umum"}</span>
                        <div className="lp-video-card-title">{v.judul}</div>
                        {v.deskripsi && (
                          <div className="lp-video-card-desc">
                            {v.deskripsi.length > 90 ? v.deskripsi.substring(0,90)+"..." : v.deskripsi}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="lp-cta">
        <h2>Siap memulai proses belajar yang lebih terarah?</h2>
        <p>Masuk ke MatHeal, pilih materi, lalu lanjutkan progres belajarmu.</p>
        <button className="btn-white" style={{padding:"14px 36px",fontSize:"16px"}} onClick={() => navigate("/login")}>
          Masuk dan mulai belajar
        </button>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <p className="lp-footer-copy">© 2026 MatHeal. Platform pembelajaran matematika.</p>
      </footer>
    </>
  );
}
