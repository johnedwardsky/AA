const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('================================================================');
console.log('EMPIRICAL CHALLENGER TEST SUITE — MILESTONE 1 (R1: DASHBOARD)');
console.log('================================================================\n');

const htmlPath = path.resolve(__dirname, '../admin.html');
const dataJsPath = path.resolve(__dirname, '../data.js');
const propJsPath = path.resolve(__dirname, '../properties-data.js');

let rawHtml = fs.readFileSync(htmlPath, 'utf8');
const dataJs = fs.existsSync(dataJsPath) ? fs.readFileSync(dataJsPath, 'utf8') : '';
const propJs = fs.existsSync(propJsPath) ? fs.readFileSync(propJsPath, 'utf8') : '';

// Inline script tags so JSDOM executes everything synchronously without network requests
rawHtml = rawHtml.replace('<script src="data.js"></script>', `<script>${dataJs}</script>`);
rawHtml = rawHtml.replace('<script src="properties-data.js"></script>', `<script>${propJs}</script>`);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
    if (details) console.error(`     Details: ${details}`);
    failures.push({ message, details });
  }
}

function createTestSandbox(customStore = {}) {
  const store = { ...customStore };
  const mockStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
    _store: store
  };

  const dom = new JSDOM(rawHtml, {
    runScripts: 'dangerously',
    url: 'http://localhost/admin.html',
    beforeParse(win) {
      Object.defineProperty(win, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true
      });
    }
  });

  return { dom, window: dom.window, document: dom.window.document, storage: mockStorage };
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 1: DOM Hierarchy & Section Layouts
// ─────────────────────────────────────────────────────────────
console.log('▶ CHALLENGE 1: 3-Tier Layout & Static Markup Conformance');
{
  const { document } = createTestSandbox();

  // 1.1 Root Sections
  assert(!!document.getElementById('section-dashboard'), 'Section #section-dashboard is present');
  assert(document.getElementById('section-dashboard').classList.contains('active'), 'Dashboard section is active by default');

  // 1.2 3 Blocks
  assert(!!document.getElementById('dash-block-1'), 'Block 1 (#dash-block-1) exists in DOM');
  assert(!!document.getElementById('dash-block-2'), 'Block 2 (#dash-block-2) exists in DOM');
  assert(!!document.getElementById('dash-block-3'), 'Block 3 (#dash-block-3) exists in DOM');

  // 1.3 6 KPI Cards in Block 1
  const kpiIds = [
    'kpi-dev-count',
    'kpi-zhk-count',
    'kpi-users-count',
    'kpi-views-count',
    'kpi-leads-count',
    'kpi-monetization-revenue'
  ];
  kpiIds.forEach(id => {
    assert(!!document.getElementById(id), `KPI metric element #${id} is present`);
  });

  // 1.4 Micro-Summary Bar in Block 1
  const summaryBar = document.querySelector('.dash-kpi-summary-bar');
  assert(!!summaryBar, 'Micro-summary bar (.dash-kpi-summary-bar) exists in Block 1');
  assert(!!document.getElementById('dash-top-pages-list'), 'Top-3 pages list (#dash-top-pages-list) exists');
  assert(!!document.getElementById('dash-top-queries-list'), 'Top-3 queries list (#dash-top-queries-list) exists');
  assert(!!document.getElementById('dash-top-traffic-list'), 'Top-3 traffic list (#dash-top-traffic-list) exists');

  const pageItems = document.querySelectorAll('#dash-top-pages-list li');
  const queryItems = document.querySelectorAll('#dash-top-queries-list li');
  const trafficItems = document.querySelectorAll('#dash-top-traffic-list li');
  assert(pageItems.length === 3, 'Top-3 pages contains exactly 3 ranked items', `Found: ${pageItems.length}`);
  assert(queryItems.length === 3, 'Top-3 queries contains exactly 3 ranked items', `Found: ${queryItems.length}`);
  assert(trafficItems.length === 3, 'Top-3 traffic contains exactly 3 ranked items', `Found: ${trafficItems.length}`);

  // 1.5 Center Widgets in Block 2
  assert(!!document.querySelector('.dash-two-cols'), 'Two-column grid container (.dash-two-cols) exists');
  assert(!!document.getElementById('dash-incoming-leads'), 'Incoming leads container (#dash-incoming-leads) exists');
  assert(!!document.getElementById('dash-leads-count-badge'), 'Leads counter badge (#dash-leads-count-badge) exists');
  assert(!!document.getElementById('dash-moderation-widget'), 'Moderation widget (#dash-moderation-widget) exists');
  assert(!!document.getElementById('dash-developer-notifs'), 'Developer notifications feed (#dash-developer-notifs) exists');
  assert(!!document.getElementById('dash-notifs-count-badge'), 'Notifications count badge (#dash-notifs-count-badge) exists');
  assert(!!document.getElementById('dash-support-tickets'), 'Support tickets feed (#dash-support-tickets) exists');
  assert(!!document.getElementById('dash-tickets-count-badge'), 'Tickets count badge (#dash-tickets-count-badge) exists');
  assert(!!document.getElementById('dash-audit-counter'), 'Audit log counter widget (#dash-audit-counter) exists');

  // 1.6 Quick Actions in Block 3
  const tiles = document.querySelectorAll('#dash-block-3 .quick-action-tile');
  assert(tiles.length >= 6, 'Quick actions grid in Block 3 contains at least 6 action tiles', `Found: ${tiles.length}`);

  // 1.7 Tickets Modal
  assert(!!document.getElementById('tickets-feed-modal'), 'Support tickets modal overlay (#tickets-feed-modal) exists');
  assert(!!document.getElementById('tickets-modal-body'), 'Tickets modal body container exists');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 2: Interactive Behaviors & Navigation Handlers
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 2: Interactive Behaviors & Section Switching');
{
  const { window, document } = createTestSandbox();

  // 2.1 switchAdminSection('dashboard')
  window.switchAdminSection('dashboard');
  assert(document.getElementById('section-dashboard').classList.contains('active'), 'switchAdminSection("dashboard") activates #section-dashboard');

  // 2.2 Micro-Summary «Подробнее →» button -> switchAdminSection('stats')
  const statsBtn = document.querySelector('.dash-stats-btn');
  assert(!!statsBtn, '«Подробнее →» button exists in micro-summary bar');
  statsBtn.click();
  assert(document.getElementById('section-stats').classList.contains('active'), 'Clicking «Подробнее →» switches active section to #section-stats');
  assert(!document.getElementById('section-dashboard').classList.contains('active'), 'Dashboard section deactivated after switching to stats');

  // Return to dashboard
  window.switchAdminSection('dashboard');

  // 2.3 Moderation Widget Button -> switchAdminSection('properties')
  window.renderDashboard();
  const modBtn = document.querySelector('#dash-moderation-widget button');
  assert(!!modBtn, 'Moderation widget contains action button');
  modBtn.click();
  assert(document.getElementById('section-properties').classList.contains('active'), 'Clicking moderation action button navigates to #section-properties');

  // Return to dashboard
  window.switchAdminSection('dashboard');

  // 2.4 Developer Notifications Links
  const notifLinks = document.querySelectorAll('#dash-developer-notifs .dash-notif-link');
  assert(notifLinks.length > 0, 'Developer notification cards contain action links');
  const firstLink = notifLinks[0];
  firstLink.click();
  // Depending on notification action, should navigate to placements / monetization / blog
  const isSectionChanged = !document.getElementById('section-dashboard').classList.contains('active');
  assert(isSectionChanged, 'Clicking notification link triggers navigation away from dashboard');

  // Return to dashboard
  window.switchAdminSection('dashboard');

  // 2.5 Tickets Modal Open & Close
  const ticketsBtn = document.querySelector('.dash-tickets-card button');
  assert(!!ticketsBtn, '«Все тикеты» button is present on tickets card');
  ticketsBtn.click();
  const modal = document.getElementById('tickets-feed-modal');
  assert(modal.style.display === 'flex' || modal.style.display === 'block', 'Clicking «Все тикеты» opens #tickets-feed-modal dialog');

  const modalCloseBtn = modal.querySelector('.admin-modal-close');
  assert(!!modalCloseBtn, 'Modal close button (&times;) is present');
  modalCloseBtn.click();
  assert(modal.style.display === 'none', 'Clicking modal close button hides #tickets-feed-modal dialog');

  // 2.6 Audit Counter Button -> switchAdminSection('audit-log')
  const auditBtn = document.querySelector('#dash-audit-counter button');
  assert(!!auditBtn, 'Audit counter widget contains navigation button');
  auditBtn.click();
  assert(document.getElementById('section-audit-log').classList.contains('active'), 'Clicking audit counter button navigates to #section-audit-log');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 3: Dynamic Data Rendering & Tag Extraction
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 3: Dynamic Data Rendering, Seed Leads & Tag Badges');
{
  const { window, document } = createTestSandbox();
  window.renderDashboard();

  // 3.1 KPI numbers updated
  const devVal = document.getElementById('kpi-dev-count').textContent.trim();
  const zhkVal = document.getElementById('kpi-zhk-count').textContent.trim();
  const leadsVal = document.getElementById('kpi-leads-count').textContent.trim();
  assert(devVal !== '' && !isNaN(Number(devVal)), `KPI Developers count is dynamically calculated (${devVal})`);
  assert(zhkVal !== '' && !isNaN(Number(zhkVal)), `KPI Active ZHK count is dynamically calculated (${zhkVal})`);
  assert(leadsVal !== '', `KPI Leads count is populated (${leadsVal})`);

  // 3.2 Incoming Leads Feed items
  const leadItems = document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(leadItems.length >= 10 && leadItems.length <= 15, `Incoming leads feed renders 10-15 leads (${leadItems.length} rendered)`);

  // 3.3 Four Tags per lead verification
  let tagsChecked = 0;
  let invalidTagCount = 0;
  leadItems.forEach((item, idx) => {
    const pageTag = item.querySelector('.lead-tag.tag-page');
    const zhkTag = item.querySelector('.lead-tag.tag-zhk');
    const ctaTag = item.querySelector('.lead-tag.tag-cta');
    const utmTag = item.querySelector('.lead-tag.tag-utm');

    if (pageTag && zhkTag && ctaTag && utmTag) {
      tagsChecked++;
    } else {
      invalidTagCount++;
    }
  });
  assert(invalidTagCount === 0 && tagsChecked === leadItems.length, `All ${leadItems.length} leads have all 4 tags (.tag-page, .tag-zhk, .tag-cta, .tag-utm)`);

  // 3.4 Tag extractor logic verification
  const customTagLead = {
    source: 'calc',
    type: 'mortgage',
    zhkName: 'ЖК «Белый Сад»',
    utmSource: 'yandex_direct',
    utmCampaign: 'promo2026'
  };
  const extracted = window.getLeadTagValues(customTagLead);
  assert(extracted.pageTag === 'Ипотечный калькулятор', 'getLeadTagValues resolves source="calc" to "Ипотечный калькулятор"');
  assert(extracted.ctaTag === 'Заявка на ипотеку', 'getLeadTagValues resolves type="mortgage" to "Заявка на ипотеку"');
  assert(extracted.zhkTag === 'ЖК «Белый Сад»', 'getLeadTagValues resolves zhkName');
  assert(extracted.utmTag.includes('yandex_direct') && extracted.utmTag.includes('promo2026'), 'getLeadTagValues constructs UTM pair');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 4: Paid Leads Guard, Lock Mechanics & Tooltip
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 4: Paid Leads Guard & Lock Mechanics');
{
  const testLeads = [
    {
      id: 'paid-1',
      name: 'Владимир Оплаченный',
      phone: '+7 (911) 111-22-33',
      zhkName: 'ЖК «Seven»',
      isPaidCard: true,
      status: 'new'
    },
    {
      id: 'unpaid-1',
      name: 'Елена Обычная',
      phone: '+7 (921) 333-44-55',
      zhkName: 'ЖК «Автограф»',
      isPaidCard: false,
      ownedBy: 'platform',
      status: 'new'
    },
    {
      id: 'paid-2',
      name: 'Сергей ИзСписка',
      phone: '+7 (909) 555-66-77',
      zhk: 'ЖК «Специальный»',
      status: 'new'
    }
  ];

  const { window, document } = createTestSandbox({
    amber_leads: JSON.stringify(testLeads),
    amber_paid_cards: JSON.stringify(['ЖК «Специальный»'])
  });

  window.renderDashboard();

  const renderedItems = document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(renderedItems.length === 3, 'Rendered 3 custom test leads');

  // Lead 1: Paid card
  const itemPaid1 = renderedItems[0];
  assert(itemPaid1.classList.contains('dash-lead-paid'), 'Paid lead 1 has .dash-lead-paid class');
  assert(!!itemPaid1.querySelector('.dash-paid-lock'), 'Paid lead 1 has .dash-paid-lock element');
  assert(itemPaid1.querySelector('.dash-paid-lock').getAttribute('title') === 'Лид застройщика — не трогать', 'Paid lead 1 lock has tooltip "Лид застройщика — не трогать"');
  const btnPaid1 = itemPaid1.querySelector('button');
  assert(btnPaid1 && btnPaid1.disabled === true, 'Paid lead 1 action button is disabled (disabled=true)');
  assert(btnPaid1.textContent.includes('Лид застройщика — не трогать'), 'Paid lead 1 button text explains lock');

  // Lead 2: Unpaid platform lead
  const itemUnpaid = renderedItems[1];
  assert(!itemUnpaid.classList.contains('dash-lead-paid'), 'Unpaid lead 2 does not have .dash-lead-paid class');
  assert(!itemUnpaid.querySelector('.dash-paid-lock'), 'Unpaid lead 2 does not have lock icon');
  const btnUnpaid = itemUnpaid.querySelector('button');
  assert(btnUnpaid && btnUnpaid.disabled === false, 'Unpaid lead 2 action button is active');
  assert(btnUnpaid.textContent.includes('Обработать лид'), 'Unpaid lead 2 button text says "Обработать лид"');

  // Lead 3: Paid via amber_paid_cards array
  const itemPaid2 = renderedItems[2];
  assert(itemPaid2.classList.contains('dash-lead-paid'), 'Lead 3 matched via amber_paid_cards array has .dash-lead-paid class');
  const btnPaid2 = itemPaid2.querySelector('button');
  assert(btnPaid2 && btnPaid2.disabled === true, 'Lead 3 button is disabled');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 5: Moderation Counter, Developer Notifications & Expiry
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 5: Moderation Counter, Developer Requests & 1-Day Expiry');
{
  // 5.1 Dynamic Moderation Counter
  const testModRecords = [
    { zhkId: 'zhk-1', zhkName: 'ЖК 1', status: 'on_review' },
    { zhkId: 'zhk-2', zhkName: 'ЖК 2', status: 'on_review' },
    { zhkId: 'zhk-3', zhkName: 'ЖК 3', status: 'approved' },
    { zhkId: 'zhk-4', zhkName: 'ЖК 4', status: 'needs_correction' }
  ];

  const envMod = createTestSandbox({
    amber_moderation_zhk_1: JSON.stringify(testModRecords[0]),
    amber_moderation_zhk_2: JSON.stringify(testModRecords[1]),
    amber_moderation_zhk_3: JSON.stringify(testModRecords[2]),
    amber_moderation_zhk_4: JSON.stringify(testModRecords[3])
  });

  envMod.window.renderDashboard();
  const modWidget = envMod.document.getElementById('dash-moderation-widget');
  const modBadge = modWidget.querySelector('.dash-mod-badge-big');
  assert(modBadge && modBadge.textContent.trim() === '2', `Moderation badge reflects exactly 2 pending ZHKs on_review (got ${modBadge.textContent})`);

  // 5.2 Expiry Alert (1-Day threshold)
  const tomorrow = new Date(Date.now() + 18 * 3600 * 1000).toISOString(); // 18 hours (<24h)
  const farFuture = new Date(Date.now() + 15 * 86400 * 1000).toISOString(); // 15 days

  const envExp = createTestSandbox({
    amber_placement_requests: JSON.stringify([
      { id: 'req-1', developerName: 'СК «Калининград»', placementType: 'Баннер Слайдера', requestedAt: new Date().toISOString() }
    ]),
    amber_placements: JSON.stringify({
      urgentAd: { title: 'Главный баннер каталога', developerName: 'ГК «Балтия»', expiryDate: tomorrow },
      farAd: { title: 'Спецразмещение 1', developerName: 'ГК «КСИ»', expiryDate: farFuture }
    })
  });

  envExp.window.renderDashboard();
  const notifsContainer = envExp.document.getElementById('dash-developer-notifs');
  const notifItems = notifsContainer.querySelectorAll('.dash-notif-item');
  assert(notifItems.length >= 2, `Developer notifications feed renders both request and expiring placement (${notifItems.length} items)`);

  const expiryItem = notifsContainer.querySelector('.dash-notif-item.expiry-alert');
  assert(!!expiryItem, 'Expiring placement within 1 day renders with .expiry-alert styling');
  assert(expiryItem.innerHTML.includes('Истекает через 1 день') || expiryItem.innerHTML.includes('остался 1 день') || expiryItem.innerHTML.includes('Срочно'), 'Expiry notification displays urgent label');

  // Verify cabinet sync
  const cabNotifs = JSON.parse(envExp.storage.getItem('amber_cabinet_notifications') || '[]');
  assert(cabNotifs.some(cn => cn.type === 'placement_expiring'), '1-day expiry alert auto-synced to amber_cabinet_notifications for developer cabinet');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 6: Support Tickets & Audit Change Logs
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 6: Support Tickets Feed, Modal & Audit Counter');
{
  const testTickets = {
    't-101': { id: 7001, subject: 'Запрос на изменение реквизитов', status: 'in_progress', statusLabel: 'В работе', date: '25 авг' },
    't-102': { id: 7002, subject: 'Вопрос по продлению тарифа', status: 'resolved', statusLabel: 'Решено', date: '24 авг' }
  };

  const envTickets = createTestSandbox({
    amber_tickets_1: JSON.stringify(testTickets),
    amber_audit_logs_queue_admin: JSON.stringify([
      { id: 'log-1', action: 'update', target: 'zhk-1', hash: 'abc123' },
      { id: 'log-2', action: 'approve', target: 'zhk-2', hash: 'def456' },
      { id: 'log-3', action: 'tariff_change', target: 'dev-1', hash: '789ghi' }
    ])
  });

  envTickets.window.renderDashboard();

  // 6.1 Tickets Feed
  const ticketRows = envTickets.document.querySelectorAll('#dash-support-tickets .dash-ticket-row');
  assert(ticketRows.length === 2, `Support tickets feed rendered 2 tickets from amber_tickets_1`);
  assert(ticketRows[0].innerHTML.includes('#7002') || ticketRows[0].innerHTML.includes('#7001'), 'Tickets feed displays ticket ID');

  // 6.2 Tickets Modal Table
  envTickets.window.openAllTicketsModal();
  const modalBody = envTickets.document.getElementById('tickets-modal-body');
  const tableRows = modalBody.querySelectorAll('tbody tr');
  assert(tableRows.length === 2, `Tickets modal displays all 2 tickets in data table`);
  assert(tableRows[0].innerHTML.includes('#7002') || tableRows[0].innerHTML.includes('#7001'), 'Modal row contains ticket details');

  // 6.3 Audit Counter
  const auditCounter = envTickets.document.getElementById('dash-audit-counter');
  assert(auditCounter.innerHTML.includes('3 изменений') || auditCounter.innerHTML.includes('3') || auditCounter.innerHTML.includes('изменений'), 'Audit counter widget displays dynamic change count from logs queue');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 7: Stress Testing Boundary Conditions & XSS Safety
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 7: Edge Cases (0 Leads, 50 Leads, Malformed JSON, XSS Payloads)');
{
  // 7.1 Empty Leads State
  const envEmpty = createTestSandbox({ amber_leads: '[]' });
  envEmpty.window.renderDashboard();
  const emptyFeed = envEmpty.document.getElementById('dash-incoming-leads');
  assert(emptyFeed.textContent.includes('Новых входящих лидов пока нет'), 'Empty leads list renders friendly placeholder text');
  assert(envEmpty.document.getElementById('dash-leads-count-badge').textContent === '0', 'Empty leads badge displays 0');

  // 7.2 50 Leads Feed Cap
  const fiftyLeads = Array.from({ length: 50 }, (_, i) => ({
    id: `lead-stress-${i}`,
    name: `Клиент ${i}`,
    phone: `+7 900 123-${String(i).padStart(4, '0')}`,
    zhkName: `ЖК ${i}`
  }));
  const env50 = createTestSandbox({ amber_leads: JSON.stringify(fiftyLeads) });
  env50.window.renderDashboard();
  const items50 = env50.document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(items50.length === 15, `50 leads correctly capped to 15 items in dashboard feed (got ${items50.length})`);
  assert(env50.document.getElementById('dash-leads-count-badge').textContent === '50', 'Badge displays total 50 leads');

  // 7.3 Malformed / Null Objects
  const malformedLeads = [null, undefined, {}, { name: 123 }, { id: 'test', source: null, type: undefined }];
  const envMalformed = createTestSandbox({ amber_leads: JSON.stringify(malformedLeads) });
  let noCrash = true;
  try {
    envMalformed.window.renderDashboard();
  } catch(e) {
    noCrash = false;
  }
  assert(noCrash, 'renderDashboard does not crash on malformed/null lead objects');

  // 7.4 XSS Sanitization in Leads
  const xssLeads = [
    {
      id: 'xss-1',
      name: '<script>alert("XSS")</script>Тестовый',
      phone: '<img src=x onerror=alert(1)>',
      zhkName: '<iframe src="evil.com"></iframe>',
      sourceLabel: '<b>Каталог</b>',
      ctaLabel: '<svg onload=alert(1)>',
      utm: '"><script>alert(1)</script>'
    }
  ];
  const envXss = createTestSandbox({ amber_leads: JSON.stringify(xssLeads) });
  envXss.window.renderDashboard();
  const xssItem = envXss.document.querySelector('#dash-incoming-leads .dash-lead-item');
  assert(!xssItem.innerHTML.includes('<script>alert("XSS")</script>'), 'XSS script in client name is escaped');
  assert(!xssItem.innerHTML.includes('<img src=x onerror=alert(1)>'), 'XSS img tag in phone is escaped');
  assert(!xssItem.innerHTML.includes('<iframe src="evil.com"></iframe>'), 'XSS iframe in ZHK name is escaped');
}

// ─────────────────────────────────────────────────────────────
// CHALLENGE 8: Responsive CSS Layout Rules Inspection
// ─────────────────────────────────────────────────────────────
console.log('\n▶ CHALLENGE 8: Responsive CSS Layout Rules Verification');
{
  const cssMatches = {
    dashBlock1: rawHtml.includes('#dash-block-1') || rawHtml.includes('.dash-block-kpis'),
    dashBlock2: rawHtml.includes('#dash-block-2') || rawHtml.includes('.dash-two-cols'),
    dashBlock3: rawHtml.includes('#dash-block-3') || rawHtml.includes('.dash-block-actions'),
    kpiSummaryBar: rawHtml.includes('.dash-kpi-summary-bar'),
    summaryGrid: rawHtml.includes('grid-template-columns') && rawHtml.includes('1fr 1fr 1fr auto'),
    twoColsGrid: rawHtml.includes('.dash-two-cols') && rawHtml.includes('grid-template-columns'),
    tagBadges: rawHtml.includes('.lead-tag.tag-page') && rawHtml.includes('.lead-tag.tag-zhk') && rawHtml.includes('.lead-tag.tag-cta') && rawHtml.includes('.lead-tag.tag-utm'),
    paidCardStyle: rawHtml.includes('.dash-lead-item.dash-lead-paid') && rawHtml.includes('#F0FDF4'),
    paidLockStyle: rawHtml.includes('.dash-paid-lock'),
    modWidgetStyle: rawHtml.includes('.dash-moderation-card') || rawHtml.includes('.dash-moderation-inner'),
    notifsFeedStyle: rawHtml.includes('.dash-notifs-feed') && rawHtml.includes('.dash-notif-item.expiry-alert'),
    ticketsFeedStyle: rawHtml.includes('.dash-tickets-feed') && rawHtml.includes('.dash-ticket-row'),
    auditCardStyle: rawHtml.includes('.dash-audit-card') || rawHtml.includes('.dash-audit-inner'),
    mediaQueries: rawHtml.includes('@media') && (rawHtml.includes('1024px') || rawHtml.includes('768px') || rawHtml.includes('900px'))
  };

  assert(cssMatches.dashBlock1, 'CSS contains styles for Block 1 (.dash-block-kpis / #dash-block-1)');
  assert(cssMatches.dashBlock2, 'CSS contains styles for Block 2 (.dash-two-cols / #dash-block-2)');
  assert(cssMatches.dashBlock3, 'CSS contains styles for Block 3 (.dash-block-actions / #dash-block-3)');
  assert(cssMatches.kpiSummaryBar, 'CSS contains styles for .dash-kpi-summary-bar');
  assert(cssMatches.summaryGrid, 'CSS specifies 4-column responsive grid (1fr 1fr 1fr auto) for micro-summary bar');
  assert(cssMatches.twoColsGrid, 'CSS specifies two-column grid layout (.dash-two-cols)');
  assert(cssMatches.tagBadges, 'CSS contains tag badge styles for all 4 tags (.tag-page, .tag-zhk, .tag-cta, .tag-utm)');
  assert(cssMatches.paidCardStyle, 'CSS contains paid lead card green styling (.dash-lead-paid, #F0FDF4)');
  assert(cssMatches.paidLockStyle, 'CSS contains paid lead lock icon styling (.dash-paid-lock)');
  assert(cssMatches.modWidgetStyle, 'CSS contains pending moderation widget styling (.dash-moderation-card)');
  assert(cssMatches.notifsFeedStyle, 'CSS contains developer notifications and expiry alert styling (.expiry-alert)');
  assert(cssMatches.ticketsFeedStyle, 'CSS contains support tickets feed styling (.dash-ticket-row)');
  assert(cssMatches.auditCardStyle, 'CSS contains audit counter card styling (.dash-audit-card)');
  assert(cssMatches.mediaQueries, 'CSS contains responsive breakpoint media queries for dashboard layouts');
}

// ─────────────────────────────────────────────────────────────
// FINAL VERDICT
// ─────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TOTAL ASSERTIONS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
if (failedTests === 0) {
  console.log('VERDICT: APPROVE — ALL EMPIRICAL CHALLENGES SATISFIED');
} else {
  console.log(`VERDICT: REQUEST_CHANGES — ${failedTests} CHALLENGE(S) FAILED`);
}
console.log('================================================================');

process.exit(failedTests > 0 ? 1 : 0);
