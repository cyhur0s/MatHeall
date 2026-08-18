import { useEffect, useState } from "react";
import { syncCurrentUserProgress } from "../utils/userProgress";

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};

const createCertificateId = (username, materialKey, issuedAt) => {
  const source = `${username}|${materialKey}|${issuedAt}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `MTH-${new Date(issuedAt).getFullYear()}-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
};

const formatCertificateDate = (date) => new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(new Date(String(date).length === 10 ? `${date}T00:00:00` : date));

export function ensureCertificateRecord(material, username) {
  const records = readJson("certificates", {});
  if (records[material.key]) return records[material.key];

  const issuedAt = new Date().toISOString();
  const record = { id: createCertificateId(username, material.key, issuedAt), issuedAt };
  localStorage.setItem("certificates", JSON.stringify({ ...records, [material.key]: record }));
  return record;
}

export default function CertificateModal({ certificate, username, onClose }) {
  const [step, setStep] = useState("biodata");
  const [fullName, setFullName] = useState("");
  const [certificateDate, setCertificateDate] = useState("");
  const [savedRecord, setSavedRecord] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!certificate) return;
    const existingRecord = certificate.record || {};
    setFullName(existingRecord.fullName || "");
    setCertificateDate(existingRecord.certificateDate || new Date().toISOString().slice(0, 10));
    setSavedRecord(existingRecord);
    setFormError("");
    setStep("biodata");
  }, [certificate]);

  if (!certificate) return null;
  const { material, record } = certificate;

  const handleBiodataSubmit = (event) => {
    event.preventDefault();
    const cleanName = fullName.trim().replace(/\s+/g, " ");
    if (cleanName.length < 3) {
      setFormError("Nama lengkap minimal 3 karakter.");
      return;
    }
    if (!certificateDate) {
      setFormError("Tanggal sertifikat wajib dipilih.");
      return;
    }

    const records = readJson("certificates", {});
    const updatedRecord = { ...record, fullName: cleanName, certificateDate };
    localStorage.setItem("certificates", JSON.stringify({ ...records, [material.key]: updatedRecord }));
    setFullName(cleanName);
    setSavedRecord(updatedRecord);
    setFormError("");
    setStep("preview");
    syncCurrentUserProgress();
  };

  const handlePrintCertificate = () => {
    const certificateSheet = document.querySelector(".certificate-print-sheet");
    if (!certificateSheet) return;

    const printPortal = document.createElement("div");
    printPortal.className = "certificate-print-portal";
    printPortal.setAttribute("aria-hidden", "true");
    printPortal.appendChild(certificateSheet.cloneNode(true));
    document.body.appendChild(printPortal);
    document.body.classList.add("certificate-printing");

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("certificate-printing");
      printPortal.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    try {
      window.print();
    } finally {
      // Sebagian browser tidak mengirim event afterprint ketika dialog dibatalkan.
      window.setTimeout(cleanup, 1000);
    }
  };

  if (step === "biodata") {
    return (
      <div className="cert-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="certificate-biodata-title">
        <form className="certificate-biodata-card" onSubmit={handleBiodataSubmit}>
          <span className="certificate-biodata-kicker">Sertifikat {material.title}</span>
          <h2 id="certificate-biodata-title">Lengkapi biodata sertifikat</h2>
          <p>Pastikan nama dan tanggal sudah benar. Data ini akan tercetak pada sertifikat PDF.</p>

          <label htmlFor="certificate-full-name">Nama lengkap</label>
          <input
            id="certificate-full-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            minLength="3"
            maxLength="100"
            autoComplete="name"
            placeholder="Contoh: Ahmad Rizky Pratama"
            required
            autoFocus
          />

          <label htmlFor="certificate-date">Tanggal Menyelesaikan Kelas</label>
          <input
            id="certificate-date"
            type="date"
            value={certificateDate}
            onChange={(event) => setCertificateDate(event.target.value)}
            required
          />

          {formError && <div className="certificate-biodata-error" role="alert">{formError}</div>}
          <div className="certificate-biodata-actions">
            <button type="button" className="cert-close-button" onClick={onClose}>Batal</button>
            <button type="submit" className="cert-print-button">Lihat pratinjau</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="cert-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="certificate-title">
      <div className="cert-preview-shell">
        <div className="cert-modal-actions">
          <div>
            <strong>Pratinjau sertifikat</strong>
            <span>Periksa biodata, lalu pilih Simpan sebagai PDF pada jendela cetak.</span>
          </div>
          <button type="button" className="cert-close-button" onClick={onClose}>Tutup</button>
          <button type="button" className="cert-close-button" onClick={() => setStep("biodata")}>Edit biodata</button>
          <button type="button" className="cert-print-button" onClick={handlePrintCertificate}>Cetak / Simpan PDF</button>
        </div>

        <article className="certificate-print-sheet">
          <div className="certificate-inner-border">
            <div className="certificate-brand">
              <span className="certificate-brand-mark">M</span>
              <div><strong>MATHEAL</strong><small>Matematika Informatika</small></div>
            </div>
            <p className="certificate-kicker">Penghargaan Kelulusan</p>
            <h2 id="certificate-title">Sertifikat</h2>
            <p className="certificate-intro">Dengan bangga diberikan kepada</p>
            <h3>{savedRecord?.fullName || username}</h3>
            <p className="certificate-description">atas kelulusannya pada kelas</p>
            <h4>{material.title}</h4>
            <p className="certificate-completion-note">setelah menyelesaikan seluruh level pembelajaran</p>
            <div className="certificate-level-row">
              <span>Mudah</span><i></i><span>Sedang</span><i></i><span>Sulit</span>
            </div>
            <div className="certificate-footer">
              <div><strong>{formatCertificateDate(savedRecord?.certificateDate || record.issuedAt)}</strong><span>Tanggal sertifikat</span></div>
              <div className="certificate-seal"><span>M</span><small>TERVERIFIKASI</small></div>
              <div><strong>{record.id}</strong><span>Nomor sertifikat</span></div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
