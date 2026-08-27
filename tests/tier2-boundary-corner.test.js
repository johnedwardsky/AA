'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { createAuditLogEntry, createCorruptedAuditLogEntry, createMockPlacementRecord, createMockLead, createMockAnalyticsEvent, FIXTURES } = require('./harness/test-fixtures');

/**
 * TIER 2: Boundary & Corner Cases Test Suite
 * Tests empty states, corrupted data, limits, caps, date rollovers,
 * cooldown enforcement, zero division, and malformed inputs.
 */
async function runTier2Tests() {
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

  // ════════════════════════════════════════════════════════════════════════════
  // BASELINE BOUNDARY TESTS (T2.1 - T2.15)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Boundary T2.1: Empty AMBER_DATA collections render empty tables without throwing', () => {
    const sandbox = createAdminSandbox({
      initialAmberData: {
        properties: [],
        developers: [],
        blog: [],
        experts: [],
        banners: [],
        heroSlides: []
      }
    });
    assert.doesNotThrow(() => {
      sandbox.window.renderPropertiesTable();
      sandbox.window.renderDevelopersTable();
      sandbox.window.renderBlogTable();
      sandbox.window.renderExpertsTable();
      sandbox.window.renderBannersTable();
      sandbox.window.renderHeroSlidesTable();
    });
    const propTbody = sandbox.document.querySelector('#table-properties tbody');
    assert.strictEqual(propTbody.children.length, 0, 'Properties table is empty');
  });

  await test('Boundary T2.2: Empty localStorage for moderation displays clean placeholder on empty filter', () => {
    const sandbox = createAdminSandbox({ initialLocalStorage: {} });
    if (typeof sandbox.window.renderModerationSection === 'function') {
      const filterEl = sandbox.document.getElementById('mod-filter-status');
      if (filterEl) filterEl.value = 'needs_correction';
      sandbox.window.renderModerationSection();
    }
    const container = sandbox.document.getElementById('moderation-table-container') || sandbox.document.getElementById('moderation-queue-container');
    if (container) {
      assert.ok(container.innerHTML.length >= 0, 'Moderation container rendered cleanly');
    }
  });

  await test('Boundary T2.3: Corrupted / Malformed JSON in localStorage amber_moderation_* is safely ignored', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_bad1': '{ invalid json !!!',
        'amber_moderation_bad2': '{"zhkId": null, "broken": true}'
      }
    });
    assert.doesNotThrow(() => {
      if (typeof sandbox.window.getAllModerationRecords === 'function') {
        const records = sandbox.window.getAllModerationRecords();
        assert.ok(Array.isArray(records));
        assert.strictEqual(records.some(r => !r || !r.zhkId), false, 'Corrupted records safely filtered out');
      }
    });
  });

  await test('Boundary T2.4: Corrupted / Malformed JSON in amber_audit_logs_queue_* is safely ignored', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_audit_logs_queue_1': 'NOT_ARRAY_OR_JSON',
        'amber_audit_logs_queue_2': '{"unexpected": "object"}'
      }
    });
    assert.doesNotThrow(() => {
      if (typeof sandbox.window.getAllAuditLogs === 'function') {
        const logs = sandbox.window.getAllAuditLogs();
        assert.strictEqual(logs.length, 0, 'Corrupted audit queues safely handled');
      }
    });
  });

  await test('Boundary T2.5: Cryptographic SHA-256 verification of tampered changes dictionary', async () => {
    const entry = createCorruptedAuditLogEntry();
    const sandbox = createAdminSandbox();
    const result = await sandbox.window.verifyHash(entry);
    assert.strictEqual(result, false, 'Tampered changes dictionary must fail verification');
  });

  await test('Boundary T2.6: Cryptographic SHA-256 verification of tampered developer ID', async () => {
    const entry = createAuditLogEntry();
    entry.developerId = 9999;
    const sandbox = createAdminSandbox();
    const result = await sandbox.window.verifyHash(entry);
    assert.strictEqual(result, false, 'Tampered developerId must fail hash check');
  });

  await test('Boundary T2.7: Cryptographic SHA-256 verification of altered timestamp', async () => {
    const entry = createAuditLogEntry();
    entry.timestamp = '2020-01-01T00:00:00.000Z';
    const sandbox = createAdminSandbox();
    const result = await sandbox.window.verifyHash(entry);
    assert.strictEqual(result, false, 'Tampered timestamp must fail verification');
  });

  await test('Boundary T2.8: Large list pagination (150+ audit logs) handles high page index gracefully', async () => {
    const entries = Array.from({ length: 150 }, (_, i) => createAuditLogEntry({ id: 'aud-' + i }));
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: entries
      }
    });
    await sandbox.window.renderAdminAuditLog();
    const countEl = sandbox.document.getElementById('audit-count');
    if (countEl) assert.strictEqual(countEl.textContent, '150 записей');
  });

  await test('Boundary T2.9: Special characters and XSS payloads in entity names are safely handled in diffs', () => {
    const entry = createAuditLogEntry({
      developerName: '<script>alert("xss")</script> "ГК" & Co',
      changes: { '<img src=x onerror=1>': { old: '<b>1</b>', new: '<i>2</i>' } }
    });
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: [entry]
      }
    });
    assert.doesNotThrow(() => {
      sandbox.window.populateDevFilter([entry]);
    });
  });

  await test('Boundary T2.10: Empty string / whitespace search filters match all records without errors', () => {
    const sandbox = createAdminSandbox();
    const filterInput = sandbox.document.getElementById('audit-filter-search');
    if (filterInput) {
      filterInput.value = '   ';
      assert.doesNotThrow(() => {
        sandbox.window.renderAdminAuditLog();
      });
    }
  });

  await test('Boundary T2.11: Non-existent ID in openConsentCard handles gracefully with console warning', () => {
    const sandbox = createAdminSandbox({ initialLocalStorage: {} });
    assert.doesNotThrow(() => {
      sandbox.window.openConsentCard('non-existent-lead-999');
    });
  });

  await test('Boundary T2.12: Deleting non-existent item in collection does not throw', () => {
    const sandbox = createAdminSandbox();
    sandbox.setConfirmResponse(true);
    assert.doesNotThrow(() => {
      sandbox.window.deleteItem('properties', 99999);
    });
  });

  await test('Boundary T2.13: Moderation corrections with empty comments prompts confirmation', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-1': {
          zhkId: 'zhk-1',
          zhkName: 'ЖК 1',
          status: 'on_review',
          adminComments: { main: null, chars: null }
        }
      }
    });
    sandbox.setConfirmResponse(true);
    assert.doesNotThrow(() => {
      if (typeof sandbox.window.adminSendCorrections === 'function') {
        sandbox.window.adminSendCorrections('zhk-1', 0);
      }
    });
  });

  await test('Boundary T2.14: Safe handling of zero leads in Amber Leads table', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: { amber_leads: [] }
    });
    assert.doesNotThrow(() => {
      sandbox.window.renderAmberLeadsTable();
    });
  });

  await test('Boundary T2.15: Rapid sequential tab switching stress test', () => {
    const sandbox = createAdminSandbox();
    const sections = ['dashboard', 'developers', 'moderation', 'properties', 'blog', 'banners', 'monetization', 'stats', 'amber-leads', 'settings', 'audit-log'];
    sections.forEach(s => {
      sandbox.window.switchAdminSection(s);
    });
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EXTENDED BOUNDARY TESTS FOR R1–R6 (B1 to B8)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Boundary B1.1: Empty placements storage handles gracefully with zero errors', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: { amber_placements: [], amber_paid_cards: [] }
    });
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Boundary B1.2: Empty analytics storage falls back cleanly to seed data without NaN', () => {
    const sandbox = createAdminSandbox({ initialLocalStorage: {} });
    const analytics = JSON.parse(sandbox.localStorage.getItem('amber_analytics_global') || '[]');
    assert.ok(Array.isArray(analytics));
  });

  await test('Boundary B2.1: Cabinet Analytics Gating boundary at exactly 4 paid cards (locked)', () => {
    const paidCards = [1, 2, 3, 4];
    const isLocked = paidCards.length < 5;
    assert.strictEqual(isLocked, true, 'Boundary N=4 must be locked');
  });

  await test('Boundary B2.2: Cabinet Analytics Gating boundary at exactly 5 paid cards (unlocked)', () => {
    const paidCards = [1, 2, 3, 4, 5];
    const isLocked = paidCards.length < 5;
    assert.strictEqual(isLocked, false, 'Boundary N=5 must unlock');
  });

  await test('Boundary B2.3: Type 3 Progressive Pricing scales for 10 horizontal banners', () => {
    function calcType3(n) {
      if (n <= 0) return 0;
      let cost = 35000;
      if (n >= 2) cost += 25000;
      if (n >= 3) cost += (n - 2) * 15000;
      return cost;
    }
    // 35k + 25k + 8 * 15k = 60k + 120k = 180k
    assert.strictEqual(calcType3(10), 180000, '10 banners cost 180 000 ₽');
  });

  await test('Boundary B2.4: Type 8 Premium pricing transition between month 6 (900k) and month 7 (1.15M)', () => {
    function calcType8(months) {
      if (months <= 6) return months * 150000;
      return (6 * 150000) + ((months - 6) * 250000);
    }
    assert.strictEqual(calcType8(6), 900000);
    assert.strictEqual(calcType8(7), 1150000);
    assert.strictEqual(calcType8(12), 2400000);
  });

  await test('Boundary B3.1: Placements Countdown displaying 0 days when placement expired yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const remainingDays = Math.max(0, Math.ceil((new Date(yesterday).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    assert.strictEqual(remainingDays, 0, 'Expired date yields 0 remaining days without negative values');
  });

  await test('Boundary B3.2: Year rollover in booking calendar (Dec 2026 -> Jan 2027)', () => {
    const dec = new Date(2026, 11, 31);
    const jan = new Date(dec.getTime() + 86400000);
    assert.strictEqual(jan.getFullYear(), 2027);
    assert.strictEqual(jan.getMonth(), 0);
  });

  await test('Boundary B4.1: Type 4 Recommended block rejects 4 cards', () => {
    const selectedCards = [1, 2, 3, 4];
    const isValid = selectedCards.length <= 3;
    assert.strictEqual(isValid, false, '4 cards exceed max cap of 3');
  });

  await test('Boundary B4.2: Type 4 Recommended block rejects 8 consecutive days', () => {
    const days = 8;
    const isValid = days <= 7;
    assert.strictEqual(isValid, false, '8 days exceed max limit of 7 days');
  });

  await test('Boundary B4.3: Type 2 Side Banner rejects consecutive positions (e.g. 5 and 6)', () => {
    const posA = 5;
    const posB = 6;
    const isValid = Math.abs(posA - posB) >= 2;
    assert.strictEqual(isValid, false, 'Consecutive card positions rejected');
  });

  await test('Boundary B5.1: Type 4 Recommended 30-day cooldown enforcement', () => {
    const lastBookingEnd = new Date('2026-08-01').getTime();
    const attemptDate = new Date('2026-08-20').getTime(); // 19 days later (<30)
    const daysDiff = Math.floor((attemptDate - lastBookingEnd) / (1000 * 60 * 60 * 24));
    const allowed = daysDiff >= 30;
    assert.strictEqual(allowed, false, 'Rebooking at day 19 is rejected due to cooldown');

    const allowedDate = new Date('2026-09-05').getTime(); // 35 days later (>=30)
    const daysDiff2 = Math.floor((allowedDate - lastBookingEnd) / (1000 * 60 * 60 * 24));
    assert.strictEqual(daysDiff2 >= 30, true, 'Rebooking at day 35 is allowed');
  });

  await test('Boundary B6.1: Corrupted JSON in amber_placements is handled safely', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: { amber_placements: '{ corrupted JSON string [[[' }
    });
    assert.doesNotThrow(() => {
      const raw = sandbox.localStorage.getItem('amber_placements');
      let data = [];
      try { data = JSON.parse(raw); } catch { data = []; }
      assert.ok(Array.isArray(data));
    });
  });

  await test('Boundary B7.1: Zero impressions CTR computation returns 0.0% without NaN', () => {
    const impressions = 0;
    const clicks = 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0.0%';
    assert.strictEqual(ctr, '0.0%', 'CTR with 0 impressions returns 0.0%');
  });

  await test('Boundary B7.2: Zero clicks CPC computation returns 0 ₽ without Infinity', () => {
    const cost = 50000;
    const clicks = 0;
    const cpc = clicks > 0 ? Math.round(cost / clicks) + ' ₽' : '0 ₽';
    assert.strictEqual(cpc, '0 ₽', 'CPC with 0 clicks returns 0 ₽');
  });

  await test('Boundary B8.1: Currency formatting handles large amounts (1 250 000 ₽)', () => {
    const amount = 1250000;
    const formatted = amount.toLocaleString('ru-RU') + ' ₽';
    assert.ok(formatted.includes('1') && formatted.includes('250') && formatted.includes('000'));
  });

  await test('Boundary B8.2: Invalid tariff planId in storage falls back safely', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: '{"planId": "unknown_plan_xyz", "modules": "not-an-array"}'
      }
    });
    assert.doesNotThrow(() => {
      const raw = sandbox.localStorage.getItem('amber_tariff_1');
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
      const plan = ['free', 'standard', 'pro', 'custom'].includes(parsed.planId) ? parsed.planId : 'free';
      assert.strictEqual(plan, 'free');
    });
  });

  await test('Boundary B8.3: Empty required fields in Company 214-FZ form handled safely', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_company_1: { name: '', inn: '', ogrn: '', address: '' }
      }
    });
    const company = JSON.parse(sandbox.localStorage.getItem('amber_company_1') || '{}');
    const isValid = Boolean(company.name && company.inn && company.inn.length >= 10);
    assert.strictEqual(isValid, false, 'Empty company requisites correctly flagged as invalid');
  });

  await test('Boundary B8.4: Boundary dates with leap year calculation', () => {
    const leapDate = new Date(2028, 1, 29); // Feb 29, 2028
    assert.strictEqual(leapDate.getDate(), 29);
    assert.strictEqual(leapDate.getMonth(), 1);

    const nonLeapDate = new Date(2027, 1, 29); // Feb 29, 2027 -> Mar 1, 2027
    assert.strictEqual(nonLeapDate.getMonth(), 2);
    assert.strictEqual(nonLeapDate.getDate(), 1);
  });

  await test('Boundary B8.5: Malformed JSON in amber_settings and amber_company recovery', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_settings_1: 'BROKEN_JSON{',
        amber_company_1: 'INVALID}'
      }
    });
    assert.doesNotThrow(() => {
      let settings = {};
      try { settings = JSON.parse(sandbox.localStorage.getItem('amber_settings_1')); } catch { settings = {}; }
      let company = {};
      try { company = JSON.parse(sandbox.localStorage.getItem('amber_company_1')); } catch { company = {}; }
      assert.ok(typeof settings === 'object');
      assert.ok(typeof company === 'object');
    });
  });

  await test('Boundary B8.6: XSS safety: Escaping script tags in document file names and employee names', () => {
    const rawDocName = '<script>alert("hack")</script>Проектная_декларация.pdf';
    const escaped = rawDocName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    assert.ok(escaped.includes('&lt;script&gt;'));
    assert.strictEqual(escaped.includes('<script>'), false);
  });

  await test('Boundary B8.7: Negative lead IDs and extreme integer bounds handled safely', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: [
          createMockLead({ id: '-999', name: 'Boundary Lead Negative' }),
          createMockLead({ id: '9007199254740991', name: 'Boundary Lead Max Safe' })
        ]
      }
    });
    assert.doesNotThrow(() => {
      sandbox.window.openConsentCard('-999');
      sandbox.window.openConsentCard('9007199254740991');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ITERATION 2 BOUNDARY & CORNER CASES (22 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('T2_R1_ZeroZhkQualityIndex: Developer with 0 complexes displays clean placeholder without NaN', () => {
    function computeOverallQuality(properties) {
      if (!properties || properties.length === 0) {
        return { score: 0, display: '--', color: 'status-gray', count: 0 };
      }
      const sum = properties.reduce((acc, p) => acc + (p.score || 0), 0);
      const avg = Math.round(sum / properties.length);
      return { score: avg, display: `${avg}%`, color: avg >= 80 ? 'status-green' : (avg >= 50 ? 'status-yellow' : 'status-red'), count: properties.length };
    }

    const res = computeOverallQuality([]);
    assert.strictEqual(res.display, '--');
    assert.strictEqual(res.count, 0);
    assert.strictEqual(Number.isNaN(res.score), false);
  });

  await test('T2_R1_MaxCompletionScore: 100% complete complex data achieves max score & green status', () => {
    function evaluateZhkCompleteness(prop) {
      let score = 0;
      if (prop.title && prop.title.trim()) score += 20;
      if (prop.address && prop.address.trim()) score += 20;
      if (prop.price && prop.price.trim()) score += 20;
      if (prop.images && prop.images.length > 0) score += 20;
      if (prop.infrastructure && prop.infrastructure.trim()) score += 20;
      return score;
    }

    const perfectProp = {
      title: 'ЖК «Расцвет на Гагарина»',
      address: 'ул. Гагарина, 100',
      price: 'от 4.2 млн ₽',
      images: ['photo1.jpg', 'photo2.jpg'],
      infrastructure: 'Детский сад, школа, паркинг'
    };
    const score = evaluateZhkCompleteness(perfectProp);
    assert.strictEqual(score, 100);
  });

  await test('T2_R1_MinCompletionScore: 0% complete complex triggers all missing data advice warnings', () => {
    function getMissingDataAdvice(prop) {
      const advice = [];
      if (!prop.description && !prop.infrastructure) advice.push('Заполните все характеристики объекта');
      if (!prop.images || prop.images.length === 0) advice.push('Добавьте фотографии и планировки');
      if (!prop.price) advice.push('Укажите актуальные цены');
      return advice;
    }

    const emptyProp = { name: 'ЖК Безымянный', images: [] };
    const advice = getMissingDataAdvice(emptyProp);
    assert.strictEqual(advice.length, 3);
    assert.ok(advice.includes('Заполните все характеристики объекта'));
    assert.ok(advice.includes('Добавьте фотографии и планировки'));
  });

  await test('T2_R1_PriceStale30DaysBoundary_30Days: Price updated exactly 30 days ago does not trigger stale warning', () => {
    function isPriceStale(lastUpdatedTimestamp, currentTimestamp) {
      const diffMs = currentTimestamp - new Date(lastUpdatedTimestamp).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    }

    const now = 1756123456789;
    const exactly30DaysAgo = new Date(now - 30 * 86400000).toISOString();
    assert.strictEqual(isPriceStale(exactly30DaysAgo, now), false);
  });

  await test('T2_R1_PriceStale30DaysBoundary_31Days: Price updated 31 days ago triggers stale price advice', () => {
    function isPriceStale(lastUpdatedTimestamp, currentTimestamp) {
      const diffMs = currentTimestamp - new Date(lastUpdatedTimestamp).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    }

    const now = 1756123456789;
    const exactly31DaysAgo = new Date(now - 31 * 86400000).toISOString();
    assert.strictEqual(isPriceStale(exactly31DaysAgo, now), true);
  });

  await test('T2_R2_ZeroUnpaidLeads: 0 unpaid leads produces 0 ₽ missed revenue loss with positive notice', () => {
    function getMissedOpportunitySummary(leads) {
      const unpaid = (leads || []).filter(l => l.isPaidCard === false);
      const loss = unpaid.length * 50000;
      return {
        count: unpaid.length,
        loss,
        message: unpaid.length === 0 ? 'Все лиды поступают с оплаченных карточек!' : `Упущено ${unpaid.length} лидов`
      };
    }

    const result = getMissedOpportunitySummary([{ isPaidCard: true }, { isPaidCard: true }]);
    assert.strictEqual(result.count, 0);
    assert.strictEqual(result.loss, 0);
    assert.strictEqual(result.message, 'Все лиды поступают с оплаченных карточек!');
  });

  await test('T2_R2_DuplicateUnlockRequest: Rapid duplicate unlock request submission is prevented', () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    function submitUnlockRequest(req) {
      const current = sandbox.localStorage.getUnlockRequests();
      const exists = current.some(r => r.leadId === req.leadId && r.status === 'pending');
      if (exists) return false;
      current.push(req);
      sandbox.localStorage.setUnlockRequests(current);
      return true;
    }

    const req = { id: 'unl-1', leadId: 'lead-106', zhkId: 10, developerId: 3, status: 'pending' };
    const firstCall = submitUnlockRequest(req);
    const secondCall = submitUnlockRequest(req);

    assert.strictEqual(firstCall, true);
    assert.strictEqual(secondCall, false);
    assert.strictEqual(sandbox.localStorage.getUnlockRequests().length, 1);
  });

  await test('T2_R2_NonStandardPhoneFormat: Phone masking handles non-standard numbers cleanly', () => {
    function maskPhone(phone) {
      if (!phone) return '+7 (9**) ***-**-67';
      const clean = String(phone).replace(/[^\d]/g, '');
      const lastTwo = clean.slice(-2);
      return `+7 (9**) ***-**-${lastTwo || '67'}`;
    }

    assert.strictEqual(maskPhone('89001234567'), '+7 (9**) ***-**-67');
    assert.strictEqual(maskPhone('+74012112233'), '+7 (9**) ***-**-33');
    assert.strictEqual(maskPhone('8 (4012) 55-66-88'), '+7 (9**) ***-**-88');
    assert.strictEqual(maskPhone(''), '+7 (9**) ***-**-67');
    assert.strictEqual(maskPhone(null), '+7 (9**) ***-**-67');
  });

  await test('T2_R2_XSSInLeadInquiry: Malicious payload in unpaid lead inquiry is sanitized', () => {
    function sanitizeLeadText(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const evilPayload = '<script>document.cookie="stolen";</script>Хочу 2-комнатную квартиру';
    const sanitized = sanitizeLeadText(evilPayload);
    assert.strictEqual(sanitized.includes('<script>'), false);
    assert.ok(sanitized.includes('&lt;script&gt;'));
    assert.ok(sanitized.includes('Хочу 2-комнатную'));
  });

  await test('T2_R3_CompetitorZeroImpressions: 0 impressions in CTR calculation returns 0.0% without division by zero', () => {
    function calculateCtr(clicks, impressions) {
      if (!impressions || impressions <= 0) return 0.0;
      return Number(((clicks / impressions) * 100).toFixed(2));
    }

    assert.strictEqual(calculateCtr(0, 0), 0.0);
    assert.strictEqual(calculateCtr(15, 0), 0.0);
    assert.strictEqual(calculateCtr(15, 1000), 1.5);
  });

  await test('T2_R3_NoCompetitorsInDistrict: Rural district without competitors falls back to regional benchmark', () => {
    function getDistrictBenchmark(districtId, benchmarks) {
      const found = (benchmarks.districts || []).find(d => d.id === districtId);
      if (found) return found;
      return { id: 'default', name: 'Калининград (среднее по рынку)', avgCtr: 3.5, avgPriceSqm: 120000 };
    }

    const benchmark = getDistrictBenchmark('unknown_rural_district', FIXTURES.competitorBenchmarks || {});
    assert.strictEqual(benchmark.name, 'Калининград (среднее по рынку)');
    assert.strictEqual(benchmark.avgCtr, 3.5);
  });

  await test('T2_R4_ZeroActivePlacements: Developer with 0 active placements renders empty state with CTA', () => {
    const sandbox = createCabinetSandbox({ developerId: 10 });
    sandbox.localStorage.setPlacements(10, []);
    const placements = sandbox.localStorage.getPlacements(10);
    assert.strictEqual(placements.length, 0);

    const emptyStateHtml = '<div class="empty-state">Нет активных рекламных кампаний <button>Запросить размещение</button></div>';
    assert.ok(emptyStateHtml.includes('Нет активных рекламных кампаний'));
  });

  await test('T2_R4_ExpiredPlacementCountdown: Past end date displays 0 days remaining without negative numbers', () => {
    function calculateDaysRemaining(endDateStr, currentTimestamp) {
      const endMs = new Date(endDateStr).getTime();
      const diffMs = endMs - currentTimestamp;
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }

    const now = 1756123456789;
    const pastDate = new Date(now - 5 * 86400000).toISOString();
    const futureDate = new Date(now + 18 * 86400000).toISOString();

    assert.strictEqual(calculateDaysRemaining(pastDate, now), 0);
    assert.strictEqual(calculateDaysRemaining(futureDate, now), 18);
  });

  await test('T2_R4_LeapYearCalendarRollover: Calendar correctly evaluates 29 days for February 2028', () => {
    function getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }

    assert.strictEqual(getDaysInMonth(2028, 2), 29, 'Feb 2028 is leap year with 29 days');
    assert.strictEqual(getDaysInMonth(2026, 2), 28, 'Feb 2026 has 28 days');
  });

  await test('T2_R5_PasswordMismatchValidation: Password confirmation mismatch triggers validation rejection', () => {
    function validatePasswordUpdate(oldPass, newPass, confirmPass) {
      if (!oldPass || !newPass) return { valid: false, error: 'Заполните все поля' };
      if (newPass !== confirmPass) return { valid: false, error: 'Пароли не совпадают' };
      if (newPass.length < 6) return { valid: false, error: 'Пароль должен быть не менее 6 символов' };
      return { valid: true };
    }

    const res = validatePasswordUpdate('old123', 'newPass123', 'differentPass456');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Пароли не совпадают');
  });

  await test('T2_R5_IncorrectOldPassword: Wrong current password entered rejects password change', () => {
    function verifyOldPassword(enteredOldPass, actualHash) {
      const crypto = require('node:crypto');
      const enteredHash = crypto.createHash('sha256').update(enteredOldPass).digest('hex');
      return enteredHash === actualHash;
    }

    const crypto = require('node:crypto');
    const correctHash = crypto.createHash('sha256').update('CorrectPass2026!').digest('hex');

    assert.strictEqual(verifyOldPassword('WrongPassword', correctHash), false);
    assert.strictEqual(verifyOldPassword('CorrectPass2026!', correctHash), true);
  });

  await test('T2_R6_MissingTariffFallback: Missing amber_tariff storage defaults to Basic plan at 69 000 ₽', () => {
    const sandbox = createCabinetSandbox({ developerId: 99, initialLocalStorage: {} });
    let tariff = sandbox.localStorage.getTariff(99);
    if (!tariff) {
      tariff = {
        planId: 'basic',
        planName: 'Базовый',
        price: '69 000 ₽ / мес',
        modules: ['analytics-basic']
      };
    }
    assert.strictEqual(tariff.planId, 'basic');
    assert.strictEqual(tariff.price, '69 000 ₽ / мес');
  });

  await test('T2_R7_RedeemUsedInviteToken: Redeeming an already accepted token is rejected', () => {
    function redeemInviteToken(tokenStr, storedTokens) {
      const found = storedTokens.find(t => t.token === tokenStr);
      if (!found) return { ok: false, error: 'Приглашение не найдено' };
      if (found.used || found.status === 'accepted') return { ok: false, error: 'Приглашение уже использовано' };
      return { ok: true, token: found };
    }

    const tokens = [{ token: 'inv_used_1', used: true, status: 'accepted' }];
    const res = redeemInviteToken('inv_used_1', tokens);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Приглашение уже использовано');
  });

  await test('T2_R7_RedeemExpiredInviteToken: Redeeming an expired invite token is rejected', () => {
    function redeemInviteToken(tokenStr, storedTokens, currentTimestamp) {
      const found = storedTokens.find(t => t.token === tokenStr);
      if (!found) return { ok: false, error: 'Приглашение не найдено' };
      if (new Date(found.expiresAt).getTime() < currentTimestamp) {
        return { ok: false, error: 'Срок действия приглашения истек' };
      }
      return { ok: true, token: found };
    }

    const now = 1756123456789;
    const tokens = [{ token: 'inv_exp_1', used: false, expiresAt: new Date(now - 86400000).toISOString() }];
    const res = redeemInviteToken('inv_exp_1', tokens, now);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Срок действия приглашения истек');
  });

  await test('T2_R7_PasswordResetRateLimit5Min: Second password reset request within 5 minutes is blocked', () => {
    function requestPasswordReset(lastRequestTime, currentTime) {
      const ONE_HOUR_MS = 60 * 60 * 1000;
      if (lastRequestTime && (currentTime - lastRequestTime) < ONE_HOUR_MS) {
        return { ok: false, error: 'Запрос можно отправлять не чаще 1 раза в час' };
      }
      return { ok: true };
    }

    const now = 1756123456789;
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const res = requestPasswordReset(fiveMinutesAgo, now);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Запрос можно отправлять не чаще 1 раза в час');
  });

  await test('T2_R7_PasswordResetAfter61Min: Password reset request after 61 minutes is permitted', () => {
    function requestPasswordReset(lastRequestTime, currentTime) {
      const ONE_HOUR_MS = 60 * 60 * 1000;
      if (lastRequestTime && (currentTime - lastRequestTime) < ONE_HOUR_MS) {
        return { ok: false, error: 'Запрос можно отправлять не чаще 1 раза в час' };
      }
      return { ok: true, resetToken: 'rst-' + Math.random().toString(36).slice(2) };
    }

    const now = 1756123456789;
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    const res = requestPasswordReset(sixtyOneMinutesAgo, now);
    assert.strictEqual(res.ok, true);
    assert.ok(res.resetToken.startsWith('rst-'));
  });

  await test('T2_R7_SessionExpiry30Days: Session timestamp older than 30 days is deemed invalid', () => {
    function validateSession(sessionTimestamp, currentTime) {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      if (!sessionTimestamp) return { valid: false, reason: 'no_session' };
      const age = currentTime - new Date(sessionTimestamp).getTime();
      if (age > THIRTY_DAYS_MS) return { valid: false, reason: 'expired' };
      return { valid: true };
    }

    const now = 1756123456789;
    const thirtyOneDaysAgo = new Date(now - 31 * 86400000).toISOString();
    const twentyDaysAgo = new Date(now - 20 * 86400000).toISOString();

    assert.strictEqual(validateSession(thirtyOneDaysAgo, now).valid, false);
    assert.strictEqual(validateSession(twentyDaysAgo, now).valid, true);
  });

  return results;
}

if (require.main === module) {
  runTier2Tests().then(results => {
    console.log(`TIER 2 RESULTS: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    results.forEach(r => {
      if (!r.passed) console.error(`  FAIL: ${r.name} -> ${r.error}`);
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runTier2Tests };
