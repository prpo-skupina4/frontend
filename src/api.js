import React from "react";


export const URNIK_URL = import.meta.env.URNIK_URL || "http://localhost:8002";
export const USERS_URL = import.meta.env.USERS_OUT_URL || "http://localhost:8006/auth";
export const BOOL_URL = import.meta.env.VITE_BOOLEAN_URL || "http://localhost:8004/bool";
export const KOSILO_URL  = import.meta.env.VITE_KOSILO_URL  || "http://localhost:8005/kosilo";
const VREME_API = import.meta.env.VITE_API_URL ?? "http://localhost:8007/vreme";

export async function register(email, password, userId) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  body.set("userId", userId);

  const res = await fetch(`${USERS_URL}/register`, {//id, email
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: Number(userId),
      email,
      password,
    }),
  });

  if (!res.ok) throw new Error(`Register failed (${res.status})`);
  
  return res.json(); // { access_token, ... }
}




export async function login(email, password) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${USERS_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  return res.json(); // { access_token, ... }
}


export async function getUrnik(userId) {//prebere termin
  const res = await fetch(`${URNIK_URL}/urniki/${userId}`);
 
  if (!res.ok) throw new Error(`Urnik failed (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data.termini) || data.termini.length === 0) {
    console.log("prazen urnik")
    const token = localStorage.getItem("token");
    const novUrnikRes = await fetch(`${URNIK_URL}/urniki/${userId}/dodaj`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

    if (!novUrnikRes.ok) {
      throw new Error(`Dodaj urnik failed (${novUrnikRes.status})`);
    }

    return await novUrnikRes.json();
  }

  return data;
}


export async function novTermin(user_id, termin) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${URNIK_URL}/urniki/${user_id}/novTermin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(termin),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Dodajanje novega termina failed (${res.status}): ${txt}`);
  }
}

export async function addFriend(friendId, name) {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
 const res = await fetch(`${USERS_URL}/friend`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      friend_id: Number(friendId),
      user_id: userId,
      name: name.trim(),
    }),
  });

  if(res.status==400)throw new Error("Friend already exists!");
  if (!res.ok) throw new Error("Add friend failed");
  return await res.json();
}

export async function getFriends(userId){
  const res = await fetch(
    `${USERS_URL}/${userId}/friends`,
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Getting friend list failed");
  const data = await res.json();
  return data
}

export async function optimizirajUrnik(userId, zahteve) {
  console.log("zahteve typeof", typeof zahteve, zahteve);
  const body = JSON.stringify(zahteve);
  const res = await fetch(`${URNIK_URL}/urniki/optimizations/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json","Accept": "application/json"},
    body,
  });
  if (!res.ok) {
    const text = await res.text();    
    throw new Error(text);
  }
  return res.json();
}

export async function shraniUrnik(userId, urnik) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${URNIK_URL}/urniki/${userId}/shrani`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(urnik),
  });
  if (!res.ok) throw new Error(`Shranjevanje urnika failed (${res.status})`);
  return res.json();
}

export async function zdruziUrnik(userId, friendIds) {
   const ids = [Number(userId), ...friendIds.map(Number)];
  const res = await fetch(`${BOOL_URL}/combine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_ids: ids,   // ✅ neposredno
    }),
  });
  if (!res.ok) throw new Error(`Zdruzi urnik failed (${res.status})`);
  return res.json(); // list terminov
}

export async function dodajKosilo(userId, dan, udelezenci) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${KOSILO_URL}/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      uporabnik_id: Number(userId),
      dan:Number(dan),
      udelezenci:udelezenci.map(Number),
    }),
  });
  if (!res.ok) throw new Error(`Kosilo failed (${res.status})`);
  return res.json();
}

export async function odstraniUrnik(userId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${URNIK_URL}/urniki/${userId}/odstrani`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export function useWeekWeather() {
  const [weatherByDay, setWeatherByDay] = React.useState({});
  const [werr, setWerr] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setWerr("");
        const res = await fetch(`${VREME_API}/`);
        if (!res.ok) throw new Error(`Weather failed (${res.status})`);
        const data = await res.json();
        if (alive) setWeatherByDay(data || {});
      } catch (e) {
        if (alive) setWerr(e?.message || "Napaka pri vremenu");
      }
    })();

    return () => { alive = false; };
  }, []);

  return { weatherByDay, werr };
}