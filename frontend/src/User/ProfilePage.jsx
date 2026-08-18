import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} 

from 'chart.js';
import { useEffect, useState } from "react";
import { Line } from 'react-chartjs-2';
import { useNavigate } from "react-router-dom";
import UserSidebar from "../UserSidebar";
import { getStoredStreak } from "../utils/streak";
import { syncCurrentUserProgress } from "../utils/userProgress";
import { getHeartState } from "../utils/hearts";
import { buildCumulativeWeekdayActivity, readDailyActivity } from "../utils/dailyMissions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Filler,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const TOTAL_QUIZ = 51;

const ProfilePage = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState(localStorage.getItem("username") || "User");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || "");
  const joinedYear = localStorage.getItem("joined_year") || String(new Date().getFullYear());

  // Edit Profile State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [editAvatar, setEditAvatar] = useState(avatar);

  const displayAvatar = avatar ? avatar : username.slice(0, 2).toUpperCase();

  const saveProfile = () => {
    localStorage.setItem("username", editUsername);
    localStorage.setItem("avatar", editAvatar);
    setUsername(editUsername);
    setAvatar(editAvatar);
    setShowEditModal(false);
    syncCurrentUserProgress();
  };

  const [stats, setStats] = useState({
    totalPoints: 0,
    streak: 0,
    longestStreak: 0,
    streakActive: false,
    hearts: getHeartState().value,
    levelsCompleted: 0,
    levelBreakdown: { mudah: 0, sedang: 0, sulit: 0 },
  });

  const [chartData, setChartData] = useState([0, 0, 0, 0, 0, 0, 0]);

  const loadStats = () => {
    // Passed quizzes (sumber utama)
    const passedQuizzes = (() => {
      try {
        return JSON.parse(localStorage.getItem("passed_quizzes") || "[]")
          .filter((key) => typeof key === "string" && key.includes("::"));
      } catch { return []; }
    })();

    // Level progress hanya menyimpan status kelulusan, bukan nilai percobaan.
    const savedProgress = (() => {
      try { return JSON.parse(localStorage.getItem("levelProgress") || "{}"); } catch { return {}; }
    })();
    const completedKeys = new Set(passedQuizzes);
    Object.entries(savedProgress).forEach(([progressKey, level]) => {
      if (!progressKey.includes("::")) return;
      if (level.completed) completedKeys.add(progressKey);
    });

    const levelBreakdown = { mudah: 0, sedang: 0, sulit: 0 };
    completedKeys.forEach((progressKey) => {
      const levelName = progressKey.split("::").pop();
      if (levelName in levelBreakdown) levelBreakdown[levelName] += 1;
    });
    const realCompleted = completedKeys.size;
    const realPoints = realCompleted * 100;

    const { streak: currentStreak, longestStreak, streakActive } = getStoredStreak();

    setStats({
      totalPoints: realPoints,
      streak: currentStreak,
      longestStreak,
      streakActive,
      hearts: getHeartState().value,
      levelsCompleted: realCompleted,
      levelBreakdown,
    });

    // Setiap titik mengakumulasi aktivitas pada nama hari yang sama dari
    // seluruh minggu, sehingga diagram tidak kembali nol setiap Senin.
    setChartData(buildCumulativeWeekdayActivity(readDailyActivity()));
  };

  useEffect(() => {
    loadStats();
    const interval = window.setInterval(loadStats, 1000);
    const handleStorage = () => loadStats();
    window.addEventListener("focus", loadStats);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadStats);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);


  const activityData = {
    labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
    datasets: [
      {
        label: "Soal dikerjakan",
        data: chartData,
        borderColor: "#215f6d",
        backgroundColor: "rgba(33, 95, 109, 0.12)",
        pointBackgroundColor: "#d29862",
        pointBorderColor: "#fffefa",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.34,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(10, ...chartData),
        grid: { color: "rgba(33, 59, 56, 0.08)" },
        ticks: { color: "#64748b", font: { size: 11 }, precision: 0 },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
    },
  };

  const [note, setNote] = useState(localStorage.getItem("studyNote") || "");

  const handleNoteChange = (e) => {
    setNote(e.target.value);
    localStorage.setItem("studyNote", e.target.value);
    syncCurrentUserProgress();
  };

  const progressPct = Math.round((stats.levelsCompleted / TOTAL_QUIZ) * 100);

  return (
    <>
      <UserSidebar />

      <div className="usb-page-content">
        <div className="prof-container">

          {/* PROFILE */}
          <div className="prof-card">
            <div className="prof-avatar">
              {(avatar.startsWith("http") || avatar.startsWith("data:image")) ? <img src={avatar} alt="avatar" /> : displayAvatar}
            </div>
            <div className="prof-info">
              <h2>{username}</h2>
              <div className="prof-meta-row">
                <span className="prof-handle">@{username.toLowerCase().replace(/\s+/g, '')}</span>
                <span className="prof-joined"><span aria-hidden="true">◷</span> Bergabung {joinedYear}</span>
              </div>
              <div className="prof-badge-row">
                <span className="prof-badge">🌱 PEMULA</span>
                {stats.streakActive && (
                  <span className="prof-badge prof-badge-streak">🔥 STREAK AKTIF</span>
                )}
                {stats.levelsCompleted >= 10 && (
                  <span className="prof-badge prof-badge-gold">⭐ BERPRESTASI</span>
                )}
              </div>
            </div>
            <button className="edit-prof-btn" onClick={() => setShowEditModal(true)}>✏️ Edit Profile</button>
          </div>

          {/* STATS */}
          <div className="prof-stats">
            <div className="prof-stat-card prof-blue">
              <div className="prof-stat-icon">🎯</div>
              <h2>{stats.totalPoints}</h2>
              <p>Total Poin</p>
              <small>100 poin tiap level lulus</small>
            </div>
            <div className={`prof-stat-card ${stats.streakActive ? "prof-orange prof-streak-glow" : "prof-orange"}`}>
              <div className="prof-stat-icon">{stats.streakActive ? "🔥" : "🔥"}</div>
              <h2>{stats.streak}</h2>
              <p>Day Streak</p>
              <small>Hari belajar beruntun</small>
              <span className="prof-streak-record">🔥 Terlama {stats.longestStreak} hari</span>
            </div>
            <div className="prof-stat-card prof-green">
              <div className="prof-stat-icon">♥</div>
              <h2>{stats.hearts}</h2>
              <p>Heart</p>
              <small>Energi untuk mengikuti kuis</small>
            </div>
            <div className="prof-stat-card prof-purple">
              <div className="prof-stat-icon">📚</div>
              <h2>{stats.levelsCompleted}</h2>
              <p>Level Lulus</p>
              <small>Dari total {TOTAL_QUIZ} level</small>
            </div>
          </div>
          {/* PROGRESS ROW */}
          <div className="prof-mini-row">
            <div className="prof-mini-card" style={{ flex: 1 }}>
              <div className="prof-mini-label">📈 Progress Kuis</div>
              <div className="prof-progress-track">
                <div className="prof-progress-fill" style={{ width: `${progressPct}%` }}></div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: 6 }}>
                {stats.levelsCompleted} dari {TOTAL_QUIZ} kuis selesai ({progressPct}%)
              </div>
            </div>
          </div>

          <div className="prof-grid">
            {/* ACTIVITY CHART */}
            <div className="prof-activity">
              <div className="prof-chart-heading">
                <div>
                  <h3>Progres Belajar</h3>
                  <p>Akumulasi soal per hari dari minggu ke minggu</p>
                </div>
                <strong>{chartData.reduce((total, value) => total + value, 0)} soal</strong>
              </div>
              <div className="prof-level-breakdown">
                <span title="Materi tingkat Mudah yang sudah lulus"><i className="prof-level-dot easy"></i>Mudah <strong>{stats.levelBreakdown.mudah} dari 17</strong></span>
                <span title="Materi tingkat Sedang yang sudah lulus"><i className="prof-level-dot medium"></i>Sedang <strong>{stats.levelBreakdown.sedang} dari 17</strong></span>
                <span title="Materi tingkat Sulit yang sudah lulus"><i className="prof-level-dot hard"></i>Sulit <strong>{stats.levelBreakdown.sulit} dari 17</strong></span>
              </div>
              <div className="chart-wrapper">
                <Line data={activityData} options={chartOptions} />
              </div>
              <p className="prof-chart-note">Diagram terus bertambah setiap minggu berdasarkan jumlah soal yang selesai dikerjakan pada setiap hari WIB, tanpa menyimpan nilai atau rincian jawaban.</p>
            </div>

            {/* CATATAN */}
            <div className="prof-activity" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3>📝 Catatan Belajar</h3>
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="Tulis catatan, target, atau to-do list kamu di sini..."
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: '200px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#1e293b',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2491ff';
                  e.target.style.background = '#fff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(36,145,255,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Profile</h3>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Masukkan username baru..."
              />
            </div>
            <div className="form-group">
              <label>Foto Profile (Pilih File / URL / Emoji)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditAvatar(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ marginBottom: '12px' }}
              />
              <input
                type="text"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="Atau masukkan URL / Emoji..."
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowEditModal(false)}>Batal</button>
              <button className="modal-btn modal-save" onClick={saveProfile}>Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default ProfilePage;
