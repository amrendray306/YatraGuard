# 🛡️ YatraGuard (यात्रागार्ड)
### **AI-Powered Context-Aware Travel Safety & Local Transportation Fare Intelligence Platform**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Automated Tests](https://img.shields.io/badge/tests-16%2F16%20passed-success.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-blue.svg)]()
[![React](https://img.shields.io/badge/React-v18-cyan.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue.svg)]()
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)]()
[![Prisma ORM](https://img.shields.io/badge/Prisma-v5-darkblue.svg)]()
[![License](https://img.shields.io/badge/License-MIT-amber.svg)]()

---

## 🧭 1. Executive Summary & Product Vision

**YatraGuard** is a commercial-grade, startup-ready travel safety and transit intelligence platform engineered for travelers across India. Moving beyond traditional tourism directories, YatraGuard answers the five vital questions every traveler faces in an unfamiliar city:

> **1. “Where should I go?”** — Context-aware destination discovery and safety-ranked attractions.  
> **2. “Is this location and route safe?”** — Bayesian dynamic safety scoring and real-time risk heatmaps.  
> **3. “How much should local transportation cost?”** — RTO-notified tariffs for Auto, Taxi, Metro, and Bus.  
> **4. “Am I being overcharged by the driver?”** — Real-time quote auditing with polite bilingual negotiation scripts.  
> **5. “How do I get help in an emergency?”** — 3-stage SOS dispatch state machine and offline PWA emergency vault.

---

## ✨ 2. Key Platform Capabilities

### 🚖 1. Local Transportation Fare Intelligence & Overcharge Defense
- **RTO & Union Notified Tariffs:** Calibrated fare calculations across Auto Rickshaws, Local Taxis, Shared Cabs, E-Rickshaws, City Buses, and Metro rail.
- **Topographic Terrain Factors:** Automatically applies a **+20% to +25% gradient surcharge** for Himalayan mountain destinations (e.g., Manali, Rohtang, Solang Valley).
- **Night Surcharges:** Automatically detects and applies **+25% night tariff** between 11:00 PM and 5:00 AM in compliance with Indian Motor Vehicles regulations.
- **Round-Trip & Sightseeing Waiting:** Calculates round-trip packages with union-notified driver waiting charges (₹100–150/hr).
- **Driver Fare Quote Audit Tool:** Flags driver pricing as `FAIR`, `SLIGHTLY_ELEVATED`, `POTENTIAL_OVERCHARGE`, or `SEVERE_OVERCHARGE`.
- **Driver Negotiation Assistant:** 1-click copyable polite and assertive Hindi & English negotiation phrases with pronunciation guidance.
- **Statutory Regulatory Backing:** Displays official circular references and legal protections under **Section 67(1) of the Motor Vehicles Act 1988**.

### 🧠 2. YatraGuard AI Travel Guardian
- **Live Gemini Integration:** Powered by Google's `@google/genai` SDK with resilient multi-model fallbacks (`gemini-2.5-flash` / `gemini-2.0-flash`).
- **Context-Grounded Answers:** Feeds real-time city safety scores, nearest emergency hospitals, police stations, active scams, and regulated corridor benchmarks directly into prompt context.
- **Zero-Key Heuristic Engine:** Operates autonomously in demo/offline mode using expert rule-based safety heuristics when no API key is provided.
- **Zero-XSS Output Tokenization:** Safe JSX parsing prevents DOM-based cross-site scripting vulnerabilities.

### 🛡️ 3. Bayesian Safety Intelligence & Dynamic Heatmaps
- **Dynamic Safety Scoring (0–100):** Weighted multi-factor algorithm incorporating verified incidents, police station proximity, hospital trauma centers, street lighting, and time of day.
- **Multi-Layer Interactive Leaflet Map:** Visualizes Safety Zones (Good, Moderate, High-Risk), 24x7 Hospitals, Police Stations, Pharmacies, Transit Hubs, and Community Scams.
- **Mobile Scroll Trapping Prevention:** Configured with `scrollWheelZoom: false` to ensure smooth gesture scrolling on mobile touchscreens and trackpads.

### 🚨 4. Emergency SOS & Offline Resilience
- **3-Stage Dispatch State Machine:** `REQUESTED` ➔ `DISPATCHED` ➔ `CONFIRMED_DELIVERED` with audit trace identifiers and ISO timestamps.
- **Audible Alarm & Live GPS Beacon:** Sounds emergency sirens and copies live GPS coordinates.
- **PWA Offline Vault (`/offline.html`):** Zero-internet emergency hotline directory (112, 100, 108, 1090, 1363) with direct cellular calling and emergency Hindi phrases.

### 👥 5. Community Intelligence & Moderation Desk
- **Community Fare Reports:** Travelers submit actual fares paid, building crowdsourced pricing benchmarks.
- **Admin Moderation Console:** Role-based queue (Admin/Moderator) to verify or reject reported incidents and community fare submissions.

### 🎨 6. UI/UX Design System
- **Dark & Light Mode Toggle:** Smooth client-side theme switcher persisting preferences with high-contrast accessibility.
- **Mobile-First Responsive Layout:** Custom safe-area insets (`.pb-safe`, `.pt-safe`) for iPhone Notch, Dynamic Island, and Android gesture navigation bars.

---

## 🛠️ 3. Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| **Mapping Engine** | Leaflet, React-Leaflet, CartoDB Voyager Dark/Light Vector Tiles |
| **Backend API** | Node.js (v20+), Express.js, TypeScript |
| **Database & ORM** | SQLite (`dev.db`) / PostgreSQL (Cloud), Prisma ORM |
| **AI Integration** | Google GenAI SDK (`@google/genai`), Gemini 2.5 Flash |
| **Security** | Zero-dependency OWASP headers, sliding-window rate limiters, coordinate validators, bcrypt, JWT |
| **Offline / PWA** | Web App Manifest, Service Worker (`sw.js`), Zero-dependency Offline Shell (`offline.html`) |
| **Containerization** | Docker (Multi-stage build), Docker Compose |

---

## 📂 4. Project Directory Structure

```
TravelApp/
├── client/                     # Frontend React (Vite + Tailwind)
│   ├── public/
│   │   ├── manifest.json       # PWA Web App Manifest
│   │   ├── sw.js               # Service Worker caching & offline handler
│   │   ├── offline.html        # Zero-internet Emergency Vault
│   │   ├── icon-192.svg        # PWA App Icon (192px)
│   │   └── icon-512.svg        # PWA App Icon (512px)
│   ├── src/
│   │   ├── components/         # Modals, SafetyMap, Navbar, MobileNav, Cards
│   │   ├── context/            # AuthContext, CityContext, ThemeContext
│   │   ├── pages/              # Dashboard, FareIntelligence, Map, Guardian, Admin...
│   │   ├── services/           # Axios API client
│   │   ├── index.css           # Safe-areas, light/dark theme tokens, glassmorphism
│   │   └── main.tsx            # PWA registration & React root
│   └── vite.config.ts
├── server/                     # Backend Node.js Express API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (Cities, Fares, Incidents, Users...)
│   │   └── seed.ts             # 13 cities, 35 fare rules, 59 services seeded
│   ├── src/
│   │   ├── controllers/        # Fare, AI, Safety, Emergency, Incident controllers
│   │   ├── middleware/         # Security headers, rate limiting, auth, validation
│   │   ├── routes/             # API route registration
│   │   ├── services/           # FareEstimationService, aiService, safetyScoreService
│   │   └── index.ts            # Express server entry & SPA static serving
│   └── test/
│       └── testRunner.ts       # 13 automated unit & integration tests
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Container orchestration with volume persistence
├── package.json                # Root package scripts
└── README.md                   # System documentation
```

---

## 🚀 5. Getting Started

### Prerequisites
- **Node.js** v18+ (Node 20 LTS recommended)
- **npm** v9+

### 1. Installation
Clone the repository and install dependencies for both client and server:
```bash
# Clone the repository
git clone https://github.com/your-username/yatraguard.git
cd yatraguard

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Database Setup & Seeding
Initialize the SQLite database and seed 13 Indian cities and transit rules:
```bash
cd server
npm run db:push
npm run seed
```

### 3. Environment Configuration
Create `server/.env` (or copy from `.env.example`):
```env
PORT=5001
DATABASE_URL="file:./dev.db"
JWT_SECRET="yatraguard-production-secure-jwt-secret-key-2026"
ALLOWED_ORIGINS="http://localhost:5001,http://localhost:5173"
NODE_ENV="development"

# Optional: Add your Google Gemini API key for live LLM responses
GEMINI_API_KEY=""
```

### 4. Running Locally
Run both server and client in development mode:

**Terminal 1 (Backend API):**
```bash
npm run dev:server
# Server starts at http://localhost:5001
```

**Terminal 2 (Frontend Client):**
```bash
npm run dev:client
# Vite dev server opens at http://localhost:5173
```

---

## 🧪 6. Automated Testing Suite

YatraGuard includes an automated integration and algorithmic test suite in `server/test/testRunner.ts`.

Run the test suite with:
```bash
npm test
```

### Test Coverage Highlights:
- **Suite 1: Security & Cryptographic Integrity**
  - Geographic bounds validation (rejects invalid/spoofed coordinates)
  - JWT token generation, payload validation, and role extraction
  - Bcrypt password hashing and verification
- **Suite 2: Local Transit Fare Intelligence Engine**
  - Delhi daytime metered Auto Rickshaw tariff calculation
  - Pan-India automatic night surcharge (+25%) between 11 PM and 5 AM
  - Himalayan mountain terrain surcharge (+20%–25%) for hill stations (Manali)
- **Suite 3: Driver Overcharge Audit & Anti-Scam Protection**
  - `FAIR` verdict assertion for standard quotes
  - `POTENTIAL_OVERCHARGE` detection when drivers inflate quotes by >30%
  - `SEVERE_OVERCHARGE` alerts for tourist predatory rates
- **Suite 4: Bayesian Safety Intelligence Engine**
  - Real-time score generation and tier classification
  - Proximity factor resolution for nearest hospitals and police stations
- **Suite 5: Emergency SOS Notification Delivery Engine**
  - Full state-machine progression (`REQUESTED` ➔ `DISPATCHED` ➔ `CONFIRMED_DELIVERED`)
- **Suite 6: Dual Authentication & Account Security Engine**
  - Strict RFC email validation and malformed address rejection
  - Password reset cryptographic token generation with timestamp expiration verification
  - Google OAuth profile normalization (ID token extraction, verified email, profile photo)

---

## 📦 7. Production Build & Deployment

### Unified Single-Service Build
To compile both the frontend and backend for production:
```bash
npm run build
```
This produces:
- `client/dist/` — Optimized frontend bundle with PWA assets and HTML.
- `server/dist/` — Compiled CommonJS backend server.

Start the unified production server:
```bash
npm start
```
The Express server at `http://localhost:5001` serves both the backend API (`/api/*`) and the static React SPA frontend with client-side routing fallback.

### Docker Deployment
Build and run the multi-stage Docker container:
```bash
docker compose up -d --build
```
Access the application at `http://localhost:5001`.

---

## 🛡️ 8. Security Hardening

- **Sliding-Window In-Memory Rate Limiting:**
  - Global API: 120 requests/min
  - Authentication: 20 attempts/15 min
  - AI Travel Guardian: 25 requests/5 min
  - Emergency SOS: 15 requests/min
- **OWASP HTTP Security Headers:**
  - `Content-Security-Policy`: Restricts scripts, styles, and tile sources.
  - `X-Frame-Options: DENY`: Full clickjacking prevention.
  - `X-Content-Type-Options: nosniff`: MIME sniffing prevention.
- **Zero-XSS Guardian Output:** Markdown tokenization into safe React JSX trees without `dangerouslySetInnerHTML`.
- **Coordinate Sanitization:** Validates numeric bounds (`-90 <= lat <= 90` and `-180 <= lng <= 180`) on all geospatial endpoints.

---

## 📜 9. License & Academic Attribution
Developed as an advanced B.Tech Computer Science & Engineering Final-Year Capstone Project. Built with startup-grade software architecture, production-ready full-stack practices, and real-world utility for travelers in India.

Released under the [MIT License](LICENSE).

