import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { restoreUserProgress } from "./utils/userProgress";
import { apiFetch } from "./config/api";

const MATH_FACTS = [
  { icon: "💡", fact: "Angka 0 bersifat netral: menambah atau mengurangi suatu bilangan dengan 0 tidak mengubah nilainya." },
  { icon: "📐", fact: "Simbol 'sama dengan' (=) diciptakan pada tahun 1557 oleh Robert Recorde agar tidak perlu mengetik 'is equal to' berulang kali." },
  { icon: "🧮", fact: "Lingkaran memiliki 360° karena bangsa Babilonia kuno menggunakan sistem bilangan berbasis 60." },
  { icon: "♾️", fact: "Kata 'Aljabar' berasal dari istilah Arab 'Al-Jabr' dari buku karya Al-Khwarizmi abad ke-9." },
  { icon: "📊", fact: "Nilai Pi (π) adalah konstanta irasional yang angka di belakang komanya tidak pernah berhenti dan tidak berulang." },
  { icon: "🎯", fact: "Pola Segitiga Pascal sudah dikenal di Tiongkok & Persia jauh sebelum Blaise Pascal lahir." }
];

function LoginPage() {
  const [tab, setTab] = useState("login");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % MATH_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Username dan password wajib diisi!");
      return;
    }

    try {
      const response = await apiFetch(
        "login.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        }
      );

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON:", text);
        alert("Terjadi kesalahan pada server. Silakan cek koneksi backend.");
        return;
      }

      if (data.status === "success") {
        localStorage.setItem("username", data.user?.username || "");
        localStorage.setItem("role",     data.user?.role     || "user");
        localStorage.setItem("auth_token", data.token || "");
        if (data.user?.joined_year) localStorage.setItem("joined_year", String(data.user.joined_year));
        if (data.user?.role !== "admin") {
          await restoreUserProgress(data.user?.username || username);
        }

        if (data.user?.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        setPopupMessage(data.message || "Login gagal.");
        setShowPopup(true);
      }
    } catch (error) {
      console.error("ERROR:", error);
      alert("Backend tidak terhubung atau server bermasalah!");
    }
  };

  // REGISTER (Default role is user)
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!regUsername || !regPassword || !regConfirm) {
      alert("Semua data wajib diisi!");
      return;
    }

    if (regPassword !== regConfirm) {
      alert("Password tidak sama!");
      return;
    }

    try {
      const response = await apiFetch(
        "register.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: regUsername,
            password: regPassword,
            role: "user",
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        alert("Pendaftaran berhasil! Silakan masuk.");

        setTab("login");
        setUsername(regUsername);

        setRegUsername("");
        setRegPassword("");
        setRegConfirm("");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal koneksi ke server!");
    }
  };

  const currentFact = MATH_FACTS[factIndex];

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    if (!forgotUsername.trim()) return;
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const response = await apiFetch("request_password_reset.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      });
      const data = await response.json();
      setForgotMessage(data.message || "Permintaan reset telah diproses.");
    } catch {
      setForgotMessage("Tidak dapat menghubungi server. Silakan coba kembali.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <div className="login-page">
        {/* CHALK MATH WATERMARK */}
        <div className="math-bg-watermark" aria-hidden="true">
          {/* Top section */}
          <span className="chalk-text" style={{top:'4%',left:'3%',fontSize:'22px',transform:'rotate(-5deg)'}}>y = mx + b</span>
          <span className="chalk-text" style={{top:'4%',left:'32%',fontSize:'18px',transform:'rotate(2deg)'}}>x⁻⁶ = 1/x⁶</span>
          <span className="chalk-text" style={{top:'3%',right:'5%',fontSize:'15px',transform:'rotate(-3deg)'}}>C = 2πr</span>

          {/* Upper middle */}
          <span className="chalk-text" style={{top:'13%',left:'6%',fontSize:'20px',transform:'rotate(-8deg)'}}>V = ⁴⁄₃πr³</span>
          <span className="chalk-text" style={{top:'12%',left:'28%',fontSize:'22px',transform:'rotate(4deg)'}}>sin(θ) = opp/hyp</span>
          <span className="chalk-text" style={{top:'11%',right:'8%',fontSize:'16px',transform:'rotate(-2deg)'}}>x/a + y/b = 1</span>

          {/* Middle */}
          <span className="chalk-text" style={{top:'26%',left:'2%',fontSize:'32px',fontWeight:900,transform:'rotate(-3deg)'}}>ax² + bx + c = 0</span>
          <span className="chalk-text" style={{top:'25%',right:'4%',fontSize:'18px',transform:'rotate(3deg)'}}>V = s³</span>
          <span className="chalk-text" style={{top:'38%',left:'4%',fontSize:'38px',fontWeight:900,transform:'rotate(-1deg)'}}>y = mx + b</span>
          <span className="chalk-text" style={{top:'37%',left:'52%',fontSize:'24px',transform:'rotate(2deg)'}}>M = ((x₁+x₂)/2, (y₁+y₂)/2)</span>

          {/* Lower middle */}
          <span className="chalk-text" style={{top:'50%',left:'3%',fontSize:'19px',transform:'rotate(-5deg)'}}>ax + by = c</span>
          <span className="chalk-text" style={{top:'50%',left:'38%',fontSize:'22px',transform:'rotate(1deg)'}}>y - y₁ = m(x - x₁)</span>
          <span className="chalk-text" style={{top:'58%',left:'5%',fontSize:'20px',transform:'rotate(-4deg)'}}>A = √3/4 · a²</span>
          <span className="chalk-text" style={{top:'57%',left:'36%',fontSize:'26px',fontWeight:900,transform:'rotate(2deg)'}}>a = (Vf - Vi) / t</span>
          <span className="chalk-text" style={{top:'58%',right:'4%',fontSize:'24px',fontWeight:900,transform:'rotate(-2deg)'}}>S = d/t</span>

          {/* Lower */}
          <span className="chalk-text" style={{top:'70%',left:'3%',fontSize:'18px',transform:'rotate(-6deg)'}}>A = bh</span>
          <span className="chalk-text" style={{top:'70%',left:'32%',fontSize:'19px',transform:'rotate(3deg)'}}>tan(θ) = opp/adj</span>
          <span className="chalk-text" style={{top:'70%',right:'3%',fontSize:'19px',transform:'rotate(-4deg)'}}>ax + by = c</span>

          {/* Bottom */}
          <span className="chalk-text" style={{bottom:'10%',left:'2%',fontSize:'18px',transform:'rotate(-5deg)'}}>S = d/t</span>
          <span className="chalk-text" style={{bottom:'9%',left:'22%',fontSize:'28px',fontWeight:900,transform:'rotate(-1deg)'}}>d = √((x₂-x₁)² + (y₂-y₁)²)</span>
          <span className="chalk-text" style={{bottom:'3%',left:'20%',fontSize:'22px',transform:'rotate(2deg)'}}>(2x)³ = 2³ · x³ = 8x³</span>
          <span className="chalk-text" style={{bottom:'3%',right:'5%',fontSize:'20px',transform:'rotate(-3deg)'}}>xᵃ · xᵇ = xᵃ⁺ᵇ</span>

          {/* Pi symbol */}
          <span className="chalk-text" style={{bottom:'2%',right:'2%',fontSize:'72px',fontWeight:900,opacity:0.35,lineHeight:1}}>π</span>
        </div>

        <div className="login-wrapper">
          {/* TAHUKAH KAMU? ILLUSTRATION & FACT SIDEBAR (LEFT) */}
          <div className="login-fact-container">
            <div className="fact-illustration-box">
              <img
                src={`${import.meta.env.BASE_URL}tahukah_kamu.png`}
                alt="Belajar Matematika"
                className="fact-illustration-img"
              />
            </div>
            
            <div className="fact-text-group">
              <h2 className="fact-title">Tahukah Kamu?</h2>
              <p className="fact-description">
                {currentFact.fact}
              </p>

              <div className="fact-dots-row">
                {MATH_FACTS.map((_, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={`fact-dot ${idx === factIndex ? "active" : ""}`}
                    onClick={() => setFactIndex(idx)}
                    aria-label={`Tampilkan fakta matematika ${idx + 1}`}
                    aria-pressed={idx === factIndex}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* LOGIN / REGISTER CARD */}
          <div className="login-card">
            <div className="logo-box">🧮</div>

            <h1>MatHeal</h1>
            <p>Tutor matematika pribadimu</p>

            <div className="tab-box">
              <button
                type="button"
                className={`login-tab ${tab === "login" ? "active" : ""}`}
                aria-pressed={tab === "login"}
                onClick={() => setTab("login")}
              >
                Masuk
              </button>

              <button
                type="button"
                className={`login-tab ${tab === "register" ? "active" : ""}`}
                aria-pressed={tab === "register"}
                onClick={() => setTab("register")}
              >
                Daftar
              </button>
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin}>
                <label className="sr-only" htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />

                <div style={{ position: "relative" }}>
                  <label className="sr-only" htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ width: "100%" }}
                  />
                  <button
                    type="button"
                    className="password-visibility-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => { setForgotUsername(username); setForgotMessage(""); setShowForgot(true); }}
                >
                  Lupa password?
                </button>

                <button type="submit" className="primary-btn">
                  Masuk
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <label className="sr-only" htmlFor="register-username">Username baru</label>
                <input
                  id="register-username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  autoComplete="username"
                  minLength={3}
                  required
                />

                <div style={{ position: "relative" }}>
                  <label className="sr-only" htmlFor="register-password">Password baru</label>
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (minimal 8 karakter)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    style={{ width: "100%" }}
                  />
                  <button
                    type="button"
                    className="password-visibility-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <label className="sr-only" htmlFor="register-confirm-password">Konfirmasi password baru</label>
                  <input
                    id="register-confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Konfirmasi password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <button type="submit" className="primary-btn">
                  Daftar
                </button>
              </form>
            )}
          </div>
        </div>

        {showPopup && (
          <div className="popup-overlay">
            <div className="modern-popup" role="alertdialog" aria-modal="true" aria-labelledby="login-error-title">
              <div className="popup-icon">⚠️</div>

              <h2 id="login-error-title">Gagal Masuk</h2>

              <p>
                {popupMessage || "Akun belum terdaftar atau password salah."}
              </p>

              <div className="popup-buttons">
                <button
                  className="popup-register-btn"
                  onClick={() => {
                    setShowPopup(false);
                    setTab("register");
                  }}
                >
                  Daftar Sekarang
                </button>

                <button
                  className="popup-close-btn"
                  onClick={() => setShowPopup(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {showForgot && (
          <div className="modal-overlay" onClick={() => setShowForgot(false)}>
            <div className="modal-content forgot-password-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" onClick={(event) => event.stopPropagation()}>
              <span className="forgot-password-kicker">Pemulihan akun</span>
              <h3 id="forgot-password-title">Lupa password?</h3>
              <p>Masukkan username. Permintaan akan diteruskan kepada admin Matheal untuk dibuatkan password baru.</p>
              <form onSubmit={handleForgotPassword}>
                <label htmlFor="forgot-username">Username</label>
                <input
                  id="forgot-username"
                  value={forgotUsername}
                  onChange={(event) => setForgotUsername(event.target.value)}
                  placeholder="Masukkan username"
                  required
                />
                {forgotMessage && <div className="forgot-password-message">{forgotMessage}</div>}
                <div className="modal-actions">
                  <button type="button" className="modal-btn modal-cancel" onClick={() => setShowForgot(false)}>Batal</button>
                  <button type="submit" className="modal-btn modal-save" disabled={forgotLoading}>
                    {forgotLoading ? "Mengirim..." : "Kirim permintaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LoginPage;
