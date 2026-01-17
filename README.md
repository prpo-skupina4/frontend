# Frontend (React) — Urnik aplikacija

Frontend je enostranska aplikacija (SPA) v React, ki uporabniku omogoča:
- registracijo in prijavo (JWT token),
- prikaz urnika (pon–pet),
- dodajanje lastnih aktivnosti,
- optimizacijo urnika z zahtevami,
- združevanje urnikov s prijatelji,
- dodajanje kosila,
- reset urnika na original (FRI),
- prikaz vremenske napovedi po dnevih (v headerju urnika).

---

## Tehnologije

- React + React Router
- REST API (klici na mikroservise)
- JWT
- Komponente:
  - `Login` (prijava/registracija)
  - `Dashboard` (glavni UI + akcije)
  - `Timetable` (vizualizacija urnika + vreme)

---

## Zagon z Docker

```bash
docker compose up --build
