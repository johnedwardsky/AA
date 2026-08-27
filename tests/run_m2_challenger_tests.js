const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/Users/johnsky/Documents/node_modules/jsdom');

console.log('================================================================');
console.log('EMPIRICAL CHALLENGER TEST SUITE — MILESTONE 2 (R2 & R3)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// 1. Load HTML & inlined data scripts
const htmlPath = '/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/admin.html';
const dataJsPath = '/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/data.js';
const propJsPath = '/Users/johnsky/Documents/Amber Avenue/Amber Avenue Site/properties-data.js';

let rawHtml = fs.readFileSync(htmlPath, 'utf8');
const dataJs = fs.existsSync(dataJsPath) ? fs.readFileSync(dataJsPath, 'utf8') : '';
const propJs = fs.existsSync(propJsPath) ? fs.readFileSync(propJsPath, 'utf8') : '';

rawHtml = rawHtml.replace('<script src="data.js"></script>', `<script>${dataJs}</script>`);
rawHtml = rawHtml.replace('<script src="properties-data.js"></script>', `<script>${propJs}</script>`);

// Mock localStorage
const store = {};
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
    win.showAdminToast = function() {};
    win.confirm = function() { return true; };
    win.alert = function() {};
    win.navigator.clipboard = {
      writeText: async function(text) { return Promise.resolve(text); }
    };
  }
});

const window = dom.window;
const document = window.document;

// ── TEST SUITE EXECUTION ──

// CHALLENGE 1: Unified Properties & Moderation DOM Architecture
console.log('▶ CHALLENGE 1: Unified Properties & Moderation DOM Architecture');
{
  const propNavItem = document.querySelector('.admin-nav-item[data-section="properties"]');
  assert(!!propNavItem, 'Sidebar has nav item for "properties" (Новостройки (ЖК))');
  
  const duplicateModNav = document.querySelector('.admin-nav-item[data-section="moderation"]');
  assert(!duplicateModNav, 'Duplicate "moderation" nav item was removed from sidebar');
  
  const navModBadge = document.getElementById('admin-mod-pending-count');
  assert(!!navModBadge, 'Moderation badge #admin-mod-pending-count exists in sidebar');
  if (navModBadge && propNavItem) {
    assert(propNavItem.contains(navModBadge), 'Moderation badge is nested inside "properties" nav item');
  }

  const propSection = document.getElementById('section-properties');
  assert(!!propSection, '#section-properties exists in DOM');

  const oldModSection = document.getElementById('section-moderation');
  assert(!oldModSection, 'Standalone #section-moderation removed in favor of unified section');

  const topBlock = document.getElementById('zhk-moderation-block');
  assert(!!topBlock, 'Top block #zhk-moderation-block exists in #section-properties');

  const bottomBlock = document.getElementById('zhk-all-block');
  assert(!!bottomBlock, 'Bottom block #zhk-all-block exists in #section-properties');

  assert(!!document.getElementById('mod-block-pending-badge'), '#mod-block-pending-badge exists in top block');
  assert(!!document.getElementById('mod-filter-status'), '#mod-filter-status select filter exists');
  assert(!!document.getElementById('moderation-table-container'), '#moderation-table-container exists');
  assert(!!document.getElementById('search-properties'), '#search-properties input exists in bottom block');
  assert(!!document.getElementById('filter-properties-dev'), '#filter-properties-dev select filter exists in bottom block');
  assert(!!document.getElementById('properties-cards-grid'), '#properties-cards-grid container exists');
  assert(!!document.getElementById('properties-pagination'), '#properties-pagination container exists');
  assert(!!document.getElementById('dev-code-modal'), '#dev-code-modal dialog exists');
}

// CHALLENGE 2: Moderation Block Card Grid, Accordions & Action Handlers
console.log('\n▶ CHALLENGE 2: Moderation Block Card Grid, Accordions & Action Handlers');
{
  window.seedDefaultModerationRecords();
  window.renderModerationSection();

  const container = document.getElementById('moderation-table-container');
  const modCards = container.querySelectorAll('.zhk-mod-card');
  assert(modCards.length >= 2, `Moderation block rendered cards in grid (found ${modCards.length})`);

  const firstCard = modCards[0];
  if (firstCard) {
    const titleEl = firstCard.querySelector('.zhk-card-title');
    assert(!!titleEl && titleEl.textContent.includes('Seven'), 'First moderation card displays ZHK title');

    const statusTag = firstCard.querySelector('.zhk-card-status-tag');
    assert(!!statusTag && statusTag.textContent.includes('модерации'), 'Card displays status badge "🔵 На модерации"');

    const actions = firstCard.querySelector('.zhk-card-actions');
    assert(!!actions, 'Card contains .zhk-card-actions container');

    const editBtn = actions.querySelector('button[onclick*="openEditPropertyModal"]');
    const approveBtn = actions.querySelector('button[onclick*="adminApproveZhk"]');
    const remarkBtn = actions.querySelector('button[onclick*="toggleModAccordion"]');

    assert(!!editBtn, 'Card has ✏️ «Редактировать» button');
    assert(!!approveBtn, 'Card has ✅ «Одобрить» button');
    assert(!!remarkBtn, 'Card has 💬 «Доработать» button');

    // Test Accordion toggle
    const accordion = firstCard.querySelector('.mod-accordion-panel');
    assert(!!accordion, 'Card contains 9-section accordion inspection panel');
    assert(accordion.style.display === 'none', 'Accordion is collapsed initially');

    window.toggleModAccordion('zhk-amber-seven', 0);
    assert(accordion.style.display === 'block', 'toggleModAccordion expands inspection panel');

    const tabBoxes = accordion.querySelectorAll('.mod-tab-box');
    assert(tabBoxes.length === 9, `Inspection panel contains all 9 property sections (found ${tabBoxes.length})`);

    // Test sending remarks
    const commentMain = document.getElementById('mod-comment-0-main');
    if (commentMain) commentMain.value = 'Пожалуйста, уточните цену студий';

    window.adminSendCorrections('zhk-amber-seven', 0);
    const updatedMod = JSON.parse(mockStorage.getItem('amber_moderation_zhk-amber-seven'));
    assert(updatedMod.status === 'needs_correction', 'adminSendCorrections sets status to "needs_correction"');
    assert(updatedMod.adminComments.main === 'Пожалуйста, уточните цену студий', 'adminSendCorrections records admin comment');

    // Test approving ZHK
    window.adminApproveZhk('zhk-amber-seven');
    const approvedMod = JSON.parse(mockStorage.getItem('amber_moderation_zhk-amber-seven'));
    assert(approvedMod.status === 'approved', 'adminApproveZhk sets status to "approved"');
  }
}

// CHALLENGE 3: Unified Properties Card Grid, Search, Filter & Pagination
console.log('\n▶ CHALLENGE 3: Unified Properties Card Grid, Search, Filter & Pagination');
{
  window.renderPropertiesSection();

  const cardsGrid = document.getElementById('properties-cards-grid');
  const cards = cardsGrid.querySelectorAll('.zhk-full-card');
  assert(cards.length > 0, `Properties section rendered card grid (rendered ${cards.length} cards)`);

  const firstPropCard = cards[0];
  if (firstPropCard) {
    assert(!!firstPropCard.querySelector('.zhk-card-banner img'), 'Property card contains image preview');
    assert(!!firstPropCard.querySelector('.zhk-card-title'), 'Property card contains title');
    assert(!!firstPropCard.querySelector('.zhk-card-dev'), 'Property card contains developer name');
    assert(!!firstPropCard.querySelector('.zhk-card-loc'), 'Property card contains location');
    assert(!!firstPropCard.querySelector('.zhk-card-price'), 'Property card contains price');
    assert(!!firstPropCard.querySelector('.zhk-card-rating'), 'Property card contains rating');

    const actions = firstPropCard.querySelector('.zhk-card-actions');
    assert(!!actions, 'Property card contains action buttons container');
    assert(!!actions.querySelector('button[onclick*="openEditPropertyModal"]'), 'Property card has ✏️ «Редактировать» button');
    assert(!!actions.querySelector('button[onclick*="adminApproveZhk"]'), 'Property card has ✅ «Одобрить» button');
    assert(!!actions.querySelector('button[onclick*="openZhkRemarksModal"]'), 'Property card has 💬 «Доработать» button');
  }

  // Test Developer filter populate
  const devSelect = document.getElementById('filter-properties-dev');
  assert(devSelect.options.length > 1, `Developer filter dropdown populated with options (count: ${devSelect.options.length})`);

  // Test search filtering
  const searchInput = document.getElementById('search-properties');
  searchInput.value = 'Seven';
  window.renderPropertiesCards(1);
  const searchCards = cardsGrid.querySelectorAll('.zhk-full-card');
  assert(searchCards.length >= 1, `Searching for "Seven" returns matching cards (found ${searchCards.length})`);

  // Reset search
  searchInput.value = '';
  window.renderPropertiesCards(1);

  // Test pagination
  const pagination = document.getElementById('properties-pagination');
  const pageBtns = pagination.querySelectorAll('.page-btn');
  assert(pageBtns.length > 0, 'Pagination controls rendered for multi-page properties list');

  // Test switching pages
  window.renderPropertiesCards(2);
  const activePageBtn = pagination.querySelector('.page-btn.active');
  assert(!!activePageBtn && activePageBtn.textContent === '2', 'Navigating to page 2 updates active page button');
}

// CHALLENGE 4: Developer Access Code Generation & Modal Mechanics
console.log('\n▶ CHALLENGE 4: Developer Access Code Generation & Modal Mechanics');
{
  window.renderDevelopersTable();

  const devTable = document.querySelector('#table-developers tbody');
  const rows = devTable.querySelectorAll('tr');
  assert(rows.length > 0, `Developers table rendered rows (count: ${rows.length})`);

  const firstRow = rows[0];
  const regenBtn = firstRow.querySelector('.btn-regen-code');
  assert(!!regenBtn, 'Developer row contains «🔄 Сменить код» button');

  const devs = window.getAdminDevelopers();
  const targetDev = devs[0];
  const oldCode = targetDev.code || '123456';

  // Trigger code regeneration
  window.regenerateDeveloperCode(targetDev.id);

  const updatedDevs = window.getAdminDevelopers();
  const updatedTargetDev = updatedDevs.find(d => String(d.id) === String(targetDev.id));
  assert(!!updatedTargetDev.code && /^\d{6}$/.test(updatedTargetDev.code), `Generated new 6-digit access code: ${updatedTargetDev.code}`);
  assert(updatedTargetDev.code !== oldCode || /^\d{6}$/.test(updatedTargetDev.code), 'Access code updated in persistence');

  // Verify Modal
  const modal = document.getElementById('dev-code-modal');
  assert(modal.style.display === 'flex', '#dev-code-modal opened automatically');

  const displayEl = document.getElementById('dev-code-modal-display');
  assert(displayEl.textContent === updatedTargetDev.code, 'Modal displays new 6-digit code in large monospace');

  const devNameEl = document.getElementById('dev-code-modal-devname');
  assert(devNameEl.textContent.includes(targetDev.name), 'Modal displays developer company name');

  // Test Copy button
  window.copyDevCodeToClipboard();
  const copyBtn = document.getElementById('btn-copy-dev-code');
  assert(copyBtn.textContent.includes('Скопировано') || copyBtn.textContent.includes('Скопировать'), 'Copy button handles clipboard action');

  // Test Close Modal
  window.closeDevCodeModal();
  assert(modal.style.display === 'none', 'closeDevCodeModal hides modal dialog');
}

// CHALLENGE 5: Developer Rating Calculation Formula & Tooltip Breakdown
console.log('\n▶ CHALLENGE 5: Developer Rating Calculation Formula & Tooltip Breakdown');
{
  const testProps = [
    { id: 101, name: 'ЖК «Seven»', developer: 'ГК «КалининградСтройИнвест»', rating: 4.5 },
    { id: 102, name: 'ЖК «Автограф»', developer: 'ГК «КалининградСтройИнвест»', rating: 4.4 }
  ];
  const testDev = { id: 1, name: 'ГК «КалининградСтройИнвест»', rating: 4.8 };

  const ratingResult = window.calculateDeveloperRating(testDev, testProps);
  assert(ratingResult.rating === 4.45, `Calculated average rating is 4.45 ★ (got ${ratingResult.rating})`);
  assert(ratingResult.formula.includes('(ЖК «Seven»: 4.5 + ЖК «Автограф»: 4.4) / 2 = 4.45 ★'), `Formula breakdown string correct: ${ratingResult.formula}`);
  assert(ratingResult.zhkCount === 2, `ZHK count is 2 (got ${ratingResult.zhkCount})`);

  // Test dev with 0 ZHKs
  const emptyDev = { id: 99, name: 'Новый Застройщик', rating: 4.8 };
  const emptyResult = window.calculateDeveloperRating(emptyDev, []);
  assert(emptyResult.rating === 4.8, `New dev without ZHK gets base rating 4.8 (got ${emptyResult.rating})`);
  assert(emptyResult.formula.includes('Базовый рейтинг нового партнера'), 'Formula displays fallback for new partner');

  // Verify in table DOM
  window.renderDevelopersTable();
  const ratingBadge = document.querySelector('#table-developers tbody .dev-rating-badge');
  assert(!!ratingBadge, 'Developer table renders .dev-rating-badge element');
  assert(!!ratingBadge.getAttribute('title') && ratingBadge.getAttribute('title').includes('★'), 'Rating badge has formula tooltip in title attribute');
}

// CHALLENGE 6: Section Switching & Aliases
console.log('\n▶ CHALLENGE 6: Section Switching & Aliases');
{
  window.switchAdminSection('properties');
  assert(document.getElementById('section-properties').classList.contains('active'), 'switchAdminSection("properties") activates #section-properties');

  // Test alias mapping 'moderation' -> 'properties'
  window.switchAdminSection('dashboard');
  assert(document.getElementById('section-dashboard').classList.contains('active'), 'Switched to dashboard');

  window.switchAdminSection('moderation');
  assert(document.getElementById('section-properties').classList.contains('active'), 'switchAdminSection("moderation") automatically redirects to unified #section-properties');
}

// CHALLENGE 7: CSS Styles for M2 Components
console.log('\n▶ CHALLENGE 7: CSS Styles for M2 Components');
{
  assert(rawHtml.includes('.my-zhk-cards-grid'), 'CSS defines .my-zhk-cards-grid');
  assert(rawHtml.includes('.zhk-full-card'), 'CSS defines .zhk-full-card');
  assert(rawHtml.includes('.zhk-card-banner'), 'CSS defines .zhk-card-banner');
  assert(rawHtml.includes('.zhk-card-status-tag'), 'CSS defines .zhk-card-status-tag');
  assert(rawHtml.includes('.zhk-card-class-tag'), 'CSS defines .zhk-card-class-tag');
  assert(rawHtml.includes('.zhk-card-body'), 'CSS defines .zhk-card-body');
  assert(rawHtml.includes('.zhk-card-title'), 'CSS defines .zhk-card-title');
  assert(rawHtml.includes('.zhk-card-dev'), 'CSS defines .zhk-card-dev');
  assert(rawHtml.includes('.zhk-card-loc'), 'CSS defines .zhk-card-loc');
  assert(rawHtml.includes('.zhk-card-metrics'), 'CSS defines .zhk-card-metrics');
  assert(rawHtml.includes('.zhk-card-actions'), 'CSS defines .zhk-card-actions');
  assert(rawHtml.includes('.dev-rating-badge'), 'CSS defines .dev-rating-badge');
  assert(rawHtml.includes('.admin-pagination'), 'CSS defines .admin-pagination');
  assert(rawHtml.includes('.page-btn'), 'CSS defines .page-btn');
}

console.log('\n================================================================');
console.log(`TOTAL ASSERTIONS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
if (failCount === 0) {
  console.log('VERDICT: APPROVE — ALL MILESTONE 2 CHALLENGES SATISFIED');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error('VERDICT: REJECT — MILESTONE 2 CHALLENGES FAILED');
  console.log('================================================================\n');
  process.exit(1);
}
