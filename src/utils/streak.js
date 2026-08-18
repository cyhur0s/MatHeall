export const WIB_TIME_ZONE = "Asia/Jakarta";

export function getWibDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WIB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dayNumber(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ""));
  if (!match) return null;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

export function calculateNextStreak({ currentStreak = 0, lastQuizDate = "", today }) {
  const todayNumber = dayNumber(today);
  const lastNumber = dayNumber(lastQuizDate);
  const safeCurrent = Math.max(0, Number.parseInt(currentStreak, 10) || 0);
  if (todayNumber === null) return safeCurrent;
  if (lastNumber === todayNumber) return safeCurrent || 1;
  if (lastNumber !== null && todayNumber - lastNumber === 1) return safeCurrent + 1;
  return 1;
}

export function deriveStreakStatus({ currentStreak = 0, longestStreak = 0, lastQuizDate = "", today }) {
  const todayNumber = dayNumber(today);
  const lastNumber = dayNumber(lastQuizDate);
  const storedStreak = Math.max(0, Number.parseInt(currentStreak, 10) || 0);
  const storedLongest = Math.max(0, Number.parseInt(longestStreak, 10) || 0, storedStreak);
  if (todayNumber === null || lastNumber === null) {
    return { streak: 0, longestStreak: storedLongest, streakActive: false, lastQuizDate };
  }
  const gap = todayNumber - lastNumber;
  return {
    streak: gap > 1 ? 0 : storedStreak,
    longestStreak: storedLongest,
    streakActive: gap === 0 && storedStreak > 0,
    lastQuizDate,
  };
}

export function getStoredStreak(value = new Date()) {
  const lastQuizDate = localStorage.getItem("lastQuizDate") || localStorage.getItem("streakDate") || "";
  const currentStreak = localStorage.getItem("streak") || "0";
  const savedLongest = localStorage.getItem("longestStreak") || "0";
  const status = deriveStreakStatus({
    currentStreak,
    longestStreak: savedLongest,
    lastQuizDate,
    today: getWibDate(value),
  });
  if (String(status.longestStreak) !== savedLongest) {
    localStorage.setItem("longestStreak", String(status.longestStreak));
  }
  return status;
}

export function recordQuizCompletion(value = new Date()) {
  const today = getWibDate(value);
  const lastQuizDate = localStorage.getItem("lastQuizDate") || localStorage.getItem("streakDate") || "";
  const streak = calculateNextStreak({
    currentStreak: localStorage.getItem("streak") || "0",
    lastQuizDate,
    today,
  });
  const longestStreak = Math.max(
    streak,
    Number.parseInt(localStorage.getItem("longestStreak") || "0", 10) || 0,
    Number.parseInt(localStorage.getItem("streak") || "0", 10) || 0,
  );
  localStorage.setItem("streak", String(streak));
  localStorage.setItem("longestStreak", String(longestStreak));
  localStorage.setItem("lastQuizDate", today);
  localStorage.setItem("streakDate", today); // kompatibilitas data progres lama
  localStorage.removeItem("lastLoginDate");
  window.dispatchEvent(new CustomEvent("matheal:streak-updated", { detail: { streak, longestStreak, today } }));
  return { streak, longestStreak, streakActive: true, lastQuizDate: today };
}
