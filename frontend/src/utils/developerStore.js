const STORAGE_KEY = "developers";
const UPDATE_EVENT = "matheal:developers-updated";
import { apiFetch } from "../config/api";

export const DEFAULT_DEVELOPERS = [{
  id: "default-developer",
  name: "Developer",
  role: "Developer",
  photo: "",
  color: "#397582",
  github: "https://github.com/cyhur0s",
  linkedin: "https://www.linkedin.com/in/katarinasw",
  email: "katarinasw@gmail.com",
}];

export const normalizeDeveloper = (developer = {}, index = 0) => ({
  id: developer.id ?? `developer-${index}`,
  name: developer.name?.trim() || "Developer",
  role: developer.role?.trim() || "Developer",
  photo: developer.photo || "",
  color: developer.color || "#397582",
  github: developer.github?.trim() || "",
  linkedin: developer.linkedin?.trim() || "",
  email: developer.email?.trim() || "",
});

export const readLocalDevelopers = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === null) return null;
    const list = JSON.parse(value);
    return Array.isArray(list) ? list.map(normalizeDeveloper) : null;
  } catch {
    return null;
  }
};

export const cacheDevelopers = (list) => {
  const normalized = list.map(normalizeDeveloper);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: normalized }));
  return normalized;
};

export const fetchDeveloperProfiles = async () => {
  const response = await apiFetch(`read_developers.php?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Gagal membaca developer");
  const payload = await response.json();
  return {
    configured: payload?.configured === true,
    developers: Array.isArray(payload?.data) ? payload.data.map(normalizeDeveloper) : [],
  };
};

export const saveDeveloperProfiles = async (list) => {
  const normalized = cacheDevelopers(list);
  const response = await apiFetch("save_developers.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ developers: normalized }),
  });
  if (!response.ok) throw new Error("Gagal menyimpan developer");
  const payload = await response.json();
  if (payload?.status !== "success") throw new Error(payload?.message || "Gagal menyimpan developer");
  return normalized;
};

export const getDeveloperFallback = () => readLocalDevelopers() ?? DEFAULT_DEVELOPERS;
export const DEVELOPER_UPDATE_EVENT = UPDATE_EVENT;
