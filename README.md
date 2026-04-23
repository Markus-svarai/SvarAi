# SvarAI

AI-resepsjonist for klinikker i Norge. Svarer på henvendelser, håndterer bookinger og løfter kundeservicen – døgnet rundt.

MVP bygget med **Next.js 14 (App Router) + TypeScript + Tailwind CSS**.

---

## Hva er inkludert

- **Landingsside** – Hero, problem-statement, feature-seksjon, "hvordan det fungerer", fordeler, live demo og book-demo-skjema. Premium SaaS-design, fullstendig responsiv.
- **AI-chat-demo på norsk** – Trent på en generisk klinikk (`Oslo Klinikk`). Svarer intelligent på:
  - Åpningstider
  - Tjenester og priser
  - Adresse og kontaktinfo
  - Avbestilling / endring av time
  - Generelle spørsmål
  - Booking-intent → utløser booking-flyten
- **Booking-flyt** – Guider brukeren gjennom tjeneste → dato → tid → kontaktinfo. Bekreftelse vises i chatten og lagres via API.
- **Booking-API** – `POST /api/booking` validerer og lagrer bestillinger til `data/bookings.json`. `GET /api/booking` returnerer en redigert liste for demo-oversikt.
- **Config-system** – `lib/clinic-config.ts` definerer klinikknavn, type, åpningstider, tjenester+priser, adresse og kontakt. Én fil å endre for å tilpasse demoen til hvilken som helst klinikk.

---

## Kom i gang

### 1. Krav

- Node.js 18.17+ (eller 20+)
- npm (eller pnpm/yarn)

Hvis du ikke har Node installert på macOS:

```bash
# Med Homebrew:
brew install node

# Eller last ned fra https://nodejs.org
```

### 2. Installer og kjør

```bash
cd ~/dev/svarai
npm install
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

### 3. Build for produksjon

```bash
npm run build
npm start
```

---

## Tilpasse til en annen klinikk

All klinikkinformasjon ligger i én fil:

```
lib/clinic-config.ts
```

Endre:
- `name` – klinikkens navn
- `type` – `medisinsk | tannlege | skjønnhet | fysioterapi | generell`
- `address`, `contact`
- `openingHours` – per ukedag
- `services` – tjenester med navn, beskrivelse, varighet og pris
- `cancellationPolicy`

Både chatten, booking-flyten og seksjonene oppdateres automatisk.

---

## Arkitektur

```
svarai/
├── app/
│   ├── layout.tsx           # Root layout + metadata
│   ├── page.tsx             # Landingsside
│   ├── globals.css          # Tailwind + custom styling
│   └── api/
│       ├── chat/route.ts    # Chat-intent routing (norsk)
│       └── booking/route.ts # Booking-validering + JSON-lagring
├── components/
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── Problem.tsx
│   ├── Features.tsx
│   ├── HowItWorks.tsx
│   ├── Benefits.tsx
│   ├── DemoSection.tsx
│   ├── ChatDemo.tsx         # Interaktiv chat + booking UI
│   ├── CTA.tsx
│   └── Footer.tsx
├── lib/
│   └── clinic-config.ts     # All klinikkdata
├── data/
│   └── bookings.json        # Lagrede bookinger (generert)
├── tailwind.config.ts
└── package.json
```

### Chat-motoren

`app/api/chat/route.ts` bruker en rask intent-matcher med norske nøkkelord. Fordeler:
- Ingen eksterne API-kaller – demoen kjører offline
- Deterministisk og trygg for live-demo
- Lett å oppgradere til en LLM senere (f.eks. OpenAI/Anthropic) – bytt ut `route()`-funksjonen

Intents som håndteres:
- `book / bestille` → starter booking-flyten, kan gjenkjenne tjeneste
- `avbestille / endre` → viser avbestillingsinstruks
- `åpningstid / åpent` → rendrer full åpningstid-liste med live "åpent nå"-status
- `tjeneste / pris / koste` → viser tjenester og priser (eller spesifikk tjeneste hvis nevnt)
- `adresse / telefon / epost` → viser kontaktinfo
- `hei / hallo` → hilsen
- `akutt / nød` → viser 113/116 117-informasjon

### Booking-API

`POST /api/booking` tar et JSON-objekt:
```json
{
  "serviceId": "helsesjekk",
  "date": "2026-04-24",
  "time": "10:30",
  "name": "Ola Nordmann",
  "phone": "+47 123 45 678",
  "email": "ola@eksempel.no"
}
```

Returnerer bekreftet booking med generert ID. Data lagres i `data/bookings.json`.

---

## Videre utvikling (forslag til neste iterasjon)

- **Ekte LLM-backend** for chatten (OpenAI/Anthropic/Mistral)
- **Kalenderintegrasjon** (Google Calendar, Outlook, Timely, Physica)
- **SMS/e-post-bekreftelser** (Twilio, Postmark)
- **Avbestilling via chat** (finn booking via ID + telefon)
- **Admin-dashboard** for resepsjonen
- **Voice-kanal** (Twilio Voice + STT/TTS på norsk)
- **Flerspråklig** (bokmål + nynorsk + engelsk)

---

## Lisens

Proprietær – bygget som MVP-demo for SvarAI.
