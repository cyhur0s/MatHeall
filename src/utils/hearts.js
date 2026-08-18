export const NORMAL_HEART_CAP = 5;
export const BONUS_HEART_CAP = 10;
export const HEART_REGEN_MS = 30 * 60 * 1000;

const HEART_KEY = "heartState";

const clampHeart = (value) => Math.max(0, Math.min(BONUS_HEART_CAP, Number(value) || 0));

export function calculateHeartState(state, now = Date.now()) {
  const safeNow = Number(now) || Date.now();
  const current = clampHeart(state?.value ?? NORMAL_HEART_CAP);
  const storedRefillAt = Number(state?.lastRefillAt);
  let lastRefillAt = Number.isFinite(storedRefillAt) && storedRefillAt > 0 ? storedRefillAt : safeNow;
  let value = current;

  if (value < NORMAL_HEART_CAP && safeNow > lastRefillAt) {
    const recovered = Math.floor((safeNow - lastRefillAt) / HEART_REGEN_MS);
    if (recovered > 0) {
      value = Math.min(NORMAL_HEART_CAP, value + recovered);
      lastRefillAt += recovered * HEART_REGEN_MS;
      if (value >= NORMAL_HEART_CAP) lastRefillAt = safeNow;
    }
  } else if (value >= NORMAL_HEART_CAP && !(Number.isFinite(storedRefillAt) && storedRefillAt > 0)) {
    lastRefillAt = safeNow;
  }

  return { value, lastRefillAt };
}

function readRawHeartState() {
  try {
    return JSON.parse(localStorage.getItem(HEART_KEY) || "null");
  } catch {
    return null;
  }
}

function storeHeartState(state) {
  localStorage.setItem(HEART_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("matheal:heart-updated", { detail: state }));
  return state;
}

export function getHeartState(now = Date.now()) {
  const previous = readRawHeartState();
  const state = calculateHeartState(previous, now);
  if (!previous || Number(previous.value) !== state.value || Number(previous.lastRefillAt) !== state.lastRefillAt) {
    storeHeartState(state);
  }
  const nextHeartInMs = state.value < NORMAL_HEART_CAP
    ? Math.max(0, HEART_REGEN_MS - ((Number(now) || Date.now()) - state.lastRefillAt))
    : 0;
  return { ...state, nextHeartInMs };
}

export function spendHeart(now = Date.now()) {
  const current = getHeartState(now);
  if (current.value <= 0) return current;
  return storeHeartState({ value: current.value - 1, lastRefillAt: Number(now) || Date.now() });
}

export function awardMissionHearts(amount = 5, now = Date.now()) {
  const current = getHeartState(now);
  return storeHeartState({
    value: Math.min(BONUS_HEART_CAP, current.value + Math.max(0, Number(amount) || 0)),
    lastRefillAt: Number(now) || Date.now(),
  });
}

export function formatHeartCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil((Number(milliseconds) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
