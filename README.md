# dyno_website

Next.js App für die DYNO Unternehmenswebsite.  
Optimiert für modulare Komponenten, interaktive Tools und die Einbettung in Framer.

---

## 🚀 Overview

Dieses Repository enthält wiederverwendbare UI-Komponenten und Business-Logik für:

- Marketing-Seiten
- Interaktive Rechner (z. B. bAV vs. Depot)
- Vergleichstools
- API-Integrationen
- Embed-Widgets für Framer

Fokus:

- Performance
- Saubere Architektur
- Wiederverwendbare Komponenten
- Framer-kompatible Struktur

---

## 🏗 Tech Stack

- Next.js (App Router)
- TypeScript
- React
- TailwindCSS
- Modular Component Architecture

Optional:
- API Routes
- Server Actions
- Externe APIs

---

## 🧩 Framer Integration

Die Struktur ist so aufgebaut, dass einzelne Komponenten isoliert exportiert und in Framer eingebettet werden können.

### Option 1: iFrame Embed

Nach Deployment (z. B. via Vercel):

```html
<iframe 
  src="https://your-domain.com/embed/bav-rechner"
  width="100%" 
  height="800"
  style="border:none;"
></iframe>
