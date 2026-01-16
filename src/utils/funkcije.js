export function getUserIdFromToken(token) {
  if (!token) return null;

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return Number(payload.sub);
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}

export function timeEnd(hhmmss, minutesToAdd) {
  const [h, m, s] = hhmmss.split(":").map(Number);
  const total = h * 60 + m + Math.floor((s || 0) / 60) + minutesToAdd;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function toHHMMSS(hhmm) {
  if (!hhmm) return null;
  // če že vsebuje sekunde
  if (hhmm.length === 8) return hhmm;
  // "08:00" -> "08:00:00"
  return `${hhmm}:00`;
}

