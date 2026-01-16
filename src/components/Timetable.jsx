import React from "react";

const DAYS = ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek"];

// nastavitve osi časa
const START_HOUR = 6;
const END_HOUR = 24;
const MINUTES_PER_DAY = (END_HOUR - START_HOUR) * 60;
const PX_PER_MINUTE = 1; // 1px na minuto (lahko 0.8, 1.2 …)

function toMinutesSinceStart(hhmmss) {
  const [h, m] = hhmmss.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

function addMinutesToTime(hhmmss, minutesToAdd) {
  const [h, m, s] = hhmmss.split(":").map(Number);
  const total = h * 60 + m + Math.floor((s || 0) / 60) + minutesToAdd;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatHHMM(hhmmss) {
  return hhmmss.slice(0, 5);
}
function DayHeader({ label, dayIdx, weatherByDay }) {
  const w = weatherByDay?.[dayIdx] ?? weatherByDay?.[String(dayIdx)];
  console.log("WEATHER KEYS", Object.keys(weatherByDay || {}));


  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
      {w ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <img
            alt={w.description || "vreme"}
            src={`https://openweathermap.org/img/wn/${w.icon}@2x.png`}
            style={{ width: 26, height: 26 }}
          />
          <div style={{ lineHeight: 1.1, color: "white" }}>
            <div style={{ fontWeight: 700 }}>{w.temp_min}° / {w.temp_max}°</div>
            <div style={{ opacity: 0.7 }}>{w.description}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.6 }}>—</div>
      )}

      <div style={{ fontWeight: 800, color: "white" }}>{label}</div>
    </div>
  );
}

function layoutDayEvents(dayEvents) {
  
  const evs = dayEvents //termini
    .map((t) => {
      const startMin = toMinutesSinceStart(formatHHMM(t.zacetek)); // minute od START_HOUR
      const duration = Number(t.dolzina ?? 0);
      const endMin = startMin + duration;
      return { t, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  if (evs.length === 0) return [];

  const clusters = [];//ce se kaj prekriva
  let current = [];
  let currentEnd = -Infinity;

  for (const e of evs) {
    if (current.length === 0 || e.startMin < currentEnd) {
      current.push(e);
      currentEnd = Math.max(currentEnd, e.endMin);
    } else {
      clusters.push(current);
      current = [e];
      currentEnd = e.endMin;
    }
  }
  if (current.length) clusters.push(current);

  // 3) znotraj vsakega clustra dodeli stolpce (greedy)
  const placed = [];
  for (const cluster of clusters) {
    const colEnds = []; // endMin za vsak stolpec

    for (const e of cluster) {
      // najdi prvi stolpec, kjer se ne prekriva
      let col = colEnds.findIndex((end) => e.startMin >= end);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(e.endMin);
      } else {
        colEnds[col] = e.endMin;
      }

      placed.push({ ...e, col, cols: null });
    }

    const totalCols = colEnds.length;
    // nastavi cols za vse iz tega clustra
    for (let i = placed.length - cluster.length; i < placed.length; i++) {
      placed[i].cols = totalCols;
    }
  }

  return placed;
}

export default function Timetable({ termini = [], weatherByDay = {} }) {
  const heightPx = MINUTES_PER_DAY * PX_PER_MINUTE;

  // grupiraj po dnevu
  const byDay = React.useMemo(() => {
    const out = Array.from({ length: 5 }, () => []);
    for (const t of termini || []) {
      if (t?.dan >= 0 && t?.dan <= 4) out[t.dan].push(t);
    }
    for (const d of out) d.sort((a, b) => String(a.zacetek).localeCompare(String(b.zacetek)));
    return out;
  }, [termini]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
      {/* leva časovna os */}
      <div>
        <div style={{ height: 40 }} />
        <div style={{ position: "relative", height: heightPx, borderRight: "1px solid #eee" }}>
          {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
            const hour = START_HOUR + i;
            const top = i * 60 * PX_PER_MINUTE;
            return (
              <div key={hour} style={{ position: "absolute", top: top - 8, fontSize: 12, color: "#666" }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            );
          })}
        </div>
      </div>

      {/* desni del: 5 dni */}
      <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", background: "#73C2FB", color: "white" }}>
          {DAYS.map((d, dayIdx) => (
            <div key={d} style={{ padding: "10px 12px", textAlign: "center" }}>
              <DayHeader label={d} dayIdx={dayIdx} weatherByDay={weatherByDay} />
            </div>
          ))}
                  </div>

        {/* grid body */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
          {byDay.map((dayEvents, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                position: "relative",
                height: heightPx,
                borderLeft: dayIdx === 0 ? "none" : "1px solid #eee",
                background: "white",
                overflow: "hidden",  
              }}
            >
              {/* horizontal lines each hour */}
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: i * 60 * PX_PER_MINUTE,
                    borderTop: "1px solid #f2f2f2",
                  }}
                />
              ))}

              {/* events */}
              {dayEvents.map((t) => {
                const startMin = toMinutesSinceStart(formatHHMM(t.zacetek));
                const duration = Number(t.dolzina ?? 0);
                const top = Math.max(0, startMin) * PX_PER_MINUTE;
                const height = Math.max(24, duration * PX_PER_MINUTE); // min višina 24px
                const end = addMinutesToTime(t.zacetek, duration);

                // osnovna “card” vsebina
                const title = t.predmet ? `${t.predmet.oznaka} — ${t.predmet.ime}` : t.aktivnost?.ime ?? "Aktivnost";
                 const meta = `${t.tip} • ${t.lokacija}`;
                const time = `${formatHHMM(t.zacetek)} – ${end}`;

                return (
                  <div
                    key={t.termin_id ?? `${t.dan}-${t.zacetek}-${title}`}
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      top,
                      height,
                      boxSizing: "border-box", 
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      padding: 10,
                      background: "#fff",
                      overflow: "hidden",
                    }}
                    title={title}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>{meta}</div>
                    <div style={{ fontSize: 12, color: "#111", marginTop: 6, fontWeight: 700 }}>{time}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
