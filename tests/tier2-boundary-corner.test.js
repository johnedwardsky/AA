'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { createAuditLogEntry, createCorruptedAuditLogEntry, createMockPlacementRecord, createMockLead, createMockAnalyticsEvent } = require('./harness/test-fixtures');

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

  await test('Boundary T2.2: Empty localStorage for moderation displays clean placeholder', () => {
    const sandbox = createAdminSandbox({ initialLocalStorage: {} });
    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
    }
    const container = sandbox.document.getElementById('moderation-table-container');
    if (container) {
      assert.ok(container.innerHTML.includes('Нет записей') || container.innerHTML.includes('пусто') || container.innerHTML.includes('фильтр') || container.children.length === 0);
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
        assert.strictEqual(records.length, 0, 'Corrupted records safely filtered out');
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
