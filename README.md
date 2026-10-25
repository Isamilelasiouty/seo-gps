# SEO GPS 🛰️
> **Automated SEO Regression & Health Monitor for Modern Websites**
> Built by **Ismail El Asiouty**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Python%20%7C%20Supabase-gold)](https://github.com/Isamilelasiouty/seo-gps)

---

## 📌 Overview

**SEO GPS** is an automated, zero-cost SEO regression monitoring platform designed to eliminate "silent regressions":
- Sudden 404 / 500 status code spikes.
- Altered or stripped canonical tags.
- Accidental `noindex` / `nofollow` deployments.
- Corrupted structured data / Schema markup (JSON-LD, Microdata).
- Sitemap desynchronization.
- Keyword and topic cannibalization across internal pages.
- Leaked staging and development subdomains.

Each user monitors up to **5 websites**, receiving daily **delta-only** email alerts highlighting exactly what broke or changed since yesterday.

---

## 🏗️ Architecture

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS (Hosted on GitHub Pages / Cloudflare Pages).
- **Backend & Crawler:** Python 3.11+ async crawler running on GitHub Actions scheduled cron.
- **Analytics:** R text distance / clustering with automatic scikit-learn Python fallback.
- **Database & Auth:** Supabase (PostgreSQL with strict Row Level Security).
- **Email Delivery:** Resend / Brevo transactional API with Jinja2 responsive templates.

---

## 🛠️ Design System

- **Colors:** White & Gold theme (`#FFFFFF`, `#FAFAF7`, `#B8892B`, `#16140F`).
- **Typography:** **IBM Plex Sans Arabic** for Arabic, **Inter** for English. Optimized for eye comfort with generous line heights and high contrast (WCAG AA).
- **Full RTL & LTR Support**.

---

## 📜 License

Created by **Ismail El Asiouty**. All rights reserved.
