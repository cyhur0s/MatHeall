import { apiFetch } from "../config/api";

const PROGRESS_KEYS = [
  "passed_quizzes",
  "levelProgress",
  "dailyActivity",
  "streak",
  "longestStreak",
  "streakDate",
  "lastQuizDate",
  "lastLoginDate",
  "studyNote",
  "avatar",
  "certificates",
  "heartState",
];

const REMOVED_PROGRESS_KEYS = ["quizHistory"];

const snapshotKey = (username) => `matheal_user_progress_${encodeURIComponent(username || "")}`;
let syncQueue = Promise.resolve();
let syncTimer = null;

function compactLevelProgress(rawValue) {
  try {
    const progress = JSON.parse(rawValue || "{}");
    return JSON.stringify(Object.fromEntries(Object.entries(progress).map(([key, value]) => [key, {
      completed: value?.completed === true,
    }])));
  } catch {
    return "{}";
  }
}

function sanitizeSnapshot(snapshot = {}) {
  const clean = { ...snapshot };
  REMOVED_PROGRESS_KEYS.forEach((key) => delete clean[key]);
  if (Object.prototype.hasOwnProperty.call(clean, "levelProgress")) {
    clean.levelProgress = compactLevelProgress(clean.levelProgress);
  }
  return clean;
}

function writeLocalSnapshot(username) {
  REMOVED_PROGRESS_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("levelProgress", compactLevelProgress(localStorage.getItem("levelProgress")));
  const snapshot = {};
  PROGRESS_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  });
  const cleanSnapshot = sanitizeSnapshot(snapshot);
  localStorage.setItem(snapshotKey(username), JSON.stringify(cleanSnapshot));
  return cleanSnapshot;
}

export async function saveUserProgress(username) {
  if (!username) return;
  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }
  const snapshot = writeLocalSnapshot(username);
  syncQueue = syncQueue.catch(() => {}).then(() => apiFetch("user_progress.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: snapshot }),
  })).catch(() => {
    // Snapshot lokal tetap menjadi fallback ketika koneksi terputus.
  });
  await syncQueue;
}

export async function restoreUserProgress(username) {
  if (!username) return;
  REMOVED_PROGRESS_KEYS.forEach((key) => localStorage.removeItem(key));
  PROGRESS_KEYS.forEach((key) => localStorage.removeItem(key));
  try {
    let snapshot = JSON.parse(localStorage.getItem(snapshotKey(username)) || "{}");
    try {
      const response = await apiFetch("user_progress.php", { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result?.status === "success" && result.data && Object.keys(result.data).length > 0) {
        snapshot = sanitizeSnapshot(result.data);
        localStorage.setItem(snapshotKey(username), JSON.stringify(snapshot));
      }
    } catch {
      // Gunakan snapshot perangkat jika server tidak tersedia.
    }
    PROGRESS_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        localStorage.setItem(key, snapshot[key]);
      }
    });
    await saveUserProgress(username);
  } catch {
    // Snapshot rusak tidak boleh menghambat proses login.
  }
}

export function syncCurrentUserProgress() {
  const username = localStorage.getItem("username") || "";
  if (!username) return Promise.resolve();
  writeLocalSnapshot(username);
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    saveUserProgress(username);
  }, 500);
  return Promise.resolve();
}
