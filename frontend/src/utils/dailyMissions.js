import { getWibDate } from "./streak.js";
import { awardMissionHearts } from "./hearts.js";

const MISSIONS = [
  { id: "complete-1", label: "Selesaikan 1 kuis", icon: "🎯", field: "completed", target: 1 },
  { id: "answer-20", label: "Jawab 20 soal", icon: "📝", field: "questions", target: 20 },
  { id: "pass-1", label: "Lulus 1 kuis", icon: "🏆", field: "passed", target: 1 },
  { id: "complete-2", label: "Selesaikan 2 kuis", icon: "⚡", field: "completed", target: 2 },
  { id: "answer-10", label: "Jawab 10 soal", icon: "📚", field: "questions", target: 10 },
  { id: "pass-2", label: "Lulus 2 kuis", icon: "⭐", field: "passed", target: 2 },
  { id: "complete-1b", label: "Tuntaskan satu sesi latihan", icon: "🧠", field: "completed", target: 1 },
];

function dayIndex(dayKey) {
  return [...String(dayKey)].reduce((total, char) => total + char.charCodeAt(0), 0) % MISSIONS.length;
}

export function getDailyMission(value = new Date()) {
  const dayKey = getWibDate(value);
  return { ...MISSIONS[dayIndex(dayKey)], dayKey, reward: 5 };
}

export function readDailyActivity() {
  try {
    const parsed = JSON.parse(localStorage.getItem("dailyActivity") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function buildCumulativeWeekdayActivity(activity = readDailyActivity()) {
  const totals = [0, 0, 0, 0, 0, 0, 0]; // Senin sampai Minggu
  Object.entries(activity).forEach(([dayKey, rawEntry]) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
    if (!match) return;
    const weekday = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
    const mondayIndex = (weekday + 6) % 7;
    totals[mondayIndex] += normalizeEntry(rawEntry).questions;
  });
  return totals;
}

function normalizeEntry(entry) {
  if (typeof entry === "number") {
    return { questions: Math.max(0, entry), completed: Math.floor(Math.max(0, entry) / 10), passed: Math.floor(Math.max(0, entry) / 10), rewarded: false };
  }
  return {
    questions: Math.max(0, Number(entry?.questions) || 0),
    completed: Math.max(0, Number(entry?.completed) || 0),
    passed: Math.max(0, Number(entry?.passed) || 0),
    rewarded: entry?.rewarded === true,
  };
}

export function getDailyMissionStatus(value = new Date()) {
  const mission = getDailyMission(value);
  const activity = readDailyActivity();
  const entry = normalizeEntry(activity[mission.dayKey]);
  const current = Math.min(mission.target, entry[mission.field]);
  return { ...mission, current, completed: current >= mission.target, rewarded: entry.rewarded, entry };
}

export function recordDailyQuiz({ passed = false, questions = 10, value = new Date() } = {}) {
  const mission = getDailyMission(value);
  const activity = readDailyActivity();
  const entry = normalizeEntry(activity[mission.dayKey]);
  entry.questions += Math.max(0, Number(questions) || 0);
  entry.completed += 1;
  if (passed) entry.passed += 1;

  const reachedTarget = entry[mission.field] >= mission.target;
  let rewardedNow = false;
  if (reachedTarget && !entry.rewarded) {
    entry.rewarded = true;
    awardMissionHearts(mission.reward);
    rewardedNow = true;
  }

  activity[mission.dayKey] = entry;
  // Riwayat tidak dipangkas pada pergantian minggu agar grafik progres
  // pengguna terus bertambah dari minggu ke minggu.
  localStorage.setItem("dailyActivity", JSON.stringify(activity));
  window.dispatchEvent(new CustomEvent("matheal:mission-updated", { detail: { mission, entry, rewardedNow } }));
  return { mission, entry, rewardedNow };
}
