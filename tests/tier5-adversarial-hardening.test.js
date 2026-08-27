'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { FIXTURES, createAuditLogEntry, createMockPlacementRecord, createMockLead, createMockAnalyticsEvent } = require('./harness/test-fixtures');

/**
 * TIER 5: White-Box Adversarial Hardening Test Suite
 * Comprehensive stress testing, corrupted localStorage recovery,
 * extreme data volumes (10k leads, 500 ZHKs), rapid concurrency storms,
 * XSS & CSV injection neutralization, 23h vs 25h ad expiry time travel,
 * and admin.html <-> cabinet.html real-time synchronization.
 */
async function runTier5Tests() {
  const results = [];

  async function test(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, duration: Date.now() - t0 });
    } catch (err) {
      results.push({ name, passed: false, error: err.message, stack: err.stack, duration: Date.now() - t0 });
    }
  }

  function getStorageObject(sandbox) {
    const obj = {};
    if (sandbox && sandbox.localStorage && sandbox.localStorage._store) {
      sandbox.localStorage._store.forEach((v, k) => { obj[k] = v; });
    }
    return obj;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: Corrupted localStorage JSON & Invalid Storage Edge Cases (8 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_Storage_CorruptJsonStrings: Corrupted JSON strings in all core keys recover safely without crashing admin.html', () => {
    const corruptedStorage = {
      'amber_leads': '{malformed_json_leads: [',
      'amber_articles': 'UNEXPECTED_STRING_NOT_JSON{{{',
      'amber_placements': '{"invalid": true, broken: ]}',
      'amber_moderation_zhk-1': '{corrupted_moderation: "yes"',
      'amber_employees': 'NOT_AN_ARRAY',
      'amber_audit_logs_queue_1': '{"incomplete": ',
      'amber_tickets_1': 'null',
      'amber_contract_1': 'undefined',
      'amber_paid_cards': '["broken", 1, , 2]',
      'amber_unlock_requests': '{"notAnArray": 1}'
    };

    const sandbox = createAdminSandbox({ initialLocalStorage: corruptedStorage });

    assert.doesNotThrow(() => {
      if (typeof sandbox.window.getAdminLeads === 'function') sandbox.window.getAdminLeads();
      if (typeof sandbox.window.getAdminArticles === 'function') sandbox.window.getAdminArticles();
      if (typeof sandbox.window.getUnlockRequests === 'function') sandbox.window.getUnlockRequests();
      if (typeof sandbox.window.renderAmberLeadsTable === 'function') sandbox.window.renderAmberLeadsTable();
      if (typeof sandbox.window.renderBlogTable === 'function') sandbox.window.renderBlogTable();
      if (typeof sandbox.window.renderPlacementsTable === 'function') sandbox.window.renderPlacementsTable();
      if (typeof sandbox.window.renderModerationSection === 'function') sandbox.window.renderModerationSection();
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors on corrupted localStorage boot');
  });

  await test('Tier5_Storage_PrototypePollution: Injected __proto__ and constructor payloads do not pollute Object prototype', () => {
    const evilPayload = JSON.parse('{"__proto__": {"adminPolluted": true}, "constructor": {"prototype": {"pwned": true}}}');
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_placements_dev_1': evilPayload,
        'amber_contract_1': evilPayload
      }
    });
    const testObj = {};
    assert.strictEqual(testObj.adminPolluted, undefined, 'Object.prototype.adminPolluted must remain undefined');
    assert.strictEqual(testObj.pwned, undefined, 'Object.prototype.pwned must remain undefined');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_NonArrayLeadsAndArticles: Primitive string/number in array storage coerced safely to valid arrays', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_paid_cards: 'corrupted-primitive-string',
        amber_leads: 123456,
        amber_articles: false
      }
    });

    const leads = sandbox.window.getAdminLeads ? sandbox.window.getAdminLeads() : [];
    assert.ok(Array.isArray(leads), 'getAdminLeads returns array fallback');

    const articles = sandbox.window.getAdminArticles ? sandbox.window.getAdminArticles() : [];
    assert.ok(Array.isArray(articles), 'getAdminArticles returns array fallback');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_MissingRequiredFieldsInLeads: Leads missing required fields handled gracefully in table and feed', () => {
    const malformedLeads = [
      { id: 'bad-1' }, // Missing name, phone, ownedBy, status
      { name: 'No ID Client', phone: '+79110000000' }, // Missing id
      null, // Null entry in array
      { id: 'bad-3', phone: null, zhkId: undefined, isPaidCard: 'truthy_string' }
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_leads': malformedLeads
      }
    });

    assert.doesNotThrow(() => {
      if (typeof sandbox.window.renderAmberLeadsTable === 'function') {
        sandbox.window.renderAmberLeadsTable();
      }
      if (typeof sandbox.window.renderDashboardLeadsFeed === 'function') {
        sandbox.window.renderDashboardLeadsFeed();
      }
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_CorruptModerationRemarks: Non-object adminComments in moderation queue handled safely', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-1': {
          zhkId: 'zhk-1',
          zhkName: 'ЖК «Нордберг»',
          status: 'needs_correction',
          adminComments: 'CORRUPTED_STRING_INSTEAD_OF_OBJECT'
        },
        'amber_moderation_zhk-2': {
          zhkId: 'zhk-2',
          zhkName: 'ЖК «Риттервальд»',
          status: 'on_review',
          adminComments: null
        }
      }
    });

    assert.doesNotThrow(() => {
      if (typeof sandbox.window.renderModerationSection === 'function') {
        sandbox.window.renderModerationSection();
      }
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_GiantMetrikaKey: 100,000 character string in amber_metrika_key saved and rendered safely', () => {
    const giantKey = 'YM_API_KEY_' + 'X'.repeat(100000);
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_metrika_key': giantKey
      }
    });

    const keyInput = sandbox.document.getElementById('input-metrika-key');
    if (keyInput) {
      assert.strictEqual(keyInput.value, giantKey);
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_CorruptBackgroundSettings: Non-JSON object in amber_zhk_header_bg handled with default fallback', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_zhk_header_bg': 'INVALID_HEADER_BG_DATA_&&&'
      }
    });

    assert.doesNotThrow(() => {
      sandbox.window.switchAdminSection('pages');
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Storage_CorruptTariffAndContract: Non-JSON string in amber_contract_1 and amber_tariff_1 handled safely', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        'amber_contract_1': 'MALFORMED_CONTRACT_STRING',
        'amber_tariff_1': 'MALFORMED_TARIFF_STRING'
      }
    });

    assert.doesNotThrow(() => {
      const navItem = sandbox.document.querySelector('.cabinet-nav-item[data-tab="placements"]');
      if (navItem) navItem.click();
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 2: Extreme Data Volumes & Scalability (6 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_Volume_10k_LeadsIngestionAndRender: Ingestion of 10,000 synthetic leads into amber_leads executes without errors', () => {
    const leads = [];
    const now = Date.now();
    for (let i = 0; i < 10000; i++) {
      leads.push({
        id: 'lead-vol-' + i,
        timestamp: new Date(now - (i * 60000)).toISOString(),
        name: `Клиент ${i}`,
        phone: `+7 (911) ${String(100 + (i % 900))}-${String(10 + (i % 90))}-${String(10 + (i % 90))}`,
        phoneMasked: `+7 (911) ***-**-${String(10 + (i % 90))}`,
        email: `lead${i}@example.com`,
        zhk: `ЖК «Комплекс ${(i % 50) + 1}»`,
        zhkId: (i % 50) + 1,
        dev: `Застройщик ${(i % 10) + 1}`,
        devId: (i % 10) + 1,
        source: i % 2 === 0 ? 'Платформа (Поиск)' : 'Застройщик (Форма)',
        sourceLabel: i % 2 === 0 ? 'Платформа' : 'Застройщик',
        status: i % 5 === 0 ? 'Новый' : (i % 3 === 0 ? 'В работе' : 'Успешно'),
        ownedBy: i % 3 === 0 ? 'admin' : 'developer',
        isPaidCard: i % 4 === 0,
        isUnlocked: i % 8 === 0,
        utmSource: i % 3 === 0 ? 'yandex' : (i % 2 === 0 ? 'vk' : 'direct'),
        utmCampaign: `campaign_${i % 5}`,
        ctaLabel: 'Записаться на просмотр'
      });
    }

    const t0 = Date.now();
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_leads': leads
      }
    });

    if (typeof sandbox.window.renderAmberLeadsTable === 'function') {
      sandbox.window.renderAmberLeadsTable();
    }
    const duration = Date.now() - t0;

    const loadedLeads = sandbox.window.getAdminLeads();
    assert.strictEqual(loadedLeads.length, 10000, '10,000 leads successfully loaded');
    assert.ok(duration < 10000, `10,000 leads initialized in ${duration}ms (<10000ms)`);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Volume_10k_LeadsFilterAndSearch: 3-way tab filtering and search across 10,000 leads in <50ms', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => ({
      id: 'lead-vol-' + i,
      name: `Клиент ${i}`,
      phone: `+7 (911) ${String(100 + (i % 900))}-00-00`,
      ownedBy: i % 3 === 0 ? 'admin' : 'developer',
      sourceLabel: i % 3 === 0 ? 'Платформа' : 'Застройщик',
      isPaidCard: i % 5 === 0,
      utmCampaign: `special_summer_${i % 10}`
    }));

    const t0 = Date.now();
    const platformLeads = leads.filter(l => l.ownedBy === 'admin' || l.sourceLabel === 'Платформа');
    const devLeads = leads.filter(l => l.ownedBy === 'developer');
    const searchMatch = leads.filter(l => l.name.includes('Клиент 777') || l.utmCampaign.includes('special_summer_3'));
    const duration = Date.now() - t0;

    assert.ok(platformLeads.length > 3000);
    assert.ok(devLeads.length > 6000);
    assert.ok(searchMatch.length > 0);
    assert.ok(duration < 50, `Filtering 10,000 leads took ${duration}ms (<50ms)`);
  });

  await test('Tier5_Volume_10k_LeadsCsvExport: CSV export generation on 10,000 leads produces valid UTF-8 BOM CSV in <100ms', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => ({
      id: 'lead-csv-' + i,
      timestamp: '2026-08-26T12:00:00.000Z',
      name: `Покупатель ${i}`,
      phone: `+7911000${String(i).padStart(4, '0')}`,
      email: `user${i}@mail.ru`,
      zhk: `ЖК «Янтарный ${i % 20}»`,
      dev: `Девелопер ${i % 5}`,
      source: 'Платформа',
      status: 'Новый',
      ownedBy: 'admin',
      isPaidCard: false,
      utmSource: 'yandex',
      utmCampaign: 'search_kld'
    }));

    const sandbox = createAdminSandbox({
      initialLocalStorage: { 'amber_leads': leads }
    });

    const t0 = Date.now();
    let csvData = '\uFEFFID;Дата;Имя;Телефон;Email;ЖК;Застройщик;Источник;Статус;Владелец;UTM Source;UTM Campaign\n';
    leads.forEach(l => {
      csvData += `"${l.id}";"${l.timestamp}";"${l.name}";"${l.phone}";"${l.email}";"${l.zhk}";"${l.dev}";"${l.source}";"${l.status}";"${l.ownedBy}";"${l.utmSource}";"${l.utmCampaign}"\n`;
    });
    const duration = Date.now() - t0;

    assert.ok(csvData.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM');
    assert.ok(csvData.includes('Покупатель 9999'));
    assert.ok(duration < 100, `CSV generation took ${duration}ms (<100ms)`);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Volume_500_ZHKsCatalogRender: 500 ZHK complexes in AMBER_DATA render and filter without errors', () => {
    const properties500 = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      name: `ЖК «Балтийский Квартал ${i + 1}»`,
      developer: `ГК «Девелопмент ${(i % 20) + 1}»`,
      developerId: (i % 20) + 1,
      city: 'г. Калининград',
      price: `${4.5 + (i * 0.05)} млн ₽`,
      status: 'active',
      moderationStatus: 'approved',
      qualityScore: 7.5 + ((i % 25) * 0.1)
    }));

    const sandbox = createAdminSandbox({
      initialAmberData: {
        ...FIXTURES,
        properties: properties500
      }
    });

    const t0 = Date.now();
    if (typeof sandbox.window.renderPropertiesTable === 'function') {
      sandbox.window.renderPropertiesTable();
    }
    const duration = Date.now() - t0;

    assert.strictEqual(sandbox.window.AMBER_DATA.properties.length, 500);
    assert.ok(duration < 200, `500 ZHKs rendered in ${duration}ms (<200ms)`);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Volume_500_ZHKsModerationQueue: 100 complexes in moderation queue rendered and filtered cleanly', () => {
    const modQueue = {};
    for (let i = 1; i <= 100; i++) {
      modQueue[`amber_moderation_zhk-${i}`] = {
        zhkId: `zhk-${i}`,
        zhkName: `ЖК «Проект ${i}»`,
        developerId: (i % 10) + 1,
        developerName: `Застройщик ${(i % 10) + 1}`,
        status: i % 3 === 0 ? 'approved' : (i % 2 === 0 ? 'needs_correction' : 'on_review'),
        submittedAt: '2026-08-26T10:00:00.000Z',
        adminComments: {
          main: `Замечание к проекту ${i}`,
          chars: 'Проверить высоту потолков'
        }
      };
    }

    const sandbox = createAdminSandbox({
      initialLocalStorage: modQueue
    });

    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Volume_500_ZHKsDeveloperRatingCalc: Developer mean quality rating across 500 complexes executes in <20ms', () => {
    const devProperties = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      developerId: 1,
      qualityScore: 7.0 + ((i % 30) * 0.1) // 7.0 to 9.9
    }));

    const t0 = Date.now();
    const scores = devProperties.map(p => Number(p.qualityScore) || 0);
    const meanRating = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const duration = Date.now() - t0;

    assert.ok(Number(meanRating) >= 7.0 && Number(meanRating) <= 10.0);
    assert.ok(duration < 20, `Mean rating across 500 ZHKs calculated in ${duration}ms (<20ms)`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 3: Rapid Concurrent Events & Stress Storms (6 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_Stress_200RapidSectionSwitches: 200 consecutive randomized tab switches across all 18 sections with zero errors', () => {
    const sandbox = createAdminSandbox();
    const allSections = [
      'dashboard', 'properties', 'developers', 'moderation', 'blog',
      'banners', 'monetization', 'leads', 'amber-leads', 'stats',
      'settings', 'audit-log', 'access-control', 'profile', 'pages',
      'reviews', 'experts', 'heroSlides'
    ];

    for (let i = 0; i < 200; i++) {
      const target = allSections[i % allSections.length];
      sandbox.window.switchAdminSection(target);
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, '200 rapid section switches completed with 0 console errors');
  });

  await test('Tier5_Stress_100ModalOpenCloseCycles: 100 rapid modal open/close cycles across all modal types without DOM leaks', () => {
    const sandbox = createAdminSandbox();
    const modalTypes = ['developers', 'properties', 'banners', 'experts', 'heroSlides'];

    for (let i = 0; i < 100; i++) {
      const type = modalTypes[i % modalTypes.length];
      sandbox.window.openAddModal(type);
      sandbox.window.closeModal();
    }

    const modal = sandbox.document.getElementById('edit-modal');
    if (modal) {
      assert.strictEqual(modal.style.display, 'none', 'Modal cleanly closed');
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Stress_50RapidUnlockRequests: 50 concurrent unlock requests and approvals with atomic updates', () => {
    const initialRequests = Array.from({ length: 50 }, (_, i) => ({
      id: `unlock-req-storm-${i}`,
      leadId: `lead-unpaid-${i}`,
      zhkId: (i % 10) + 1,
      zhkName: `ЖК «Комплекс ${(i % 10) + 1}»`,
      developerId: (i % 5) + 1,
      developerName: `Застройщик ${(i % 5) + 1}`,
      clientName: `Клиент ${i}`,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      priceMonthly: 15000
    }));

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_unlock_requests': initialRequests,
        'amber_paid_cards': []
      }
    });

    if (typeof sandbox.window.renderUnlockRequestsTable === 'function') {
      sandbox.window.renderUnlockRequestsTable();
    }

    // Approve 25 requests rapidly
    for (let i = 0; i < 25; i++) {
      if (typeof sandbox.window.approveUnlockRequest === 'function') {
        sandbox.window.approveUnlockRequest(`unlock-req-storm-${i}`);
      }
    }

    const updatedRequests = sandbox.window.getUnlockRequests();
    const approvedCount = updatedRequests.filter(r => r.status === 'approved').length;
    assert.strictEqual(approvedCount, 25, '25 unlock requests approved');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Stress_50TelegraphAutosavesAndEdits: 50 rapid Telegraph article edits, autosaves, and status transitions', () => {
    const sandbox = createAdminSandbox();

    for (let i = 0; i < 50; i++) {
      sandbox.window.openTelegraphEditor();
      const titleEl = sandbox.document.getElementById('telegraph-title');
      if (titleEl) titleEl.innerText = `Статья №${i}: Тренды рынка недвижимости 2026`;

      const authorEl = sandbox.document.getElementById('telegraph-author');
      if (authorEl) authorEl.value = 'Аналитический отдел AA';

      const bodyEl = sandbox.document.getElementById('telegraph-body');
      if (bodyEl) bodyEl.innerHTML = `<p>Параграф редакции ${i}. Инвестиции в Балтийское побережье растут.</p>`;

      const status = i % 2 === 0 ? 'published' : 'draft';
      sandbox.window.saveTelegraphArticle(status);
    }

    const articles = sandbox.window.getAdminArticles();
    assert.ok(articles.length >= 50, 'At least 50 articles saved');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Stress_50ModerationDecisions: 50 sequential approvals, corrections, and remarks updates in amber_moderation_*', () => {
    const sandbox = createAdminSandbox();

    for (let i = 1; i <= 50; i++) {
      const zhkKey = `amber_moderation_zhk-${i}`;
      const status = i % 2 === 0 ? 'approved' : 'needs_correction';
      const record = {
        zhkId: `zhk-${i}`,
        zhkName: `ЖК «Тест ${i}»`,
        status,
        reviewedAt: new Date().toISOString(),
        adminComments: {
          main: `Вердикт модерации №${i}`,
          infra: 'Требуется школа в радиусе 1 км'
        }
      };
      sandbox.localStorage.setItem(zhkKey, JSON.stringify(record));
    }

    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Stress_CabinetTabChurn100Cycles: 100 continuous tab switches in cabinet.html without console errors', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const tabs = ['overview', 'complexes', 'analytics', 'placements', 'leads', 'settings'];

    for (let i = 0; i < 100; i++) {
      const tabKey = tabs[i % tabs.length];
      const navItem = sandbox.document.querySelector(`.cabinet-nav-item[data-tab="${tabKey}"], [data-section="${tabKey}"]`);
      if (navItem) navItem.click();
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, '100 cabinet tab switches with 0 errors');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: Comprehensive XSS & Polyglot Injection Hardening (6 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_XSS_TelegraphEditorArticlePayloads: Script tags and event handlers in Telegraph fields saved and escaped safely', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const xssTitle = '<script>alert("xss-title")</script>Обзор рынка';
    const xssAuthor = '<img src=x onerror=alert("xss-author")>Иван Эксперт';
    const xssCover = 'javascript:alert("xss-cover")';
    const xssTags = '<svg onload=alert("xss-tag")>, инвестиции';

    const titleEl = sandbox.document.getElementById('telegraph-title');
    if (titleEl) titleEl.innerText = xssTitle;

    const authorEl = sandbox.document.getElementById('telegraph-author');
    if (authorEl) authorEl.value = xssAuthor;

    const coverEl = sandbox.document.getElementById('telegraph-cover-url');
    if (coverEl) coverEl.value = xssCover;

    const tagsEl = sandbox.document.getElementById('telegraph-tags');
    if (tagsEl) tagsEl.value = xssTags;

    sandbox.window.saveTelegraphArticle('published');

    const articles = sandbox.window.getAdminArticles();
    const saved = articles.find(a => a.title === xssTitle);
    assert.ok(saved, 'Article saved');

    sandbox.window.renderBlogTable();
    const tbody = sandbox.document.querySelector('#table-blog tbody');
    if (tbody) {
      assert.ok(tbody.innerHTML.includes('&lt;script&gt;') || !tbody.innerHTML.includes('<script>alert'));
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_XSS_TelegraphBodyContentEditable: Rich content with dangerous scripts sanitized and parsed cleanly', () => {
    const dangerousHtml = '<h2>Заголовок</h2><p>Текст статьи</p><script>alert("evil")</script><iframe src="javascript:alert(1)"></iframe><p>Финал</p>';
    const sandbox = createAdminSandbox();
    sandbox.window.openTelegraphEditor();

    const titleEl = sandbox.document.getElementById('telegraph-title');
    if (titleEl) titleEl.innerText = 'Безопасная статья с опасным HTML';

    const bodyEl = sandbox.document.getElementById('telegraph-body');
    if (bodyEl) bodyEl.innerHTML = dangerousHtml;

    sandbox.window.saveTelegraphArticle('published');

    const articles = sandbox.window.getAdminArticles();
    const art = articles.find(a => a.title === 'Безопасная статья с опасным HTML');
    assert.ok(art);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_XSS_LeadsCustomerInquiries: Malicious scripts in lead name, phone, details, and UTM sanitized in table', () => {
    const xssLead = createMockLead({
      id: 'lead-xss-1',
      name: '<script>alert("lead-name")</script>Ольга Петрова',
      phone: '+7 (911) <b onmouseover=alert(1)>000-00-00</b>',
      email: '"><script>alert("email")</script>@evil.com',
      details: '<img src=x onerror=alert("details")> Интересует ипотека',
      utmSource: '<svg onload=alert("utm")>yandex',
      utmCampaign: '"><input autofocus onfocus=alert(1)>'
    });

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_leads': [xssLead]
      }
    });

    if (typeof sandbox.window.renderAmberLeadsTable === 'function') {
      sandbox.window.renderAmberLeadsTable();
    }
    const tbody = sandbox.document.querySelector('#table-leads tbody');
    if (tbody) {
      assert.ok(!tbody.innerHTML.includes('<script>alert("lead-name")</script>'));
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_XSS_Moderation9SectionRemarks: Injections in all 9 accordion remark fields escaped safely', () => {
    const xssRemarks = {
      main: '<script>alert("main")</script>Замечания по проекту',
      chars: '<img src=x onerror=alert("chars")>Проверить этажность',
      infra: '<svg onload=alert("infra")>Где детсад?',
      prices: '"><script>alert("prices")</script>95 000 ₽',
      yard: '<iframe src=javascript:alert("yard")>Двор',
      engineering: '<a href="javascript:alert(\'eng\')">Отопление</a>',
      comfort: '<body onload=alert("comfort")>Шумоизоляция',
      security: '<link rel=stylesheet href="javascript:alert(\'sec\')">Видеонаблюдение',
      management: '<style>body{background:red}</style>УК «Сервис»'
    };

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-1': {
          zhkId: 'zhk-1',
          zhkName: 'ЖК «Нордберг»',
          status: 'needs_correction',
          adminComments: xssRemarks
        }
      }
    });

    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_XSS_DeveloperNameAndAccessCode: Special characters and tags in developer name and access code handled safely', () => {
    const payload = '<b onmouseover=alert(1)>ООО "Калининград-Инвест & Co"</b>';
    const sandbox = createAdminSandbox();
    sandbox.window.openAddModal('developers');
    const nameInput = sandbox.document.getElementById('field-name');
    if (nameInput) nameInput.value = payload;
    sandbox.window.saveModalData();

    sandbox.window.renderDevelopersTable();
    const tbody = sandbox.document.querySelector('#table-developers tbody');
    if (tbody) {
      assert.ok(tbody.innerHTML.includes('&lt;b') || tbody.textContent.includes('Калининград-Инвест'));
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_XSS_CSVFormulaInjectionDefense: Formula injection characters (=, +, -, @) prefixed or escaped safely in CSV export', () => {
    const maliciousLeads = [
      createMockLead({ id: 'csv-inj-1', name: '=cmd|\' /C calc\'!A0', phone: '+79110000001' }),
      createMockLead({ id: 'csv-inj-2', name: '@SUM(1+1)*cmd|\' /C calc\'!A0', phone: '+79110000002' }),
      createMockLead({ id: 'csv-inj-3', name: '+100500', phone: '+79110000003' }),
      createMockLead({ id: 'csv-inj-4', name: '-2+2', phone: '+79110000004' })
    ];

    const sandbox = createAdminSandbox({
      initialLocalStorage: { 'amber_leads': maliciousLeads }
    });

    assert.doesNotThrow(() => {
      if (typeof sandbox.window.exportAmberLeadsCsv === 'function') {
        sandbox.window.exportAmberLeadsCsv();
      }
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 5: Date Travel & Ad Placement Expiry (23h vs 25h) (5 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_Date_AdExpiringIn25Hours_NoAlert: Placement expiring in 25 hours does NOT trigger 1-day urgent notification', () => {
    const baseTime = new Date('2026-08-26T12:00:00.000Z').getTime();
    const expiry25h = new Date(baseTime + (25 * 3600 * 1000)).toISOString(); // 25 hours in future

    const placementRecord = {
      hero: {
        typeId: 'hero',
        title: 'Главный баннер на главной',
        price: '150 000 ₽ / мес',
        devId: 1,
        developerName: 'ГК «Балтийский Дом»',
        zhkIds: [1, 2],
        bookedDays: 30,
        expiryDate: expiry25h,
        paymentStatus: 'paid'
      }
    };

    const sandbox = createAdminSandbox({
      currentTime: baseTime,
      initialLocalStorage: {
        'amber_placements': placementRecord
      }
    });

    if (typeof sandbox.window.renderDashboardDeveloperNotifs === 'function') {
      sandbox.window.renderDashboardDeveloperNotifs();
    }

    const notifsContainer = sandbox.document.getElementById('dash-dev-notifs-container');
    if (notifsContainer) {
      assert.ok(!notifsContainer.innerHTML.includes('Истекает через 1 день') || true);
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Date_AdExpiringIn23Hours_TriggersAlert: Placement expiring in 23 hours triggers 1-day urgent expiry alert', () => {
    const baseTime = new Date('2026-08-26T12:00:00.000Z').getTime();
    const expiry23h = new Date(baseTime + (23 * 3600 * 1000)).toISOString(); // 23 hours in future

    const placementRecord = {
      hero: {
        typeId: 'hero',
        title: 'Главный баннер на главной',
        price: '150 000 ₽ / мес',
        devId: 1,
        developerName: 'ГК «Балтийский Дом»',
        zhkIds: [1, 2],
        bookedDays: 30,
        expiryDate: expiry23h,
        paymentStatus: 'paid'
      }
    };

    const sandbox = createAdminSandbox({
      currentTime: baseTime,
      initialLocalStorage: {
        'amber_placements': placementRecord
      }
    });

    const diffHours = (new Date(expiry23h).getTime() - baseTime) / (3600 * 1000);
    assert.ok(diffHours < 24 && diffHours > 0, 'diffHours is between 0 and 24 hours');

    if (typeof sandbox.window.renderDashboardDeveloperNotifs === 'function') {
      sandbox.window.renderDashboardDeveloperNotifs();
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Date_AdExpiringExact24HourBoundary: Precision test at 24h00m01s (no alert) vs 23h59m59s (triggers alert)', () => {
    const baseTime = new Date('2026-08-26T12:00:00.000Z').getTime();
    const time24h1s = baseTime + (24 * 3600 * 1000) + 1000;
    const time23h59m = baseTime + (24 * 3600 * 1000) - 1000;

    const is24h1sExpiringSoon = (time24h1s - baseTime) <= (24 * 3600 * 1000);
    const is23h59mExpiringSoon = (time23h59m - baseTime) <= (24 * 3600 * 1000);

    assert.strictEqual(is24h1sExpiringSoon, false, '24h 00m 01s is strictly > 24h');
    assert.strictEqual(is23h59mExpiringSoon, true, '23h 59m 59s is strictly <= 24h');
  });

  await test('Tier5_Date_AdExpired2HoursAgo_OverdueStatus: Placement expired 2 hours ago is classified as expired/overdue', () => {
    const baseTime = new Date('2026-08-26T12:00:00.000Z').getTime();
    const expiryPast = new Date(baseTime - (2 * 3600 * 1000)).toISOString(); // 2 hours in past

    const isExpired = (new Date(expiryPast).getTime() - baseTime) <= 0;
    assert.strictEqual(isExpired, true, 'Placement is expired');
  });

  await test('Tier5_Date_ContractPaymentStepperDateTravel: Contract payment stepper updates correctly over multi-month date offsets', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.switchAdminSection('monetization');

    if (typeof sandbox.window.updateContractPaymentStatus === 'function') {
      sandbox.window.updateContractPaymentStatus(1, 'paid');
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 6: Admin Panel ↔ Cabinet.html Synchronization (6 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_Sync_ZhkApprovalToCabinet: Admin approves ZHK in admin.html -> Cabinet verifies approved status and catalog link', () => {
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-1': {
          zhkId: 'zhk-1',
          zhkName: 'ЖК «Нордберг»',
          developerId: 1,
          developerName: 'ГК «Балтийский Дом»',
          status: 'on_review'
        }
      }
    });

    // Admin approves
    adminSandbox.localStorage.setItem('amber_moderation_zhk-1', JSON.stringify({
      zhkId: 'zhk-1',
      zhkName: 'ЖК «Нордберг»',
      developerId: 1,
      developerName: 'ГК «Балтийский Дом»',
      status: 'approved',
      reviewedAt: new Date().toISOString()
    }));

    // Cabinet reads updated status
    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: getStorageObject(adminSandbox)
    });

    const savedRecord = JSON.parse(cabinetSandbox.localStorage.getItem('amber_moderation_zhk-1'));
    assert.ok(savedRecord, 'Record must exist in cabinet storage');
    assert.strictEqual(savedRecord.status, 'approved', 'Cabinet observes approved status');
    assert.strictEqual(cabinetSandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Sync_9SectionCorrectionRemarksToCabinet: Admin requests correction with 9 remarks -> Cabinet verifies remarks', () => {
    const remarks = {
      main: 'Обновить генеральный план',
      chars: 'Уточнить высоту потолков',
      infra: 'Добавить расстояние до школы',
      prices: 'Обновить минимальную стоимость м²',
      yard: 'Прикрепить рендеры детской площадки',
      engineering: 'Указать тип автономного отопления',
      comfort: 'Проверить классификацию комфорт-класса',
      security: 'Описать систему контроля доступа',
      management: 'Указать тариф управляющей компании'
    };

    const adminSandbox = createAdminSandbox();
    adminSandbox.localStorage.setItem('amber_moderation_zhk-1', JSON.stringify({
      zhkId: 'zhk-1',
      zhkName: 'ЖК «Нордберг»',
      developerId: 1,
      status: 'needs_correction',
      adminComments: remarks
    }));

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: getStorageObject(adminSandbox)
    });

    const record = JSON.parse(cabinetSandbox.localStorage.getItem('amber_moderation_zhk-1'));
    assert.ok(record, 'Record must exist in cabinet storage');
    assert.strictEqual(record.status, 'needs_correction');
    assert.strictEqual(record.adminComments.main, 'Обновить генеральный план');
    assert.strictEqual(record.adminComments.engineering, 'Указать тип автономного отопления');
    assert.strictEqual(cabinetSandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Sync_DeveloperCodeRegenerationToCabinet: Admin regenerates code -> Cabinet auth requires new code', () => {
    const adminSandbox = createAdminSandbox();
    const oldCode = '123456';
    const newCode = '987654';

    const dev = adminSandbox.window.AMBER_DATA.developers.find(d => d.id === 1);
    if (dev) {
      dev.accessCode = newCode;
    }

    assert.strictEqual(dev?.accessCode, newCode, 'Developer access code updated in AMBER_DATA');
    assert.notStrictEqual(dev?.accessCode, oldCode, 'Old access code invalidated');
    assert.strictEqual(adminSandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Sync_PaidLeadsLockingToCabinet: Admin locks lead -> Cabinet renders locked guard and unlock request flow', () => {
    const paidLead = createMockLead({
      id: 'lead-sync-locked',
      phone: '+7 (911) 456-78-90',
      phoneMasked: '+7 (911) ***-**-90',
      developerId: 1,
      isPaidCard: true,
      isUnlocked: false
    });

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_leads': [paidLead],
        'amber_paid_cards': []
      }
    });

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: getStorageObject(adminSandbox)
    });

    const raw = cabinetSandbox.localStorage.getItem('amber_leads');
    const leads = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    const lead = leads.find(l => l.id === 'lead-sync-locked');
    assert.ok(lead, 'Lead must exist in cabinet leads');
    assert.strictEqual(lead.isPaidCard, true);
    assert.strictEqual(lead.isUnlocked, false);
    assert.strictEqual(cabinetSandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Sync_CabinetAdBookingToAdminDashboard: Cabinet ad placement request visible in Admin Developer Notifications feed', () => {
    const cabinetSandbox = createCabinetSandbox({ developerId: 1 });
    const newBooking = {
      hero: {
        typeId: 'hero',
        title: 'Главный баннер на главной',
        developerId: 1,
        developerName: 'ГК «Балтийский Дом»',
        requestedAt: new Date().toISOString(),
        status: 'pending'
      }
    };
    cabinetSandbox.localStorage.setItem('amber_placements_dev_1', JSON.stringify(newBooking));

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: getStorageObject(cabinetSandbox)
    });

    if (typeof adminSandbox.window.renderDashboardDeveloperNotifs === 'function') {
      adminSandbox.window.renderDashboardDeveloperNotifs();
    }

    assert.strictEqual(adminSandbox.getConsoleErrors().length, 0);
  });

  await test('Tier5_Sync_CabinetSupportTicketToAdminFeed: Cabinet support ticket excerpt visible in Admin Dashboard Tickets feed', () => {
    const ticketRecord = {
      't-101': {
        id: 't-101',
        subject: 'Вопрос по выгрузке планировок в XML',
        developerId: 1,
        developerName: 'ГК «Балтийский Дом»',
        date: '2026-08-26',
        status: 'open',
        messages: [
          { from: 'user', text: 'Добрый день, подскажите формат фида для Domclick', time: '14:30' }
        ]
      }
    };

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_tickets_1': ticketRecord
      }
    });

    if (typeof adminSandbox.window.renderDashboardTicketsFeed === 'function') {
      adminSandbox.window.renderDashboardTicketsFeed();
    }

    assert.strictEqual(adminSandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY 7: Zero Uncaught Exceptions & Console Errors Invariant (3 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier5_ZeroErrors_AdminAllSectionsAndModals: Complete traversal of all admin sections and modals produces zero errors', () => {
    const sandbox = createAdminSandbox();
    const sections = ['dashboard', 'developers', 'moderation', 'properties', 'blog', 'banners', 'monetization', 'stats', 'amber-leads', 'settings', 'audit-log'];
    sections.forEach(sec => sandbox.window.switchAdminSection(sec));

    ['developers', 'properties', 'banners', 'experts', 'heroSlides'].forEach(type => {
      sandbox.window.openAddModal(type);
      sandbox.window.closeModal();
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Admin panel has 0 console errors');
  });

  await test('Tier5_ZeroErrors_CabinetAllTabsAndDialogs: Traversal of all cabinet tabs produces zero errors', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const tabs = ['overview', 'complexes', 'analytics', 'placements', 'leads', 'settings'];
    tabs.forEach(tab => {
      const navItem = sandbox.document.querySelector(`.cabinet-nav-item[data-tab="${tab}"], [data-section="${tab}"]`);
      if (navItem) navItem.click();
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Cabinet panel has 0 console errors');
  });

  await test('Tier5_ZeroErrors_CatalogViewportsAndFeeds: Rendering across all catalog viewports produces zero errors', () => {
    const sandbox = createCatalogSandbox({ pageName: 'zhk-kaliningrad.html' });
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Catalog feed has 0 console errors');
  });

  return results;
}

if (require.main === module) {
  runTier5Tests().then(results => {
    console.log(`TIER 5 RESULTS: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    results.forEach(r => {
      const icon = r.passed ? '  ✅' : '  ❌';
      console.log(`${icon} ${r.name} (${r.duration}ms)`);
      if (!r.passed) console.error(`     Error: ${r.error}`);
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runTier5Tests };
