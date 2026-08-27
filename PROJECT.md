# Project: Amber Avenue Admin Panel Overhaul (admin.html)

## Architecture
- **Single Page Application (SPA)**: `admin.html` with vanilla JavaScript, CSS custom properties, zero backend dependencies.
- **Storage Layer**: `localStorage` data store synchronized across `admin.html`, `cabinet.html`, and `analytics.js`.
- **UI System**: Responsive dark/light theme, modern card grid layouts (`.my-zhk-cards-grid`), interactive visual steppers, floating selection toolbars, collapsible info banners, modals, and toast alerts.
- **Interoperability**: Two-way data contracts with Developer Cabinet (`cabinet.html`) for moderation statuses, 9-section remarks, ad requests, 1-day expiry notifications, support tickets, and leads locking.

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| F-01 | Dashboard 3-Tier Layout | Restructure `section-dashboard` into Top KPIs, 2-Column Center, Quick Actions Footer | M1 | DONE |
| F-02 | Top-3 KPI Summaries | Micro-summaries under KPI cards for top pages, search queries, and UTM traffic sources | M1 | DONE |
| F-03 | Incoming Leads Tagged Feed | Feed of last 10–15 leads with Source Page, ZHK, Form CTA, and UTM tags | M1 | DONE |
| F-04 | Paid Leads Visual Guard | Green/amber tint, lock icon 🔒, tooltip, and disabled buttons on paid leads | M1 | DONE |
| F-05 | Moderation Counter Widget | Live badge counter of pending ZHK reviews with link to properties section | M1 | DONE |
| F-06 | Developer Notifs & Expiry | Feed of ad/service requests + 1-day placement expiry warnings | M1 | DONE |
| F-07 | Support Tickets Feed | Feed of recent developer inquiries from `amber_tickets_*` | M1 | DONE |
| F-08 | Audit Change Logs Widget | Compact counter showing new audit changes with link to audit log | M1 | DONE |
| F-09 | Properties/Mod Menu Unification | Merge sidebar menu into single «Новостройки (ЖК)» item, remove «Модерация ЖК» | M2 | DONE |
| F-10 | ZHK Card Grid Architecture | Replace table with responsive card grid matching cabinet's `tab-my-zhk` | M2 | DONE |
| F-11 | ZHK Card Action Buttons | 3 buttons per card: Edit (modal), Approve (publish), Needs Correction (remarks) | M2 | DONE |
| F-12 | Two-Block Properties Layout | Top block for «На модерации» with 9 sections; Bottom block for «Все ЖК» | M2 | DONE |
| F-13 | 9-Section Accordion Remarks | Full 9-section diff and comment fields sent to `amber_moderation_{zhkId}` | M2 | DONE |
| F-14 | Developer Code Regeneration | Button «🔄 Сменить код» generates new 6-digit random access code | M2 | DONE |
| F-15 | Copy Access Code Modal | Modal showing new code with one-click clipboard copy button | M2 | DONE |
| F-16 | Auto-Calculated Dev Rating | Developer rating calculated as mean of all its ZHK indexes + tooltip formula | M2 | DONE |
| F-17 | Telegraph-Style Full Editor | Embedded full-screen contentEditable panel replacing modal WYSIWYG | M3 | DONE |
| F-18 | Floating Formatting Toolbar | Toolbar appearing on text selection (Bold, Italic, H2, H3, Link, Quote) | M3 | DONE |
| F-19 | Telegraph Block Elements | Title, Subtitle, Paragraphs, Images, Blockquotes, Lists, and Header Cover Upload | M3 | DONE |
| F-20 | Blog Action Controls | Publish, Save Draft, Preview buttons with persistence in `amber_articles` | M3 | DONE |
| F-21 | Payment Status Stepper | 4-step horizontal clickable stepper: Новый → Частичная → Оплачен → Просрочен | M3 | DONE |
| F-22 | Expanded Placements Comments | Textarea for special conditions expanded to min 120px height | M3 | DONE |
| F-23 | 3-Step Ad Booking Flow | Step 1 Developer -> Step 2 ZHK Checkboxes -> Step 3 Calendar Booking | M3 | DONE |
| F-24 | 1-Day Expiry Notification Hub | Auto-creates notification in dashboard and cabinet store upon 1-day expiry | M3 | DONE |
| F-25 | Unified Leads Menu & Section | Single «Лиды» section replacing platform-leads and amber-leads | M4 | DONE |
| F-26 | Collapsible Leads Info Banner | Informational banner explaining leads, filters, CSV, and card unlocking | M4 | DONE |
| F-27 | Leads 3-Way Filter Tabs | Filter tabs: «Все лиды», «Лиды платформы», «Лиды застройщиков» | M4 | DONE |
| F-28 | Leads Paid Visual Guard & Tags | Paid row highlights, lock icon, disabled actions, and 4 tag chips | M4 | DONE |
| F-29 | Leads CSV & 152-FZ Passport | Preserved UTF-8 BOM CSV export, unlock requests, and 152-FZ consent data card | M4 | DONE |
| F-30 | 8-Block Statistics Dashboard | 8 analytical blocks: KPIs, Pages, Traffic, Queries, Geo, Banners, Funnel, Metrika | M4 | DONE |
| F-31 | Yandex Metrika Storage & UI | API Key input field in `localStorage.amber_metrika_key` + UI placeholder | M4 | DONE |
| F-32 | Navigation & Sidebar Reorg | 6-group sidebar hierarchy; hidden Experts section; CRM merged into Leads | M4 | DONE |
| F-33 | Backgrounds Controls Verified | Verified Save, Reset, Preview, and Upload buttons in `section-pages` | M4 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dashboard Overhaul (R1) | F-01 to F-08: 3-tier layout, KPI summaries, 2-column center widgets, quick actions | none | DONE |
| M2 | Properties & Developers (R2 + R3) | F-09 to F-16: Card grid view, 3 action buttons, 9-section remarks, dev code modal, average rating | none | DONE |
| M3 | Blog & Placements (R4 + R5) | F-17 to F-24: Telegraph blog editor, floating toolbar; 4-step stepper, 120px comments, 3-step ad booking, 1-day expiry alerts | none | DONE |
| M4 | Leads, Stats & Navigation (R6 + R7 + R8) | F-25 to F-33: Unified leads section, 3 tabs, locked paid leads; 8-block stats; 6-group sidebar, background controls | M1, M2, M3 | DONE |
| M-E2E | E2E Test Suite Creation | Dual-track comprehensive test harness & test suite (Tiers 1-4, 381 test assertions) | none | DONE |
| M-FINAL | Final Verification & Hardening | Pass 100% E2E test suite (521/521 tests) + Tier 5 Adversarial Hardening + Forensic Integrity Audit | M1, M2, M3, M4, M-E2E | DONE |

## Code Layout
- `admin.html`: Main admin interface (Styles `<style>`, Markup `<section class="admin-section">`, Scripts `<script>`).
- `cabinet.html`: Developer cabinet interface for reference and integration verification.
- `analytics.js`: Event tracking and local analytics aggregator.
- `data.js`: Base catalog seed data (`AMBER_DATA`).
- `tests/`: Automated test suite for testing `admin.html` and cross-app contracts (521 tests).
