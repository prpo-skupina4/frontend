import React, {useState} from "react";
import * as F from "../utils/funkcije";
import { getUrnik, novTermin, addFriend, getFriends, optimizirajUrnik, shraniUrnik, zdruziUrnik, dodajKosilo, odstraniUrnik, useWeekWeather } from "../api";
import Timetable from "../components/Timetable";

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [urnik, setUrnik] = React.useState(null);//rezultati api (JSON urnik)
  const [originalUrnik, setOriginalUrnik] = React.useState(null);
  const [isPreview, setIsPreview] = React.useState(false);
  const [previewType, setPreviewType] = React.useState(null); // null | "optimize" | "merge" | "lunch"
  const [kosiloDan, setKosiloDan] = React.useState(0);
  const { weatherByDay, werr } = useWeekWeather();
console.log("WEATHER (render)", weatherByDay, werr);

  async function loadUrnik() {
    setBusy(true);
    setError("");
    try {
      const data = await getUrnik(userId);
      setUrnik(data);
      setOriginalUrnik(data);
      setIsPreview(false);
    } catch (e) {
      setError(e.message || "Napaka pri urniku");
    } finally {
      setBusy(false);
    }
  }
  React.useEffect(() => {//posodobitev urnika
  if (!userId) return;
  loadUrnik();
  }, [userId]);



  const [showAddAkt, setShowAddAkt] = React.useState(false);
  const [newAkt, setNewAkt] = React.useState({
    dan: 0,
    zacetek: "12:00",
    dolzina: 60,
    lokacija: "",
    tip: "AKTIVNOST",
    oznaka: "AKT",
    ime: "Nova aktivnost",
  });

  const termini = React.useMemo(() => {//ko se spremeni urnik
  if (!urnik) return [];
  if (Array.isArray(urnik)) return urnik;                
  return urnik.termini ??[]; 
  }, [urnik]);


  const predmeti = React.useMemo(() => {
  const map = new Map(); // key: predmet_id
  for (const t of termini) {
    const p = t?.predmet;
    if (p?.predmet_id != null) {
      map.set(Number(p.predmet_id), p);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.oznaka).localeCompare(String(b.oznaka))
  );
}, [termini]);



  // zahteve za optimizatorja
  const [startAt, setStartAt] = React.useState("08:00");
  const [endAt, setEndAt] = React.useState("20:00");
  const [freeDays, setFreeDays] = React.useState({ //prosti dnevi
    mon: false, tue: false, wed: false, thu: false, fri: false,
  });
  const [minPavze, setMinPavze] = React.useState(false);//najmanj lukenj
  const [pavze, setPavze] = React.useState([]);//željene pavze
  const [vaje, setVaje] = React.useState([]);//zahteve za vaje
  // seznam prijateljev (dummy podatki)
    const [showAddFriend, setShowAddFriend] = React.useState(false);
  const [newFriendId, setNewFriendId] = React.useState("");
  const [nickname, setNickname] = useState("");
  const [friends, setFriends] = React.useState([]);
  const [friendsCollapsed, setFriendsCollapsed] = React.useState(false);//za prikaz
  const [selectedFriendIds, setSelectedFriendIds] = React.useState(new Set());//za boolean izbereš prijatelje

    function toggleFriendPick(id) {
  setSelectedFriendIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}
async function handleMergeSchedules() {
  try {
    setBusy(true);
    setError("");

    const ids = Array.from(selectedFriendIds).map(Number).filter(Number.isFinite);
    if (ids.length === 0) {
      setError("Izberi vsaj enega prijatelja za združitev urnika.");
      return;
    }

    // Shrani original, če še ni
    if (!originalUrnik) setOriginalUrnik(urnik);

    const merged = await zdruziUrnik(userId, ids);

    setUrnik(merged);
    setIsPreview(true); // isto kot pri optimizaciji - preview + Shrani/Nazaj
    setPreviewType("merge");
  } catch (e) {
    setError(e?.message || "Združevanje urnika ni uspelo");
  } finally {
    setBusy(false);
  }
}

async function handleKosilo() {
  try {
    setBusy(true);
    setError("");

    const ids = [
      Number(userId),
      ...Array.from(selectedFriendIds).map(Number).filter(Number.isFinite),
    ];
    await dodajKosilo(userId, kosiloDan, ids);
    await loadUrnik();
    setIsPreview(false);
    setPreviewType(null);
  } catch (e) {
    setError(e?.message || "Dodajanje kosila ni uspelo");
  } finally {
    setBusy(false);
  }
}

async function handleResetUrnik() {
  try {
    setBusy(true);
    setError("");

    await odstraniUrnik(userId); //odstrani
    await getUrnik(userId);         //na novo naloži fri urnik 
    await loadUrnik();                  //prikaz

    setIsPreview(false);
    setPreviewType(null);
  } catch (e) {
    setError(e?.message || "Reset urnika ni uspel");
  } finally {
    setBusy(false);
  }
}



function addPavza() {
  setPavze(prev => [...prev, { dan: 0, zacetek: "12:00", dolzina: 60 }]);
}

function updatePavza(idx, patch) {
  setPavze(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
}

function removePavza(idx) {
  setPavze(prev => prev.filter((_, i) => i !== idx));
}

function addVajeZahteva() {
  setVaje(prev => [...prev, { dan: -1, predmet: null, zacetek: "", konec: "" }]);
}


function updateVaje(idx, patch) {
  setVaje(prev => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
}

function removeVaje(idx) {
  setVaje(prev => prev.filter((_, i) => i !== idx));
}

function buildZahteve() {
  // prosti_dnevi: List[int]
  const DAY_KEY_TO_INT = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };
  const prosti_dnevi = Object.entries(freeDays)
  .filter(([, v]) => v)
  .map(([k]) => DAY_KEY_TO_INT[k])
  .filter(Number.isInteger);


  // pavze: List[Pavza]
  const pavzePayload = pavze
    .filter(p => p && RdyPavza(p))
    .map(p => ({
      dan: Number(p.dan),
      zacetek: F.toHHMMSS(p.zacetek),   // "HH:MM:SS"
      dolzina: Number(p.dolzina),
    }));

  // vaje: List[VajeZahteva]
  const vajePayload = vaje
    .filter(v => v && v.predmet && v.dan !== undefined && v.dan !== null)
    .map(v => ({
      dan: Number(v.dan),
      predmet: v.predmet,               // pošlješ cel Predmet objekt (tako kot backend pričakuje)
      zacetek: v.zacetek ? F.toHHMMSS(v.zacetek) : null,
      konec: v.konec ? F.toHHMMSS(v.konec) : null,
    }));

  return {
    prosti_dnevi,
    zacetek: startAt ? F.toHHMMSS(startAt) : null,
    konec: endAt ? F.toHHMMSS(endAt) : null,
    pavze: pavzePayload,
    vaje: vajePayload,
    min_pavze: Boolean(minPavze),
  };
}

async function addAktivnost() {
  try {
    setBusy(true);
    setError("");

    const termin = {
      termin_id: null,
      dan: Number(newAkt.dan),
      zacetek: `${newAkt.zacetek}:00`,
      dolzina: Number(newAkt.dolzina),
      lokacija: newAkt.lokacija || "",
      tip: newAkt.tip || "AKTIVNOST",
      predmet: null,
      aktivnost: {
        aktivnost_id: null,
        oznaka: newAkt.oznaka || "AKT",
        ime: newAkt.ime || "Aktivnost",
      },
    };

    const fresh = await novTermin(userId, termin);
    setUrnik(fresh);
    setShowAddAkt(false);
    await loadUrnik();
  } catch (e) {
    setError(e?.message || "Napaka pri dodajanju aktivnosti");
  } finally {
    setBusy(false);
  }
}

async function loadFriends() {
  try {
    const list = await getFriends(userId);
    setFriends(Array.isArray(list) ? list : []);
  } catch (e) {
    setFriends([]);
    setError(e?.message || "Napaka pri pridobivanju prijateljev");
  }
}


React.useEffect(() => {
  if (!userId) return;
  loadFriends();
}, [userId]);


async function handleAddFriend(newFriendId, nickname) {
  const friendId = Number(newFriendId);
  const myId = Number(localStorage.getItem("userId"));

  if (!Number.isInteger(friendId) || friendId <= 0) {
    setError("Vpiši veljavno vpisno številko.");
    return;
  }
  if (friendId === myId) {
    setError("Ne moreš dodati samega sebe.");
    return;
  }

  try {
    setBusy(true);
    setError("");

    await addFriend(friendId, nickname);   // kličemo api users
    await loadFriends();
    setShowAddFriend(false);
  } catch (e) {
    setError(e?.message || "Dodajanje prijatelja ni uspelo");
  } finally {
    setBusy(false);
  }
}

async function handleOptimize() {//za optimizacijo urnika
  try {
    setBusy(true);
    setError("");

    // Shrani original, če še ni
    if (!originalUrnik) setOriginalUrnik(urnik);

    const zahteve = buildZahteve();     // ✅ pošlješ samo to
    const optimized = await optimizirajUrnik(userId, zahteve);

    setUrnik(optimized);               // ✅ pričakujemo optimiziran urnik
    setIsPreview(true);
  } catch (e) {
    setError(e?.message || "Optimizacija ni uspela");
  } finally {
    setBusy(false);
  }
}

async function handleSaveOptimized() {//shrani optimiziran urnik
  try {
    setBusy(true);
    setError("");

    const saved = await shraniUrnik(userId, urnik);
    setUrnik(saved);
    setOriginalUrnik(saved);
    setIsPreview(false);
    await loadUrnik();               //osveži prikaz
  } catch (e) {
    setError(e?.message || "Shranjevanje ni uspelo");
  } finally {
    setBusy(false);
  }
}

function handleBackToOriginal() {//nazaj prejšnji urnik
  if (originalUrnik) setUrnik(originalUrnik);
  setIsPreview(false);
}
  // validacija pavze
  function RdyTimeStr(x) {
    return typeof x === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(x);
  }
  function RdyPavza(p) {
    return (
      p.dan !== undefined &&
      p.dolzina !== undefined &&
      Number(p.dolzina) > 0 &&
      RdyTimeStr(p.zacetek)
    );
  }

  

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* top controls */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <label>
           uporabnik_id: {localStorage.getItem("userId")}
        </label>
        <button onClick={loadUrnik} disabled={busy}>
          {busy ? "Nalagam..." : "Naloži urnik"}
        </button>

        <button onClick={handleResetUrnik} disabled={busy}>
          {busy ? "Resetiram..." : "Resetiraj urnik"}
        </button>

        {error && <span style={{ color: "crimson" }}>{error}</span>}
      </div>
       {/* side: friends + requirements */}
          {/* friends */}
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0 }}>Drugi uporabniki</h2>
              <div>
                <input
                  type="number"
                  value={newFriendId}
                  onChange={(e) => setNewFriendId(e.target.value)}
                  placeholder="Vpisna številka (npr. 12345678)"
                />

                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Vzdevek"
                />

                <button
                  type="button"
                  onClick={() => handleAddFriend(newFriendId, nickname)}
                  disabled={busy || !newFriendId}
                >
                  {busy ? "Dodajam..." : "Dodaj"}
                </button>

              </div>
              
              <div style={{ display: "grid", gap: 14 }}>
              <button style={{ marginLeft: "auto" }} onClick={() => setFriendsCollapsed(v => !v)}>
                {friendsCollapsed  ? "Razširi" : "Minimiziraj"}
              </button>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={handleMergeSchedules}
                  disabled={busy || selectedFriendIds.size === 0 || !urnik}
                >
                  {busy ? "Združujem..." : "Združi urnik"}
                </button>

                <button
                  type="button"
                  onClick={handleKosilo}
                  disabled={busy || !urnik}
                >
                  {busy ? "Dodajam..." : "Kosilo"}
                </button>

                <select value={kosiloDan} onChange={(e) => setKosiloDan(Number(e.target.value))}>
                <option value={0}>MON</option>
                <option value={1}>TUE</option>
                <option value={2}>WED</option>
                <option value={3}>THU</option>
                <option value={4}>FRI</option>
              </select>


              </div>


            {!friendsCollapsed && (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(!friends || friends.length === 0) && (
                  <div style={{ color: "#666" }}>Nimaš še prijateljev.</div>
                )}

                {(friends ?? []).map(f => {
                  const fid = Number(f.id ?? f.friend_id);
                  const checked = selectedFriendIds.has(fid);

                  return (
                    <label
                      key={fid}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 8,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFriendPick(fid)}
                      />
                      <div style={{ display: "grid" }}>
                        <div>
                          {f.name ?? f.nickname ?? f.email ?? "Uporabnik"}{" "}
                          <span style={{ opacity: 0.6 }}>({fid})</span>
                        </div>
                      </div>
                    </label>
                  );
                })}


              </div>
            )}
          </div>

          {/* requirements */}
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Zahteve za urnik</h2>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ flex: 1 }}>
                  Start
                  <input type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </label>
                <label style={{ flex: 1 }}>
                  End
                  <input type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </label>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Prosti dnevi</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {Object.entries(freeDays).map(([k, v]) => (
                    <label key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={v}
                        onChange={(e) => setFreeDays(s => ({ ...s, [k]: e.target.checked }))}
                      />
                      {k.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
                  <div>
                    <h3>Pavze</h3>
                    {pavze.map((p, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "120px 140px 120px 40px", gap: 8, alignItems: "center" }}>
                        <select value={p.dan} onChange={e => updatePavza(idx, { dan: Number(e.target.value) })}>
                          <option value={0}>MON</option><option value={1}>TUE</option><option value={2}>WED</option><option value={3}>THU</option><option value={4}>FRI</option>
                        </select>

                        <input type="time" value={p.zacetek} onChange={e =>  updatePavza(idx, { zacetek: e.target.value })} />
                        <input type="number" min={1} value={p.dolzina} onChange={e =>  updatePavza(idx, { dolzina: Number(e.target.value) })} />
                        <button type="button" onClick={() => removePavza(idx)}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={addPavza}>+ Dodaj pavzo</button>
                  </div>
                  <div>
    </div>
  <h3>Vaje (zahteve)</h3>

  {vaje.map((v, idx) => (
    <div key={idx} style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 140px 40px", gap: 8, alignItems: "center" }}>
      <select value={v.dan} onChange={e => updateVaje(idx, { dan: Number(e.target.value) })}>
      <option value={-1}>ANY</option>
      <option value={0}>MON</option>
      <option value={1}>TUE</option>
      <option value={2}>WED</option>
      <option value={3}>THU</option>
      <option value={4}>FRI</option>
    </select>


      <select
        value={v.predmet?.predmet_id ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          const selected = predmeti.find(p => Number(p.predmet_id) === id) ?? null;
          updateVaje(idx, { predmet: selected });
        }}
      >
        <option value="">Izberi predmet…</option>
        {predmeti.map(p => (
          <option key={p.predmet_id} value={p.predmet_id}>
            {p.oznaka} — {p.ime}
          </option>
        ))}
      </select>

      <input
        type="time"
        value={v.zacetek || ""}
        onChange={e => updateVaje(idx, { zacetek: e.target.value })}
        title="Najprej začne ob"
      />
      <input
        type="time"
        value={v.konec || ""}
        onChange={e => updateVaje(idx, { konec: e.target.value })}
        title="Najkasneje konča do"
      />

      <button type="button" onClick={() => removeVaje(idx)}>✕</button>
    </div>
  ))}

  <button type="button" onClick={addVajeZahteva}>+ Dodaj zahtevo za vaje</button>
  </div>


                      <button type="button" onClick={handleOptimize} disabled={busy || !urnik}>
          {busy ? "Optimiziram..." : "Optimiziraj"}
        </button>

        {isPreview && (
        <div style={{ display: "flex", gap: 10 }}>
          {previewType !== "merge" && (   // ✅ merge se ne shranjuje
            <button type="button" onClick={handleSaveOptimized} disabled={busy}>
              Shrani
            </button>
          )}
          <button type="button" onClick={handleBackToOriginal} disabled={busy}>
            Nazaj
          </button>
        </div>
      )}




      <div style={{ padding: 20 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <h1 style={{ margin: 0 }}>Urnik</h1>

    <button
      type="button"
      onClick={() => setShowAddAkt(true)}
      disabled={busy}
      style={{
        marginLeft: "auto",
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        fontWeight: 800,
      }}
    >
      + Dodaj aktivnost
    </button>
  </div>

  {/* ✅ FORM za dodajanje aktivnosti */}
  {showAddAkt && (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
        <label>Dan</label>
        <select
          value={newAkt.dan}
          onChange={(e) => setNewAkt((s) => ({ ...s, dan: Number(e.target.value) }))}
        >
          <option value={0}>Ponedeljek</option>
          <option value={1}>Torek</option>
          <option value={2}>Sreda</option>
          <option value={3}>Četrtek</option>
          <option value={4}>Petek</option>
        </select>

        <label>Začetek</label>
        <input
          type="time"
          value={newAkt.zacetek}
          onChange={(e) => setNewAkt((s) => ({ ...s, zacetek: e.target.value }))}
        />

        <label>Dolžina (min)</label>
        <input
          type="number"
          min={5}
          value={newAkt.dolzina}
          onChange={(e) => setNewAkt((s) => ({ ...s, dolzina: Number(e.target.value) }))}
        />

        <label>Oznaka</label>
        <input
          value={newAkt.oznaka}
          onChange={(e) => setNewAkt((s) => ({ ...s, oznaka: e.target.value }))}
        />

        <label>Ime</label>
        <input
          value={newAkt.ime}
          onChange={(e) => setNewAkt((s) => ({ ...s, ime: e.target.value }))}
        />

        <label>Lokacija</label>
        <input
          value={newAkt.lokacija}
          onChange={(e) => setNewAkt((s) => ({ ...s, lokacija: e.target.value }))}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setShowAddAkt(false)} disabled={busy}>
          Prekliči
        </button>
        <button type="button" onClick={addAktivnost} disabled={busy} style={{ fontWeight: 900 }}>
          {busy ? "Dodajam..." : "Dodaj"}
        </button>
      </div>
    </div>
  )}

  <div style={{ marginTop: 12 }}>
    <Timetable termini={termini} weatherByDay={weatherByDay}/>
  </div>
</div>


       
          
          </div>
        </div>
      </div>
    
  );
}
