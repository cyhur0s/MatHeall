import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./config/api";

function PasswordVisibilityButton({ visible, onToggle }) {
  return (
    <button
      type="button"
      className="password-visibility-btn"
      onClick={onToggle}
      aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={visible}
      title={visible ? "Sembunyikan password" : "Tampilkan password"}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {visible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
            <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.2 0 8.5 4.4 9.4 6a2 2 0 0 1 0 2c-.4.7-1.3 1.9-2.6 3" />
            <path d="M6.6 6.6C4.5 8 3.2 9.8 2.6 11a2 2 0 0 0 0 2c.9 1.6 4.2 6 9.4 6 1.1 0 2.1-.2 3-.5" />
          </>
        ) : (
          <>
            <path d="M2.6 11a2 2 0 0 0 0 2c.9 1.6 4.2 6 9.4 6s8.5-4.4 9.4-6a2 2 0 0 0 0-2C20.5 9.4 17.2 5 12 5S3.5 9.4 2.6 11Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

function RegisterAdmin() {
  const [inputKey, setInputKey] = useState("");
  const [isKeyValid, setIsKeyValid] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleVerifyKey = (e) => {
    e.preventDefault();
    if (inputKey.trim().length >= 12) {
      setIsKeyValid(true);
      setMessage("");
    } else {
      setIsKeyValid(false);
      setMessage("❌ Kunci keamanan admin tidak valid!");
    }
  };

  const handleRegisterAdmin = async (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPass) {
      alert("Semua data wajib diisi!");
      return;
    }

    if (password !== confirmPass) {
      alert("Konfirmasi password tidak cocok!");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password,
          role: "admin",
          admin_key: inputKey,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.status === "success") {
        alert("🎉 Akun Admin berhasil dibuat! Silakan login.");
        navigate("/login");
      } else {
        alert(data.message || "Gagal membuat akun admin.");
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("Gagal koneksi ke server!");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: "460px" }}>
        <div className="logo-box" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
          🛡️
        </div>

        <h1 style={{ marginTop: "12px", fontSize: "24px" }}>Register Admin</h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Area Khusus Administrator MatHeal</p>

        {!isKeyValid ? (
          <form onSubmit={handleVerifyKey} style={{ marginTop: "20px" }}>
            <div style={{ background: "#fef3c7", border: "1.5px solid #fde68a", color: "#92400e", padding: "14px", borderRadius: "12px", fontSize: "13px", lineHeight: "1.5" }}>
              🔒 <strong>Akses Terproteksi!</strong><br />
              Pendaftaran Administrator memerlukan Kunci Keamanan Khusus.
            </div>

            {message && <div style={{ color: "#ef4444", fontSize: "13px", textAlign: "center", fontWeight: "bold", marginTop: "10px" }}>{message}</div>}

            <input
              type="password"
              placeholder="Masukkan Secret Admin Key..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{ marginTop: "12px" }}
              required
            />

            <button type="submit" className="primary-btn" style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              Verifikasi Akses
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{ padding: "10px", background: "none", border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer", marginTop: "6px" }}
            >
              ← Kembali ke Login User
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterAdmin} style={{ marginTop: "20px" }}>
            <div style={{ background: "#d1fae5", border: "1.5px solid #a7f3d0", color: "#065f46", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "bold" }}>
              🔐 Kunci akan diverifikasi oleh server saat akun dibuat.
            </div>

            <input
              type="text"
              placeholder="Username Admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password Admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordVisibilityButton
                visible={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
              />
            </div>

            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Konfirmasi Password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
              <PasswordVisibilityButton
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((visible) => !visible)}
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              {loading ? "Memproses..." : "Daftar Akun Admin"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{ padding: "8px", background: "none", border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer" }}
            >
              ← Kembali ke Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RegisterAdmin;
