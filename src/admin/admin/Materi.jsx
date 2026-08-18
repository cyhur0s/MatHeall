import { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

const MateriSection = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchMateriFiles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`list_materi_files.php?sync=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        setFiles(data.data);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Error fetching materi files:", err);
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMateriFiles();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim() || uploadFile.name.replace(/\.pdf$/i, ""));
    try {
      const response = await apiFetch("upload_materi.php", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Unggah gagal.");
      showToast("✅ Materi PDF berhasil diunggah.");
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle("");
      fetchMateriFiles();
    } catch (error) {
      showToast(`❌ ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    try {
      const res = await apiFetch("rename_materi.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: editFile.filename, newtitle: editTitle.trim() }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(`✅ Berkas berhasil diubah namanya!`);
        setEditFile(null);
        fetchMateriFiles();
      } else {
        showToast(`❌ Gagal mengganti nama: ${data.message}`);
      }
    } catch {
      showToast("❌ Gagal terhubung ke server.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await apiFetch("delete_materi_file.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: deleteConfirm.filename }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(`🗑️ Berkas '${deleteConfirm.title}' berhasil dihapus!`);
        setDeleteConfirm(null);
        fetchMateriFiles();
      } else {
        showToast(`❌ Gagal menghapus: ${data.message}`);
        setDeleteConfirm(null);
      }
    } catch {
      showToast("❌ Gagal terhubung ke server.");
      setDeleteConfirm(null);
    }
  };

  const getFileIcon = (ext) => {
    switch (ext) {
      case "pdf": return "📄";
      case "pptx":
      case "ppt": return "📊";
      case "docx":
      case "doc": return "📝";
      default: return "📁";
    }
  };

  const getFileBadgeClass = (ext) => {
    switch (ext) {
      case "pdf": return "ml-badge sulit";
      case "pptx":
      case "ppt": return "ml-badge sedang";
      case "docx":
      case "doc": return "ml-badge mudah";
      default: return "ml-badge";
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pdf") return matchesSearch && f.extension === "pdf";
    if (activeTab === "pptx") return matchesSearch && (f.extension === "pptx" || f.extension === "ppt");
    if (activeTab === "docx") return matchesSearch && (f.extension === "docx" || f.extension === "doc");
    return matchesSearch;
  });

  return (
    <>
      <div className="ml-container">
        <div className="ml-header-section" style={{ flexWrap: "wrap", gap: "16px" }}>
          <div className="ml-title-group">
            <h1>📚 Manajemen File Materi Pembelajaran</h1>
            <div className="ml-subtitle">
              Menampilkan {files.length} berkas materi dari folder <code>/Materi</code> (Diurutkan abjad A-Z)
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              className="adm-search"
              placeholder="🔍 Cari berkas materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "240px", padding: "10px 14px", borderRadius: "12px" }}
            />
            <button className="ml-add-btn" onClick={fetchMateriFiles}>
              🔄 Refresh List
            </button>
            <button className="ml-add-btn" onClick={() => setShowUpload(true)}>
              ＋ Unggah PDF
            </button>
          </div>
        </div>

        {/* Tab Filter Ekstensi File */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "🌐 Semua Berkas", count: files.length },
            { id: "pdf", label: "📄 Dokumen PDF", count: files.filter(f => f.extension === "pdf").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "12px",
                border: activeTab === tab.id ? "2px solid #2491ff" : "1.5px solid #cbd5e1",
                background: activeTab === tab.id ? "#eff6ff" : "#ffffff",
                color: activeTab === tab.id ? "#2491ff" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="ml-table-card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>⏳ Memuat berkas materi...</div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Tidak ada berkas materi yang ditemukan.</div>
          ) : (
            <table className="ml-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Nama Berkas Materi</th>
                  <th>Format File</th>
                  <th>Ukuran</th>
                  <th>Terakhir Diperbarui</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f, i) => (
                  <tr key={f.filename}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div className="ml-level-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{getFileIcon(f.extension)}</span>
                        <span>{f.title}</span>
                      </div>
                      <div className="ml-level-desc" style={{ marginLeft: '28px' }}>
                        <code>{f.filename}</code>
                      </div>
                    </td>
                    <td>
                      <span className={getFileBadgeClass(f.extension)}>
                        {f.extension.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>
                      {f.size}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                      {f.mtime}
                    </td>
                    <td>
                      <div className="ml-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          className="ml-soal-btn"
                          onClick={() => setPreviewFile(f)}
                          style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
                        >
                          👁️ Lihat
                        </button>
                        <button
                          onClick={() => { setEditFile(f); setEditTitle(f.title); }}
                          style={{
                            padding: '6px 12px', background: '#fef9c3', border: '1.5px solid #fde047',
                            borderRadius: '8px', color: '#854d0e', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(f)}
                          style={{
                            padding: '6px 12px', background: '#fee2e2', border: '1.5px solid #fca5a5',
                            borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <form className="modal-box materi-upload-modal" onSubmit={handleUpload} onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">Unggah Materi PDF</div>
            <p className="modal-subtitle">Berkas maksimal 15 MB dan akan langsung tersedia pada menu Materi pengguna.</p>
            <label className="form-label">Judul materi</label>
            <input className="form-input" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Contoh: 18 Teori Peluang" />
            <label className="form-label">Berkas PDF</label>
            <input className="form-input" type="file" accept="application/pdf,.pdf" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} required />
            <div className="modal-btns">
              <button type="button" className="btn-cancel" onClick={() => setShowUpload(false)} disabled={uploading}>Batal</button>
              <button type="submit" className="btn-save" disabled={uploading || !uploadFile}>{uploading ? "Mengunggah..." : "Unggah materi"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Preview Berkas */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-box" style={{ width: "90%", maxWidth: "900px", height: "85vh", display: "flex", flexDirection: "column", padding: "20px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{getFileIcon(previewFile.extension)}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>{previewFile.title}</h3>
                  <small style={{ color: "#64748b" }}>{previewFile.filename} • {previewFile.size}</small>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewFile.extension === "pdf" ? (
                <iframe src={previewFile.url} title={previewFile.title} style={{ width: "100%", height: "100%", border: "none" }} />
              ) : (
                <div style={{ textAlign: "center", padding: "40px", width: "100%" }}>
                  <div style={{ fontSize: "50px", marginBottom: "16px" }}>{getFileIcon(previewFile.extension)}</div>
                  <h4>Format file {previewFile.extension.toUpperCase()}</h4>
                  <p style={{ color: "#64748b", maxWidth: "400px", margin: "8px auto 20px" }}>
                    Pratinjau langsung di browser didukung untuk berkas PDF. Untuk berkas {previewFile.extension.toUpperCase()}, silakan unduh berkas di bawah ini.
                  </p>
                  <a
                    href={previewFile.url}
                    download={previewFile.filename}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "12px 24px",
                      background: "#2491ff",
                      color: "white",
                      borderRadius: "10px",
                      fontWeight: "bold",
                      textDecoration: "none"
                    }}
                  >
                    ⬇️ Unduh Berkas ({previewFile.size})
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* EDIT TITLE MODAL */}
      {editFile && (
        <div className="modal-overlay" onClick={() => setEditFile(null)}>
          <div className="modal-box" style={{ maxWidth: '440px', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>✏️ Edit Judul Materi</h3>
              <button onClick={() => setEditFile(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Berkas: <code>{editFile.filename}</code></p>
            <form onSubmit={handleRenameSubmit}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#374151', fontSize: '13px' }}>Judul Baru</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1',
                  borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
                autoFocus
                placeholder="Masukkan judul baru..."
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditFile(null)}
                  style={{ padding: '9px 20px', borderRadius: '9px', border: '1.5px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >Batal</button>
                <button type="submit"
                  style={{ padding: '9px 20px', borderRadius: '9px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                >Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" style={{ maxWidth: '400px', padding: '28px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1e293b' }}>Hapus Materi?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              Anda yakin ingin menghapus <strong>"{deleteConfirm.title}"</strong>?<br/>
              <span style={{ color: '#ef4444', fontSize: '12px' }}>Tindakan ini tidak bisa dibatalkan.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '10px 24px', borderRadius: '9px', border: '1.5px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >Batal</button>
              <button onClick={handleDeleteConfirm}
                style={{ padding: '10px 24px', borderRadius: '9px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
              >Ya, Hapus!</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: toastMsg.startsWith('❌') ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#059669,#10b981)',
          color: '#fff', padding: '14px 22px', borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: 14, fontWeight: 700, minWidth: '220px',
          animation: 'duoFadeUp 0.3s ease-out'
        }}>
          {toastMsg}
        </div>
      )}
    </>
  );
};

export default MateriSection;
