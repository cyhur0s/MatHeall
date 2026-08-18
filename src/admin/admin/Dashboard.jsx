import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../config/api";

const DASHBOARD_CACHE_KEY = "matheal_admin_dashboard_cache";
const DASHBOARD_REFRESH_MS = 30_000;
const EMPTY_DASHBOARD = {
  stats: { users: 0, materi: 0, soal: 0, videos: 0 },
  activities: [],
  weekly: { activities: 0, types: 0, activeUsers: 0, quizTotal: 0, materialTotal: 0, daily: [], since: "" },
  cachedAt: null,
};

const readDashboardCache = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || "null");
    return saved && typeof saved === "object" ? { ...EMPTY_DASHBOARD, ...saved } : EMPTY_DASHBOARD;
  } catch {
    return EMPTY_DASHBOARD;
  }
};

const formatLocalDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const ACTIVITY_META = {
  user_register: { label: "Registrasi", icon: "+", tone: "register" },
  user_login: { label: "Login", icon: "→", tone: "login" },
  user_logout: { label: "Logout", icon: "←", tone: "logout" },
  materi: { label: "Materi", icon: "▤", tone: "material" },
  kuis: { label: "Kuis", icon: "✓", tone: "quiz" },
};

const DashboardSection = ({
  liveActivities = [],
  activitiesLoading = false,
  activityError = "",
  onRefreshActivities,
}) => {
  const initial = readDashboardCache();
  const [stats, setStats] = useState(initial.stats);
  const [activities, setActivities] = useState(initial.activities);
  const [weekly, setWeekly] = useState(initial.weekly);
  const [loading, setLoading] = useState(!initial.cachedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(initial.cachedAt ? new Date(initial.cachedAt) : null);
  const [connectionState, setConnectionState] = useState(initial.cachedAt ? "cached" : "loading");

  const fetchStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const timestamp = Date.now();
      const getJson = (path, fallback = [], required = false) => apiFetch(`${path}${path.includes("?") ? "&" : "?"}t=${timestamp}`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          if (required) throw error;
          return fallback;
        });

      const [usersRes, materiRes, soalRes, videosRes, weeklyRes] = await Promise.all([
        getJson("read.php"),
        getJson("list_materi_files.php", { data: [], total: 0 }),
        getJson("read_soal.php"),
        getJson("read_video.php"),
        getJson("dashboard_weekly.php", { activities: 0, types: 0, active_users: 0, quiz_total: 0, material_total: 0, daily: [], recent: [], since: "" }, true),
      ]);

      const nextStats = {
        users: Array.isArray(usersRes)
          ? usersRes.filter((user) => (user.role || "user") === "user").length
          : 0,
        materi: Number(materiRes?.total) || (Array.isArray(materiRes?.data) ? materiRes.data.length : 0),
        soal: Array.isArray(soalRes) ? soalRes.length : 0,
        videos: Array.isArray(videosRes) ? videosRes.length : 0,
      };
      const nextActivities = Array.isArray(weeklyRes?.recent) ? weeklyRes.recent : [];
      const nextWeekly = {
        activities: Number(weeklyRes?.activities) || 0,
        types: Number(weeklyRes?.types) || 0,
        activeUsers: Number(weeklyRes?.active_users) || 0,
        quizTotal: Number(weeklyRes?.quiz_total) || 0,
        materialTotal: Number(weeklyRes?.material_total) || 0,
        daily: Array.isArray(weeklyRes?.daily) ? weeklyRes.daily : [],
        since: weeklyRes?.since || "",
      };
      const updatedAt = new Date();

      setStats(nextStats);
      setActivities(nextActivities);
      setWeekly(nextWeekly);
      setLastUpdated(updatedAt);
      setConnectionState("live");
      localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        stats: nextStats,
        activities: nextActivities,
        weekly: nextWeekly,
        cachedAt: updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error("Gagal memuat statistik dashboard:", error);
      setConnectionState("cached");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = window.setInterval(fetchStats, DASHBOARD_REFRESH_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchStats();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", fetchStats);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", fetchStats);
    };
  }, [fetchStats]);

  const handleManualRefresh = async () => {
    if (refreshing || activitiesLoading) return;
    await Promise.all([
      fetchStats(),
      typeof onRefreshActivities === "function" ? onRefreshActivities() : Promise.resolve(),
    ]);
  };

  const displayedActivities = liveActivities.length > 0 ? liveActivities : activities;

  const activityTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: formatLocalDateKey(date),
        label: date.toLocaleDateString("id-ID", { weekday: "short" }).replace(".", ""),
        count: 0,
      };
    });
    const serverCounts = new Map((weekly.daily || []).map((item) => [item.date, Number(item.count) || 0]));
    days.forEach((day) => { day.count = serverCounts.get(day.key) || 0; });
    return days;
  }, [weekly.daily]);

  const maxTrend = Math.max(1, ...activityTrend.map((day) => day.count));
  const averageQuestions = stats.materi > 0 ? Math.round(stats.soal / stats.materi) : 0;
  const contentReady = stats.materi > 0 && averageQuestions >= 30;

  const statCards = [
    { key: "users", label: "Pengguna Terdaftar", value: stats.users, icon: "👥", tone: "teal", note: "Akun dengan role user" },
    { key: "materi", label: "Materi Belajar", value: stats.materi, icon: "▤", tone: "green", note: "Modul yang tersedia" },
    { key: "soal", label: "Bank Soal", value: stats.soal, icon: "✎", tone: "amber", note: `${averageQuestions} soal rata-rata/materi` },
    { key: "videos", label: "Video Panduan", value: stats.videos, icon: "▶", tone: "blue", note: "Media pendukung" },
  ];

  const weeklyStartLabel = weekly.since
    ? new Date(`${weekly.since}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    : "7 hari terakhir";

  if (loading) {
    return <div className="adm-dashboard-loading"><span></span>Memuat dashboard...</div>;
  }

  return (
    <div className="adm-dashboard">
      <section className="adm-dashboard-intro">
        <div>
          <span className="adm-dashboard-eyebrow">Ringkasan operasional</span>
          <h2>Selamat datang di Admin MatHeal</h2>
          <p>Pantau pengguna, konten belajar, bank soal, dan aktivitas aplikasi dari satu halaman.</p>
        </div>
        <div className="adm-dashboard-sync-tools">
          <div className={`adm-live-status ${connectionState}`}>
            <i></i>
            <span>{connectionState === "live" ? "Data terbaru" : "Data tersimpan"}</span>
            <small>{lastUpdated ? `Diperbarui ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Belum diperbarui"}</small>
          </div>
          <button type="button" className="adm-refresh-button" onClick={handleManualRefresh} disabled={refreshing || activitiesLoading}>
            <span aria-hidden="true" className={refreshing || activitiesLoading ? "spinning" : ""}>↻</span>
            {refreshing || activitiesLoading ? "Memperbarui..." : "Perbarui data"}
          </button>
        </div>
      </section>

      <section className="adm-stats" aria-label="Ringkasan data utama">
        {statCards.map((card) => (
          <article key={card.key} className={`adm-stat-card adm-stat-${card.tone}`}>
            <div className="adm-stat-icon">{card.icon}</div>
            <div className="adm-stat-copy">
              <div className="adm-stat-label">{card.label}</div>
              <div className="adm-stat-val">{card.value.toLocaleString("id-ID")}</div>
              <div className="adm-stat-note">{card.note}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="adm-dashboard-primary-grid">
        <article className="adm-chart-card adm-recent-card">
          <div className="adm-dashboard-card-head">
            <div><span>Pembaruan pengguna</span><h3>Aktivitas user terbaru</h3></div>
            <strong>{displayedActivities.length} tercatat</strong>
          </div>
          {activityError && <div className="adm-activity-error" role="alert">{activityError}</div>}
          <div className="adm-recent-activity-list">
            {displayedActivities.length > 0 ? displayedActivities.slice(0, 4).map((item) => {
              const meta = ACTIVITY_META[item.tipe] || { label: "Aktivitas", icon: "•", tone: "general" };
              return (
              <div key={item.id} className="adm-activity-item">
                <div className={`adm-activity-symbol ${meta.tone}`}>{meta.icon}</div>
                <div className="adm-activity-text">
                  <div><strong>{item.username || "User"}</strong><span className={`adm-activity-type ${meta.tone}`}>{meta.label}</span></div>
                  <span>{item.deskripsi}</span>
                </div>
                <span className="adm-activity-time">{item.waktu}</span>
              </div>
            );
            }) : activitiesLoading
              ? <div className="adm-dashboard-empty">Memuat aktivitas user...</div>
              : <div className="adm-dashboard-empty">Belum ada aktivitas user yang tercatat.</div>}
          </div>
        </article>

        <article className="adm-chart-card adm-system-card">
          <div className="adm-dashboard-card-head"><div><span>Kesiapan aplikasi</span><h3>Status sistem</h3></div></div>
          <div className="adm-system-list">
            <div><span><i className="ok"></i>Database aktivitas</span><strong>Aktif</strong></div>
            <div><span><i className="ok"></i>Sinkronisasi dashboard</span><strong>30 detik</strong></div>
            <div><span><i className={contentReady ? "ok" : "warn"}></i>Cakupan bank soal</span><strong>{averageQuestions}/materi</strong></div>
            <div><span><i className="ok"></i>Penyimpanan aktivitas</span><strong>Permanen</strong></div>
          </div>
          <p className="adm-system-note">Aktivitas disimpan di database dan tetap tersedia setelah admin keluar atau berganti perangkat.</p>
        </article>
      </section>

      <section className="adm-dashboard-secondary-grid">
        <article className="adm-chart-card adm-trend-card">
          <div className="adm-dashboard-card-head">
            <div><span>Tren pengguna</span><h3>Aktivitas user 7 hari terakhir</h3></div>
            <strong>{weekly.activities} aktivitas user</strong>
          </div>
          <div className="adm-activity-chart" aria-label="Grafik aktivitas user selama tujuh hari">
            {activityTrend.map((day) => (
              <div className="adm-activity-bar-column" key={day.key}>
                <span className="adm-activity-bar-value">{day.count}</span>
                <div className="adm-activity-bar-track"><i style={{ height: `${Math.max(7, (day.count / maxTrend) * 100)}%` }}></i></div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
          <div className="adm-trend-summary">
            <span><i className="quiz"></i><strong>{weekly.quizTotal}</strong> kuis diselesaikan user</span>
            <span><i className="account"></i><strong>{weekly.materialTotal}</strong> materi dibuka user</span>
            <span><i className="type"></i><strong>{weekly.activeUsers}</strong> pengguna aktif</span>
            <span><i className="type"></i><strong>{weekly.types}</strong> jenis aktivitas sejak {weeklyStartLabel}</span>
          </div>
        </article>
      </section>
    </div>
  );
};

export default DashboardSection;
