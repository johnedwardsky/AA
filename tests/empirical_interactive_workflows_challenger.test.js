'use strict';

const assert = require('node:assert');
const path = require('node:path');
const { createAdminSandbox } = require('./harness/dom-sandbox');
const { FIXTURES } = require('./harness/test-fixtures');

let passedTests = 0;
let failedTests = 0;
const testResults = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    passedTests++;
    testResults.push({ name, passed: true, duration });
    console.log(`  ✅ PASS: ${name} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    failedTests++;
    testResults.push({ name, passed: false, duration, error: err.message, stack: err.stack });
    console.error(`  ❌ FAIL: ${name} (${duration}ms)`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    }
  }
}

async function runEmpiricalInteractiveWorkflowsSuite() {
  console.log('\n================================================================================');
  console.log('  🔬 CHALLENGER 2 FINAL: EMPIRICAL PROBING OF ALL 5 INTERACTIVE WORKFLOWS      ');
  console.log('================================================================================\n');

  // ════════════════════════════════════════════════════════════════════════════
  // 1. TELEGRAPH EDITOR INTERACTION & PUBLISHING
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🔹 [1/5] Probing Telegraph Editor Interactions & Publishing...');

  await test('Telegraph: openTelegraphEditor opens editor view and hides list view', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const editorView = sandbox.document.getElementById('telegraph-editor-container');
    const listView = sandbox.document.getElementById('blog-list-view');
    const previewView = sandbox.document.getElementById('telegraph-preview-container');

    assert.strictEqual(editorView.style.display, 'block', 'Editor container must be visible');
    assert.strictEqual(listView.style.display, 'none', 'Blog list view must be hidden');
    assert.strictEqual(previewView.style.display, 'none', 'Preview view must be hidden initially');
  });

  await test('Telegraph: openTelegraphEditor populates fields for existing article', () => {
    const initialArticles = [
      {
        id: 42,
        title: 'Инвестиции в апартаменты Светлогорска 2026',
        author: 'Михаил Решетников',
        category: 'Инвестиции',
        date: '2026-08-20',
        tags: ['апартаменты', 'море', 'доходность'],
        imgSrc: 'svetlogorsk.png',
        content: '<p>Светлогорск демонстрирует стабильный рост спроса.</p>',
        status: 'published'
      }
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_articles: JSON.stringify(initialArticles)
      }
    });

    sandbox.window.openTelegraphEditor(42);

    const titleEl = sandbox.document.getElementById('telegraph-title');
    const authorEl = sandbox.document.getElementById('telegraph-author');
    const catEl = sandbox.document.getElementById('telegraph-category');
    const dateEl = sandbox.document.getElementById('telegraph-date');
    const tagsEl = sandbox.document.getElementById('telegraph-tags');
    const coverUrlEl = sandbox.document.getElementById('telegraph-cover-url');
    const bodyEl = sandbox.document.getElementById('telegraph-body');

    assert.strictEqual(titleEl.innerText, 'Инвестиции в апартаменты Светлогорска 2026');
    assert.strictEqual(authorEl.value, 'Михаил Решетников');
    assert.strictEqual(catEl.value, 'Инвестиции');
    assert.strictEqual(dateEl.value, '2026-08-20');
    assert.ok(tagsEl.value.includes('апартаменты'));
    assert.strictEqual(coverUrlEl.value, 'svetlogorsk.png');
    assert.ok(bodyEl.innerHTML.includes('Светлогорск'));
  });

  await test('Telegraph: Floating toolbar positioning and selection range detection', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const bodyEl = sandbox.document.getElementById('telegraph-body');
    const toolbar = sandbox.document.getElementById('telegraph-floating-toolbar');
    assert.ok(bodyEl, 'telegraph-body must exist');
    assert.ok(toolbar, 'telegraph-floating-toolbar must exist');

    // Simulate window.getSelection within telegraph-body
    const mockRange = {
      commonAncestorContainer: bodyEl,
      getBoundingClientRect: () => ({ top: 250, left: 400, width: 120, height: 20 })
    };

    let mockSelection = {
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: (idx) => (idx === 0 ? mockRange : null)
    };

    sandbox.window.getSelection = () => mockSelection;
    sandbox.window.scrollY = 100;
    sandbox.window.scrollX = 50;

    // Trigger selectionchange listener
    sandbox.document.dispatchEvent({ type: 'selectionchange' });

    assert.strictEqual(toolbar.style.display, 'flex', 'Toolbar must be displayed for active selection');
    assert.ok(toolbar.style.top.endsWith('px'), 'Toolbar top must have pixel positioning');
    assert.ok(toolbar.style.left.endsWith('px'), 'Toolbar left must have pixel positioning');

    // Collapsed selection must hide toolbar
    mockSelection = { isCollapsed: true, rangeCount: 1, getRangeAt: () => mockRange };
    sandbox.document.dispatchEvent({ type: 'selectionchange' });
    assert.strictEqual(toolbar.style.display, 'none', 'Collapsed selection must hide toolbar');

    // Selection outside telegraph-body must hide toolbar
    const outsideEl = sandbox.document.getElementById('telegraph-title');
    const outsideRange = {
      commonAncestorContainer: outsideEl,
      getBoundingClientRect: () => ({ top: 100, left: 100, width: 80, height: 20 })
    };
    mockSelection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => outsideRange };
    sandbox.document.dispatchEvent({ type: 'selectionchange' });
    assert.strictEqual(toolbar.style.display, 'none', 'Selection outside body must hide toolbar');
  });

  await test('Telegraph: Formatting commands (bold, italic, h2, h3, quote, block inserts)', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const executedCommands = [];
    sandbox.document.execCommand = (cmd, showUI, value) => {
      executedCommands.push({ cmd, showUI, value });
      return true;
    };

    sandbox.window.formatTelegraph('bold');
    assert.strictEqual(executedCommands[executedCommands.length - 1].cmd, 'bold');

    sandbox.window.formatTelegraph('italic');
    assert.strictEqual(executedCommands[executedCommands.length - 1].cmd, 'italic');

    sandbox.window.formatTelegraph('h2');
    assert.strictEqual(executedCommands[executedCommands.length - 1].cmd, 'formatBlock');
    assert.strictEqual(executedCommands[executedCommands.length - 1].value, '<h2>');

    sandbox.window.formatTelegraph('h3');
    assert.strictEqual(executedCommands[executedCommands.length - 1].cmd, 'formatBlock');
    assert.strictEqual(executedCommands[executedCommands.length - 1].value, '<h3>');

    sandbox.window.formatTelegraph('quote');
    assert.strictEqual(executedCommands[executedCommands.length - 1].cmd, 'formatBlock');
    assert.strictEqual(executedCommands[executedCommands.length - 1].value, '<blockquote>');

    // Test insertTelegraphBlock quote
    const countBeforeQuote = executedCommands.length;
    sandbox.window.insertTelegraphBlock('quote');
    assert.strictEqual(executedCommands.length, countBeforeQuote + 1, 'insertTelegraphBlock quote must execute 1 command');
    const quoteCmd = executedCommands[executedCommands.length - 1];
    assert.strictEqual(quoteCmd.cmd, 'insertHTML');
    assert.ok(quoteCmd.value.includes('blockquote'));

    // Test insertTelegraphBlock list
    const countBeforeList = executedCommands.length;
    sandbox.window.insertTelegraphBlock('list');
    assert.strictEqual(executedCommands.length, countBeforeList + 1, 'insertTelegraphBlock list must execute 1 command');
    const listCmd = executedCommands[executedCommands.length - 1];
    assert.strictEqual(listCmd.cmd, 'insertHTML');
    assert.ok(listCmd && listCmd.value && listCmd.value.includes('ul'), `listCmd.value was: ${JSON.stringify(listCmd)}`);

    // Test insertTelegraphBlock h2
    sandbox.window.insertTelegraphBlock('h2');
    const h2Cmd = executedCommands[executedCommands.length - 1];
    assert.strictEqual(h2Cmd.cmd, 'insertHTML');
    assert.ok(h2Cmd.value.includes('h2'));
  });

  await test('Telegraph: Cover image preview & URL update', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const box = sandbox.document.getElementById('telegraph-cover-box');
    const prompt = sandbox.document.getElementById('telegraph-cover-empty-prompt');

    sandbox.window.updateTelegraphCoverPreview('kaliningrad_hero_new.jpg');
    assert.ok(box.style.backgroundImage.includes('kaliningrad_hero_new.jpg'), 'Cover box must set backgroundImage');
    assert.strictEqual(prompt.style.display, 'none', 'Empty prompt must be hidden when cover is set');

    sandbox.window.updateTelegraphCoverPreview('');
    assert.strictEqual(box.style.backgroundImage, 'none', 'Cover box backgroundImage must be none when empty');
    assert.strictEqual(prompt.style.display, 'block', 'Empty prompt must be shown when cover is empty');
  });

  await test('Telegraph: toggleTelegraphPreview toggles preview container and renders formatted article', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const titleEl = sandbox.document.getElementById('telegraph-title');
    const bodyEl = sandbox.document.getElementById('telegraph-body');
    const coverUrlEl = sandbox.document.getElementById('telegraph-cover-url');
    const previewContainer = sandbox.document.getElementById('telegraph-preview-container');
    const rendered = sandbox.document.getElementById('telegraph-preview-rendered');

    if (previewContainer) previewContainer.scrollIntoView = () => {};

    if (titleEl) titleEl.innerText = 'Главные стройки Калининграда 2026';
    if (bodyEl) bodyEl.innerHTML = '<p>Обзор ключевых строительных площадок области.</p>';
    if (coverUrlEl) coverUrlEl.value = 'kld_city_welcome.png';

    sandbox.window.toggleTelegraphPreview();
    assert.strictEqual(previewContainer.style.display, 'block', 'Preview must be visible');
    assert.ok(rendered.innerHTML.includes('Главные стройки Калининграда 2026'), 'Preview must render article title');
    assert.ok(rendered.innerHTML.includes('Обзор ключевых строительных площадок'), 'Preview must render article body');
    assert.ok(rendered.innerHTML.includes('kld_city_welcome.png'), 'Preview must render cover image');

    // Toggle again should hide preview
    sandbox.window.toggleTelegraphPreview();
    assert.strictEqual(previewContainer.style.display, 'none', 'Second toggle must hide preview container');
  });

  await test('Telegraph: Publishing and Draft save into amber_articles in localStorage', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const titleEl = sandbox.document.getElementById('telegraph-title');
    const authorEl = sandbox.document.getElementById('telegraph-author');
    const catEl = sandbox.document.getElementById('telegraph-category');
    const bodyEl = sandbox.document.getElementById('telegraph-body');

    if (titleEl) titleEl.innerText = 'Анализ цен новостроек Q3 2026';
    if (authorEl) authorEl.value = 'Виктор Семенов';
    if (catEl) catEl.value = 'Аналитика';
    if (bodyEl) {
      bodyEl.innerHTML = '<p>Цены на квадратный метр выросли на 4.2% за квартал.</p>';
      bodyEl.innerText = 'Цены на квадратный метр выросли на 4.2% за квартал.';
    }

    // 1. Save as draft
    sandbox.window.saveTelegraphArticle('draft');
    let articles = JSON.parse(sandbox.localStorage.getItem('amber_articles') || '[]');
    let savedDraft = articles.find(a => a.title === 'Анализ цен новостроек Q3 2026');
    assert.ok(savedDraft, 'Draft article must be persisted in amber_articles');
    assert.strictEqual(savedDraft.status, 'draft', 'Status must be draft');
    assert.strictEqual(savedDraft.author, 'Виктор Семенов');
    assert.strictEqual(savedDraft.category, 'Аналитика');

    // 2. Open saved article and publish
    sandbox.window.openTelegraphEditor(savedDraft.id);
    sandbox.window.saveTelegraphArticle('published');

    articles = JSON.parse(sandbox.localStorage.getItem('amber_articles') || '[]');
    let publishedArt = articles.find(a => a.id === savedDraft.id);
    assert.strictEqual(publishedArt.status, 'published', 'Status must be updated to published');

    // 3. Validation: publishing with empty title triggers alert
    let alertMessage = null;
    sandbox.window.alert = (msg) => { alertMessage = msg; };
    sandbox.window.openTelegraphEditor();
    const emptyTitleEl = sandbox.document.getElementById('telegraph-title');
    if (emptyTitleEl) emptyTitleEl.innerText = '';
    sandbox.window.saveTelegraphArticle('published');
    assert.ok(alertMessage && alertMessage.includes('заголовок'), 'Publishing empty title must trigger alert');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PLACEMENTS STEPPER & 3-STEP AD BOOKING FLOW
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [2/5] Probing Placements Stepper & 3-Step Ad Booking Flow...');

  await test('Placements: Stepper transitions update amber_contract_{devId} and CSS classes', () => {
    const sandbox = createAdminSandbox();
    // Provide markContractUnsaved stub if missing in runtime
    if (typeof sandbox.window.markContractUnsaved !== 'function') {
      sandbox.window.markContractUnsaved = () => {};
    }
    sandbox.window.initPlacementsSection();

    const devSelect = sandbox.document.getElementById('placements-dev-select');
    assert.ok(devSelect, 'placements-dev-select must exist');
    devSelect.value = '3'; // ГК «Расцвет»

    // Step 1: not_paid (Новый)
    sandbox.window.setContractPaymentStatus('not_paid');
    let contract = JSON.parse(sandbox.localStorage.getItem('amber_contract_3') || '{}');
    assert.strictEqual(contract.paymentStatus, 'not_paid', 'amber_contract_3 must store not_paid');

    let newStep = sandbox.document.querySelector('#contract-status-stepper .step-new');
    let paidStep = sandbox.document.querySelector('#contract-status-stepper .step-paid');
    assert.ok(newStep.classList.contains('active'), 'step-new must be active');
    assert.ok(!paidStep.classList.contains('active'), 'step-paid must not be active');

    // Step 2: partial (Частичная оплата)
    sandbox.window.setContractPaymentStatus('partial');
    contract = JSON.parse(sandbox.localStorage.getItem('amber_contract_3') || '{}');
    assert.strictEqual(contract.paymentStatus, 'partial', 'amber_contract_3 must store partial');
    let partialStep = sandbox.document.querySelector('#contract-status-stepper .step-partial');
    assert.ok(partialStep.classList.contains('active'), 'step-partial must be active');
    assert.ok(!newStep.classList.contains('active'), 'step-new must be inactive');

    // Step 3: paid (Оплачен)
    sandbox.window.setContractPaymentStatus('paid');
    contract = JSON.parse(sandbox.localStorage.getItem('amber_contract_3') || '{}');
    assert.strictEqual(contract.paymentStatus, 'paid', 'amber_contract_3 must store paid');
    assert.ok(paidStep.classList.contains('active'), 'step-paid must be active');

    // Step 4: overdue (Просрочен)
    sandbox.window.setContractPaymentStatus('overdue');
    contract = JSON.parse(sandbox.localStorage.getItem('amber_contract_3') || '{}');
    assert.strictEqual(contract.paymentStatus, 'overdue', 'amber_contract_3 must store overdue');
    let overdueStep = sandbox.document.querySelector('#contract-status-stepper .step-overdue');
    assert.ok(overdueStep.classList.contains('active'), 'step-overdue must be active');
  });

  await test('Placements: loadContractData restores contract number, date, and stepper for developer', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_contract_7: JSON.stringify({
          number: 'ДОГ-2026/08-77',
          date: '2026-08-15',
          paymentStatus: 'paid',
          comments: 'Оплата 100% поступила по счету №402'
        })
      }
    });

    sandbox.window.initPlacementsSection();
    const devSelect = sandbox.document.getElementById('placements-dev-select');
    devSelect.value = '7';
    sandbox.window.loadContractData();

    const numInput = sandbox.document.getElementById('contract-number');
    const dateInput = sandbox.document.getElementById('contract-date');
    const commentsInput = sandbox.document.getElementById('contract-comments');
    const statusSelect = sandbox.document.getElementById('contract-payment-status');
    const paidStep = sandbox.document.querySelector('#contract-status-stepper .step-paid');

    assert.strictEqual(numInput.value, 'ДОГ-2026/08-77');
    assert.strictEqual(dateInput.value, '2026-08-15');
    assert.strictEqual(commentsInput.value, 'Оплата 100% поступила по счету №402');
    assert.strictEqual(statusSelect.value, 'paid');
    assert.ok(paidStep.classList.contains('active'), 'Paid stepper button must be highlighted active');
  });

  await test('Placements: 3-Step Ad Booking Flow (Dev Select -> ZHK checkboxes -> Calendar slots)', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.initPlacementsSection();

    // Step 1: Dev selection syncs across all step 1 selectors
    const step1DevSelect = sandbox.document.querySelector('.pl-step-dev');
    assert.ok(step1DevSelect, 'Step 1 dev select must exist');
    assert.ok(step1DevSelect.children.length > 20, 'Step 1 must contain all developers');

    sandbox.window.syncDevFromStep('3'); // Select devId 3
    const mainDevSelect = sandbox.document.getElementById('placements-dev-select');
    assert.strictEqual(mainDevSelect.value, '3', 'Header dev select must sync with step 1');

    // Step 2: ZHK checkboxes rendered for devId 3
    const zhkList1 = sandbox.document.getElementById('pl-1-zhk-list');
    assert.ok(zhkList1, 'ZHK list container for placement type 1 must exist');
    const checkboxes = zhkList1.querySelectorAll('input[type="checkbox"]');
    assert.ok(checkboxes.length > 0, 'Developer complexes checkboxes must be rendered');

    // Step 3: Calendar slots rendering and month shift
    sandbox.window.renderPlCalendar(1);
    const calTitle = sandbox.document.getElementById('pl-cal-title-1');
    const calGrid = sandbox.document.getElementById('pl-cal-grid-1');
    assert.ok(calTitle.textContent.includes('2026'), 'Calendar header must show year');
    assert.ok(calGrid.children.length >= 28, 'Calendar grid must render day cells and headers');

    // Month shift
    const initialMonthTitle = calTitle.textContent;
    sandbox.window.shiftPlCalendar(1, 1);
    const nextMonthTitle = sandbox.document.getElementById('pl-cal-title-1').textContent;
    assert.notStrictEqual(nextMonthTitle, initialMonthTitle, 'Calendar month must advance on shift');
  });

  await test('Placements: checkPlacementExpirations detects expiring slots and logs notifications', () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placements: JSON.stringify({
          [`1_kaliningrad_${today}`]: '3',
          [`2_pos1_${tomorrow}`]: '7'
        })
      }
    });

    sandbox.window.checkPlacementExpirations();

    const dev3Notifs = JSON.parse(sandbox.localStorage.getItem('amber_notifications_3') || '[]');
    const dev7Notifs = JSON.parse(sandbox.localStorage.getItem('amber_notifications_7') || '[]');

    assert.ok(dev3Notifs.length > 0, 'Developer 3 must receive expiration warning');
    assert.ok(dev7Notifs.length > 0, 'Developer 7 must receive expiration warning');
    assert.ok(dev3Notifs[0].title.includes('Истечение срока'));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. UNIFIED LEADS MANAGEMENT & GUARDS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [3/5] Probing Unified Leads (Banner Memory, Tab Switches, Paid Lock, CSV)...');

  await test('Leads: Collapsible info banner toggles collapsed class and remembers state in localStorage', () => {
    const sandbox = createAdminSandbox();
    const banner = sandbox.document.getElementById('leads-info-banner');
    const toggleBtn = sandbox.document.getElementById('leads-banner-toggle');

    assert.ok(banner, 'leads-info-banner must exist');
    assert.ok(!banner.classList.contains('collapsed'), 'Banner must be expanded by default');

    sandbox.window.toggleLeadsBanner();
    assert.ok(banner.classList.contains('collapsed'), 'Banner must be collapsed after toggle');
    assert.strictEqual(sandbox.localStorage.getItem('amber_leads_banner_collapsed'), '1', 'Collapsed state 1 stored in localStorage');
    if (toggleBtn) assert.ok(toggleBtn.textContent.includes('Развернуть'), 'Toggle button text must update');

    sandbox.window.toggleLeadsBanner();
    assert.ok(!banner.classList.contains('collapsed'), 'Banner must be expanded on second toggle');
    assert.strictEqual(sandbox.localStorage.getItem('amber_leads_banner_collapsed'), '0', 'Expanded state 0 stored in localStorage');
    if (toggleBtn) assert.ok(toggleBtn.textContent.includes('Свернуть'), 'Toggle button text must update');
  });

  await test('Leads: 3 Filter Tabs (All / Platform / Developer) switch active states and filter rows', () => {
    const testLeads = [
      { id: 101, name: 'Иван Петров', phone: '+7 900 111-22-33', ownedBy: 'admin', isPaidCard: false, status: 'new' },
      { id: 102, name: 'Ольга Смирнова', phone: '+7 900 222-33-44', ownedBy: 'developer', developerId: 3, isPaidCard: true, status: 'in_progress' },
      { id: 103, name: 'Алексей Кузнецов', phone: '+7 900 333-44-55', ownedBy: 'admin', isPaidCard: false, status: 'processed' }
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: JSON.stringify(testLeads)
      }
    });

    // Tab 1: All
    sandbox.window.filterLeadsTab('all');
    let tbody = sandbox.document.querySelector('#table-amber-leads tbody');
    assert.ok(tbody.innerHTML.includes('Иван Петров') && tbody.innerHTML.includes('Ольга Смирнова'));
    assert.ok(sandbox.document.getElementById('tab-leads-all').classList.contains('active'));

    // Tab 2: Platform
    sandbox.window.filterLeadsTab('platform');
    tbody = sandbox.document.querySelector('#table-amber-leads tbody');
    assert.ok(tbody.innerHTML.includes('Иван Петров'), 'Platform leads must show Иван Петров');
    assert.ok(!tbody.innerHTML.includes('Ольга Смирнова'), 'Platform tab must exclude developer leads');
    assert.ok(sandbox.document.getElementById('tab-leads-platform').classList.contains('active'));

    // Tab 3: Developer
    sandbox.window.filterLeadsTab('developer');
    tbody = sandbox.document.querySelector('#table-amber-leads tbody');
    assert.ok(tbody.innerHTML.includes('Ольга Смирнова'), 'Developer tab must show Ольга Смирнова');
    assert.ok(!tbody.innerHTML.includes('Иван Петров'), 'Developer tab must exclude platform leads');
    assert.ok(sandbox.document.getElementById('tab-leads-developer').classList.contains('active'));
  });

  await test('Leads: Paid Lead visual guard (disabled controls, delete lock alert)', () => {
    const testLeads = [
      { id: 201, name: 'Девелоперский Лид', ownedBy: 'developer', developerId: 3, isPaidCard: true, status: 'new' },
      { id: 202, name: 'Платформенный Лид', ownedBy: 'admin', isPaidCard: false, status: 'new' }
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: JSON.stringify(testLeads)
      }
    });

    sandbox.window.renderAmberLeadsTable();
    const tbody = sandbox.document.querySelector('#table-amber-leads tbody');

    // Paid lead row must contain disabled select and lock badge
    assert.ok(tbody.innerHTML.includes('disabled'), 'Paid lead controls must have disabled attribute');
    assert.ok(tbody.innerHTML.includes('🔒 Лид застройщика') || tbody.innerHTML.includes('Лид застройщика'), 'Paid lead must display developer badge');
    assert.ok(tbody.innerHTML.includes('Лид застройщика защищён от удаления'));
  });

  await test('Leads: CSV Export generates string with UTF-8 BOM, semicolon delimiters, and all required columns', () => {
    const testLeads = [
      {
        id: 301,
        timestamp: '2026-08-26 15:00',
        name: 'Екатерина Морозова',
        phone: '+7 911 555-66-77',
        email: 'morozova@mail.ru',
        zhk: 'ЖК «Нордберг»',
        dev: 'ГК «КСК»',
        sourcePage: 'zhk.html',
        ctaLabel: 'Забронировать',
        utmSource: 'yandex_direct',
        ownedBy: 'developer',
        type: 'Бронь',
        status: 'new',
        consentHash: '#a1b2c3d4',
        ip: '178.67.214.88'
      }
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: JSON.stringify(testLeads)
      }
    });

    // Mock Blob and URL.createObjectURL to capture CSV content
    let exportedBlobContent = null;
    sandbox.window.Blob = class {
      constructor(chunks, options) {
        exportedBlobContent = chunks.join('');
        this.options = options;
      }
    };
    sandbox.window.URL = {
      createObjectURL: () => 'blob:http://localhost/test-csv',
      revokeObjectURL: () => {}
    };

    sandbox.window.exportLeadsCSV();

    assert.ok(exportedBlobContent, 'CSV content must be created');
    assert.ok(exportedBlobContent.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM (\\uFEFF)');
    assert.ok(exportedBlobContent.includes('ID;Дата;Имя;Телефон;Email;ЖК;Застройщик'), 'CSV must have correct header columns');
    assert.ok(exportedBlobContent.includes('Екатерина Морозова'), 'CSV must contain lead name');
    assert.ok(exportedBlobContent.includes('178.67.214.88'), 'CSV must contain lead IP');
    assert.ok(exportedBlobContent.includes('#a1b2c3d4'), 'CSV must contain consent hash');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. STATISTICS DASHBOARD & YANDEX METRIKA INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [4/5] Probing Statistics Dashboard (8 Blocks) & Yandex Metrika...');

  await test('Statistics: All 8 analytical blocks are present in DOM and render properly', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.switchAdminSection('stats');
    sandbox.window.renderStatsDashboard();

    const block1 = sandbox.document.getElementById('stat-block-kpis');
    const block2 = sandbox.document.getElementById('stat-block-pages');
    const block3 = sandbox.document.getElementById('stat-block-traffic');
    const block4 = sandbox.document.getElementById('stat-block-queries');
    const block5 = sandbox.document.getElementById('stat-block-geo');
    const block6 = sandbox.document.getElementById('stat-block-banners');
    const block7 = sandbox.document.getElementById('stat-block-funnel');
    const block8 = sandbox.document.getElementById('stat-block-metrika');

    assert.ok(block1, 'Block 1: stat-block-kpis must exist');
    assert.ok(block2, 'Block 2: stat-block-pages must exist');
    assert.ok(block3, 'Block 3: stat-block-traffic must exist');
    assert.ok(block4, 'Block 4: stat-block-queries must exist');
    assert.ok(block5, 'Block 5: stat-block-geo must exist');
    assert.ok(block6, 'Block 6: stat-block-banners must exist');
    assert.ok(block7, 'Block 7: stat-block-funnel must exist');
    assert.ok(block8, 'Block 8: stat-block-metrika must exist');

    // Check data rendering in tables
    const pagesTbody = sandbox.document.querySelector('#table-stat-pages tbody');
    const queriesTbody = sandbox.document.querySelector('#table-stat-queries tbody');
    const geoTbody = sandbox.document.querySelector('#table-stat-geo tbody');

    assert.ok(pagesTbody && (pagesTbody.innerHTML.includes('новостроек') || pagesTbody.innerHTML.includes('zhk.html') || pagesTbody.children.length > 0), 'Pages table must render top pages');
    assert.ok(queriesTbody && (queriesTbody.innerHTML.toLowerCase().includes('новостройк') || queriesTbody.innerHTML.toLowerCase().includes('калининград') || queriesTbody.children.length > 0), 'Queries table must render queries');
    assert.ok(geoTbody && (geoTbody.innerHTML.includes('Калининград и область') || geoTbody.children.length > 0), 'Geo table must render regions');
  });

  await test('Statistics: Yandex Metrika key save/load with persistence and badge status update', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.renderStatsDashboard();

    const metrikaInput = sandbox.document.getElementById('metrika-api-key');
    const badge = sandbox.document.getElementById('metrika-status-badge');
    assert.ok(metrikaInput, 'metrika-api-key input must exist');

    // 1. Enter custom key and save
    metrikaInput.value = 'AQAAAAAA_CustomTestKey999_Prod';
    sandbox.window.saveMetrikaKey();

    assert.strictEqual(sandbox.localStorage.getItem('amber_metrika_key'), 'AQAAAAAA_CustomTestKey999_Prod', 'Custom key must be persisted');
    assert.strictEqual(badge.textContent, 'API Ключ Сохранен', 'Badge must update to API Ключ Сохранен');

    // 2. Reloading stats dashboard preserves saved key
    metrikaInput.value = '';
    sandbox.window.renderStatsDashboard();
    assert.strictEqual(metrikaInput.value, 'AQAAAAAA_CustomTestKey999_Prod', 'Key must be reloaded from localStorage');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. NAVIGATION (18 SECTIONS) & BACKGROUNDS CONTROLS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [5/5] Probing 18 Sections Navigation & Backgrounds Controls...');

  await test('Navigation: Switching all 18 sections via sidebar and verifying active state', () => {
    const sandbox = createAdminSandbox();

    const sections = [
      'dashboard', 'properties', 'developers', 'submissions', 'blog',
      'experts', 'banners', 'placements', 'monetization', 'modules',
      'leads', 'pages', 'stats', 'dev-analytics', 'audit-log',
      'settings', 'users', 'reviews'
    ];

    sections.forEach(secId => {
      sandbox.window.switchAdminSection(secId);
      const activeSections = sandbox.document.querySelectorAll('.admin-section.active');
      assert.strictEqual(activeSections.length, 1, `Exactly 1 section must be active when switching to ${secId}`);
    });
  });

  await test('Navigation: URL Alias routing maps legacy/alternate names to canonical sections', () => {
    const sandbox = createAdminSandbox();

    const aliases = [
      { from: 'managers', to: 'submissions' },
      { from: 'pricing', to: 'monetization' },
      { from: 'analytics', to: 'stats' },
      { from: 'amber-leads', to: 'leads' },
      { from: 'platform-leads', to: 'leads' },
      { from: 'moderation', to: 'properties' },
      { from: 'users', to: 'developers' }
    ];

    aliases.forEach(({ from, to }) => {
      sandbox.window.switchAdminSection(from);
      const targetSec = sandbox.document.getElementById('section-' + to);
      assert.ok(targetSec.classList.contains('active'), `Alias ${from} must activate section-${to}`);
    });
  });

  await test('Backgrounds Controls: Save, Reset, Preview, and Upload workflows', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.switchAdminSection('pages');

    const pageSelect = sandbox.document.getElementById('page-bg-select');
    const sloganInput = sandbox.document.getElementById('page-bg-slogan');
    const subtitleInput = sandbox.document.getElementById('page-bg-subtitle');
    const urlInput = sandbox.document.getElementById('page-bg-url');
    const opacityInput = sandbox.document.getElementById('page-bg-opacity');
    const alignmentSelect = sandbox.document.getElementById('page-bg-alignment');

    assert.ok(pageSelect && sloganInput && subtitleInput && urlInput, 'Background controls inputs must exist');

    // 1. Select 'umory' and update fields
    pageSelect.value = 'umory';
    sloganInput.value = 'Элитные новостройки у Балтийского моря';
    subtitleInput.value = 'Светлогорск, Зеленоградск, Пионерский, Янтарный';
    urlInput.value = 'baltic_sea_banner.png';
    opacityInput.value = '0.50';
    alignmentSelect.value = 'center';

    // 2. Preview
    sandbox.window.previewPageHeaderBg();
    const previewEl = sandbox.document.getElementById('page-bg-preview');
    const previewTitle = sandbox.document.getElementById('page-bg-preview-title');
    assert.ok(previewEl.style.backgroundImage.includes('baltic_sea_banner.png'), 'Preview must have updated image');
    assert.strictEqual(previewTitle.textContent, 'Элитные новостройки у Балтийского моря', 'Preview title must update');

    // 3. Save
    sandbox.window.savePageHeaderBg();
    const savedHeaders = JSON.parse(sandbox.localStorage.getItem('amber_zhk_header_bg') || '{}');
    assert.ok(savedHeaders['umory'], 'umory header config must be persisted');
    assert.strictEqual(savedHeaders['umory'].slogan, 'Элитные новостройки у Балтийского моря');
    assert.strictEqual(savedHeaders['umory'].overlayOpacity, 0.50);

    // 4. Reset
    sandbox.window.resetPageHeaderBg();
    const headersAfterReset = JSON.parse(sandbox.localStorage.getItem('amber_zhk_header_bg') || '{}');
    assert.strictEqual(headersAfterReset['umory'], undefined, 'umory override must be removed on reset');
    // Default slogan should be reloaded
    assert.notStrictEqual(sloganInput.value, 'Элитные новостройки у Балтийского моря', 'Default slogan must be restored');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n================================================================================');
  console.log(`  📊 CHALLENGER 2 FINAL RESULTS: ${passedTests} passed, ${failedTests} failed (${passedTests + failedTests} total)`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    throw new Error(`${failedTests} empirical tests failed.`);
  }

  return testResults;
}

if (require.main === module) {
  runEmpiricalInteractiveWorkflowsSuite().then(
    (res) => {
      console.log('All empirical interactive workflow tests passed successfully!');
      process.exit(0);
    },
    (err) => {
      console.error('Test suite failed with error:', err);
      process.exit(1);
    }
  );
}

module.exports = { runEmpiricalInteractiveWorkflowsSuite };
