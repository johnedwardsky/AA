const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('====================================================');
console.log('RUNNING EMPIRICAL TEST SUITE: MILESTONE 1 DASHBOARD');
console.log('====================================================\n');

const htmlPath = path.resolve(__dirname, '../admin.html');
const dataJsPath = path.resolve(__dirname, '../data.js');
const propertiesDataJsPath = path.resolve(__dirname, '../properties-data.js');

const rawHtml = fs.readFileSync(htmlPath, 'utf8');
const dataJs = fs.existsSync(dataJsPath) ? fs.readFileSync(dataJsPath, 'utf8') : 'window.AMBER_DATA = {};';
const propertiesDataJs = fs.existsSync(propertiesDataJsPath) ? fs.readFileSync(propertiesDataJsPath, 'utf8') : '';

// Create HTML with inlined scripts so JSDOM can execute without network requests
let preparedHtml = rawHtml
  .replace('<script src="data.js"></script>', `<script>${dataJs}</script>`)
  .replace('<script src="properties-data.js"></script>', `<script>${propertiesDataJs}</script>`);

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

function createTestEnvironment(customLocalStorage = {}) {
  const store = { ...customLocalStorage };
  const mockStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
    _store: store
  };

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  virtualConsole.on('error', () => {});

  const dom = new JSDOM(preparedHtml, {
    runScripts: 'dangerously',
    url: 'https://example.com/admin.html',
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
    }
  });

  return { dom, window: dom.window, document: dom.window.document, storage: mockStorage };
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE 1: Static DOM Structure & Elements
// ─────────────────────────────────────────────────────────────
console.log('▶ TEST SUITE 1: Static DOM Structure & Elements (F-01, F-02)');
{
  const { document } = createTestEnvironment();

  assert(!!document.getElementById('section-dashboard'), 'Section #section-dashboard exists');
  assert(!!document.getElementById('dash-block-1'), 'Block 1 (#dash-block-1) exists');
  assert(!!document.getElementById('dash-block-2'), 'Block 2 (#dash-block-2) exists');
  assert(!!document.getElementById('dash-block-3'), 'Block 3 (#dash-block-3) exists');

  // KPI elements
  const kpis = [
    'kpi-dev-count',
    'kpi-zhk-count',
    'kpi-leads-count',
    'kpi-users-count',
    'kpi-views-count',
    'kpi-monetization-revenue'
  ];
  kpis.forEach(id => {
    assert(!!document.getElementById(id), `KPI element #${id} exists`);
  });

  // Micro-summary bar
  assert(!!document.querySelector('.dash-kpi-summary-bar'), 'Summary bar .dash-kpi-summary-bar exists');
  assert(!!document.getElementById('dash-top-pages-list'), '#dash-top-pages-list exists');
  assert(!!document.getElementById('dash-top-queries-list'), '#dash-top-queries-list exists');
  assert(!!document.getElementById('dash-top-traffic-list'), '#dash-top-traffic-list exists');

  const pageItems = document.querySelectorAll('#dash-top-pages-list li');
  const queryItems = document.querySelectorAll('#dash-top-queries-list li');
  const trafficItems = document.querySelectorAll('#dash-top-traffic-list li');
  assert(pageItems.length === 3, 'Top pages list has exactly 3 items', `Found: ${pageItems.length}`);
  assert(queryItems.length === 3, 'Top queries list has exactly 3 items', `Found: ${queryItems.length}`);
  assert(trafficItems.length === 3, 'Top traffic list has exactly 3 items', `Found: ${trafficItems.length}`);

  const moreBtn = document.querySelector('.dash-kpi-summary-action button');
  assert(moreBtn && moreBtn.getAttribute('onclick') === "switchAdminSection('stats')", 'Summary bar button links to switchAdminSection("stats")');

  // Two columns & center widgets
  assert(!!document.querySelector('.dash-two-cols'), '.dash-two-cols layout exists');
  assert(!!document.getElementById('dash-incoming-leads'), '#dash-incoming-leads exists');
  assert(!!document.getElementById('dash-leads-count-badge'), '#dash-leads-count-badge exists');
  assert(!!document.getElementById('dash-moderation-widget'), '#dash-moderation-widget exists');
  assert(!!document.getElementById('dash-developer-notifs'), '#dash-developer-notifs exists');
  assert(!!document.getElementById('dash-notifs-count-badge'), '#dash-notifs-count-badge exists');
  assert(!!document.getElementById('dash-support-tickets'), '#dash-support-tickets exists');
  assert(!!document.getElementById('dash-tickets-count-badge'), '#dash-tickets-count-badge exists');
  assert(!!document.getElementById('dash-audit-counter'), '#dash-audit-counter exists');

  // Quick actions
  const actionTiles = document.querySelectorAll('.quick-action-tile');
  assert(actionTiles.length >= 6, 'Quick action tiles >= 6 present in Block 3', `Found: ${actionTiles.length}`);

  // Support tickets modal
  assert(!!document.getElementById('tickets-feed-modal'), '#tickets-feed-modal dialog exists');
  assert(!!document.getElementById('tickets-modal-body'), '#tickets-modal-body exists');
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE 2: Standard Execution & Initial Seed Data
// ─────────────────────────────────────────────────────────────
console.log('\n▶ TEST SUITE 2: Standard Startup Execution & Widgets (F-01..F-08)');
{
  const { window, document } = createTestEnvironment();

  assert(typeof window.renderDashboard === 'function', 'window.renderDashboard is exported as a function');
  assert(typeof window.renderDashboardKpis === 'function', 'window.renderDashboardKpis is exported as a function');
  assert(typeof window.renderIncomingLeads === 'function', 'window.renderIncomingLeads is exported as a function');
  assert(typeof window.renderDashboardModerationWidget === 'function', 'window.renderDashboardModerationWidget is exported as a function');
  assert(typeof window.renderDeveloperNotifications === 'function', 'window.renderDeveloperNotifications is exported as a function');
  assert(typeof window.renderDashboardTickets === 'function', 'window.renderDashboardTickets is exported as a function');
  assert(typeof window.renderDashboardAuditCounter === 'function', 'window.renderDashboardAuditCounter is exported as a function');

  // Trigger renderDashboard
  let renderError = null;
  try {
    window.renderDashboard();
  } catch (err) {
    renderError = err;
  }
  assert(!renderError, 'renderDashboard() executes with 0 runtime errors', renderError ? renderError.stack : '');

  // Verify KPI values populated
  const devVal = document.getElementById('kpi-dev-count').textContent;
  const zhkVal = document.getElementById('kpi-zhk-count').textContent;
  const leadsVal = document.getElementById('kpi-leads-count').textContent;
  assert(parseInt(devVal) > 0, `KPI dev count populated (${devVal})`);
  assert(parseInt(zhkVal) > 0, `KPI zhk count populated (${zhkVal})`);
  assert(leadsVal.length > 0, `KPI leads count populated (${leadsVal})`);

  // Verify Incoming leads rendered
  const leadItems = document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(leadItems.length > 0, `Incoming leads rendered (${leadItems.length} items)`, `Items count: ${leadItems.length}`);
  assert(leadItems.length <= 15, 'Incoming leads does not exceed 15 items limit');

  // Check 4 tags on lead items
  let allHave4Tags = true;
  leadItems.forEach((el) => {
    const pageTag = el.querySelector('.lead-tag.tag-page');
    const zhkTag = el.querySelector('.lead-tag.tag-zhk');
    const ctaTag = el.querySelector('.lead-tag.tag-cta');
    const utmTag = el.querySelector('.lead-tag.tag-utm');
    if (!pageTag || !zhkTag || !ctaTag || !utmTag) {
      allHave4Tags = false;
    }
  });
  assert(allHave4Tags, 'All rendered leads contain all 4 tag badges (.tag-page, .tag-zhk, .tag-cta, .tag-utm)');

  // Verify Moderation widget
  const modWidget = document.getElementById('dash-moderation-widget');
  assert(modWidget.innerHTML.includes('Карточки на модерации'), 'Moderation widget renders title');
  assert(modWidget.innerHTML.includes('switchAdminSection'), 'Moderation widget has navigation trigger');

  // Verify Developer notifications
  const notifItems = document.querySelectorAll('#dash-developer-notifs .dash-notif-item');
  assert(notifItems.length > 0, `Developer notifications rendered (${notifItems.length} items)`);
  const urgentAlert = document.querySelector('#dash-developer-notifs .dash-notif-item.expiry-alert');
  assert(!!urgentAlert, 'Developer notifications render 1-day expiry alert with .expiry-alert class');
  assert(!!document.querySelector('.dash-expiry-badge'), 'Expiry badge .dash-expiry-badge is rendered');

  // Verify Support Tickets feed
  const ticketRows = document.querySelectorAll('#dash-support-tickets .dash-ticket-row');
  assert(ticketRows.length > 0, `Support tickets feed rendered (${ticketRows.length} tickets)`);

  // Verify Audit Log counter
  const auditCounter = document.getElementById('dash-audit-counter');
  assert(auditCounter.innerHTML.includes('Журнал аудита'), 'Audit log widget renders title');
  assert(auditCounter.innerHTML.includes('изменений'), 'Audit log widget renders changes badge');
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE 3: Paid Leads Guard & Lock Mechanics (F-03, F-04)
// ─────────────────────────────────────────────────────────────
console.log('\n▶ TEST SUITE 3: Paid Leads Guard & Lock Mechanics');
{
  const testLeads = [
    {
      id: 101,
      name: 'Иван Застройщиков',
      phone: '+7 999 111-22-33',
      zhkId: 1,
      zhkName: 'ЖК «Seven»',
      isPaidCard: true,
      status: 'new'
    },
    {
      id: 102,
      name: 'Анна Платформенная',
      phone: '+7 999 444-55-66',
      zhkId: 2,
      zhkName: 'ЖК «Автограф»',
      isPaidCard: false,
      ownedBy: 'platform',
      status: 'new'
    },
    {
      id: 103,
      name: 'Олег ОплаченныйПоСписку',
      phone: '+7 999 777-88-99',
      zhkId: 999, // In amber_paid_cards list
      zhkName: 'ЖК «Морской»',
      status: 'new'
    },
    {
      id: 104,
      name: 'Елена DeveloperOwned',
      phone: '+7 999 000-11-22',
      ownedBy: 'developer',
      status: 'in_progress'
    }
  ];

  const { window, document } = createTestEnvironment({
    amber_leads: JSON.stringify(testLeads),
    amber_paid_cards: JSON.stringify([999, 'ЖК «Специальный»'])
  });

  window.renderIncomingLeads();

  const renderedItems = document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(renderedItems.length === 4, 'Rendered exactly 4 custom test leads');

  // Lead 101 (isPaidCard: true)
  const item101 = renderedItems[0];
  assert(item101.classList.contains('dash-lead-paid'), 'Lead 101 has .dash-lead-paid class');
  assert(!!item101.querySelector('.dash-paid-lock'), 'Lead 101 has .dash-paid-lock element');
  assert(item101.querySelector('.dash-paid-lock').getAttribute('title') === 'Лид застройщика — не трогать', 'Lead 101 lock has tooltip "Лид застройщика — не трогать"');
  const btn101 = item101.querySelector('button');
  assert(btn101 && btn101.disabled === true, 'Lead 101 action button is disabled (disabled=true)');
  assert(btn101 && btn101.textContent.includes('не трогать'), 'Lead 101 button text explains lock');

  // Lead 102 (Unpaid platform lead)
  const item102 = renderedItems[1];
  assert(!item102.classList.contains('dash-lead-paid'), 'Lead 102 does NOT have .dash-lead-paid class');
  assert(!item102.querySelector('.dash-paid-lock'), 'Lead 102 does NOT have .dash-paid-lock');
  const btn102 = item102.querySelector('button');
  assert(btn102 && btn102.disabled === false, 'Lead 102 action button is NOT disabled');
  assert(btn102 && btn102.textContent.includes('Обработать лид'), 'Lead 102 button says "Обработать лид"');

  // Lead 103 (Paid via amber_paid_cards localStorage array)
  const item103 = renderedItems[2];
  assert(item103.classList.contains('dash-lead-paid'), 'Lead 103 (matched via amber_paid_cards) has .dash-lead-paid class');
  const btn103 = item103.querySelector('button');
  assert(btn103 && btn103.disabled === true, 'Lead 103 button is disabled');

  // Lead 104 (ownedBy === 'developer')
  const item104 = renderedItems[3];
  assert(item104.classList.contains('dash-lead-paid'), 'Lead 104 (ownedBy: developer) has .dash-lead-paid class');
  const btn104 = item104.querySelector('button');
  assert(btn104 && btn104.disabled === true, 'Lead 104 button is disabled');
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE 4: Boundary & Edge Case Stress Testing
// ─────────────────────────────────────────────────────────────
console.log('\n▶ TEST SUITE 4: Edge Cases (0 Leads, 50 Leads, Missing Tags, 0 Tickets, Expiry Diff)');
{
  // Edge Case 4.1: Empty Leads (0 leads in getAdminLeads)
  const envEmpty = createTestEnvironment();
  envEmpty.window.getAdminLeads = () => [];
  envEmpty.window.renderIncomingLeads();
  const leadsContainer = envEmpty.document.getElementById('dash-incoming-leads');
  assert(leadsContainer.innerHTML.includes('Новых входящих лидов пока нет'), 'Empty leads displays friendly placeholder "Новых входящих лидов пока нет"');
  assert(envEmpty.document.getElementById('dash-leads-count-badge').textContent === '0', 'Leads badge count shows 0 on empty state');

  // Edge Case 4.2: 50 Leads Stress Test
  const fiftyLeads = Array.from({ length: 50 }, (_, i) => ({
    id: 1000 + i,
    name: `Клиент #${i}`,
    phone: `+7 900 000-${String(i).padStart(4, '0')}`,
    zhkName: `ЖК Комплекс ${i % 5}`,
    isPaidCard: i % 3 === 0
  }));
  const env50 = createTestEnvironment({ amber_leads: JSON.stringify(fiftyLeads) });
  env50.window.renderDashboard();
  const items50 = env50.document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(items50.length === 15, '50 leads correctly capped to 15 in feed view', `Rendered: ${items50.length}`);
  assert(env50.document.getElementById('dash-leads-count-badge').textContent === '50', 'Leads badge correctly displays total 50');

  // Edge Case 4.3: Missing / Null / Broken Lead Tags (Defensive Tag Extractor)
  const malformedLeads = [
    {}, // completely empty
    { source: 'calc', type: 'mortgage' },
    { source: 'card', zhkId: 1 },
    { source: 'mortgage', utmSource: 'yandex_direct', utmCampaign: 'search_brand' },
    { source: 'selection', type: 'selection' },
    { source: 'call', type: 'call' },
    { source: 'availability' },
    { name: '<script>alert(1)</script>', zhkName: '<b>XSS</b>', utm: '"><img src=x onerror=alert(1)>' }
  ];
  const envMalformed = createTestEnvironment({ amber_leads: JSON.stringify(malformedLeads) });
  let malformedError = null;
  try {
    envMalformed.window.renderDashboard();
  } catch (err) {
    malformedError = err;
  }
  assert(!malformedError, 'renderDashboard handles malformed and empty lead objects without errors', malformedError ? malformedError.stack : '');

  const malformedItems = envMalformed.document.querySelectorAll('#dash-incoming-leads .dash-lead-item');
  assert(malformedItems.length === malformedLeads.length, `All ${malformedLeads.length} malformed leads rendered safely`);

  // Verify XSS prevention
  const xssItem = malformedItems[malformedItems.length - 1];
  assert(!xssItem.innerHTML.includes('<script>alert(1)</script>'), 'XSS script injection in name safely escaped');
  assert(xssItem.innerHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'XSS payload converted to HTML entities');

  // Edge Case 4.4: Support Tickets Feed and Modal Interaction
  const customTickets = {
    '1': {
      id: 9001,
      subject: 'Запрос на выгрузку аналитики',
      status: 'in_progress',
      date: 'Сегодня'
    },
    '2': {
      id: 9002,
      subject: 'Замена логотипа застройщика',
      status: 'resolved',
      date: 'Вчера'
    }
  };
  const envTickets = createTestEnvironment({
    amber_tickets_3: JSON.stringify(customTickets)
  });
  envTickets.window.renderDashboard();
  const ticketList = envTickets.document.querySelectorAll('#dash-support-tickets .dash-ticket-row');
  assert(ticketList.length === 2, `Tickets feed rendered 2 custom tickets from amber_tickets_3`, `Count: ${ticketList.length}`);

  // Test openAllTicketsModal and closeAllTicketsModal
  envTickets.window.openAllTicketsModal();
  const modal = envTickets.document.getElementById('tickets-feed-modal');
  const modalBody = envTickets.document.getElementById('tickets-modal-body');
  assert(modal.style.display === 'flex' || modal.style.display === 'block', 'openAllTicketsModal() displays modal');
  assert(modalBody.querySelectorAll('tr').length >= 3, 'Ticket modal table contains header and ticket rows');

  envTickets.window.closeAllTicketsModal();
  assert(modal.style.display === 'none', 'closeAllTicketsModal() hides modal');

  // Edge Case 4.5: Expiration Alert Logic (1-day vs 30-days)
  const tomorrow = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(); // +20h (<1 day)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days
  const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // -5 days

  const envExp = createTestEnvironment({
    amber_placements: JSON.stringify({
      urgentPlacement: {
        title: 'Баннер Срочный',
        developerName: 'Тест Девелопер',
        expiryDate: tomorrow
      },
      farPlacement: {
        title: 'Баннер Далекий',
        developerName: 'Тест Девелопер 2',
        expiryDate: nextMonth
      },
      oldPlacement: {
        title: 'Баннер Старый',
        developerName: 'Тест Девелопер 3',
        expiryDate: past
      }
    })
  });

  envExp.window.renderDashboard();
  const notifs = envExp.window.getDeveloperNotifications();
  const urgentExpNotifs = notifs.filter(n => n.type === 'expiry' && n.isUrgent);
  assert(urgentExpNotifs.length === 1, 'Exactly 1 urgent 1-day expiry notification generated for tomorrow placement', `Found: ${urgentExpNotifs.length}`);
  assert(urgentExpNotifs[0].title.includes('Баннер Срочный'), 'Urgent alert references correct placement title');

  // Verify cabinet sync in amber_cabinet_notifications
  const cabNotifs = JSON.parse(envExp.storage.getItem('amber_cabinet_notifications') || '[]');
  assert(cabNotifs.some(cn => cn.type === 'placement_expiring'), '1-day expiry notification synchronized into amber_cabinet_notifications for developer cabinet');
}

// ─────────────────────────────────────────────────────────────
// SUMMARY & VERDICT
// ─────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
if (failedTests === 0) {
  console.log('VERDICT: ALL EMPIRICAL CHALLENGES PASSED (APPROVE)');
} else {
  console.log(`VERDICT: ${failedTests} FAILURES DETECTED (REQUEST_CHANGES)`);
}
console.log('====================================================');

process.exit(failedTests > 0 ? 1 : 0);
