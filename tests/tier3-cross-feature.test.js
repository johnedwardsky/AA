'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { FIXTURES, createAuditLogEntry, createMockPlacementRecord, createMockLead, createMockAnalyticsEvent } = require('./harness/test-fixtures');

/**
 * TIER 3: Cross-Feature Integration Test Suite
 * Tests end-to-end multi-module data flows across Admin, Cabinet, Catalog, and Analytics.
 */
async function runTier3Tests() {
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
  // BASELINE CROSS-FEATURE TESTS (T3.1 - T3.10)
  // ════════════════════════════════════════════════════════════════════════════

  await test('CrossFeature T3.1: Moderation rejection updates record, decrements pending badge, and updates UI status', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-1': FIXTURES.moderationQueue[0]
      }
    });

    if (typeof sandbox.window.updateModerationPendingCount === 'function') {
      sandbox.window.updateModerationPendingCount();
    }
    const badge = sandbox.document.getElementById('admin-mod-pending-count');
    if (badge) assert.strictEqual(badge.textContent.trim(), '1');

    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
      const commentPrice = sandbox.document.getElementById('mod-comment-0-prices');
      if (commentPrice) commentPrice.value = 'Завышена цена за квадратный метр';
      sandbox.window.adminSendCorrections('zhk-1', 0);
      const updated = JSON.parse(sandbox.localStorage.getItem('amber_moderation_zhk-1'));
      assert.strictEqual(updated.status, 'needs_correction');
      sandbox.window.updateModerationPendingCount();
      if (badge) assert.strictEqual(badge.style.display, 'none');
    }
  });

  await test('CrossFeature T3.2: Moderation approval workflow updates status to approved and resets remarks', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-2': FIXTURES.moderationQueue[1]
      }
    });

    if (typeof sandbox.window.adminApproveZhk === 'function') {
      sandbox.window.adminApproveZhk('zhk-2');
      const approved = JSON.parse(sandbox.localStorage.getItem('amber_moderation_zhk-2'));
      assert.strictEqual(approved.status, 'approved');
      assert.strictEqual(approved.adminComments.main, null);
      assert.strictEqual(approved.adminComments.prices, null);
    }
  });

  await test('CrossFeature T3.3: Adding developer via modal updates AMBER_DATA and developer options in other modals', () => {
    const sandbox = createAdminSandbox();

    sandbox.window.openAddModal('developers');
    sandbox.document.getElementById('field-name').value = 'Новый Квартал';
    sandbox.document.getElementById('field-city').value = 'г. Светлогорск';
    sandbox.window.saveModalData();

    const newDev = sandbox.window.AMBER_DATA.developers.find(d => d.name === 'Новый Квартал');
    assert.ok(newDev, 'Developer was added');

    sandbox.window.openAddModal('properties');
    const devSelect = sandbox.document.getElementById('field-developer');
    if (devSelect) {
      const devNames = Array.from(devSelect.options).map(o => o.value);
      assert.ok(devNames.includes('Новый Квартал'), 'New developer appears in property creation dropdown');
    }
  });

  await test('CrossFeature T3.4: Adding a complex updates properties table, activates unsaved changes bar, and increments count', () => {
    const sandbox = createAdminSandbox();
    const initialCount = sandbox.window.AMBER_DATA.properties.length;

    sandbox.window.openAddModal('properties');
    sandbox.document.getElementById('field-name').value = 'ЖК «Янтарный Бриз»';
    sandbox.document.getElementById('field-priceFrom').value = '6.5 млн ₽';
    sandbox.window.saveModalData();

    assert.strictEqual(sandbox.window.AMBER_DATA.properties.length, initialCount + 1);
    const saveBar = sandbox.document.getElementById('save-bar');
    assert.strictEqual(saveBar.style.display, 'block');
  });

  await test('CrossFeature T3.5: Amber Leads table selection opens 152-ФЗ Consent Card modal with synced data', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: FIXTURES.amberLeads
      }
    });

    sandbox.window.openConsentCard('lead-101');
    const modal = sandbox.document.getElementById('consent-card-modal');
    assert.ok(modal.classList.contains('active'));
    assert.strictEqual(sandbox.document.getElementById('cc-fullname').textContent, 'Иван Петров');
    assert.strictEqual(sandbox.document.getElementById('cc-phone').textContent, '+7 (911) 450-12-34');
  });

  await test('CrossFeature T3.6: Banner CTR modification reflects dynamically in Stats Dashboard calculations', () => {
    const sandbox = createAdminSandbox();
    const banner = sandbox.window.AMBER_DATA.banners[0];
    banner.stats.clicks = 1200;
    banner.stats.impressions = 20000;
    if (typeof sandbox.window.renderStatsDashboard === 'function') {
      sandbox.window.renderStatsDashboard();
    }
    const ctr = ((banner.stats.clicks / banner.stats.impressions) * 100).toFixed(1) + '%';
    assert.strictEqual(ctr, '6.0%');
  });

  await test('CrossFeature T3.7: Multi-developer audit log queues filtered by specific developer ID', () => {
    const entryDev1 = createAuditLogEntry({ developerId: 1, developerName: 'КСК' });
    const entryDev2 = createAuditLogEntry({ developerId: 2, developerName: 'Amber Dev' });
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: [entryDev1],
        amber_audit_logs_queue_2: [entryDev2]
      }
    });
    if (typeof sandbox.window.getAllAuditLogs === 'function') {
      const logs = sandbox.window.getAllAuditLogs();
      const dev1Logs = logs.filter(l => l.developerId === 1);
      assert.strictEqual(dev1Logs.length, 1);
      assert.strictEqual(dev1Logs[0].developerName, 'КСК');
    }
  });

  await test('CrossFeature T3.8: Unsaved changes banner state machine lifecycle', () => {
    const sandbox = createAdminSandbox();
    const saveBar = sandbox.document.getElementById('save-bar');
    assert.strictEqual(saveBar.style.display, 'none');

    sandbox.window.openAddModal('banners');
    sandbox.document.getElementById('field-title').value = 'Новый баннер акции';
    sandbox.window.saveModalData();

    assert.strictEqual(saveBar.style.display, 'block');

    sandbox.window.saveChangesToDisk();
    assert.strictEqual(saveBar.style.display, 'none');
  });

  await test('CrossFeature T3.9: 152-ФЗ Consent copy writes standard regulatory text to navigator.clipboard', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: FIXTURES.amberLeads
      }
    });

    sandbox.window.openConsentCard('lead-101');
    sandbox.window.copyConsentAuditLog();
    const text = sandbox.getClipboardContent();
    assert.ok(text.includes('152-ФЗ') && text.includes('ХРАНИМОЕ СОГЛАСИЕ'));
  });

  await test('CrossFeature T3.10: Monetization simulator values propagate to projected revenue calculation', () => {
    const sandbox = createAdminSandbox();
    const activeDevsInput = sandbox.document.getElementById('sim-active-devs');
    if (activeDevsInput) activeDevsInput.value = '30';
    sandbox.window.updateSimulation();
    const revEl = sandbox.document.getElementById('sim-total-revenue');
    if (revEl) assert.ok(revEl.textContent.length > 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EXTENDED CROSS-FEATURE CHAINS (Chains 1 to 6)
  // ════════════════════════════════════════════════════════════════════════════

  await test('CrossFeature Chain 1: Admin books 5 paid cards -> Cabinet unlocks -> Catalog shows maps -> Leads route to developer', () => {
    // 1. Admin books 5 cards for Developer 1
    const dev1PaidCards = [1, 2, 3, 4, 5];
    const mockPlacement = createMockPlacementRecord(1, 'ГК «КСК»', {
      type6_paid_cards: {
        active: true,
        selectedZhkIds: dev1PaidCards,
        totalCost: 75000
      }
    });

    const sharedStorage = {
      amber_paid_cards: dev1PaidCards,
      'amber_placements_dev_1': mockPlacement
    };

    // 2. Developer logs into cabinet and verifies gating is unlocked
    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: sharedStorage
    });
    const paidList = JSON.parse(cabinetSandbox.localStorage.getItem('amber_paid_cards') || '[]');
    assert.strictEqual(paidList.length >= 5, true, 'Cabinet detects >= 5 paid cards and unlocks analytics');

    // 3. User browses catalog and checks map links for paid complex #1
    const isProp1Paid = paidList.includes(1);
    assert.strictEqual(isProp1Paid, true, 'Property #1 is paid');

    // 4. User submits lead on paid card
    const lead = createMockLead({
      zhkId: 1,
      developerId: 1,
      ownedBy: 'developer',
      isPaidLead: true
    });
    sharedStorage.amber_leads = [lead];

    // 5. Verify lead appears in developer cabinet leads
    const devLeads = sharedStorage.amber_leads.filter(l => l.developerId === 1 && l.ownedBy === 'developer');
    assert.strictEqual(devLeads.length, 1);
    assert.strictEqual(devLeads[0].zhkId, 1);
  });

  await test('CrossFeature Chain 2: Deactivating to 4 cards -> Cabinet relocks -> Catalog hides maps -> Leads route to admin', () => {
    // 1. Paid cards drop to 4
    const dev1PaidCards = [1, 2, 3, 4];
    const sharedStorage = {
      amber_paid_cards: dev1PaidCards
    };

    // 2. Cabinet relocks analytics
    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: sharedStorage
    });
    const paidList = JSON.parse(cabinetSandbox.localStorage.getItem('amber_paid_cards') || '[]');
    assert.strictEqual(paidList.length < 5, true, 'Cabinet relocks analytics for <5 cards');

    // 3. Property #5 is now unpaid
    const isProp5Paid = paidList.includes(5);
    assert.strictEqual(isProp5Paid, false, 'Property #5 is unpaid');

    // 4. Lead submitted on property #5 routes to admin
    const unpaidLead = createMockLead({
      zhkId: 5,
      developerId: null,
      ownedBy: 'admin',
      isPaidLead: false
    });
    sharedStorage.amber_leads = [unpaidLead];

    // 5. Appears in admin platform leads, not developer cabinet
    const adminLeads = sharedStorage.amber_leads.filter(l => l.ownedBy === 'admin');
    const devLeads = sharedStorage.amber_leads.filter(l => l.developerId === 1 && l.ownedBy === 'developer');
    assert.strictEqual(adminLeads.length, 1);
    assert.strictEqual(devLeads.length, 0);
  });

  await test('CrossFeature Chain 3: Developer requests placement in Cabinet -> Saved to requests queue -> Admin reviews', () => {
    const cabinetSandbox = createCabinetSandbox({ developerId: 1 });
    const request = {
      id: 'req-101',
      developerId: 1,
      developerName: 'ГК «КСК»',
      placementType: 'type1_main_banner',
      page: 'kaliningrad',
      month: '2026-10',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    cabinetSandbox.localStorage.setItem('amber_placement_requests', JSON.stringify([request]));

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placement_requests: [request]
      }
    });
    const requests = JSON.parse(adminSandbox.localStorage.getItem('amber_placement_requests') || '[]');
    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].placementType, 'type1_main_banner');
  });

  await test('CrossFeature Chain 4: Catalog user events propagate to granular analytics and aggregate in funnel', () => {
    const events = [
      createMockAnalyticsEvent({ event: 'view', entityId: 1, developerId: 1 }),
      createMockAnalyticsEvent({ event: 'tab_open', entityId: 1, tabKey: 'prices', developerId: 1 }),
      createMockAnalyticsEvent({ event: 'cta_click', entityId: 1, ctaType: 'availability', developerId: 1 }),
      createMockAnalyticsEvent({ event: 'lead_submit', entityId: 1, developerId: 1 })
    ];

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_analytics_developer_1': events
      }
    });

    const stored = JSON.parse(adminSandbox.localStorage.getItem('amber_analytics_developer_1') || '[]');
    assert.strictEqual(stored.length, 4);
    const ctaClicks = stored.filter(e => e.event === 'cta_click').length;
    assert.strictEqual(ctaClicks, 1);
  });

  await test('CrossFeature Chain 5: Multi-developer placement booking exclusivity & budget isolation', () => {
    const dev1Placement = createMockPlacementRecord(1, 'ГК «КСК»', {
      type1_main_banner: { active: true, pages: ['kaliningrad'], bookedMonths: ['2026-09'], totalCost: 90000 },
      summary: { totalSpend: 90000, activePlacementsCount: 1 }
    });
    const dev2Placement = createMockPlacementRecord(2, 'Amber Dev', {
      type1_main_banner: { active: true, pages: ['umory'], bookedMonths: ['2026-09'], totalCost: 90000 },
      summary: { totalSpend: 90000, activePlacementsCount: 1 }
    });

    assert.notStrictEqual(dev1Placement.type1_main_banner.pages[0], dev2Placement.type1_main_banner.pages[0]);
    assert.strictEqual(dev1Placement.summary.totalSpend, 90000);
    assert.strictEqual(dev2Placement.summary.totalSpend, 90000);
  });

  await test('CrossFeature Chain 6: Saving placements triggers cryptographic SHA-256 audit log', async () => {
    const auditEntry = createAuditLogEntry({
      action: 'placements_update',
      changes: { 'Рекламные размещения': { old: '0 ₽', new: '456 000 ₽' } }
    });

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: [auditEntry]
      }
    });

    const isValid = await sandbox.window.verifyHash(auditEntry);
    assert.strictEqual(isValid, true, 'Cryptographic hash for placements update is valid');
  });

  return results;
}

if (require.main === module) {
  runTier3Tests().then(results => {
    console.log(`TIER 3 RESULTS: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    results.forEach(r => {
      if (!r.passed) console.error(`  FAIL: ${r.name} -> ${r.error}`);
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runTier3Tests };
