# Project: Amber Avenue Platform Modernization

## Architecture
- **Target Applications**:
  - `/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/admin.html` (Super-admin panel: R1 cleanup, R2 placements management with 8 types & visual booking calendars, R3 deep analytics & developer summary, R6 6-group sidebar navigation).
  - `/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/cabinet.html` (Developer B2B cabinet: R4 analytics gating behind 5+ paid cards, active placements tab, request placement modal, visual paid/unpaid card badges and lead warning).
  - `/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/app.js` (Catalog frontend core: R5 card map button gating in location tab, lead routing `ownedBy: 'developer'` vs `ownedBy: 'admin'`).
  - `/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/analytics.js` (Client-side analytics engine: event tracking, granular storage `amber_analytics_${entityType}_${entityId}`, deterministic seed generator).
- **Data Layers**:
  - `data.js` (Global `AMBER_DATA`: 54 developers, 369 residential complexes, banners, articles, experts, native ad inventory).
  - `properties-data.js` (Global `PROPERTIES`: 369 full complex profiles).
- **Client-Side Persistence (LocalStorage)**:
  - Placements: `amber_placements`, `amber_placements_dev_${devId}`, `amber_paid_cards`, `amber_placement_requests`
  - Analytics: `amber_analytics_developer_${devId}`, `amber_analytics_property_${zhkId}`, `amber_analytics_banner_${bannerId}`, `amber_analytics_global`
  - Leads CRM: `amber_leads` (with `ownedBy: 'developer'` or `ownedBy: 'admin'`)
  - Moderation & Audit: `amber_moderation_${zhkId}`, `amber_audit_logs_queue_${devId}` with Web Crypto SHA-256 verification

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1 Citizen Requests Removal | Remove sidebar item, KPI card, recent widget, section, switchAdminSection references, no JS errors | M1 | ORIGINAL_REQUEST R1 |
| 2 | R6 6-Group Sidebar Restructure | 6 category groups (Дашборд, Пользователи и компании, Контент, Монетизация, Аналитика, Настройки) | M1 | ORIGINAL_REQUEST R6 |
| 3 | R2.1 Developer Selector Dropdown | Dropdown with all 54 developers from AMBER_DATA.developers | M2 | ORIGINAL_REQUEST R2 |
| 4 | R2.2 8 Ad Placement Type Blocks | Type 1 (Main catalog banner 90k/mo), Type 2 (Side banner 8.5k/mo), Type 3 (Horizontal feed banner 35k/25k/15k), Type 4 (Recommended cards 3.5k/day), Type 5 (Native ads in tabs 70k/25k), Type 6 (Paid cards 15k/mo), Type 7 (Menu slider 1.5k/day), Type 8 (Premium package 150k/250k) | M2 | ORIGINAL_REQUEST R2 |
| 5 | R2.3 Visual Interactive Booking Calendars | Month/day grid with color-coded slots: green (free), red (booked by other), blue (booked by current) | M2 | ORIGINAL_REQUEST R2 |
| 6 | R2.4 Constraints & Pricing Engine | Type 4 (max 1 week, 1 month cooldown, max 3 cards), Type 2 (every-other-card rule), Type 3 (progressive 35k/25k/15k), Type 8 (150k/250k) | M2 | ORIGINAL_REQUEST R2 |
| 7 | R2.5 Placements LocalStorage Persistence | Budget totaling, active slot persistence in `amber_placements_dev_${devId}` and `amber_placements` | M2 | ORIGINAL_REQUEST R2 |
| 8 | R3.1 Analytics Tracking & Granular Storage | Storage under `amber_analytics_${entityType}_${entityId}` (`developer`, `property`, `banner`, `global`) | M3 | ORIGINAL_REQUEST R3 |
| 9 | R3.2 5-Stage Conversion Funnel | Catalog Impression → Card Expand → Tab Explore → CTA Click → Lead Submission | M3 | ORIGINAL_REQUEST R3 |
| 10 | R3.3 Tab Heatmap & CTA Analytics | Tracking opens across all 9 tabs and clicks on all 4 CTA types (availability, call, website, expert) | M3 | ORIGINAL_REQUEST R3 |
| 11 | R3.4 Demographics, Devices, Hourly & Traffic | City distribution, devices (mobile/desktop/tablet), 24h hourly distribution, traffic sources | M3 | ORIGINAL_REQUEST R3 |
| 12 | R3.5 Developer Summary Table & Seed Data | Impressions, leads, conversion %, budget spend, active placements, realistic seed demo data | M3 | ORIGINAL_REQUEST R3 |
| 13 | R4.1 Developer Cabinet Analytics Gating | Analytics locked with stub when < 5 paid cards; full interactive analytics when >= 5 paid cards | M4 | ORIGINAL_REQUEST R4 |
| 14 | R4.2 Developer Active Placements & Booking Modal | Tab with active placements, dates, remaining days countdown, expenses, and booking request modal | M4 | ORIGINAL_REQUEST R4 |
| 15 | R4.3 Developer Paid/Unpaid Card Badge & Warning | Visual paid badge; unpaid card warning: «Лиды по этой карточке обрабатываются командой Amber Avenue. Активируйте карточку за 15 000 ₽/мес для получения лидов в свой кабинет.» | M4 | ORIGINAL_REQUEST R4 |
| 16 | R5.1 Catalog Card Map Button Gating | Paid cards: active Yandex, Google, 2GIS buttons in location tab; Unpaid cards: map buttons hidden, text address only | M5 | ORIGINAL_REQUEST R5 |
| 17 | R5.2 Lead Routing & CRM Segmentation | Paid card leads: `developerId` + `ownedBy: 'developer'`; Unpaid card leads: `ownedBy: 'admin'` (routes to admin platform leads) | M5 | ORIGINAL_REQUEST R5 |
| 18 | R7.1 E2E Test Suite (Tiers 1-4) & 115 Regression | Full pass of existing 115 regression tests in `tests/run-all.js` + comprehensive new E2E tests for R1-R6 | M6 | ORIGINAL_REQUEST Acceptance Criteria |
| 19 | R7.2 White-Box Adversarial Hardening (Tier 5) | White-box stress testing of edge cases, zero console error guarantee, forensic audit sign-off | M6 | Quality & Audit Protocol |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Admin Cleanup & 6-Group Sidebar Restructure | R1 (Remove citizen requests across admin.html) + R6 (6-group navigation structure) | none | IN_PROGRESS |
| M2 | Placements Management & Visual Booking Calendar | R2 (Developer selector dropdown, 8 ad placement types, visual booking calendars, constraint validation, pricing calculations, localStorage persistence) | M1 | PLANNED |
| M3 | Detailed Behavior Analytics Engine & Admin Dashboard | R3 (Storage under amber_analytics_*, metrics tracking, 5-stage funnel, tab engagement heatmap, CTA clicks, demographics, devices, hourly activity, traffic sources, developer summary table, demo seed data) | M1, M2 | PLANNED |
| M4 | Developer Cabinet Modernization & Access Gating | R4 (Analytics gating behind 5+ paid cards, active placements tab with countdown & spending, request modal, paid/unpaid card badges and warning notice) | M2, M3 | PLANNED |
| M5 | Catalog Core Card Behavior & Leads Routing | R5 (Location tab map button gating for paid/unpaid cards, lead routing with ownedBy: 'developer' vs ownedBy: 'admin', admin platform leads integration) | M2, M3, M4 | PLANNED |
| M6 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Pass 100% of existing 115 tests + new E2E test suite (Tiers 1-4) + Tier 5 adversarial hardening + Forensic Audit verification | M1, M2, M3, M4, M5 | PLANNED |

---

## Interface Contracts

### 1. Placements Management & Persistence Contract
- **Storage Keys**:
  - `amber_placements_dev_${developerId}`: per-developer configuration object
  - `amber_placements`: global registry array of active bookings across all developers
  - `amber_paid_cards`: array of property IDs `[zhkId1, zhkId2, ...]`
  - `amber_placement_requests`: queue of requests submitted from `cabinet.html`
- **Developer Placements Object Structure**:
```json
{
  "developerId": "dev-rascvet",
  "developerName": "ГК «Расцвет»",
  "updatedAt": "2026-08-19T14:00:00.000Z",
  "type1_main_banner": {
    "active": true,
    "pages": ["kaliningrad"],
    "bookedMonths": ["2026-09", "2026-10"],
    "monthlyPrice": 90000,
    "totalCost": 180000
  },
  "type2_side_banner": {
    "active": true,
    "selectedZhkIds": ["zhk-amber-seven"],
    "feedPositions": [2, 4],
    "bookedMonths": ["2026-09"],
    "monthlyPrice": 8500,
    "totalCost": 17000
  },
  "type3_horizontal_feed": {
    "active": true,
    "slots": [5, 10],
    "bookedMonths": ["2026-09"],
    "totalCost": 60000
  },
  "type4_recommended": {
    "active": true,
    "selectedZhkIds": ["zhk-amber-seven", "zhk-balt-sky"],
    "bookedDays": ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"],
    "dailyPrice": 3500,
    "totalCost": 49000
  },
  "type5_native_ads": {
    "active": true,
    "tier1Tabs": ["prices", "location"],
    "tier2Tabs": ["infra"],
    "bookedMonths": ["2026-09"],
    "totalCost": 165000
  },
  "type6_paid_cards": {
    "active": true,
    "selectedZhkIds": ["zhk-amber-seven", "zhk-balt-sky", "zhk-nord-haus", "zhk-rybnoe", "zhk-zelenogradsk-park"],
    "bookedMonths": ["2026-09"],
    "cardPrice": 15000,
    "totalCost": 75000
  },
  "type7_menu_slider": {
    "active": false,
    "bookedDays": [],
    "dailyPrice": 1500,
    "totalCost": 0
  },
  "type8_premium": {
    "active": false,
    "monthsCount": 0,
    "selectedZhkIds": [],
    "mainBannerPage": null,
    "totalCost": 0
  },
  "summary": {
    "totalMonthly": 546000,
    "totalSpend": 546000,
    "activePlacementsCount": 6
  }
}
```

### 2. Analytics Engine & Storage Contract
- **Storage Keys**:
  - `amber_analytics_developer_${developerId}`
  - `amber_analytics_property_${zhkId}`
  - `amber_analytics_banner_${bannerId}`
  - `amber_analytics_global`
- **Analytics Event Structure**:
```json
{
  "id": "evt-1724068800000-1234",
  "event": "tab_open", // "view" | "tab_open" | "cta_click" | "dwell" | "lead_submit" | "banner_click"
  "entityType": "property", // "property" | "developer" | "banner" | "page"
  "entityId": "zhk-amber-seven",
  "developerId": "dev-rascvet",
  "tabKey": "location", // "prices" | "mortgage" | "location" | "infra" | "chars" | "docs" | "warranty" | "dev" | "pros"
  "ctaType": "availability", // "availability" | "call" | "website" | "expert"
  "dwellSeconds": 42,
  "geoCity": "Калининград",
  "device": "desktop", // "mobile" | "desktop" | "tablet"
  "hour": 14,
  "trafficSource": "direct", // "direct" | "organic_search" | "cpc_ads" | "social" | "referral"
  "timestamp": 1724068800000,
  "date": "2026-08-19"
}
```

### 3. CRM & Lead Routing Contract
- **Storage Key**: `amber_leads`
- **Lead Object Structure**:
```json
{
  "id": "L-1724068800000-123",
  "date": "19.08.2026, 14:00:00",
  "source": "Карточка ЖК: ЖК «Seven»",
  "name": "Иван Петров",
  "phone": "+7 (999) 123-45-67",
  "email": "ivan@example.com",
  "city": "Калининград",
  "details": "Узнать наличие квартир в ЖК «Seven»",
  "zhkId": "zhk-amber-seven",
  "zhkName": "ЖК «Seven»",
  "developerId": "dev-rascvet", // populated if paid, null if unpaid
  "developerName": "ГК «Расцвет»",
  "ownedBy": "developer", // "developer" for paid cards, "admin" for unpaid cards
  "isPaidLead": true,
  "status": "new"
}
```

---

## Code Layout
- `admin.html`: Super-admin application (18+ sections, light modern theme, visual calendars, analytics charts)
- `cabinet.html`: Developer B2B cabinet (18 tabs, gating logic, active placements tab)
- `app.js`: Public catalog engine (feed rendering, location tab gating, lead dispatcher)
- `analytics.js`: Public & admin analytics tracking engine & demo seed generator
- `data.js`: Central data source (`AMBER_DATA`)
- `properties-data.js`: Property objects list (`PROPERTIES`)
- `tests/run-all.js`: Master test runner
- `tests/harness/dom-sandbox.js`: DOM execution sandbox
- `tests/tier1-feature-coverage.test.js`: Feature coverage suite
- `tests/tier2-boundary-corner.test.js`: Boundary & corner cases suite
- `tests/tier3-cross-feature.test.js`: Cross-feature interaction suite
- `tests/tier4-application-scenarios.test.js`: Real-world scenario suite
- `tests/tier5-adversarial-hardening.test.js`: Adversarial stress tests
