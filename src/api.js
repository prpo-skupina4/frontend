import React from "react";

const API = import.meta.env.VITE_API_URL;
const HAS_API = typeof API === "string" && API.length > 0;
export const URNIK_URL = HAS_API ? `${API}/auth` : "http://localhost:8002/auth";

export const USERS_URL = HAS_API ? `${API}/users`: "http://localhost:8006";

export const BOOL_URL = HAS_API ? `${API}/bool`: "http://localhost:8004/bool";

export const KOSILO_URL = HAS_API ? `${API}/kosilo` : "http://localhost:8005/kosilo";

export const VREME_API = HAS_API ? `${API}/vreme`: "http://localhost:8007/vreme";


export async function register(email, password, userId) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  body.set("userId", userId);

  const res = await fetch(`${USERS_URL}/users`, {//id, email
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
    const novUrnikRes = await fetch(`${URNIK_URL}/urniki/${userId}`, {
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
  const res = await fetch(`${URNIK_URL}/urniki/${user_id}/termini`, {
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
 const res = await fetch(`${USERS_URL}/users/${userId}/friends`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      friend_id: Number(friendId),
      name: name.trim(),
    }),
  });

  if(res.status==400)throw new Error("Friend already exists!");
  if (!res.ok) throw new Error("Add friend failed");
  return await res.json();
}

export async function getFriends(userId){
  const res = await fetch(
    `${USERS_URL}/users/${userId}/friends`,
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Getting friend list failed");
  const data = await res.json();
  return data.items ?? [];
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
  const res = await fetch(`${URNIK_URL}/urniki/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(urnik),
  });
  if (!res.ok) throw new Error(`Shranjevanje urnika failed (${res.status})`);
  return res.json();
}

export async function zdruziUrnik(userId, friendIds) {
   const ids = [Number(userId), ...friendIds.map(Number)];
  const res = await fetch(`${BOOL_URL}/`, {
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
  const res = await fetch(`${KOSILO_URL}/`, {
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
  const res = await fetch(`${URNIK_URL}/urniki/${userId}`, {
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
    // 1) najprej poskusi iz sessionStorage
    const cached = sessionStorage.getItem("weekWeather");
    if (cached) {
      try {
        setWeatherByDay(JSON.parse(cached));
        return; // ✅ brez requesta
      } catch {
        sessionStorage.removeItem("weekWeather");
      }
    }

    // 2) sicer naredi en request
    const url = `${VREME_API}/`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Weather failed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setWeatherByDay(data || {});
        sessionStorage.setItem("weekWeather", JSON.stringify(data || {})); // ✅ shrani
      })
      .catch((e) => setWerr(e?.message || "Weather error"));
  }, []);

  return { weatherByDay, werr };
}