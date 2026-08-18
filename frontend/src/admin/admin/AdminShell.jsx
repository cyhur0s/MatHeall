import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DaftarPengguna from "./DaftarPengguna";
import DashboardSection from "./Dashboard";
import MateriSection from "./Materi";
import ProfileSection from "./Profile";
import AdminFileManager from "./AdminFileManager";
import {
  cacheDevelopers,
  fetchDeveloperProfiles,
  getDeveloperFallback,
  readLocalDevelopers,
  saveDeveloperProfiles,
} from "../../utils/developerStore";
import { apiFetch, clearAuthSession } from "../../config/api";

const LEGACY_SIDEBAR_LINKS = [
  { icon: "📊", label: "Dashboard", key: "dashboard" },
  { icon: "👥", label: "Data Pengguna", key: "users" },
  { icon: "📚", label: "Kelola Materi", key: "materi" },
  { icon: "📝", label: "Soal & Kuis", key: "filesoal" },
  { icon: "👤", label: "Profil & Developer", key: "profile" },
];

const ADMIN_NOTIFICATION_READ_KEY = "matheal_admin_last_read_activity_id";

const ADMIN_NAV_LINKS = [
  { icon: "▦", label: "Dashboard", key: "dashboard" },
  { icon: "♙", label: "Pengguna", key: "users" },
  { icon: "▤", label: "Materi", key: "materi" },
  { icon: "✎", label: "Bank Soal", key: "bank-soal" },
  { icon: "○", label: "Profil Admin", key: "profile" },
];

export default function AdminShell() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [adminMobileOpen, setAdminMobileOpen] = useState(false);

  const loadDevs = () => {
    return getDeveloperFallback();
  };

  const [developers, setDevelopers] = useState(loadDevs);
  const [showDevModal, setShowDevModal] = useState(false);
  const [editDev, setEditDev] = useState(null);
  const [devModalForm, setDevModalForm] = useState({
    name: "",
    role: "",
    photo: "",
    color: "#2491ff",
    github: "",
    linkedin: "",
    email: "",
  });
  const [devSaved, setDevSaved] = useState(false);

  const adminName = localStorage.getItem("username") || "Admin";
  const [adminPhoto, setAdminPhoto] = useState(() => localStorage.getItem("admin_photo") || "");
  
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCleared, setNotifCleared] = useState(false);
  const notificationOpenRef = useRef(false);
  const [materiCount, setMateriCount] = useState(0);

  useEffect(() => {
    let active = true;
    const synchronizeDevelopers = async () => {
      try {
        const remote = await fetchDeveloperProfiles();
        if (!active) return;
        if (remote.configured) {
          setDevelopers(cacheDevelopers(remote.developers));
          return;
        }
        const local = readLocalDevelopers();
        if (local !== null) {
          const saved = await saveDeveloperProfiles(local);
          if (active) setDevelopers(saved);
        }
      } catch {
        // Cache lokal tetap dipakai jika backend sedang tidak tersedia.
      }
    };
    synchronizeDevelopers();
    return () => { active = false; };
  }, []);

  const newestActivityId = useCallback((items) => (
    items.reduce((latest, item) => Math.max(latest, Number(item.id) || 0), 0)
  ), []);

  const markActivitiesAsRead = useCallback((items = activities) => {
    const newestId = newestActivityId(items);
    if (newestId > 0) localStorage.setItem(ADMIN_NOTIFICATION_READ_KEY, String(newestId));
    setUnreadCount(0);
    setNotifCleared(true);
  }, [activities, newestActivityId]);

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const res = await apiFetch(
        `read_aktivitas.php?scope=user&t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Format aktivitas tidak valid");

      setActivities(data);
      setActivityError("");
      const newestId = newestActivityId(data);
      const savedReadId = localStorage.getItem(ADMIN_NOTIFICATION_READ_KEY);

      // Aktivitas lama menjadi titik awal pada kunjungan pertama. Setelah itu,
      // badge hanya menghitung baris baru yang belum pernah dilihat admin.
      if (savedReadId === null || notificationOpenRef.current) {
        if (newestId > 0) localStorage.setItem(ADMIN_NOTIFICATION_READ_KEY, String(newestId));
        setUnreadCount(0);
      } else {
        const lastReadId = Number(savedReadId) || 0;
        setUnreadCount(data.filter((item) => (Number(item.id) || 0) > lastReadId).length);
        setNotifCleared(false);
      }
    } catch (err) {
      setActivityError("Aktivitas user belum dapat disinkronkan. Periksa koneksi backend.");
    } finally {
      setActivitiesLoading(false);
    }
  }, [newestActivityId]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 15000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchActivities();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", fetchActivities);
    window.addEventListener("storage", fetchActivities);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", fetchActivities);
      window.removeEventListener("storage", fetchActivities);
    };
  }, [fetchActivities]);

  useEffect(() => {
    const fetchMateriCount = async () => {
      try {
        const response = await apiFetch(`list_materi_files.php?t=${Date.now()}`, { cache: "no-store" });
        const data = await response.json();
        setMateriCount(Number(data?.total) || 0);
      } catch {
        setMateriCount(0);
      }
    };
    fetchMateriCount();
    const interval = setInterval(fetchMateriCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    const willOpen = !showNotifications;
    notificationOpenRef.current = willOpen;
    setShowNotifications(willOpen);
    if (willOpen) markActivitiesAsRead();
  };

  const saveDevs = async (list) => {
    setDevelopers(cacheDevelopers(list));
    try {
      const saved = await saveDeveloperProfiles(list);
      setDevelopers(saved);
      return true;
    } catch {
      alert("Data tersimpan di perangkat ini, tetapi belum berhasil disinkronkan ke server.");
      return false;
    }
  };

  const openAddDev = () => {
    setEditDev(null);
    setDevModalForm({ name: "", role: "", photo: "", color: "#2491ff", github: "", linkedin: "", email: "" });
    setShowDevModal(true);
  };

  const openEditDev = (dev) => {
    setEditDev(dev);
    setDevModalForm({ ...dev });
    setShowDevModal(true);
  };

  const handleSaveDev = async (e) => {
    e.preventDefault();
    let list;
    if (editDev) {
      list = developers.map((d) => (d.id === editDev.id ? { ...devModalForm, id: editDev.id } : d));
    } else {
      list = [...developers, { ...devModalForm, id: Date.now() }];
    }
    const saved = await saveDevs(list);
    if (!saved) return;
    setShowDevModal(false);
    setDevSaved(true);
    setTimeout(() => setDevSaved(false), 3000);
  };

  const handleDeleteDev = async (id) => {
    if (!window.confirm("Hapus developer ini?")) return;
    await saveDevs(developers.filter((d) => d.id !== id));
  };

  const handleDevPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDevModalForm((f) => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleAdminPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAdminPhoto(ev.target.result);
      localStorage.setItem("admin_photo", ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      

      <div className="adm-wrap">
        <button
          type="button"
          className={`adm-mobile-overlay ${adminMobileOpen ? "open" : ""}`}
          aria-label="Tutup menu admin"
          onClick={() => setAdminMobileOpen(false)}
        />
        <aside className={`adm-sidebar ${adminMobileOpen ? "mobile-open" : ""}`}>
          <div className="adm-logo">
            <div className="adm-logo-icon">M</div>
            <div>
              <span className="adm-logo-text">Matheal</span>
              <span className="adm-logo-badge">Admin</span>
            </div>
          </div>

          <nav className="adm-nav">
            {ADMIN_NAV_LINKS.map((l) => (
              <div key={l.key} className={`adm-nav-item ${activePage === l.key ? "active" : ""}`} onClick={() => { setActivePage(l.key); setAdminMobileOpen(false); }}>
                <span>{l.icon}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span>{l.label}</span>
                  {l.key === "materi" && (
                    <small style={{ opacity: 0.72, fontSize: 10, marginTop: 2 }}>
                      Kelola {materiCount || "–"} materi
                    </small>
                  )}
                </span>
              </div>
            ))}
          </nav>

          <div className="adm-sidebar-footer">
            <div className="adm-user-info">
              <div className="adm-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {adminPhoto ? <img src={adminPhoto} alt="Admin" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : adminName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="adm-user-name">{adminName}</div>
                <div className="adm-user-role">Administrator</div>
              </div>
            </div>
            <button className="adm-logout" onClick={async () => {
              try { await apiFetch("logout.php", { method: "POST" }); } catch {}
              clearAuthSession();
              navigate("/");
            }}>
              ➡️ Logout
            </button>
          </div>
        </aside>

        <main className="adm-main">
          <div className="adm-topbar">
            <button type="button" className="adm-mobile-toggle" aria-label="Buka menu admin" onClick={() => setAdminMobileOpen(true)}>
              <span></span><span></span><span></span>
            </button>
            <h1>
              <span className="adm-topbar-page-icon" aria-hidden="true">{ADMIN_NAV_LINKS.find((l) => l.key === activePage)?.icon}</span>
              <span className="adm-topbar-page-title">{ADMIN_NAV_LINKS.find((l) => l.key === activePage)?.label}</span>
            </h1>
            <div className="adm-topbar-right">
              <div className="adm-notif" style={{ position: "relative" }} onClick={toggleNotifications}>
                🔔
                {unreadCount > 0 && <div className="adm-badge">{unreadCount > 9 ? "9+" : unreadCount}</div>}
              </div>
              <div className="adm-avatar" style={{ width: 34, height: 34, fontSize: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {adminPhoto ? <img src={adminPhoto} alt="Admin" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : adminName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {showNotifications && (
            <div className="adm-notif-dropdown">
              <div className="adm-notif-header">
                <span>Notifikasi Aktivitas</span>
                <span
                  style={{ fontSize: 12, color: "#ef4444", cursor: "pointer", fontWeight: 700 }}
                  onClick={() => {
                    markActivitiesAsRead();
                    notificationOpenRef.current = false;
                    setShowNotifications(false);
                    setTimeout(() => setNotifCleared(false), 3000);
                  }}
                >
                  Tandai dibaca
                </span>
              </div>
              <div className="adm-notif-body">
                {activities.length > 0 ? activities.map(act => (
                  <div key={act.id} className="adm-notif-item">
                    <div className="adm-notif-item-icon">⚡</div>
                    <div className="adm-notif-item-content">
                      <div className="adm-notif-text">{act.deskripsi}</div>
                      <div className="adm-notif-time">{act.waktu}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Belum ada aktivitas.</div>
                )}
              </div>
            </div>
          )}

          {/* NOTIF CLEARED POPUP */}
          {notifCleared && (
            <div style={{
              position: "fixed", bottom: 28, right: 28, zIndex: 9999,
              background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff", padding: "14px 22px", borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(5,150,105,0.35)",
              display: "flex", alignItems: "center", gap: "10px",
              fontSize: 14, fontWeight: 700,
              animation: "duoFadeUp 0.3s ease-out"
            }}>
              <span style={{ fontSize: 20 }}>✅</span>
              Semua notifikasi telah dibaca.
            </div>
          )}

          <div className="adm-content">
            {activePage === "dashboard" && (
              <DashboardSection
                liveActivities={activities}
                activitiesLoading={activitiesLoading}
                activityError={activityError}
                onRefreshActivities={fetchActivities}
              />
            )}
            {activePage === "users" && <DaftarPengguna />}
            {activePage === "materi" && <MateriSection />}
            {activePage === "bank-soal" && <AdminFileManager />}
            {activePage === "profile" && (
              <ProfileSection
                adminName={adminName}
                adminPhoto={adminPhoto}
                handleAdminPhotoChange={handleAdminPhotoChange}
                developers={developers}
                openAddDev={openAddDev}
                openEditDev={openEditDev}
                handleDeleteDev={handleDeleteDev}
                devSaved={devSaved}
              />
            )}
          </div>
        </main>
      </div>

      {showDevModal && (
        <div className="modal-overlay" onClick={() => setShowDevModal(false)}>
          <div className="modal-box" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editDev ? "✏️ Edit Developer" : "➕ Tambah Developer"}</div>
            <form onSubmit={handleSaveDev}>
              <div className="form-group">
                <label className="form-label">Nama Developer</label>
                <input className="form-input" required value={devModalForm.name} onChange={(e) => setDevModalForm({ ...devModalForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" required value={devModalForm.role} onChange={(e) => setDevModalForm({ ...devModalForm, role: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Warna Tema</label>
                <div className="adm-color-row">
                  <input type="color" className="adm-color-input" value={devModalForm.color} onChange={(e) => setDevModalForm({ ...devModalForm, color: e.target.value })} />
                  <span style={{ fontSize: 13, color: "#64748b" }}>{devModalForm.color}</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Foto (opsional)</label>
                <input type="file" accept="image/*" onChange={handleDevPhoto} />
              </div>
              <div className="form-group">
                <label className="form-label">GitHub</label>
                <input className="form-input" value={devModalForm.github} onChange={(e) => setDevModalForm({ ...devModalForm, github: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn</label>
                <input className="form-input" value={devModalForm.linkedin} onChange={(e) => setDevModalForm({ ...devModalForm, linkedin: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={devModalForm.email} onChange={(e) => setDevModalForm({ ...devModalForm, email: e.target.value })} />
              </div>
              <div className="modal-btns">
                <button type="button" className="btn-cancel" onClick={() => setShowDevModal(false)}>Batal</button>
                <button type="submit" className="btn-save">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
