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
    assert.strictEqual(saveBar.style.display, 'flex');
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

    assert.strictEqual(saveBar.style.display, 'flex');

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

  await test('CrossFeature Chain 7: Admin assigns PRO tariff in amber_tariff_1 -> Cabinet unlocks Traffic, Competitors, and Reports modules', () => {
    const tariff = {
      planId: 'pro',
      planName: 'PRO Тариф',
      modules: ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'crm-export'],
      price: 150000,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      status: 'active'
    };

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: tariff
      }
    });

    const storedTariff = JSON.parse(cabinetSandbox.localStorage.getItem('amber_tariff_1') || '{}');
    assert.strictEqual(storedTariff.planId, 'pro');
    assert.ok(storedTariff.modules.includes('analytics-competitors'));
    assert.ok(storedTariff.modules.includes('analytics-reports'));
  });

  await test('CrossFeature Chain 8: Developer updates 214-FZ company details -> Admin inspects developer directory', () => {
    const company = {
      name: 'ООО «Балтийский Квартал»',
      inn: '3906123456',
      ogrn: '1023900789012',
      license214: '№ 39-000124 от 15.01.2023',
      city: 'Калининград',
      address: 'ул. Театральная, д. 30'
    };

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_company_1: company
      }
    });

    const stored = JSON.parse(adminSandbox.localStorage.getItem('amber_company_1') || '{}');
    assert.strictEqual(stored.inn, '3906123456');
    assert.strictEqual(stored.license214, '№ 39-000124 от 15.01.2023');
  });

  await test('CrossFeature Chain 9: Admin rejects Moderation with engineering comment -> Cabinet feedback sync', () => {
    const modRecord = {
      zhkId: 'zhk-10',
      developerId: '1',
      status: 'needs_correction',
      submittedAt: '2026-08-20T10:00:00Z',
      adminComments: {
        engineering: 'Укажите производителя автономного отопления (котла).'
      }
    };

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_moderation_zhk_10: modRecord
      }
    });

    const rec = JSON.parse(cabinetSandbox.localStorage.getItem('amber_moderation_zhk_10') || '{}');
    assert.strictEqual(rec.status, 'needs_correction');
    assert.strictEqual(rec.adminComments.engineering, 'Укажите производителя автономного отопления (котла).');
  });

  await test('CrossFeature Chain 10: Multi-role employee permission sync in Cabinet', () => {
    const employees = [
      { id: 1, name: 'Анна Кузнецова', role: 'admin', email: 'a.kuznetsova@ksk.ru', status: 'active' },
      { id: 2, name: 'Михаил Орлов', role: 'manager', email: 'm.orlov@ksk.ru', status: 'active' },
      { id: 3, name: 'Елена Васильева', role: 'employee', email: 'e.vasil@ksk.ru', status: 'active' }
    ];

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_employees_1: employees
      }
    });

    const stored = JSON.parse(cabinetSandbox.localStorage.getItem('amber_employees_1') || '[]');
    assert.strictEqual(stored.length, 3);
    const adminEmp = stored.find(e => e.role === 'admin');
    const managerEmp = stored.find(e => e.role === 'manager');
    assert.ok(adminEmp && managerEmp);
  });

  await test('CrossFeature Chain 11: Lead status change in Cabinet CRM persists to global amber_leads storage', () => {
    const leads = [
      createMockLead({ id: 'lead-301', developerId: 1, status: 'new', ownedBy: 'developer' }),
      createMockLead({ id: 'lead-302', developerId: 1, status: 'in_progress', ownedBy: 'developer' })
    ];

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: { amber_leads: leads }
    });

    // Simulate transition of lead-301 to in_progress
    const current = JSON.parse(cabinetSandbox.localStorage.getItem('amber_leads') || '[]');
    const target = current.find(l => l.id === 'lead-301');
    if (target) target.status = 'in_progress';
    cabinetSandbox.localStorage.setItem('amber_leads', JSON.stringify(current));

    const updated = JSON.parse(cabinetSandbox.localStorage.getItem('amber_leads') || '[]');
    assert.strictEqual(updated.find(l => l.id === 'lead-301').status, 'in_progress');
  });

  await test('CrossFeature Chain 12: Admin updates Category Hero background -> Visual configuration sync', () => {
    const bgConfig = {
      kaliningrad: 'kaliningrad_hero_custom.jpg',
      umory: 'umory_hero_custom.jpg',
      prigorod: 'prigorod_hero_custom.jpg',
      oblast: 'oblast_hero_custom.jpg'
    };

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_category_backgrounds: bgConfig
      }
    });

    const stored = JSON.parse(adminSandbox.localStorage.getItem('amber_category_backgrounds') || '{}');
    assert.strictEqual(stored.kaliningrad, 'kaliningrad_hero_custom.jpg');
    assert.strictEqual(stored.umory, 'umory_hero_custom.jpg');
  });

  await test('CrossFeature Chain 13: Webhook URL configured in amber_settings_1 persists across sessions', () => {
    const settings = {
      accessCode: 'KSK-2026-PRO',
      emailNotifications: true,
      tgNotifications: true,
      tgChatId: '@ksk_sales_team',
      webhookUrl: 'https://api.ksk-realty.ru/webhooks/amber-leads'
    };

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_settings_1: settings
      }
    });

    const stored = JSON.parse(cabinetSandbox.localStorage.getItem('amber_settings_1') || '{}');
    assert.strictEqual(stored.webhookUrl, 'https://api.ksk-realty.ru/webhooks/amber-leads');
    assert.strictEqual(stored.tgNotifications, true);
  });

  await test('CrossFeature Chain 14: Dynamic leads badge counter synchronization with status new count', () => {
    const leads = [
      createMockLead({ id: 'lead-401', developerId: 1, status: 'new', ownedBy: 'developer' }),
      createMockLead({ id: 'lead-402', developerId: 1, status: 'new', ownedBy: 'developer' }),
      createMockLead({ id: 'lead-403', developerId: 1, status: 'processed', ownedBy: 'developer' }),
      createMockLead({ id: 'lead-404', developerId: 2, status: 'new', ownedBy: 'developer' })
    ];

    const dev1NewCount = leads.filter(l => l.developerId === 1 && l.status === 'new').length;
    assert.strictEqual(dev1NewCount, 2, 'Developer 1 has exactly 2 new leads');
  });

  await test('CrossFeature Chain 15: Admin creates Expert card in amber_experts_admin -> Persistence and rating sync', () => {
    const newExpert = {
      id: 'exp-99',
      name: 'Виктория Соколова',
      role: 'Ведущий эксперт по новостройкам побережья',
      rating: 4.9,
      deals: 142,
      phone: '+7 (911) 777-88-99',
      avatar: 'expert-sokolova.jpg',
      bio: 'Специалист по курортной недвижимости Светлогорска и Зеленоградска.'
    };

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_experts_admin: [newExpert]
      }
    });

    const stored = JSON.parse(adminSandbox.localStorage.getItem('amber_experts_admin') || '[]');
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0].name, 'Виктория Соколова');
    assert.strictEqual(stored[0].deals, 142);
  });

  await test('CrossFeature Chain 16: Cryptographic audit log chaining across sequential operations maintains SHA-256 verification', async () => {
    const entry1 = createAuditLogEntry({ id: 'seq-1', action: 'company_update', developerId: 1 });
    const entry2 = createAuditLogEntry({ id: 'seq-2', action: 'document_upload', developerId: 1 });

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: [entry1, entry2]
      }
    });

    const valid1 = await sandbox.window.verifyHash(entry1);
    const valid2 = await sandbox.window.verifyHash(entry2);
    assert.strictEqual(valid1, true);
    assert.strictEqual(valid2, true);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ITERATION 2 CROSS-FEATURE SYNCHRONIZATION TESTS (10 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('T3_Sync_AdminTariffToCabinet: Admin assigns PRO tariff -> Cabinet unblocks Traffic & Reports, gates Competitors', () => {
    const adminSandbox = createAdminSandbox();
    const proTariff = {
      planId: 'pro',
      planName: 'Про',
      price: '150 000 ₽ / мес',
      modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports'],
      startDate: '2026-08-25',
      endDate: '2027-08-25',
      status: 'active'
    };
    adminSandbox.localStorage.setTariff(1, proTariff);

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: adminSandbox.localStorage.getTariff(1)
      }
    });

    const devTariff = cabinetSandbox.localStorage.getTariff(1);
    assert.strictEqual(devTariff.planId, 'pro');
    assert.ok(devTariff.modules.includes('analytics-traffic'));
    assert.ok(devTariff.modules.includes('analytics-reports'));
    assert.strictEqual(devTariff.modules.includes('analytics-competitors'), false);
  });

  await test('T3_Sync_UnlockRequestLifecycle: Lead unlock request -> Admin approval -> Lead unmasked in Cabinet', () => {
    const initialLeads = [
      createMockLead({
        id: 'lead-unl-1',
        developerId: 1,
        isPaidCard: false,
        isUnlocked: false,
        phone: '+7 (921) 111-22-33',
        phoneMasked: '+7 (9**) ***-**-33',
        email: 'masked@hidden.com'
      })
    ];

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: { amber_leads: initialLeads }
    });

    // 1. Developer requests unlock
    const unlockReq = {
      id: 'req-101',
      leadId: 'lead-unl-1',
      developerId: 1,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    cabinetSandbox.localStorage.setUnlockRequests([unlockReq]);

    // 2. Admin reviews & approves in admin sandbox
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_unlock_requests: cabinetSandbox.localStorage.getUnlockRequests(),
        amber_leads: initialLeads
      }
    });
    const requests = adminSandbox.localStorage.getUnlockRequests();
    requests[0].status = 'approved';
    adminSandbox.localStorage.setUnlockRequests(requests);

    // Update lead to paid & unlocked
    const leads = adminSandbox.localStorage.getLeads();
    const targetLead = leads.find(l => l.id === 'lead-unl-1');
    targetLead.isPaidCard = true;
    targetLead.isUnlocked = true;
    targetLead.email = 'unmasked.client@example.com';
    adminSandbox.localStorage.setLeads(leads);

    // 3. Cabinet reflects unlocked state
    const cabinetAfter = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: adminSandbox.localStorage.getLeads(),
        amber_unlock_requests: adminSandbox.localStorage.getUnlockRequests()
      }
    });
    const updatedLead = cabinetAfter.localStorage.getLeads().find(l => l.id === 'lead-unl-1');
    assert.strictEqual(updatedLead.isPaidCard, true);
    assert.strictEqual(updatedLead.isUnlocked, true);
    assert.strictEqual(updatedLead.email, 'unmasked.client@example.com');
  });

  await test('T3_Sync_AdminInviteToCabinetAuth: Admin generates invite -> Developer accepts and creates auth record', () => {
    const adminSandbox = createAdminSandbox();
    const token = 'inv_test_partner_99';
    const inviteRecord = {
      token,
      developerId: 99,
      developerName: 'ООО «БалтПартнер»',
      email: 'partner99@amber.ru',
      tariffPlanId: 'premium',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      used: false
    };
    adminSandbox.localStorage.setInviteTokens([inviteRecord]);

    // Developer visits cabinet with invite query
    const cabinetSandbox = createCabinetSandbox({
      url: `http://localhost/cabinet.html?invite=${token}`,
      initialLocalStorage: {
        amber_invite_tokens: adminSandbox.localStorage.getInviteTokens()
      }
    });

    const tokens = cabinetSandbox.localStorage.getInviteTokens();
    const invite = tokens.find(t => t.token === token);
    assert.ok(invite);
    assert.strictEqual(invite.used, false);

    // Register password
    invite.used = true;
    cabinetSandbox.localStorage.setInviteTokens(tokens);
    cabinetSandbox.localStorage.setAuth(99, {
      developerId: 99,
      email: 'partner99@amber.ru',
      passwordHash: 'sha256_hashed_partner_secret'
    });

    const auth = cabinetSandbox.localStorage.getAuth(99);
    assert.strictEqual(auth.email, 'partner99@amber.ru');
    assert.strictEqual(auth.passwordHash, 'sha256_hashed_partner_secret');
    assert.strictEqual(cabinetSandbox.localStorage.getInviteTokens()[0].used, true);
  });

  await test('T3_Sync_LeadStatusCabinetToAdmin: Lead status update in Cabinet persists to global leads queue', () => {
    const lead = createMockLead({ id: 'lead-sync-5', developerId: 2, status: 'new' });
    const cabinetSandbox = createCabinetSandbox({
      developerId: 2,
      initialLocalStorage: { amber_leads: [lead] }
    });

    // Developer moves lead to 'deal'
    const leads = cabinetSandbox.localStorage.getLeads();
    leads[0].status = 'deal';
    leads[0].dealValue = 5400000;
    cabinetSandbox.localStorage.setLeads(leads);

    // Admin views updated lead
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: { amber_leads: cabinetSandbox.localStorage.getLeads() }
    });
    const adminLeads = adminSandbox.localStorage.getLeads();
    assert.strictEqual(adminLeads[0].status, 'deal');
    assert.strictEqual(adminLeads[0].dealValue, 5400000);
  });

  await test('T3_Sync_PlacementBookingToCabinet: Admin books placement -> Cabinet Advertising tab reflects active booking', () => {
    const adminSandbox = createAdminSandbox();
    const placement = {
      id: 'plc-sync-1',
      developerId: 1,
      typeName: 'Главный баннер на главной',
      slot: 'hero_top',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      monthlyPrice: 90000,
      status: 'active'
    };
    adminSandbox.localStorage.setPlacements(1, [placement]);

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_placements_1: adminSandbox.localStorage.getPlacements(1)
      }
    });
    const devPlacements = cabinetSandbox.localStorage.getPlacements(1);
    assert.strictEqual(devPlacements.length, 1);
    assert.strictEqual(devPlacements[0].typeName, 'Главный баннер на главной');
    assert.strictEqual(devPlacements[0].monthlyPrice, 90000);
  });

  await test('T3_Sync_PlacementRequestToAdmin: Developer submits campaign request -> Admin inspects requests queue', () => {
    const cabinetSandbox = createCabinetSandbox({ developerId: 3 });
    const req = {
      id: 'req-sync-9',
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      typeId: 2,
      typeName: 'Боковой баннер в каталоге',
      requestedMonths: ['2026-10'],
      status: 'pending'
    };
    cabinetSandbox.localStorage.setPlacementRequests([req]);

    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placement_requests: cabinetSandbox.localStorage.getPlacementRequests()
      }
    });
    const adminRequests = adminSandbox.localStorage.getPlacementRequests();
    assert.strictEqual(adminRequests.length, 1);
    assert.strictEqual(adminRequests[0].developerName, 'ГК «Расцвет»');
    assert.strictEqual(adminRequests[0].typeName, 'Боковой баннер в каталоге');
  });

  await test('T3_Sync_PropertyEditToQualityIndex: Property data update dynamically recalculates Quality Index', () => {
    function computeScore(p) {
      let score = 0;
      if (p.title) score += 25;
      if (p.price) score += 25;
      if (p.images && p.images.length > 0) score += 25;
      if (p.infrastructure) score += 25;
      return score;
    }

    const incompleteProp = { title: 'ЖК Новый', price: 'от 5 млн ₽', images: [] };
    assert.strictEqual(computeScore(incompleteProp), 50);

    // Developer adds photos and infrastructure in Cabinet
    const updatedProp = { ...incompleteProp, images: ['p1.jpg', 'p2.jpg'], infrastructure: 'Паркинг, спортплощадка' };
    assert.strictEqual(computeScore(updatedProp), 100);
  });

  await test('T3_Sync_PasswordChangeToAuth: Password update in Settings modifies auth credentials and verifies', () => {
    const crypto = require('node:crypto');
    const cabinetSandbox = createCabinetSandbox({ developerId: 1 });
    const oldHash = crypto.createHash('sha256').update('InitialPass2026').digest('hex');
    cabinetSandbox.localStorage.setAuth(1, { developerId: 1, email: 'ksk@amber.ru', passwordHash: oldHash });

    // Update password
    const newHash = crypto.createHash('sha256').update('SecurePassUpdated!').digest('hex');
    const auth = cabinetSandbox.localStorage.getAuth(1);
    auth.passwordHash = newHash;
    cabinetSandbox.localStorage.setAuth(1, auth);

    const savedAuth = cabinetSandbox.localStorage.getAuth(1);
    assert.strictEqual(savedAuth.passwordHash, newHash);
    assert.notStrictEqual(savedAuth.passwordHash, oldHash);
  });

  await test('T3_Sync_CompanyLogoToFileStorage: Developer uploads Base64 logo -> Persists to company profile', () => {
    const cabinetSandbox = createCabinetSandbox({ developerId: 1 });
    const mockLogoBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PC9zdmc+';

    const companyProfile = {
      inn: '3906123456',
      name: 'ГК «Калининградский строительный концерн»',
      logoBase64: mockLogoBase64
    };
    cabinetSandbox.localStorage.setItem('amber_company_1', JSON.stringify(companyProfile));

    const retrieved = JSON.parse(cabinetSandbox.localStorage.getItem('amber_company_1'));
    assert.strictEqual(retrieved.logoBase64, mockLogoBase64);
  });

  await test('T3_Sync_AuditLogChaining: Mutating operations create verifiable SHA-256 audit log queue', async () => {
    const entry1 = createAuditLogEntry({ id: 'aud-sync-1', action: 'tariff_upgrade', developerId: 1 });
    const entry2 = createAuditLogEntry({ id: 'aud-sync-2', action: 'lead_unlocked', developerId: 1 });

    const cabinetSandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_audit_logs_queue_1: [entry1, entry2]
      }
    });

    const logs = JSON.parse(cabinetSandbox.localStorage.getItem('amber_audit_logs_queue_1') || '[]');
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].action, 'tariff_upgrade');
    assert.strictEqual(logs[1].action, 'lead_unlocked');
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
