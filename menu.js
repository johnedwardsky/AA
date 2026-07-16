/* ============================================================
   AMBER AVENUE — UNIFIED RESPONSIVE MENU SYSTEM
   Dynamically injects styles, header markup, mega-menu overlay, 
   and mobile drawer into any page.
   ============================================================ */

(function() {
  'use strict';

  // 1. Inject Menu Styles into Head
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* ── SEARCH SUGGESTIONS DROPDOWN ────────────────────── */
    .search-suggestions-dropdown {
      position: absolute !important; top: 100% !important; left: 0 !important; right: 0 !important;
      background: var(--color-surface, #fff) !important;
      border: 1px solid var(--color-border, #e0e0e0) !important;
      border-radius: 8px !important; margin-top: 5px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      max-height: 280px !important; overflow-y: auto !important;
      z-index: 1000 !important; display: none;
    }
    .search-suggestions-dropdown.active { display: block !important; }
    .suggestion-group-title {
      font-size: 10px !important; font-weight: 700 !important; color: var(--color-muted, #888) !important;
      text-transform: uppercase !important; letter-spacing: 0.05em !important;
      padding: 8px 12px 4px 12px !important; border-bottom: 1px solid rgba(0,0,0,0.04) !important;
    }
    .suggestion-item {
      display: flex !important; align-items: center !important; gap: 10px !important;
      padding: 10px 12px !important; font-size: 13px !important; color: var(--color-text, #333) !important;
      cursor: pointer !important; transition: background 0.15s ease !important;
      text-align: left !important;
    }
    .suggestion-item:hover { background: rgba(0,0,0,0.04) !important; }
    .suggestion-icon { font-size: 14px !important; flex-shrink: 0 !important; }
    .suggestion-info { display: flex !important; flex-direction: column !important; min-width: 0 !important; }
    .suggestion-title { font-weight: 600 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
    .suggestion-subtitle { font-size: 10.5px !important; color: var(--color-muted, #888) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

    /* ── HEADER BASE ─ only styling, stickiness handled by .site-header-wrapper ── */
    .site-header, .aa-hdr {
      z-index: 200;
      background: #142d56 !important;
      box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.15) !important;
    }
    .header-inner, .aa-hdr-in {
      max-width: var(--feed-max-width, 960px) !important; margin: 0 auto !important;
      padding: 0 16px !important; height: 56px !important;
      display: flex !important; align-items: center !important; gap: 20px !important;
    }

    /* ── LOGO ─────────────────────────────────────────────── */
    .logo, .aa-logo {
      display: flex !important; align-items: center !important; gap: 10px !important;
      flex-shrink: 0 !important; text-decoration: none !important; color: #fff !important;
    }
    .logo-icon, .aa-logo-ic {
      width: 38px !important; height: 38px !important; background: #F5A623 !important;
      border-radius: 9px !important; display: flex !important; align-items: center !important;
      justify-content: center !important; font-size: 19px !important; font-weight: 800 !important;
      color: #1B3C6E !important; flex-shrink: 0 !important; overflow: hidden !important;
    }
    .logo-icon img, .aa-logo-ic img { width: 100% !important; height: 100% !important; object-fit: contain !important; }
    .logo-text, .aa-logo-tx { display: flex !important; flex-direction: column !important; line-height: 1.25 !important; }
    .logo-name, .aa-logo-name { font-size: 14px !important; font-weight: 700 !important; color: #fff !important; white-space: nowrap !important; }
    .logo-tagline, .aa-logo-tag { font-size: 8.5px !important; color: rgba(255,255,255,0.45) !important; letter-spacing: 0.08em !important; font-weight: 500 !important; text-transform: uppercase !important; }

    /* ── SEARCH (stretches full center) ─────────────────── */
    .header-search, .aa-srch {
      flex: 1 !important; position: relative !important; min-width: 0 !important;
    }
    .header-search input, .aa-srch input {
      width: 100% !important; height: 36px !important;
      background: rgba(255,255,255,0.09) !important;
      border: 1px solid rgba(255,255,255,0.14) !important;
      border-radius: 8px !important; padding: 0 16px 0 38px !important;
      color: #fff !important; font-family: inherit !important; font-size: 13px !important;
      outline: none !important; transition: background 0.18s ease, border-color 0.18s ease !important;
    }
    .header-search input::placeholder, .aa-srch input::placeholder { color: rgba(255,255,255,0.38) !important; }
    .header-search input:focus, .aa-srch input:focus {
      background: rgba(255,255,255,0.14) !important; border-color: rgba(255,255,255,0.3) !important;
    }
    .search-icon, .aa-srch-ic {
      position: absolute !important; left: 12px !important; top: 50% !important; transform: translateY(-50%) !important;
      color: rgba(255,255,255,0.5) !important; pointer-events: none !important; z-index: 1 !important;
    }
    /* Search submit button (inside field, right side) */
    .header-search-btn, .aa-srch-btn {
      position: absolute !important; right: 5px !important; top: 50% !important; transform: translateY(-50%) !important;
      height: 26px !important; padding: 0 10px !important; border-radius: 6px !important;
      background: transparent !important; color: rgba(255,255,255,0.6) !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important;
      white-space: nowrap !important; transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease !important; z-index: 1 !important;
    }
    .header-search-btn:hover, .aa-srch-btn:hover {
      background: rgba(255,255,255,0.1) !important;
      color: rgba(255,255,255,0.9) !important;
      border-color: rgba(255,255,255,0.35) !important;
    }
    /* Adjust input padding to make room for button */
    .header-search input.has-btn, .aa-srch input.has-btn {
      padding-right: 72px !important;
    }

    /* ── RIGHT ACTIONS ────────────────────────────────────── */
    .header-actions, .aa-acts {
      display: flex !important; align-items: center !important;
      gap: 8px !important; flex-shrink: 0 !important;
    }

    /* Консультация — solid amber */
    .btn-header-accent, .aa-btn-a {
      height: 36px !important; padding: 0 18px !important; border-radius: 8px !important;
      background: #F5A623 !important; color: #1a3560 !important; border: none !important;
      font-size: 12.5px !important; font-weight: 700 !important; white-space: nowrap !important;
      cursor: pointer !important; transition: background 0.18s ease !important;
      display: flex !important; align-items: center !important;
    }
    .btn-header-accent:hover, .aa-btn-a:hover { background: #e09818 !important; }

    /* Ghost button (hidden desktop fallback) */
    .btn-header-ghost, .aa-btn-g {
      height: 36px !important; padding: 0 14px !important; border-radius: 8px !important;
      color: rgba(255,255,255,0.8) !important; border: 1px solid rgba(255,255,255,0.18) !important;
      background: transparent !important; font-size: 12px !important; font-weight: 600 !important;
      cursor: pointer !important; white-space: nowrap !important;
      display: flex !important; align-items: center !important; transition: all 0.18s ease !important;
    }
    .btn-header-ghost:hover, .aa-btn-g:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; }

    /* ≡ МЕНЮ button — outlined, compact */
    .burger-btn, .aa-burg {
      height: 36px !important; padding: 0 14px !important; border-radius: 8px !important;
      border: 1px solid rgba(255,255,255,0.22) !important;
      background: transparent !important;
      display: flex !important; align-items: center !important; gap: 9px !important;
      color: #fff !important; cursor: pointer !important; transition: all 0.18s ease !important;
      font-size: 11px !important; font-weight: 700 !important; letter-spacing: 0.1em !important;
      flex-shrink: 0 !important; white-space: nowrap !important;
    }
    .burger-btn:hover, .aa-burg:hover {
      background: rgba(255,255,255,0.09) !important;
      border-color: rgba(255,255,255,0.38) !important;
    }
    .aa-burg-lines {
      display: flex !important; flex-direction: column !important; gap: 4px !important;
      align-items: center !important; justify-content: center !important; width: 14px !important;
    }
    .burger-line, .aa-burg-l {
      width: 14px !important; height: 1.5px !important; background: #fff !important;
      border-radius: 1px !important; transition: 0.2s ease !important; transform-origin: center !important; display: block !important;
    }
    .burger-btn.open .aa-burg-l:nth-child(1) { transform: translateY(5.5px) rotate(45deg) !important; }
    .burger-btn.open .aa-burg-l:nth-child(2) { opacity: 0 !important; transform: scaleX(0) !important; }
    .burger-btn.open .aa-burg-l:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg) !important; }

    /* ── MOBILE RESPONSIVENESS ────────────────────────────── */
    @media (max-width: 900px) {
      .header-actions, .aa-acts { display: none !important; }
      .aa-burg-txt { display: none !important; }
      .burger-btn, .aa-burg {
        padding: 0 !important;
        width: 24px !important;
        height: 24px !important;
        justify-content: center !important;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      .aa-burg-lines {
        width: 20px !important;
        gap: 5px !important;
      }
      .burger-line, .aa-burg-l {
        width: 20px !important;
        height: 2px !important;
        background: #fff !important;
      }
      /* Clean transitions for borderless open state */
      .burger-btn.open .aa-burg-l:nth-child(1) { transform: translateY(7px) rotate(45deg) !important; }
      .burger-btn.open .aa-burg-l:nth-child(2) { opacity: 0 !important; transform: scaleX(0) !important; }
      .burger-btn.open .aa-burg-l:nth-child(3) { transform: translateY(-7px) rotate(-45deg) !important; }
      
      .header-inner, .aa-hdr-in { gap: 16px !important; padding: 0 16px !important; }
      .header-search, .aa-srch { flex: 1 !important; display: block !important; }
      
      /* Dropdown responsive rules: drawer is shown ONLY by .open class added by JS.
         Do NOT set display:flex here unconditionally — it causes the closed drawer
         (transform:translateY(-100%)) to visually overlap the site header. */
      .mb-srch { display: none !important; }
    }
    @media (max-width: 480px) {
      .logo-tagline, .aa-logo-tag { display: none !important; }
      .logo-text, .aa-logo-tx { display: none !important; }
      .header-inner, .aa-hdr-in { gap: 8px !important; padding: 0 12px !important; }
    }

    /* ── MEGA MENU PANEL ────────────────────────────────── */
    .mg-ov {
      position: fixed;
      top: var(--sticky-top, 56px); /* overlay starts below nav bar */
      left: 0; right: 0; bottom: 0;
      z-index: 199;
      background: rgba(12,22,44,0.45); backdrop-filter: blur(2px);
      opacity: 0; pointer-events: none; transition: opacity 0.28s ease;
    }
    .mg-ov.open { opacity: 1; pointer-events: all; }

    .mg-panel {
      position: fixed; top: var(--sticky-top, 56px); left: 50%;
      transform: translateX(-50%) translateY(-12px);
      z-index: 201; width: min(1160px, calc(100vw - 40px));
      background: #FFFFFF; border-radius: 0 0 18px 18px;
      box-shadow: 0 24px 64px rgba(18,42,82,0.18), 0 4px 16px rgba(18,42,82,0.10); overflow: hidden;
      opacity: 0; pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s ease;
    }
    .mg-panel.open {
      opacity: 1; pointer-events: all;
      transform: translateX(-50%) translateY(0);
    }

    .mg-body {
      display: grid; grid-template-columns: 224px 1fr 272px;
      max-height: calc(100vh - 80px); overflow: hidden;
    }

    /* Left column megamenu */
    .mg-left {
      background: #F8FAFD;
      border-right: 1px solid #F3F4F6;
      padding: 20px 0; overflow-y: auto; scrollbar-width: thin;
    }
    .mg-sec { padding: 0 16px; margin-bottom: 14px; }
    .mg-lbl {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #9CA3AF; padding: 0 8px; margin-bottom: 4px;
    }
    .mg-lnk {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 8px; border-radius: 8px;
      font-size: 12px; font-weight: 500; color: #1A1A2E;
      text-decoration: none; transition: background 0.18s, color 0.18s;
      margin-bottom: 1px; cursor: pointer;
    }
    .mg-lnk:hover { background: #EEF3FB; color: #1B3C6E; }
    .mg-lnk.active { background: #EEF3FB; color: #1B3C6E; font-weight: 600; }
    .mg-lnk-ic {
      width: 28px; height: 28px; border-radius: 7px;
      background: #EEF3FB; display: flex; align-items: center;
      justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .mg-lnk:hover .mg-lnk-ic { background: rgba(27,60,110,0.12); }
    .mg-chev { margin-left: auto; color: #9CA3AF; transition: transform 0.2s; }
    .mg-lnk.hs.exp .mg-chev { transform: rotate(90deg); }

    .mg-sub { overflow: hidden; max-height: 0; transition: max-height 0.3s ease; }
    .mg-sub.exp { max-height: 200px; }
    .mg-sub-l {
      display: block; padding: 6px 8px 6px 45px;
      font-size: 11px; color: #4B5563; border-radius: 6px;
      text-decoration: none; transition: background 0.15s, color 0.15s;
      margin-bottom: 1px;
    }
    .mg-sub-l:hover { background: #EEF3FB; color: #1B3C6E; }

    .mg-div { height: 1px; background: #F3F4F6; margin: 8px 16px 12px; }

    .mg-obr {
      margin: 0 16px; background: #EEF3FB;
      border-radius: 10px; padding: 10px 12px;
      display: flex; align-items: flex-start; gap: 10px;
      cursor: pointer; transition: background 0.18s;
    }
    .mg-obr:hover { background: rgba(27,60,110,0.12); }
    .mg-obr-t { font-size: 12px; font-weight: 600; color: #1A1A2E; line-height: 1.3; }
    .mg-obr-d { font-size: 10px; color: #4B5563; margin-top: 2px; line-height: 1.3; }

    /* Center column megamenu */
    .mg-ctr { padding: 20px 20px 0; overflow-y: auto; scrollbar-width: thin; }
    .mg-ctr-top-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 24px; margin-bottom: 16px;
    }
    .mg-useful-section {
      margin-bottom: 20px; padding-top: 10px;
      border-top: 1px solid #F3F4F6;
    }
    .mg-useful-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
    }
    .mg-col-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF; margin-bottom: 8px; padding-left: 8px; }

    .mg-cat-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px 8px 8px; border-radius: 8px; cursor: pointer;
      transition: background 0.18s; text-decoration: none; color: inherit;
      margin-bottom: 1px;
    }
    .mg-cat-row:hover { background: #EEF3FB; }
    .mg-cat-nm { font-size: 13px; font-weight: 500; color: #1A1A2E; }
    .mg-cat-cnt {
      font-size: 11px; font-weight: 600; color: #9CA3AF;
      background: #F3F4F6; padding: 2px 8px; border-radius: 20px;
    }

    .mg-reg-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 10px 7px 8px; border-radius: 8px; cursor: pointer;
      transition: background 0.18s; text-decoration: none; color: inherit;
      margin-bottom: 1px;
    }
    .mg-reg-row:hover { background: #EEF3FB; }
    .mg-reg-nm { font-size: 12px; font-weight: 500; color: #1A1A2E; }
    .mg-reg-cnt { font-size: 11px; color: #9CA3AF; }

    .mg-all {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 600; color: #1B3C6E;
      text-decoration: none; margin-bottom: 16px; padding: 4px 8px;
      transition: color 0.15s;
    }
    .mg-all:hover { color: #F5A623; }

    /* Banner Slider */
    .mg-bs {
      position: relative; border-radius: 14px; overflow: hidden;
      height: 180px; background: #122a52; margin-bottom: 20px;
    }
    .mg-bs-tr {
      display: flex; height: 100%;
      transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
    }
    .mg-bs-sl { flex: 0 0 100%; position: relative; overflow: hidden; }
    .mg-bs-sl img { width: 100%; height: 100%; object-fit: cover; }
    .mg-bs-ov {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(10,20,40,0.80) 0%, rgba(10,20,40,0.20) 60%);
      padding: 16px 18px; display: flex; flex-direction: column; justify-content: flex-end;
    }
    .mg-bs-lbl {
      font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: #F5A623; background: rgba(245,166,35,0.15); padding: 2px 7px;
      border-radius: 4px; width: fit-content; margin-bottom: 5px;
    }
    .mg-bs-ti { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 3px; }
    .mg-bs-lo { font-size: 10px; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
    .mg-bs-pr { font-size: 14px; font-weight: 800; color: #F5A623; margin-bottom: 10px; }
    .mg-bs-btn {
      display: inline-block; padding: 7px 16px;
      background: #F5A623; color: #122a52;
      border-radius: 7px; font-size: 11px; font-weight: 700;
      width: fit-content; transition: 0.22s; text-decoration: none;
    }
    .mg-bs-btn:hover { background: #e0911a; }
    .mg-bs-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,0.18); backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 2; transition: background 0.2s;
    }
    .mg-bs-nav:hover { background: rgba(255,255,255,0.32); }
    .mg-bs-pv { left: 8px; } .mg-bs-nx { right: 8px; }
    .mg-bs-dots {
      position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 5px; z-index: 2;
    }
    .mg-bs-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.35); border: none;
      cursor: pointer; padding: 0; transition: background 0.2s, transform 0.2s;
    }
    .mg-bs-dot.on { background: #F5A623; transform: scale(1.3); }

    /* Right column megamenu */
    .mg-right { border-left: 1px solid #F3F4F6; padding: 20px 16px 0; overflow-y: auto; scrollbar-width: thin; }
    .mg-dv-row {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 8px; border-radius: 8px;
      cursor: pointer; transition: background 0.18s;
      text-decoration: none; color: inherit; margin-bottom: 2px;
    }
    .mg-dv-row:hover { background: #EEF3FB; }
    .mg-dv-rk {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800; flex-shrink: 0;
      background: #EEF3FB; color: #1B3C6E;
    }
    .mg-dv-rk.t1 { background: #F5A623; color: #122a52; }
    .mg-dv-nm { font-size: 12px; font-weight: 500; color: #1A1A2E; flex: 1; min-width: 0; line-height: 1.3; }
    .mg-dv-rt { display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: #1A1A2E; flex-shrink: 0; }
    .mg-dv-st { color: #F5A623; font-size: 11px; }

    /* News */
    .mg-news-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .mg-news-row {
      display: block; padding: 8px; border-radius: 8px;
      transition: background 0.18s; text-decoration: none; color: inherit;
      margin-bottom: 2px;
    }
    .mg-news-row:hover { background: #EEF3FB; }
    .mg-news-meta { display: flex; gap: 8px; font-size: 9px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 4px; }
    .mg-news-tag { color: #1B3C6E; }
    .mg-news-title { font-size: 11.5px; font-weight: 600; color: #1A1A2E; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    /* Trust bar */
    .mg-trust {
      border-top: 1px solid #F3F4F6; padding: 10px 20px;
      display: grid; grid-template-columns: repeat(4, 1fr);
      background: #FAFBFD;
    }
    .mg-trust-it {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; border-right: 1px solid #F3F4F6;
    }
    .mg-trust-it:last-child { border-right: none; }
    .mg-trust-ic { font-size: 16px; flex-shrink: 0; }
    .mg-trust-t { font-size: 11px; font-weight: 600; color: #1A1A2E; line-height: 1.3; }
    .mg-trust-s { font-size: 9px; color: #9CA3AF; line-height: 1.3; }

    .mg-hint {
      text-align: center; padding: 6px; font-size: 9px; color: #9CA3AF;
      border-top: 1px solid #F3F4F6; background: #FFFFFF;
    }

    /* ── MOBILE DRAWER ───────────────────────────────────── */
    .mb-ov {
      display: none;
      position: fixed; inset: 0; z-index: 198;
      background: rgba(12,22,44,0.45); backdrop-filter: blur(2px);
      opacity: 0; pointer-events: none; transition: opacity 0.35s ease;
    }
    .mb-ov.open { display: block !important; opacity: 1; pointer-events: all; }
    .mb-dr {
      /* Hidden by default — shown ONLY when JS adds class .open */
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0;
      width: 100%;
      max-height: 100vh;
      z-index: 210;
      background: #FFFFFF;
      flex-direction: column;
      overflow-y: auto;
      box-shadow: 0 16px 32px rgba(0,0,0,0.15);
      /* Slide-in animation */
      transform: translateY(-8px);
      opacity: 0;
      transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mb-dr.open {
      display: flex !important;
      transform: translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    .mb-hdr {
      display: flex; align-items: center; gap: 10px;
      padding: 0 16px; height: 60px; background: #1B3C6E; flex-shrink: 0;
    }
    .mb-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; flex: 1; }
    .mb-logo-ic {
      width: 32px; height: 32px; background: #F5A623;
      border-radius: 7px; display: flex; align-items: center;
      justify-content: center; overflow: hidden; flex-shrink: 0;
    }
    .mb-logo-ic img { width: 100% !important; height: 100% !important; object-fit: contain !important; }
    .mb-logo-nm { font-size: 14px; font-weight: 700; color: #fff; }
    .mb-logo-tg { font-size: 8px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.06em; }
    .mb-cls {
      width: 34px; height: 34px; display: flex; align-items: center;
      justify-content: center; border-radius: 8px;
      color: rgba(255,255,255,0.75); font-size: 16px; transition: 0.22s; flex-shrink: 0;
      border: none; background: transparent;
    }
    .mb-cls:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .mb-srch { padding: 10px 16px; background: #122a52; flex-shrink: 0; }
    .mb-srch-w { position: relative; }
    .mb-srch-w input {
      width: 100%; height: 38px;
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px; padding: 0 14px 0 38px;
      color: #fff; font-family: inherit; font-size: 13px; outline: none;
    }
    .mb-srch-w input::placeholder { color: rgba(255,255,255,0.45); }
    .mb-srch-ic {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: rgba(255,255,255,0.45); pointer-events: none;
    }

    .mb-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 0 16px; }

    .mb-ni {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; font-size: 14px; font-weight: 500; color: #1A1A2E;
      border-bottom: 1px solid #F3F4F6; cursor: pointer;
      text-decoration: none; transition: background 0.15s;
    }
    .mb-ni:hover { background: #EEF3FB; }
    .mb-ni-ic {
      width: 32px; height: 32px; border-radius: 8px;
      background: #EEF3FB; display: flex; align-items: center;
      justify-content: center; font-size: 15px; flex-shrink: 0;
    }
    .mb-ni-lb { flex: 1; }
    .mb-ni-ch { color: #9CA3AF; font-size: 12px; transition: transform 0.22s; }
    .mb-ni.exp .mb-ni-ch { transform: rotate(90deg); }

    .mb-sub { overflow: hidden; max-height: 0; transition: max-height 0.3s ease; background: #F8FAFD; }
    .mb-sub.exp { max-height: 300px; }
    .mb-sub-l {
      display: block; padding: 12px 16px 12px 60px;
      font-size: 14px; color: #4B5563;
      text-decoration: none; transition: color 0.15s;
    }
    .mb-sub-l:hover { color: #1B3C6E; }

    .mb-sec-lbl {
      padding: 14px 16px 6px; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF;
    }
    .mb-div { height: 1px; background: #F3F4F6; margin: 8px 0 0; }

    .mb-use-tg {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #F3F4F6;
      cursor: pointer; background: #FFFFFF; transition: background 0.15s;
    }
    .mb-use-tg:hover { background: #EEF3FB; }
    .mb-use-t { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9CA3AF; }
    .mb-use-ch { font-size: 12px; color: #9CA3AF; transition: transform 0.22s; }
    .mb-use-tg.exp .mb-use-ch { transform: rotate(180deg); }
    .mb-use-cnt { overflow: hidden; max-height: 0; transition: max-height 0.3s ease; background: #F8FAFD; }
    .mb-use-cnt.exp { max-height: 500px; }

    .mb-ct-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-bottom: 1px solid #F3F4F6;
      font-size: 13px; color: #1A1A2E;
      text-decoration: none; transition: background 0.15s;
    }
    .mb-ct-row:hover { background: #EEF3FB; }
    .mb-ct-ic { color: #1B3C6E; font-size: 14px; }
    .mb-ct-ph { font-weight: 700; font-size: 14px; }

    /* CTA Consultation Mobile */
    .mb-cta {
      margin: 14px 16px 0; padding: 13px 18px;
      background: linear-gradient(135deg, #1B3C6E, #2a5298);
      border-radius: 12px; display: flex; align-items: center;
      justify-content: space-between; gap: 10px;
      cursor: pointer; text-decoration: none; transition: box-shadow 0.2s;
    }
    .mb-cta:hover { box-shadow: 0 8px 24px rgba(27,60,110,0.25); }
    .mb-cta-t { font-size: 13px; font-weight: 700; color: #fff; line-height: 1.3; }
    .mb-cta-s { font-size: 10px; color: rgba(255,255,255,0.65); margin-top: 2px; }
    .mb-cta-b {
      padding: 8px 14px; background: #F5A623; color: #122a52;
      border-radius: 8px; font-size: 11px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0;
    }

    /* Responsive drawer triggers */
    @media (max-width: 900px) {
      .mg-ov, .mg-panel { display: none !important; }
    }
    /* On desktop, force hide mobile drawer even if .open was left on */
    @media (min-width: 901px) {
      .mb-ov, .mb-dr { display: none !important; }
    }

    /* Toast styles */
    .aa-tc { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
    .aa-t {
      background: #1B3C6E; color: #fff; padding: 12px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transform: translateY(12px); opacity: 0; transition: all 0.3s ease;
    }
    .aa-t.show { transform: translateY(0); opacity: 1; }

    /* === Consultation Modal Styles === */
    .cm-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(14, 31, 61, 0.55);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .cm-overlay.open { opacity: 1; pointer-events: all; }
    
    .cm-card {
      width: 90%; max-width: 520px; border-radius: 20px;
      box-shadow: 0 20px 50px rgba(10,20,40,0.3);
      background: #FFFFFF; overflow: hidden; display: flex; flex-direction: column;
      transform: translateY(20px) scale(0.96); opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    }
    .cm-overlay.open .cm-card { transform: translateY(0) scale(1); opacity: 1; }
    
    .cm-header {
      background: linear-gradient(135deg, #15305B, #0E1F3D);
      color: #FFFFFF; padding: 24px 28px;
      display: flex; align-items: flex-start; justify-content: space-between;
      position: relative;
    }
    .cm-title { font-size: 20px; font-weight: 800; margin: 0; color: #FFFFFF; font-family: 'Inter', sans-serif; }
    .cm-subtitle { font-size: 12px; color: rgba(255,255,255,0.75); margin: 6px 0 0 0; line-height: 1.4; font-family: 'Inter', sans-serif; }
    
    .cm-close {
      background: rgba(255,255,255,0.1); border: none; color: #FFFFFF;
      width: 28px; height: 28px; border-radius: 50%; font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, transform 0.2s;
    }
    .cm-close:hover { background: rgba(255,255,255,0.25); transform: rotate(90deg); }
    
    .cm-body { padding: 24px 28px; margin: 0; box-sizing: border-box; }
    
    .cm-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      color: #5F7596; margin-bottom: 6px; display: block; letter-spacing: 0.05em;
      font-family: 'Inter', sans-serif;
    }
    
    .cm-input {
      width: 100%; border: 1.5px solid #E5E7EB; border-radius: 10px;
      padding: 12px 14px; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s;
      outline: none; box-sizing: border-box; font-family: inherit;
    }
    .cm-input:focus { border-color: #F5A623; box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15); }
    
    .cm-msgr-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1.5px solid #E5E7EB; border-radius: 30px;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
      color: #4B5563; background: #FFFFFF; user-select: none; position: relative;
    }
    .cm-msgr-chip input[type="checkbox"]:checked + .cm-msgr-icon { transform: scale(1.15); }
    
    .cm-msgr-chip[data-msgr="whatsapp"].active { border-color: #25D366; background: rgba(37,211,102,0.06); color: #128C7E; }
    .cm-msgr-chip[data-msgr="telegram"].active { border-color: #0088cc; background: rgba(0,136,204,0.06); color: #0088cc; }
    .cm-msgr-chip[data-msgr="vk"].active { border-color: #0077FF; background: rgba(0,119,255,0.06); color: #0077FF; }
    .cm-msgr-chip[data-msgr="max"].active { border-color: #F5A623; background: rgba(245,166,35,0.06); color: #e0911a; }
    
    .cm-topics-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    
    .cm-topic-btn {
      padding: 8px 14px; border: 1.5px solid #F3F4F6; background: #F9FAFB;
      border-radius: 30px; font-size: 12px; font-weight: 500; cursor: pointer;
      transition: all 0.2s; color: #4B5563; font-family: inherit;
    }
    .cm-topic-btn:hover { background: #EEF3FB; border-color: #1B3C6E; color: #1B3C6E; }
    .cm-topic-btn.active { background: #1B3C6E; border-color: #1B3C6E; color: #FFFFFF; }
    
    .cm-submit-btn {
      width: 100%; padding: 14px; background: #F5A623; color: #1A1A2E;
      border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
      font-family: inherit; margin-top: 16px; box-shadow: 0 4px 14px rgba(245,166,35,0.25);
    }
    .cm-submit-btn:hover { background: #e0911a; box-shadow: 0 6px 20px rgba(245,166,35,0.35); }
    .cm-submit-btn:active { transform: scale(0.98); }
    
    .cm-policy-label {
      font-size: 11px; color: #4B5563; line-height: 1.4; display: flex;
      align-items: flex-start; gap: 8px; cursor: pointer; margin-top: 14px;
      user-select: none;
    }
    .cm-policy-checkbox { accent-color: #F5A623; width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
    
    .cm-footnote { font-size: 10px; color: #9CA3AF; text-align: center; margin-top: 12px; line-height: 1.4; margin-bottom: 0; }
  `;
  document.head.appendChild(styleEl);

  // 2. HTML Templates
  const headerTemplate = `
    <div class="header-inner aa-hdr-in">
      <a href="index.html" class="logo aa-logo" aria-label="Янтарный проспект">
        <div class="logo-icon aa-logo-ic">
          <img src="AA.svg" alt="ЯП" onerror="this.parentNode.textContent='Я'">
        </div>
        <div class="logo-text aa-logo-tx">
          <span class="logo-name aa-logo-name">Янтарный проспект</span>
          <span class="logo-tagline aa-logo-tag">Amber Avenue</span>
        </div>
      </a>

      <div class="header-search aa-srch" role="search">
        <svg class="search-icon aa-srch-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="search" id="aa-header-search" class="has-btn" placeholder="ЖК, адрес, застройщик..." aria-label="Поиск" autocomplete="off">
        <button class="header-search-btn aa-srch-btn" id="aa-header-search-btn" type="button" aria-label="Найти">Поиск</button>
      </div>

      <div class="header-actions aa-acts">
        <button class="btn-header btn-header-accent aa-btn aa-btn-a" id="btn-consult">Консультация</button>
      </div>

      <button class="burger-btn aa-burg" id="aa-burg" aria-label="Открыть меню" aria-expanded="false">
        <div class="aa-burg-lines">
          <span class="burger-line aa-burg-l"></span>
          <span class="burger-line aa-burg-l"></span>
          <span class="burger-line aa-burg-l"></span>
        </div>
        <span class="aa-burg-txt">МЕНЮ</span>
      </button>
    </div>
  `;

  const megaMenuTemplate = `
    <div class="mg-ov" id="mg-ov" aria-hidden="true"></div>
    <div class="mg-panel" id="mg-panel" role="dialog" aria-label="Меню" aria-hidden="true">
      <div class="mg-body">
        <!-- LEFT -->
        <aside class="mg-left">
          <div class="mg-sec">
            <div class="mg-lbl">Каталог</div>
            <a href="zhk.html" class="mg-lnk active">
              <span class="mg-lnk-ic">🏠</span>Все новостройки
              <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            <a href="zhk-umory.html" class="mg-lnk">
              <span class="mg-lnk-ic">🌊</span>ЖК у моря
              <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            <div class="mg-lnk hs" id="mg-kld-tg">
              <span class="mg-lnk-ic">🏢</span>ЖК Калининграда
              <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            <div class="mg-sub" id="mg-kld-sub">
              <a href="zhk-kaliningrad.html" class="mg-sub-l">Все районы</a>
              <a href="zhk-kaliningrad.html?filter=district-cen" class="mg-sub-l">Центральный район</a>
              <a href="zhk-kaliningrad.html?filter=district-mos" class="mg-sub-l">Московский район</a>
              <a href="zhk-kaliningrad.html?filter=district-len" class="mg-sub-l">Ленинградский район</a>
            </div>
            <a href="zhk-prigorod.html" class="mg-lnk">
              <span class="mg-lnk-ic">🌲</span>ЖК Пригород
              <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            <a href="zhk-oblast.html" class="mg-lnk">
              <span class="mg-lnk-ic">🗺</span>ЖК Область
              <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </a>
          </div>

          <div class="mg-div"></div>

          <div class="mg-sec">
            <div class="mg-lbl">Компания</div>
            <a href="about.html" class="mg-lnk"><span class="mg-lnk-ic">ℹ️</span>О сервисе</a>
            <a href="methodology.html" class="mg-lnk"><span class="mg-lnk-ic">📊</span>Методология рейтинга</a>
            <a href="b2b-promo.html" class="mg-lnk"><span class="mg-lnk-ic">🏗</span>Для застройщиков</a>
            <a href="partners-promo.html" class="mg-lnk"><span class="mg-lnk-ic">📢</span>Для рекламодателей</a>
          </div>

          <div class="mg-div"></div>

          <div class="mg-sec">
            <div class="mg-obr" id="mg-obr" style="margin: 0;">
              <span style="font-size:18px">💬</span>
              <div>
                <div class="mg-obr-t">Обращение</div>
                <div class="mg-obr-d">Обращения от жителей<br>уже заселенных ЖК</div>
              </div>
            </div>
          </div>
        </aside>

        <!-- CENTER -->
        <section class="mg-ctr">
          <div class="mg-ctr-top-grid">
            <div>
              <div class="mg-col-lbl">Новостройки</div>
              <div id="mg-cats"></div>
            </div>
            <div>
              <div class="mg-col-lbl">Популярные города области</div>
              <div id="mg-regs"></div>
            </div>
          </div>

          <div class="mg-useful-section">
            <div class="mg-col-lbl">Полезное</div>
            <div class="mg-useful-grid">
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">💳</span>Ипотека от 5.5%
                <svg class="mg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">🏷</span>Акции и скидки
                <span style="margin-left:auto;background:#EF4444;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;">12</span>
              </a>
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">🔄</span>Trade-In</a>
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">📅</span>Рассрочка</a>
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">🎖</span>Военная ипотека</a>
              <a href="#" class="mg-lnk"><span class="mg-lnk-ic">👨‍👩‍👧</span>Материнский капитал</a>
            </div>
          </div>

          <div class="mg-bs">
            <div class="mg-bs-tr" id="mg-bs-tr"></div>
            <button class="mg-bs-nav mg-bs-pv" id="mg-bs-pv" aria-label="Назад">‹</button>
            <button class="mg-bs-nav mg-bs-nx" id="mg-bs-nx" aria-label="Вперёд">›</button>
            <div class="mg-bs-dots" id="mg-bs-dots"></div>
          </div>
        </section>

        <!-- RIGHT -->
        <aside class="mg-right">
          <div class="mg-col-lbl">ТОП Индекс - Застройщики</div>
          <div id="mg-devs"></div>
          <a href="developers.html" class="mg-all" style="margin-bottom: 16px;">Все застройщики →</a>

          <div class="mg-div" style="margin: 12px 0 16px; width: auto; height: 1px; background: #F3F4F6;"></div>

          <div class="mg-col-lbl">Актуальные новости</div>
          <div id="mg-news" class="mg-news-list"></div>
          <a href="blog.html" class="mg-all">Все новости →</a>
        </aside>
      </div>

      <!-- Trust bar -->
      <div class="mg-trust">
        <div class="mg-trust-it"><span class="mg-trust-ic">✓</span><div><div class="mg-trust-t">Актуальные цены</div><div class="mg-trust-s">от застройщиков</div></div></div>
        <div class="mg-trust-it"><span class="mg-trust-ic">🔍</span><div><div class="mg-trust-t">Проверенные объекты</div><div class="mg-trust-s">и застройщики</div></div></div>
        <div class="mg-trust-it"><span class="mg-trust-ic">🏦</span><div><div class="mg-trust-t">Ипотека онлайн</div><div class="mg-trust-s">за 5 минут</div></div></div>
        <div class="mg-trust-it"><span class="mg-trust-ic">💬</span><div><div class="mg-trust-t">Экспертная поддержка</div><div class="mg-trust-s">на всех этапах</div></div></div>
      </div>
      <div class="mg-hint">Нажмите ESC или кликните вне меню для закрытия</div>
    </div>
  `;

  // Mobile Drawer (Only left column items and Consultation CTA at the bottom)
  const mobileDrawerTemplate = `
    <div class="mb-ov" id="mb-ov" aria-hidden="true"></div>
    <aside class="mb-dr" id="mb-dr" role="dialog" aria-label="Мобильное меню" aria-modal="true">
      <div class="mb-hdr">
        <a href="index.html" class="mb-logo" aria-label="Янтарный проспект">
          <div class="mb-logo-ic">
            <img src="AA.svg" alt="ЯП" onerror="this.parentNode.textContent='Я'">
          </div>
          <div>
            <div class="mb-logo-nm">Янтарный проспект</div>
            <div class="mb-logo-tg">Amber Avenue</div>
          </div>
        </a>
        <button class="mb-cls" id="mb-cls" aria-label="Закрыть меню">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="mb-srch">
        <div class="mb-srch-w">
          <svg class="mb-srch-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="search" placeholder="ЖК, застройщик, район..." aria-label="Поиск" autocomplete="off">
        </div>
      </div>

      <div class="mb-body">
        <a href="zhk.html" class="mb-ni">
          <span class="mb-ni-ic">🏠</span><span class="mb-ni-lb">Все новостройки</span>
          <svg class="mb-ni-ch" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </a>
        <a href="zhk-umory.html" class="mb-ni">
          <span class="mb-ni-ic">🌊</span><span class="mb-ni-lb">ЖК у моря</span>
          <svg class="mb-ni-ch" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </a>
        <div class="mb-ni" id="mb-kld-tg">
          <span class="mb-ni-ic">🏢</span><span class="mb-ni-lb">ЖК Калининграда</span>
          <svg class="mb-ni-ch" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </div>
        <div class="mb-sub" id="mb-kld-sub">
          <a href="zhk-kaliningrad.html" class="mb-sub-l">Все районы</a>
          <a href="zhk-kaliningrad.html?filter=district-cen" class="mb-sub-l">Центральный район</a>
          <a href="zhk-kaliningrad.html?filter=district-mos" class="mb-sub-l">Московский район</a>
          <a href="zhk-kaliningrad.html?filter=district-len" class="mb-sub-l">Ленинградский район</a>
        </div>
        <a href="zhk-prigorod.html" class="mb-ni">
          <span class="mb-ni-ic">🌲</span><span class="mb-ni-lb">ЖК Пригород</span>
          <svg class="mb-ni-ch" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </a>
        <a href="zhk-oblast.html" class="mb-ni">
          <span class="mb-ni-ic">🗺</span><span class="mb-ni-lb">ЖК Область</span>
          <svg class="mb-ni-ch" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </a>

        <div class="mb-div"></div>

        <a href="about.html" class="mb-ni"><span class="mb-ni-ic">ℹ️</span><span class="mb-ni-lb">О сервисе</span></a>
        <a href="methodology.html" class="mb-ni"><span class="mb-ni-ic">📊</span><span class="mb-ni-lb">Методология рейтинга</span></a>
        <a href="b2b-promo.html" class="mb-ni"><span class="mb-ni-ic">🏗</span><span class="mb-ni-lb">Для застройщиков</span></a>
        <a href="partners-promo.html" class="mb-ni"><span class="mb-ni-ic">📢</span><span class="mb-ni-lb">Для рекламодателей</span></a>

        <div class="mb-use-tg" id="mb-use-tg">
          <span class="mb-use-t">Контакты</span>
          <svg class="mb-use-ch" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="mb-use-cnt" id="mb-use-cnt">
          <a href="tel:+74012123456" class="mb-sub-l" style="padding-left:16px">📞 +7 (4012) 12-34-56</a>
          <a href="mailto:info@amberavenue.ru" class="mb-sub-l" style="padding-left:16px">✉️ info@amberavenue.ru</a>
        </div>

        <!-- Consultation CTA placed at the bottom -->
        <a href="#" class="mb-cta" id="mb-cta">
          <div>
            <div class="mb-cta-t">Бесплатная консультация</div>
            <div class="mb-cta-s">Ответим за 5 минут</div>
          </div>
          <span class="mb-cta-b">Написать</span>
        </a>
      </div>
    </aside>
    <div class="aa-tc" id="aa-tc"></div>
  `;

  const consultModalTemplate = `
    <div class="cm-overlay" id="cm-overlay" aria-hidden="true">
      <div class="cm-card" role="dialog" aria-label="Консультация эксперта" aria-modal="true">
        <div class="cm-header">
          <div style="flex: 1;">
            <h3 class="cm-title">Консультация эксперта</h3>
            <p class="cm-subtitle">Ответим на любые вопросы о новостройках Калининградской области за 5 минут</p>
          </div>
          <button class="cm-close" id="cm-close" aria-label="Закрыть">✕</button>
        </div>
        <form class="cm-body" id="cm-form" autocomplete="off">
          <div class="cm-field" style="margin-bottom: 16px;">
            <label class="cm-label" for="cm-name">Имя *</label>
            <input class="cm-input" type="text" id="cm-name" placeholder="Александр" required>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="cm-field">
              <label class="cm-label" for="cm-phone">Телефон *</label>
              <input class="cm-input" type="tel" id="cm-phone" placeholder="+7 (___) ___-__-__" required>
            </div>
            <div class="cm-field">
              <label class="cm-label" for="cm-email">Email *</label>
              <input class="cm-input" type="email" id="cm-email" placeholder="mail@example.com" required>
            </div>
          </div>
          
          <div class="cm-field" style="margin-bottom: 20px;">
            <label class="cm-label">Мессенджеры, привязанные к номеру</label>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <label class="cm-msgr-chip" data-msgr="whatsapp">
                <input type="checkbox" id="cm-msgr-wa" style="position: absolute; opacity: 0; width: 0; height: 0;">
                <span class="cm-msgr-icon">💬</span> WhatsApp
              </label>
              <label class="cm-msgr-chip" data-msgr="telegram">
                <input type="checkbox" id="cm-msgr-tg" style="position: absolute; opacity: 0; width: 0; height: 0;">
                <span class="cm-msgr-icon">✈</span> Telegram
              </label>
              <label class="cm-msgr-chip" data-msgr="vk">
                <input type="checkbox" id="cm-msgr-vk" style="position: absolute; opacity: 0; width: 0; height: 0;">
                <span class="cm-msgr-icon">🔗</span> VK
              </label>
              <label class="cm-msgr-chip" data-msgr="max">
                <input type="checkbox" id="cm-msgr-max" style="position: absolute; opacity: 0; width: 0; height: 0;">
                <span class="cm-msgr-icon">⭐</span> Max
              </label>
            </div>
          </div>
          
          <div class="cm-field" style="margin-bottom: 16px;">
            <label class="cm-label">Тема консультации</label>
            <div class="cm-topics-grid">
              <button type="button" class="cm-topic-btn" data-topic="Выбрать ЖК">Выбрать ЖК</button>
              <button type="button" class="cm-topic-btn" data-topic="ЖК Калининград">ЖК Калининград</button>
              <button type="button" class="cm-topic-btn" data-topic="Ипотека">Ипотека</button>
              <button type="button" class="cm-topic-btn" data-topic="Мат. капитал">Мат. капитал</button>
              <button type="button" class="cm-topic-btn" data-topic="Военная ипотека">Военная ипотека</button>
              <button type="button" class="cm-topic-btn" data-topic="Загородные дома">Загородные дома</button>
              <button type="button" class="cm-topic-btn" data-topic="ЖК у моря">ЖК у моря</button>
            </div>
          </div>
          
          <div class="cm-field" style="margin-bottom: 16px;">
            <label class="cm-label" for="cm-request">Ваш запрос / Сообщение</label>
            <textarea class="cm-input" id="cm-request" rows="3" placeholder="Опишите ваши пожелания или оставьте поле пустым..." style="resize: none;"></textarea>
          </div>
          
          <label class="cm-policy-label">
            <input type="checkbox" class="cm-policy-checkbox" id="cm-policy" required checked>
            <span>Я согласен на обработку персональных данных и принимаю условия <a href="#" style="color:#1B3C6E; text-decoration: underline;">Политики конфиденциальности</a></span>
          </label>
          
          <button type="submit" class="cm-submit-btn">Отправить заявку</button>
          
          <p class="cm-footnote">Ваши данные под надежной защитой согласно 152-ФЗ. Мы свяжемся с вами в течение 5 минут. Никакого спама.</p>
        </form>
      </div>
    </div>
  `;

  // 3. Slider logic factory
  function makeSlider(trackId, dotsId, prevId, nextId) {
    const tr = document.getElementById(trackId);
    const dt = document.getElementById(dotsId);
    const pv = document.getElementById(prevId);
    const nx = document.getElementById(nextId);
    if (!tr || !dt) return;
    let s = 0, timer;
    const n = () => tr.querySelectorAll('[data-s]').length;
    function go(i) {
      const nn = n(); if (!nn) return;
      s = ((i % nn) + nn) % nn;
      tr.style.transform = `translateX(-${s * 100}%)`;
      dt.querySelectorAll('button').forEach((d, j) => d.classList.toggle('on', j === s));
    }
    function ra() { clearInterval(timer); timer = setInterval(() => go(s + 1), 5000); }
    pv && pv.addEventListener('click', (e) => { e.preventDefault(); go(s - 1); ra(); });
    nx && nx.addEventListener('click', (e) => { e.preventDefault(); go(s + 1); ra(); });
    dt.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) { e.preventDefault(); go(+b.dataset.i); ra(); }
    });
    ra();
  }

  // 4. Data binding and rendering
  function renderMenuData() {
    const d = window.AMBER_DATA || {};
    
    // Top Index Devs
    const devsEl = document.getElementById('mg-devs');
    if (devsEl && d.developers) {
      const props = window.PROPERTIES || d.properties || [];
      
      const getMatchedDevId = (devStr) => {
    if (!devStr) return null;
    const s = devStr.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
    
    if (s.includes('к8') || s.includes('k8')) return 4;
    if (s.includes('кси') || s.includes('калининградстройинвест')) return 1;
    if (s.includes('фжсс') || s.includes('фонджилищного') || s.includes('фонджсс')) return 2;
    if (s.includes('расцвет')) return 3;
    if (s.includes('макрострой')) return 5;
    if (s.includes('модульстройград')) return 6;
    if (s.includes('мегаполис')) return 7;
    if (s.includes('бдн') || s.includes('балтийскийдом')) return 8;
    if (s.includes('кранцпарк') || s.includes('westdream') || s.includes('вестдрим')) return 9;
    if (s.includes('ойкумена') || s.includes('евростройинвест')) return 10;
    if (s.includes('кпд')) return 11;
    if (s.includes('инвент')) return 12;
    if (s.includes('мпк')) return 13;
    if (s.includes('балтпарус') || s.includes('балтийскийпарус')) return 14;
    if (s.includes('кск')) return 15;
    if (s.includes('строиттрест') || s.includes('строительныйтрест')) return 16;
    if (s.includes('стройинвестиция')) return 17;
    
    // Put 'kst'/'кст' and 'русскаяевропа' before 'сск' and 'рекстрой'
    // 'рекстрой' contains 'кст' (реКСТрой), so check for 'рекстрой' when using 'кст'
    if (s.includes('kst') || (s.includes('кст') && !s.includes('рекстрой'))) return 39;
    if (s.includes('русскаяевропа') || s.includes('авангардинвест')) return 21;
    if (s.includes('сск') || s.includes('сибирская')) return 18;
    if (s.includes('рекстрой')) return 19;
    if (s.includes('setl') || s.includes('сетл')) return 20;
    
    // Custom checks for Specstroy & Bagration
    if (s.includes('багратион') || (s.includes('спецстрой') && !s.includes('спецремстройтрест')) || s.includes('билдингинвест')) return 22;
    
    if (s.includes('лидерстрой') || s.includes('центрфорвард')) return 23;
    if (s.includes('юстрой')) return 24;
    if (s.includes('иском')) return 25;
    if (s.includes('регионстроительство')) return 26;
    if (s.includes('ласкино')) return 27;
    if (s.includes('балткоттедж') || s.includes('балтиккоттедж')) return 28;
    if (s.includes('домарт')) return 29;
    if (s.includes('балтияинвест')) return 30;
    if (s.includes('зеленоградсксельстрой')) return 31;
    if (s.includes('автотор')) return 32;
    if (s.includes('новостройплюс')) return 33;
    if (s.includes('зеленыйгород')) return 34;
    if (s.includes('отрада')) return 35;
    if (s.includes('раушен')) return 36;
    if (s.includes('акфен')) return 37;
    if (s.includes('спецремстройтрест')) return 38;
    if (s.includes('мидгард')) return 40;
    if (s.includes('альбатрос')) return 41;
    if (s.includes('виктория')) return 42;
    if (s.includes('премьер')) return 43;
    if (s.includes('ривьера')) return 44;
    
    // New developer mappings
    if (s.includes('корторос') || s.includes('кортрос') || s.includes('kortros')) return 45;
    if (s.includes('лидергрупп') || s.includes('lidergrupp') || s.includes('смоленское')) return 46;
    if (s.includes('меркури') || s.includes('merkur')) return 47;
    if (s.includes('астори') || s.includes('astor')) return 48;
    if (s.includes('твн') || s.includes('tvn')) return 49;
    if (s.includes('доминвест') || s.includes('dominvest')) return 50;
    if (s.includes('эллипс') || s.includes('ellips')) return 51;
    if (s.includes('нановой') || s.includes('nanovoi') || s.includes('гармония')) return 52;
    if (s.includes('мпстрой') || s.includes('mpstroy') || s.includes('челноков')) return 53;
    if (s.includes('кдстрой') || s.includes('kdstroi') || s.includes('стройсервис')) return 54;
    
    return null;
      };

      const devMap = {};
      d.developers.forEach(dev => {
        devMap[dev.id] = { ...dev, ratingSum: 0, ratingCount: 0 };
      });
      
      props.forEach(p => {
        const matchedId = getMatchedDevId(p.developer);
        if (matchedId && devMap[matchedId]) {
          if (typeof p.rating === 'number' && p.rating > 0) {
            devMap[matchedId].ratingSum += p.rating;
            devMap[matchedId].ratingCount++;
          }
        }
      });
      
      const recalculatedDevs = Object.values(devMap).map(dev => {
        if (dev.ratingCount > 0) {
          dev.rating = parseFloat((dev.ratingSum / dev.ratingCount).toFixed(1));
        }
        return dev;
      });

      const sorted = [...recalculatedDevs].sort((a,b) => b.rating - a.rating).slice(0, 5);
      devsEl.innerHTML = sorted.map((dv, i) => `
        <a href="developers.html" class="mg-dv-row">
          <span class="mg-dv-rk ${i===0?'t1':''}">${i+1}</span>
          <span class="mg-dv-nm">${dv.name}</span>
          <span class="mg-dv-rt"><span class="mg-dv-st">★</span>${dv.rating.toFixed(1)}</span>
        </a>
      `).join('');
    }

    // Cats counts
    const catsEl = document.getElementById('mg-cats');
    if (catsEl) {
      const props = window.PROPERTIES || d.properties || [];
      const total = props.length;
      let sdan = 0;
      let stroy = 0;
      let soon = 0;
      props.forEach(p => {
        const del = (p.deliveryShort || p.delivery || '').toLowerCase();
        if (del.includes('сдан')) {
          sdan++;
        } else if (!del || del === 'нет данных') {
          soon++;
        } else {
          stroy++;
        }
      });
      const items = [
        {n:'Все ЖК', c: total},
        {n:'Строящиеся', c: stroy},
        {n:'Сданные', c: sdan},
        {n:'Скоро в продаже', c: soon},
      ];
      catsEl.innerHTML = items.map(it => `
        <a href="zhk.html" class="mg-cat-row">
          <span class="mg-cat-nm">${it.n}</span>
          <span class="mg-cat-cnt">${it.c}</span>
        </a>
      `).join('');
    }

    // Regions/Cities
    const regsEl = document.getElementById('mg-regs');
    if (regsEl) {
      const props = window.PROPERTIES || d.properties || [];
      const getCityFromAddress = (addr) => {
        if (!addr) return 'Другой';
        if (addr.includes('г. Калининград') || addr.includes('город Калининград')) {
          return 'Калининград';
        }
        if (addr.includes('Зеленоградск')) return 'Зеленоградск';
        if (addr.includes('Светлогорск')) return 'Светлогорск';
        if (addr.includes('Пионерский')) return 'Пионерский';
        if (addr.includes('Гурьевск')) return 'Гурьевск';
        if (addr.includes('Балтийск')) return 'Балтийск';
        if (addr.includes('Светлый')) return 'Светлый';
        if (addr.includes('Черняховск')) return 'Черняховск';
        return 'Другой';
      };
      
      const mp = {};
      props.forEach(p => {
        const city = getCityFromAddress(p.address);
        if (city !== 'Другой') {
          mp[city] = (mp[city] || 0) + 1;
        }
      });
      const regs = Object.entries(mp).sort((a,b)=>b[1]-a[1]).slice(0,5);
      regsEl.innerHTML = regs.map(([nm, cnt]) => `
        <a href="zhk.html" class="mg-reg-row">
          <span class="mg-reg-nm">${nm}</span>
          <span class="mg-reg-cnt">${cnt} ЖК</span>
        </a>
      `).join('');
    }

    // News list
    const newsEl = document.getElementById('mg-news');
    if (newsEl && d.blog) {
      const items = d.blog.slice(0, 3);
      newsEl.innerHTML = items.map(article => `
        <a href="blog.html" class="mg-news-row">
          <div class="mg-news-meta">
            <span class="mg-news-tag">${article.tag || ''}</span>
            <span>${article.date || ''}</span>
          </div>
          <div class="mg-news-title">${article.title || ''}</div>
        </a>
      `).join('');
    }

    // Banner Slider
    const banners = d.menuBanners || d.heroSlides || [];
    const mgTr = document.getElementById('mg-bs-tr');
    const mgDt = document.getElementById('mg-bs-dots');
    if (mgTr && mgDt && banners.length) {
      mgTr.innerHTML = banners.map((b,i) => `
        <div data-s style="flex:0 0 100%;position:relative;overflow:hidden;">
          <img src="${b.image||b.imgSrc||''}" alt="${b.title||''}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.opacity=0">
          <div class="mg-bs-ov">
            <div class="mg-bs-lbl">${b.label||'Рекомендуем'}</div>
            <div class="mg-bs-ti">${b.title||''}</div>
            <div class="mg-bs-lo">${b.location||b.desc||''}</div>
            ${b.price?`<div class="mg-bs-pr">${b.price}</div>`:''}
            <a href="${b.link||'zhk.html'}" class="mg-bs-btn">Подробнее</a>
          </div>
        </div>
      `).join('');
      mgDt.innerHTML = banners.map((_,i) =>
        `<button class="mg-bs-dot ${i===0?'on':''}" data-i="${i}" aria-label="Слайд ${i+1}"></button>`
      ).join('');
      makeSlider('mg-bs-tr','mg-bs-dots','mg-bs-pv','mg-bs-nx');
    }
  }

  // 5. Toast
  window.showToast = function(msg) {
    const c = document.getElementById('aa-tc');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'aa-t'; t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  };

  // 6. Bootstrap Menu Injection
  function initMenu() {
    // A. Re-render/inject header
    const oldHeader = document.querySelector('.site-header') || document.querySelector('.aa-hdr') || document.querySelector('header');
    if (oldHeader) {
      oldHeader.className = 'site-header';
      oldHeader.id = 'aa-hdr';
      oldHeader.innerHTML = headerTemplate;
    } else {
      // If no header, prepend to body
      const newHeader = document.createElement('header');
      newHeader.className = 'site-header';
      newHeader.id = 'aa-hdr';
      newHeader.role = 'banner';
      newHeader.innerHTML = headerTemplate;
      document.body.insertBefore(newHeader, document.body.firstChild);
    }

    // B. Append drawer layouts to body
    const oldPanel = document.getElementById('mg-panel');
    if (oldPanel) oldPanel.remove();
    const oldOverlay = document.getElementById('mg-ov');
    if (oldOverlay) oldOverlay.remove();
    const oldMobDr = document.getElementById('mb-dr');
    if (oldMobDr) oldMobDr.remove();
    const oldMobOv = document.getElementById('mb-ov');
    if (oldMobOv) oldMobOv.remove();

    document.body.insertAdjacentHTML('beforeend', megaMenuTemplate + mobileDrawerTemplate + consultModalTemplate);

    // C. Data binding
    renderMenuData();

    // E. Setup UI interactions
    const mgOv    = document.getElementById('mg-ov');
    const mgPanel = document.getElementById('mg-panel');
    const burg    = document.getElementById('aa-burg');
    const closeBtn = document.getElementById('btn-mg-close');
    let mgOpen = false;

    function openMg() {
      mgOpen = true;
      mgOv.classList.add('open'); mgPanel.classList.add('open');
      mgPanel.setAttribute('aria-hidden','false');
      burg.classList.add('open'); burg.setAttribute('aria-expanded','true');
      if (closeBtn) closeBtn.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    function closeMg() {
      mgOpen = false;
      mgOv.classList.remove('open'); mgPanel.classList.remove('open');
      mgPanel.setAttribute('aria-hidden','true');
      burg.classList.remove('open'); burg.setAttribute('aria-expanded','false');
      if (closeBtn) closeBtn.style.display = 'none';
      document.body.style.overflow = '';
    }

    const mbOv = document.getElementById('mb-ov');
    const mbDr = document.getElementById('mb-dr');
    const mbCls = document.getElementById('mb-cls');
    let mbOpen = false;

    function openMb() {
      mbOpen = true;
      mbOv.classList.add('open'); mbDr.classList.add('open');
      mbDr.setAttribute('aria-hidden','false');
      burg.classList.add('open'); burg.setAttribute('aria-expanded','true');
      document.body.style.overflow = 'hidden';
    }
    function closeMb() {
      mbOpen = false;
      mbOv.classList.remove('open'); mbDr.classList.remove('open');
      mbDr.setAttribute('aria-hidden','true');
      burg.classList.remove('open'); burg.setAttribute('aria-expanded','false');
      document.body.style.overflow = '';
    }

    burg.addEventListener('click', () => {
      if (window.innerWidth <= 900) { mbOpen ? closeMb() : openMb(); }
      else { mgOpen ? closeMg() : openMg(); }
    });

    mgOv.addEventListener('click', closeMg);
    if (closeBtn) closeBtn.addEventListener('click', closeMg);
    mbOv.addEventListener('click', closeMb);
    mbCls.addEventListener('click', closeMb);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (mgOpen) closeMg(); if (mbOpen) closeMb(); }
    });

    // Accordions
    const mgKldTg = document.getElementById('mg-kld-tg');
    const mgKldSb = document.getElementById('mg-kld-sub');
    mgKldTg && mgKldTg.addEventListener('click', () => {
      mgKldTg.classList.toggle('exp'); mgKldSb.classList.toggle('exp');
    });

    const mbKldTg = document.getElementById('mb-kld-tg');
    const mbKldSb = document.getElementById('mb-kld-sub');
    mbKldTg && mbKldTg.addEventListener('click', () => {
      mbKldTg.classList.toggle('exp'); mbKldSb.classList.toggle('exp');
    });

    const mbUseTg = document.getElementById('mb-use-tg');
    const mbUseCt = document.getElementById('mb-use-cnt');
    mbUseTg && mbUseTg.addEventListener('click', () => {
      mbUseTg.classList.toggle('exp'); mbUseCt.classList.toggle('exp');
    });

    // Setup Consultation Modal logic
    const cmOverlay = document.getElementById('cm-overlay');
    const cmClose = document.getElementById('cm-close');
    const cmForm = document.getElementById('cm-form');
    let cmOpen = false;

    window.openConsultModal = function(topicText = '') {
      cmOpen = true;
      if (cmOverlay) {
        cmOverlay.classList.add('open');
        cmOverlay.setAttribute('aria-hidden', 'false');
      }
      document.body.style.overflow = 'hidden';
      
      const nameInput = document.getElementById('cm-name');
      if (nameInput) setTimeout(() => nameInput.focus(), 100);

      if (topicText) {
        const customRequest = document.getElementById('cm-request');
        if (customRequest) customRequest.value = topicText;
        
        document.querySelectorAll('.cm-topic-btn').forEach(btn => {
          if (btn.dataset.topic === topicText) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    };

    window.closeConsultModal = function() {
      cmOpen = false;
      if (cmOverlay) {
        cmOverlay.classList.remove('open');
        cmOverlay.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
      if (cmForm) cmForm.reset();
      document.querySelectorAll('.cm-msgr-chip').forEach(chip => chip.classList.remove('active'));
      document.querySelectorAll('.cm-topic-btn').forEach(btn => btn.classList.remove('active'));
    };

    if (cmClose) {
      cmClose.addEventListener('click', window.closeConsultModal);
    }
    if (cmOverlay) {
      cmOverlay.addEventListener('click', (e) => {
        if (e.target === cmOverlay) window.closeConsultModal();
      });
    }

    // Escape listener extension for modal close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && cmOpen) {
        window.closeConsultModal();
      }
    });

    // Messenger chip click states
    document.querySelectorAll('.cm-msgr-chip input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', function() {
        const label = this.closest('.cm-msgr-chip');
        if (label) {
          if (this.checked) {
            label.classList.add('active');
          } else {
            label.classList.remove('active');
          }
        }
      });
    });

    // Quick topic buttons selection logic
    document.querySelectorAll('.cm-topic-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const topicVal = this.dataset.topic;
        const textarea = document.getElementById('cm-request');
        
        if (this.classList.contains('active')) {
          this.classList.remove('active');
          if (textarea && textarea.value === topicVal) {
            textarea.value = '';
          }
        } else {
          document.querySelectorAll('.cm-topic-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          if (textarea) {
            textarea.value = topicVal;
          }
        }
      });
    });

    // Phone number input formatter mask
    const phoneInput = document.getElementById('cm-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function(e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
        if (!x[2] && x[1] !== '') {
          e.target.value = x[1] === '7' || x[1] === '8' ? '+7 (' : '+' + x[1];
          return;
        }
        e.target.value = !x[3] ? '+7 (' + x[2] : '+7 (' + x[2] + ') ' + x[3] + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
      });
    }

    // Submit handler
    if (cmForm) {
      cmForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nameVal = document.getElementById('cm-name').value.trim();
        const phoneVal = document.getElementById('cm-phone').value.trim();
        const emailVal = document.getElementById('cm-email').value.trim();
        const requestVal = document.getElementById('cm-request').value.trim();
        const policyVal = document.getElementById('cm-policy').checked;
        
        if (!nameVal || !phoneVal || !emailVal || !policyVal) {
          window.showToast('Пожалуйста, заполните обязательные поля.');
          return;
        }
        
        const msgrs = [];
        document.querySelectorAll('.cm-msgr-chip input[type="checkbox"]:checked').forEach(cb => {
          msgrs.push(cb.closest('.cm-msgr-chip').textContent.trim());
        });
        
        console.log('Consultation request submitted:', {
          name: nameVal,
          phone: phoneVal,
          email: emailVal,
          messengers: msgrs,
          request: requestVal
        });
        
        window.closeConsultModal();
        window.showToast('Заявка принята! Эксперт свяжется с вами в течение 5 минут.');
      });
    }

    // Setup page-wide event listeners
    const btnConsult = document.getElementById('btn-consult');
    const devId = localStorage.getItem('auth_developer_id');
    const devName = localStorage.getItem('auth_developer_name');

    if (btnConsult) {
      if (devId && devName) {
        btnConsult.textContent = 'Панель управления';
        btnConsult.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof navigateToPage === 'function') {
            location.hash = '#developer-form';
          } else {
            window.location.href = 'developer-form.html';
          }
        });
      } else {
        btnConsult.addEventListener('click', (e) => {
          e.preventDefault();
          window.openConsultModal();
        });
      }
    }

    const mbCta = document.getElementById('mb-cta');
    if (mbCta) {
      if (devId && devName) {
        const mbCtaTitle = mbCta.querySelector('.mb-cta-t');
        const mbCtaSub = mbCta.querySelector('.mb-cta-s');
        const mbCtaBtn = mbCta.querySelector('.mb-cta-b');
        if (mbCtaTitle) mbCtaTitle.textContent = 'Панель управления';
        if (mbCtaSub) mbCtaSub.textContent = 'Кабинет застройщика';
        if (mbCtaBtn) mbCtaBtn.textContent = 'Перейти';
        
        mbCta.addEventListener('click', e => {
          e.preventDefault();
          closeMb();
          if (typeof navigateToPage === 'function') {
            location.hash = '#developer-form';
          } else {
            window.location.href = 'developer-form.html';
          }
        });
      } else {
        mbCta.addEventListener('click', e => {
          e.preventDefault();
          closeMb();
          window.openConsultModal();
        });
      }
    }

    const mgObr = document.getElementById('mg-obr');
    if (mgObr) {
      mgObr.addEventListener('click', () => {
        window.showToast('Раздел "Обращения" — скоро!');
      });
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-expert, #btn-expert-index, .btn-expert, #btn-expert-home, #btn-expert-zhk, #btn-expert-zhk, #btn-expert-developers');
      if (btn) {
        e.preventDefault();
        let topic = '';
        const card = btn.closest('.property-card');
        if (card) {
          const cardTitle = card.querySelector('.card-title');
          if (cardTitle) {
            topic = `Запрос по ЖК «${cardTitle.textContent.trim()}»`;
          }
        }
        window.openConsultModal(topic);
      }
    });

    // Dynamic URL filter chip trigger for zhk-kaliningrad.html
    if (window.location.pathname.includes('zhk-kaliningrad.html')) {
      const params = new URLSearchParams(window.location.search);
      const filterVal = params.get('filter');
      if (filterVal) {
        setTimeout(() => {
          const chip = document.querySelector(`.filter-chip[data-filter="${filterVal}"]`);
          if (chip) {
            chip.click();
            const filterBar = document.querySelector('.filter-bar');
            if (filterBar) {
              filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }, 300);
      }
    }

    // Глобальный поиск с автокомплитом для нескольких полей ввода (решает проблему SPA в бандле)
    const setupSearchAutocomplete = function(globalSearchInput) {
      if (!globalSearchInput || globalSearchInput.dataset.autocompleteInitialized) return;
      globalSearchInput.dataset.autocompleteInitialized = 'true';

      const urlParams = new URLSearchParams(window.location.search);
      const urlSearch = urlParams.get('search');
      if (urlSearch) {
        globalSearchInput.value = urlSearch;
      }

      // Создаем элемент выпадающего списка подсказок
      const dropdown = document.createElement('div');
      dropdown.className = 'search-suggestions-dropdown';
      globalSearchInput.parentNode.appendChild(dropdown);

      // Закрытие при клике вне
      document.addEventListener('click', function(e) {
        if (!globalSearchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });

      // Логика перехода при выборе подсказки
      const handleSuggestionClick = function(item) {
        dropdown.classList.remove('active');
        globalSearchInput.value = item.name;

        if (item.type === 'zhk') {
          // Перейти на карточку ЖК
          if (typeof navigateToPage === 'function') {
            window.targetZhkId = item.id;
            location.hash = '#zhk';
          } else {
            window.location.href = `zhk.html?id=${item.id}`;
          }
        } else if (item.type === 'developer') {
          // Перейти на страницу застройщика
          window.goToDeveloperPage(item.name);
        } else if (item.type === 'location') {
          // Поиск по городу/району
          if (typeof navigateToPage === 'function') {
            window.targetZhkSearch = item.name;
            location.hash = '#zhk';
          } else {
            window.location.href = `zhk.html?search=${encodeURIComponent(item.name)}`;
          }
        }
      };

      // Обработчик ввода символов для автокомплита
      globalSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        const props = window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : []) || [];
        const devs = (window.AMBER_DATA ? window.AMBER_DATA.developers : []) || [];

        // 1. Поиск по ЖК
        const matchedZhk = props.filter(p => p.name.toLowerCase().includes(query))
                                .slice(0, 4)
                                .map(p => ({ type: 'zhk', id: p.id, name: p.name, subtitle: p.developer }));

        // 2. Поиск по застройщикам
        const matchedDevs = devs.filter(d => d.name.toLowerCase().includes(query) || d.fullName.toLowerCase().includes(query))
                                .slice(0, 3)
                                .map(d => ({ type: 'developer', id: d.id, name: d.name, subtitle: d.fullName }));

        // 3. Поиск по локациям (уникальные города)
        const uniqueLocations = [...new Set(props.map(p => p.location).filter(Boolean))];
        const matchedLocations = uniqueLocations.filter(loc => loc.toLowerCase().includes(query))
                                               .slice(0, 2)
                                               .map(loc => ({ type: 'location', name: loc, subtitle: 'Регион / Город' }));

        const allSuggestions = [...matchedZhk, ...matchedDevs, ...matchedLocations];

        if (allSuggestions.length === 0) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        // Рендерим подсказки
        dropdown.innerHTML = '';
        
        let lastType = '';
        allSuggestions.forEach(item => {
          // Заголовок группы
          if (item.type !== lastType) {
            const groupTitle = document.createElement('div');
            groupTitle.className = 'suggestion-group-title';
            groupTitle.textContent = item.type === 'zhk' ? 'Жилые комплексы' : (item.type === 'developer' ? 'Застройщики' : 'Города и районы');
            dropdown.appendChild(groupTitle);
            lastType = item.type;
          }

          const el = document.createElement('div');
          el.className = 'suggestion-item';
          
          const icon = item.type === 'zhk' ? '🏢' : (item.type === 'developer' ? '🏗' : '📍');
          el.innerHTML = `
            <span class="suggestion-icon">${icon}</span>
            <div class="suggestion-info">
              <span class="suggestion-title">${item.name}</span>
              <span class="suggestion-subtitle">${item.subtitle || ''}</span>
            </div>
          `;

          el.addEventListener('click', () => handleSuggestionClick(item));
          dropdown.appendChild(el);
        });

        dropdown.classList.add('active');
      });

      const triggerGlobalSearch = function(query) {
        if (!query) return;
        const isMainZhkPage = window.location.pathname.includes('zhk.html') || window.location.pathname.includes('zhk.html');
        
        if (isMainZhkPage) {
          window.targetZhkId = null;
          if (typeof currentSearchQuery !== 'undefined') {
            currentSearchQuery = query;
          }
          if (typeof visibleCount !== 'undefined') visibleCount = 8;
          if (typeof renderFeed === 'function') {
            renderFeed();
          }
        } else {
          if (typeof navigateToPage === 'function') {
            window.targetZhkSearch = query;
            location.hash = '#zhk';
          } else {
            window.location.href = `zhk.html?search=${encodeURIComponent(query)}`;
          }
        }
      };

      globalSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          dropdown.classList.remove('active');
          triggerGlobalSearch(this.value.trim());
        }
      });

      // Wire the amber «Поиск» button (next sibling of input)
      const searchBtn = globalSearchInput.nextElementSibling;
      if (searchBtn && (searchBtn.classList.contains('header-search-btn') || searchBtn.classList.contains('aa-srch-btn'))) {
        searchBtn.addEventListener('click', function() {
          dropdown.classList.remove('active');
          triggerGlobalSearch(globalSearchInput.value.trim());
        });
      }

      // Also wire by id for the main header button
      const headerSearchBtn = document.getElementById('aa-header-search-btn');
      if (headerSearchBtn && !headerSearchBtn.dataset.wired) {
        headerSearchBtn.dataset.wired = 'true';
        headerSearchBtn.addEventListener('click', function() {
          const inp = document.getElementById('aa-header-search');
          if (inp) {
            dropdown.classList.remove('active');
            triggerGlobalSearch(inp.value.trim());
          }
        });
      }

      const searchIcon = globalSearchInput.previousElementSibling;
      if (searchIcon && (searchIcon.classList.contains('search-icon') || searchIcon.tagName === 'svg' || (searchIcon.className && searchIcon.className.baseVal && searchIcon.className.baseVal.includes('search-icon')))) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', function() {
          dropdown.classList.remove('active');
          triggerGlobalSearch(globalSearchInput.value.trim());
        });
      }
    };

    // Вешаем логику автокомплита на все доступные типы инпутов поиска
    const searchIds = ['aa-header-search', 'main-search', 'main-search-zhk', 'main-search-index'];
    searchIds.forEach(id => {
      const inputEl = document.getElementById(id);
      if (inputEl) {
        setupSearchAutocomplete(inputEl);
      }
    });

    // Периодически сканируем DOM для инициализации динамически создаваемых полей поиска (при SPA переходах)
    setInterval(() => {
      searchIds.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
          setupSearchAutocomplete(inputEl);
        }
      });
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }

  window.goToDeveloperPage = function(devName) {
    if (!devName) return;
    
    // Use the original name — renderDevFeed does substring matching
    // Cleaning ГК/«/» was breaking search since data stores full names
    window.targetDeveloperSearch = devName;
    
    if (typeof navigateToPage === 'function') {
      location.hash = 'developers';
      const devSearchInput = document.getElementById('dev-search');
      if (devSearchInput) {
        devSearchInput.value = devName;
        devSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      window.location.href = `developers.html?devName=${encodeURIComponent(devName)}`;
    }
  };

  // ── Global Error Catching: Redirect to 404 page ────────────────────
  if (window.location.pathname.indexOf('404.html') === -1 && window.location.hash.indexOf('#404') === -1) {
    window.addEventListener('error', function(event) {
      // Only catch errors from local files (our domain) to avoid browser extensions breaking UX
      const url = event.filename || '';
      if (url && (url.indexOf(window.location.origin) === 0 || url.indexOf('/') === 0)) {
        if (!url.includes('chrome-extension') && !url.includes('moz-extension')) {
          console.error('Unhandled script error captured, redirecting to 404 page:', event.message);
          if (typeof navigateToPage === 'function') {
            window.location.hash = '404';
          } else {
            window.location.href = '404.html';
          }
        }
      }
    });

    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection captured, redirecting to 404 page:', event.reason);
      if (typeof navigateToPage === 'function') {
        window.location.hash = '404';
      } else {
        window.location.href = '404.html';
      }
    });
  }

})();
