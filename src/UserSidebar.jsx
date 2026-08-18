import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { saveUserProgress } from "./utils/userProgress";
import { apiFetch, clearAuthSession } from "./config/api";

function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [topbarHidden, setTopbarHidden] = useState(false);

  const username = localStorage.getItem("username") || "User";
  const avatar = localStorage.getItem("avatar") || "";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setTopbarHidden(false);
  }, [location.pathname]);

  // Give page headings more room on mobile: hide the topbar while scrolling
  // down and bring it back as soon as the user scrolls up.
  useEffect(() => {
    const scrollPositions = new WeakMap();
    scrollPositions.set(document, window.scrollY);
    let ticking = false;
    let latestScrollTarget = document;

    const updateTopbar = () => {
      const target = latestScrollTarget;
      const currentScrollY = Math.max(
        target === document ? window.scrollY : target.scrollTop || 0,
        0,
      );
      const lastScrollY = scrollPositions.get(target) ?? currentScrollY;
      const isMobile = window.matchMedia("(max-width: 960px)").matches;
      const delta = currentScrollY - lastScrollY;

      if (!isMobile || mobileOpen || currentScrollY <= 24) {
        setTopbarHidden(false);
      } else if (Math.abs(delta) >= 6) {
        setTopbarHidden(delta > 0 && currentScrollY > 72);
      }

      scrollPositions.set(target, currentScrollY);
      ticking = false;
    };

    const handleScroll = (event) => {
      latestScrollTarget = event.target === document ? document : event.target;
      if (!ticking) {
        window.requestAnimationFrame(updateTopbar);
        ticking = true;
      }
    };

    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", handleScroll, { capture: true });
  }, [mobileOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const menuItems = [
    { icon: "🏠", label: "Beranda", path: "/home", desc: "Quiz & Kuis" },
    { icon: "📚", label: "Materi", path: "/materi", desc: "Baca Materi" },
    { icon: "🤖", label: "AskMatheal", path: "/AskMatheal", desc: "Tanya AI" },
    { icon: "👤", label: "Profil", path: "/profile", desc: "Statistik" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await saveUserProgress(username);
    try { await apiFetch("logout.php", { method: "POST" }); } catch {}
    clearAuthSession();
    navigate("/");
  };

  const avatarContent =
    avatar && (avatar.startsWith("http") || avatar.startsWith("data:image"))
      ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      : username.slice(0, 2).toUpperCase();

  const SidebarContent = ({ inDrawer = false }) => (
    <>
      {/* Nav */}
      <nav className="duo-nav">
        {menuItems.map((item) => (
          <div
            key={item.path}
            className={`duo-nav-item${isActive(item.path) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="duo-nav-icon">{item.icon}</span>
            <span className="duo-nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="duo-sidebar-footer">
        <div className="duo-user-row">
          <div className="duo-avatar">{avatarContent}</div>
          <div className="duo-user-info">
            <div className="duo-user-name">{username}</div>
            <div className="duo-user-role">Pelajar</div>
          </div>
        </div>
        <button className="duo-logout-btn" onClick={handleLogout}>
          <span>🚪</span> Keluar
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="duo-sidebar">
        {/* Brand */}
        <div className="duo-brand" onClick={() => navigate("/home")}>
          <div className="duo-brand-icon">M</div>
          <span className="duo-brand-text">Matheal</span>
        </div>
        <SidebarContent />
      </aside>

      {/* ── MOBILE TOPBAR ── */}
      <div className={`duo-topbar${topbarHidden && !mobileOpen ? " is-hidden" : ""}`}>
        <button className="duo-hamburger" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
          <span></span><span></span><span></span>
        </button>
        <div className="duo-topbar-brand" onClick={() => navigate("/home")}>
          <div className="duo-brand-icon" style={{ width: 32, height: 32, fontSize: 14 }}>M</div>
          <span className="duo-brand-text" style={{ color: "#1e293b" }}>Matheal</span>
        </div>
        <div className="duo-topbar-avatar" onClick={() => navigate("/profile")}>{avatarContent}</div>
      </div>

      {/* ── MOBILE OVERLAY ── */}
      <div
        className={`duo-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── MOBILE DRAWER ── */}
      <div className={`duo-drawer${mobileOpen ? " open" : ""}`}>
        <div className="duo-brand" style={{ margin: "0 0 20px", padding: "0 0 20px", borderBottom: "1px solid var(--duo-border)" }}>
          <div className="duo-brand-icon">M</div>
          <span className="duo-brand-text">Matheal</span>
          <button
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}
            onClick={() => setMobileOpen(false)}
          >✕</button>
        </div>
        <SidebarContent inDrawer />
      </div>
    </>
  );
}

export default UserSidebar;
