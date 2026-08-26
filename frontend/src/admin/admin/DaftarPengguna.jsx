import { useEffect, useState } from "react";
import { apiFetch } from "../../config/api";

const UsersSection = () => {
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "user", is_active: true });

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(!showLoading);
    try {
      const [res, resetRes] = await Promise.all([
        apiFetch(`read.php?t=${Date.now()}`, { cache: "no-store" }),
        apiFetch(`read_password_reset_requests.php?t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [data, resetData] = await Promise.all([res.json(), resetRes.json()]);
      setUsers(Array.isArray(data) ? data : []);
      setResetRequests(Array.isArray(resetData) ? resetData : []);
      setLastUpdated(new Date());
    } catch {
      setUsers([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = window.setInterval(() => fetchUsers(false), 4000);
    return () => window.clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus pengguna ini?")) return;
    try {
      const response = await apiFetch("delete.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Pengguna gagal dihapus.");
      fetchUsers();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const url = editUser ? "update.php" : "register.php";
    const body = editUser
      ? { id: editUser.id, username: form.username, password: form.password, role: form.role, is_active: form.is_active }
      : { username: form.username, password: form.password, role: form.role };
    try {
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Data pengguna gagal disimpan.");
      setShowModal(false);
      setEditUser(null);
      setForm({ username: "", password: "", role: "user", is_active: true });
      fetchUsers();
    } catch (error) {
      alert(error.message);
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, password: "", role: user.role || "user", is_active: Number(user.is_active) !== 0 });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditUser(null);
    setForm({ username: "", password: "", role: "user", is_active: true });
    setShowModal(true);
  };

  const filtered = users.filter((u) => u.username?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <span className="adm-card-title">Daftar Pengguna</span>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
              {refreshing ? "🔄 Sinkronisasi data real-time..." : lastUpdated ? `📡 Terakhir diperbarui ${new Date(lastUpdated).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "📡 Menunggu data pengguna..."}
            </div>
          </div>
          <div className="adm-card-actions">
            <input className="adm-search" placeholder="🔍  Cari username..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-add" onClick={openAdd}>+ Tambah</button>
          </div>
        </div>

        {resetRequests.length > 0 && (
          <div className="adm-reset-requests">
            <div className="adm-reset-header">
              <div>
                <strong>Permintaan reset password</strong>
                <span>{resetRequests.length} permintaan menunggu</span>
              </div>
            </div>
            <div className="adm-reset-list">
              {resetRequests.map((request) => {
                const user = users.find((item) => item.username === request.username);
                return (
                  <div className="adm-reset-item" key={request.id}>
                    <div>
                      <strong>{request.username}</strong>
                      <small>{new Date(request.requested_at).toLocaleString("id-ID")}</small>
                    </div>
                    <button className="btn-edit" disabled={!user} onClick={() => user && openEdit(user)}>
                      Atur password baru
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div>⏳</div>Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div>👤</div>Tidak ada pengguna</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ color: "#94a3b8", fontSize: 13 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    <span className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"}`}>
                      {u.role === "admin" ? "👑 Admin" : "👤 User"}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${Number(u.is_active) !== 0 ? "role-user" : "role-inactive"}`}>
                      {Number(u.is_active) !== 0 ? "● Aktif" : "○ Nonaktif"}
                    </span>
                  </td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "–"}
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => openEdit(u)}>✏️ Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(u.id)}>🗑️ Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editUser ? "✏️ Edit Pengguna" : "➕ Tambah Pengguna"}</div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{editUser ? "Reset password (opsional)" : "Password"}</label>
                <input className="form-input" type="password" required={!editUser} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {editUser && <small style={{ display: "block", marginTop: 6, color: "#64748b" }}>Password lama tidak dapat dilihat. Isi hanya jika ingin membuat password baru.</small>}
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">👤 User</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              {editUser && (
                <div className="form-group">
                  <label className="form-label">Status akun</label>
                  <select className="form-select" value={form.is_active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}>
                    <option value="active">● Aktif — dapat login</option>
                    <option value="inactive">○ Nonaktif — login diblokir</option>
                  </select>
                  <small style={{ display: "block", marginTop: 6, color: "#64748b" }}>Gunakan nonaktif untuk membatasi akses tanpa menghapus riwayat akun.</small>
                </div>
              )}
              <div className="modal-btns">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-save">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersSection;
