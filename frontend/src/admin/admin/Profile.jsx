import { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

const getYoutubeEmbedUrl = (url) => {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return url;
};

const VideoSection = () => {
  const emptyForm = { judul: "", deskripsi: "", url_video: "", kategori: "Umum" };
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [videoSearch, setVideoSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editVideo, setEditVideo] = useState(null);
  const [videoForm, setVideoForm] = useState(emptyForm);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("read_video.php");
      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const closeModal = () => {
    setShowModal(false);
    setEditVideo(null);
    setVideoForm(emptyForm);
  };

  const handleSaveVideo = async (event) => {
    event.preventDefault();
    const endpoint = editVideo ? "update_video.php" : "create_video.php";
    const body = editVideo ? { id_video: editVideo.id_video, ...videoForm } : videoForm;
    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Video gagal disimpan.");
      closeModal();
      fetchVideos();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm("Hapus video ini?")) return;
    try {
      const response = await apiFetch("delete_video.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_video: id }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Video gagal dihapus.");
      fetchVideos();
    } catch (error) {
      alert(error.message);
    }
  };

  const openEditVideo = (video) => {
    setEditVideo(video);
    setVideoForm({
      judul: video.judul || "",
      deskripsi: video.deskripsi || "",
      url_video: video.url_video || "",
      kategori: video.kategori || "Umum",
    });
    setShowModal(true);
  };

  const openAddVideo = () => {
    setEditVideo(null);
    setVideoForm(emptyForm);
    setShowModal(true);
  };

  const keyword = videoSearch.trim().toLowerCase();
  const filteredVideos = videos.filter((video) =>
    `${video.judul || ""} ${video.kategori || ""}`.toLowerCase().includes(keyword)
  );

  return (
    <>
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Video Tutor</span>
          <div className="adm-card-actions">
            <input className="adm-search" placeholder="Cari video..." value={videoSearch} onChange={(event) => setVideoSearch(event.target.value)} />
            <button className="btn-add" type="button" onClick={openAddVideo}>+ Tambah Video</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Memuat data...</div>
        ) : filteredVideos.length === 0 ? (
          <div className="empty-state">Belum ada video tutor.</div>
        ) : (
          <div className="adm-video-grid">
            {filteredVideos.map((video) => (
              <article className="adm-video-card" key={video.id_video}>
                <div className="adm-video-frame">
                  <iframe src={getYoutubeEmbedUrl(video.url_video)} title={video.judul} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
                <div className="adm-video-content">
                  <div className="adm-video-title-row">
                    <strong>{video.judul}</strong>
                    <span className="role-badge">{video.kategori}</span>
                  </div>
                  {video.deskripsi && <p>{video.deskripsi.length > 100 ? `${video.deskripsi.substring(0, 100)}...` : video.deskripsi}</p>}
                  <div className="adm-video-actions">
                    <button className="btn-edit" type="button" onClick={() => openEditVideo(video)}>Edit</button>
                    <button className="btn-del" type="button" onClick={() => handleDeleteVideo(video.id_video)}>Hapus</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box adm-video-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">{editVideo ? "Edit Video Tutor" : "Tambah Video Tutor"}</div>
            <form onSubmit={handleSaveVideo}>
              <div className="form-group">
                <label className="form-label">Judul Video</label>
                <input className="form-input" required placeholder="Contoh: Tutorial Limit Fungsi" value={videoForm.judul} onChange={(event) => setVideoForm({ ...videoForm, judul: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">URL Video YouTube</label>
                <input className="form-input" required placeholder="https://www.youtube.com/watch?v=..." value={videoForm.url_video} onChange={(event) => setVideoForm({ ...videoForm, url_video: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-select" value={videoForm.kategori} onChange={(event) => setVideoForm({ ...videoForm, kategori: event.target.value })}>
                  {["Umum", "Aljabar", "Kalkulus", "Geometri", "Statistika", "Logika", "Matriks", "Trigonometri"].map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi (Opsional)</label>
                <textarea className="form-input" rows="3" placeholder="Deskripsi singkat video ini..." value={videoForm.deskripsi} onChange={(event) => setVideoForm({ ...videoForm, deskripsi: event.target.value })} />
              </div>
              {videoForm.url_video && (
                <div className="adm-video-preview">
                  <label className="form-label">Preview</label>
                  <div className="adm-video-frame"><iframe src={getYoutubeEmbedUrl(videoForm.url_video)} title="Preview video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
                </div>
              )}
              <div className="modal-btns">
                <button type="button" className="btn-cancel" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn-save">Simpan Video</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const ProfileSection = ({
  adminName,
  adminPhoto,
  handleAdminPhotoChange,
  developers,
  openAddDev,
  openEditDev,
  handleDeleteDev,
  devSaved,
}) => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="adm-profile-section">
      <div className="adm-profile-tabs" role="tablist" aria-label="Menu profil admin">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          className={`adm-profile-tab ${activeTab === "profile" ? "active" : ""}`}
        >
          👤 Profil Administrator & Developer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "video"}
          onClick={() => setActiveTab("video")}
          className={`adm-profile-tab ${activeTab === "video" ? "active" : ""}`}
        >
          🎬 Kelola Video Tutor
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="adm-profile-wrap">
          <div className="adm-profile-card">
            <div className="adm-profile-section-title">👤 Profil Administrator</div>
            <div className="adm-profile-summary">
              <div className="adm-photo-upload-wrap">
                <div
                  className="adm-photo-preview"
                  onClick={() => document.getElementById("admin-photo-input").click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") document.getElementById("admin-photo-input").click();
                  }}
                >
                  {adminPhoto ? (
                    <img src={adminPhoto} alt="Admin" />
                  ) : (
                    <div className="adm-profile-avatar-fallback">
                      {adminName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="adm-photo-overlay">📷</div>
                </div>
                <input
                  id="admin-photo-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAdminPhotoChange}
                />
              </div>
              <div className="adm-dev-preview-name">{adminName}</div>
              <div className="adm-dev-preview-role">Administrator</div>
            </div>
            <div className="adm-profile-details">
              <div className="adm-profile-detail-row">
                <span>Username</span>
                <strong>{adminName}</strong>
              </div>
              <div className="adm-profile-detail-row">
                <span>Role</span>
                <span className="role-badge role-admin">Admin</span>
              </div>
            </div>
          </div>

          <div className="adm-profile-card">
            <div className="adm-profile-section-title adm-profile-title-actions">
              <span>🛠️ Daftar Developer</span>
              <button type="button" className="btn-add adm-profile-add" onClick={openAddDev}>+ Tambah</button>
            </div>

            {devSaved && (
              <div className="adm-success-banner">✅ Data developer berhasil disimpan!</div>
            )}

            {developers.length === 0 ? (
              <div className="empty-state adm-profile-empty">
                <div>👨‍💻</div>
                <div>Belum ada developer. Klik "+ Tambah" untuk menambahkan.</div>
              </div>
            ) : (
              <div className="adm-dev-list">
                {developers.map((dev) => (
                  <div key={dev.id} className="adm-dev-item">
                    <div className="adm-dev-item-photo" style={!dev.photo ? { background: `linear-gradient(135deg,${dev.color},${dev.color}cc)` } : {}}>
                      {dev.photo
                        ? <img src={dev.photo} alt={dev.name} />
                        : (dev.name?.slice(0, 2).toUpperCase() || "??")}
                    </div>
                    <div className="adm-dev-item-info">
                      <div className="adm-dev-item-name">{dev.name}</div>
                      <div className="adm-dev-item-role">{dev.role}</div>
                    </div>
                    <div className="adm-dev-item-actions">
                      <button type="button" className="btn-edit" onClick={() => openEditDev(dev)}>✏️ Edit</button>
                      <button type="button" className="btn-del" aria-label={`Hapus ${dev.name}`} onClick={() => handleDeleteDev(dev.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <VideoSection />
      )}
    </div>
  );
};

export default ProfileSection;
