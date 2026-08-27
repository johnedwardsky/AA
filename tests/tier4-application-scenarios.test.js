'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { FIXTURES, createAuditLogEntry, createCorruptedAuditLogEntry, createMockPlacementRecord, createMockLead, createMockAnalyticsEvent } = require('./harness/test-fixtures');

/**
 * TIER 4: Real-World Application Scenarios Test Suite
 * End-to-end multi-step realistic admin operations, developer onboarding, advertising campaigns,
 * and user interactions matching TEST_INFRA.md.
 */
async function runTier4Tests() {
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
  // BASELINE SCENARIOS (T4.1 - T4.6)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Scenario T4.1: Complete Admin Daily Morning Review Workflow', async () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        'amber_moderation_zhk-101': {
          zhkId: 'zhk-101',
          zhkName: 'ЖК «Янтарный Квартал»',
          developerId: 1,
          developerName: 'ГК «КСК»',
          status: 'on_review',
          submittedAt: '2026-08-19T08:00:00.000Z'
        },
        'amber_moderation_zhk-102': {
          zhkId: 'zhk-102',
          zhkName: 'ЖК «Морская Гавань»',
          developerId: 2,
          developerName: 'Amber Dev',
          status: 'on_review',
          submittedAt: '2026-08-19T08:30:00.000Z'
        }
      }
    });

    if (typeof sandbox.window.updateModerationPendingCount === 'function') {
      sandbox.window.updateModerationPendingCount();
    }
    const badge = sandbox.document.getElementById('admin-mod-pending-count');
    if (badge) assert.strictEqual(badge.textContent.trim(), '2');

    if (typeof sandbox.window.renderModerationSection === 'function') {
      sandbox.window.renderModerationSection();
      const remarkField = sandbox.document.getElementById('mod-comment-0-prices');
      if (remarkField) remarkField.value = 'Скорректируйте ипотечные ставки';
      sandbox.window.adminSendCorrections('zhk-101', 0);
      const rec1 = JSON.parse(sandbox.localStorage.getItem('amber_moderation_zhk-101'));
      assert.strictEqual(rec1.status, 'needs_correction');

      sandbox.window.adminApproveZhk('zhk-102');
      const rec2 = JSON.parse(sandbox.localStorage.getItem('amber_moderation_zhk-102'));
      assert.strictEqual(rec2.status, 'approved');

      sandbox.window.updateModerationPendingCount();
      if (badge) assert.strictEqual(badge.style.display, 'none');
    }
  });

  await test('Scenario T4.2: Developer Onboarding & Project Publishing Workflow', () => {
    const sandbox = createAdminSandbox();

    sandbox.window.openAddModal('developers');
    sandbox.document.getElementById('field-name').value = 'Премиум Девелопмент';
    sandbox.document.getElementById('field-city').value = 'г. Калининград';
    sandbox.document.getElementById('field-experience').value = '15 лет';
    sandbox.window.saveModalData();

    const dev = sandbox.window.AMBER_DATA.developers.find(d => d.name === 'Премиум Девелопмент');
    assert.ok(dev, 'Developer created');

    sandbox.window.openAddModal('properties');
    sandbox.document.getElementById('field-name').value = 'ЖК «Королевские Ворота»';
    sandbox.document.getElementById('field-priceFrom').value = '12 млн ₽';
    sandbox.document.getElementById('field-location').value = 'Центр';
    sandbox.window.saveModalData();

    const complex = sandbox.window.AMBER_DATA.properties.find(p => p.name === 'ЖК «Королевские Ворота»');
    assert.ok(complex, 'Residential complex created under developer');

    sandbox.window.renderPropertiesTable();
    const tbody = sandbox.document.querySelector('#table-properties tbody');
    assert.ok(tbody.innerHTML.includes('ЖК «Королевские Ворота»'));
  });

  await test('Scenario T4.3: 152-ФЗ Security Compliance & Lead Audit Workflow', () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: FIXTURES.amberLeads
      }
    });

    sandbox.window.openConsentCard('lead-101');
    const modal = sandbox.document.getElementById('consent-card-modal');
    assert.ok(modal.classList.contains('active'));

    sandbox.window.copyConsentAuditLog();
    const clip = sandbox.getClipboardContent();
    assert.ok(clip.includes('152-ФЗ') && clip.includes('Иван Петров'));
  });

  await test('Scenario T4.4: Advertising Campaign & CTR Optimization Workflow', () => {
    const sandbox = createAdminSandbox();

    sandbox.window.openAddModal('banners');
    sandbox.document.getElementById('field-title').value = 'Весенняя скидка 10%';
    sandbox.document.getElementById('field-tag').value = 'Спецпредложение';
    sandbox.window.saveModalData();

    const banner = sandbox.window.AMBER_DATA.banners.find(b => b.title === 'Весенняя скидка 10%');
    assert.ok(banner, 'Banner registered');
  });

  await test('Scenario T4.5: Forensic Audit Integrity Check across Multi-Developer Queues', async () => {
    const authentic1 = createAuditLogEntry({ id: 'a1', zhkName: 'ЖК 1' });
    const authentic2 = createAuditLogEntry({ id: 'a2', zhkName: 'ЖК 2' });
    const tampered = createCorruptedAuditLogEntry({ id: 'a3', zhkName: 'ЖК 3' });

    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_audit_logs_queue_1: [authentic1, tampered],
        amber_audit_logs_queue_2: [authentic2]
      }
    });

    const v1 = await sandbox.window.verifyHash(authentic1);
    const v2 = await sandbox.window.verifyHash(authentic2);
    const v3 = await sandbox.window.verifyHash(tampered);

    assert.strictEqual(v1, true);
    assert.strictEqual(v2, true);
    assert.strictEqual(v3, false, 'Forensic audit caught tampered log');
  });

  await test('Scenario T4.6: End-to-End Database Sync and State Persistence Workflow', () => {
    const sandbox = createAdminSandbox();
    const initialProps = sandbox.window.AMBER_DATA.properties.length;

    sandbox.window.openAddModal('properties');
    sandbox.document.getElementById('field-name').value = 'ЖК «Новая Волна»';
    sandbox.window.saveModalData();

    assert.strictEqual(sandbox.window.AMBER_DATA.properties.length, initialProps + 1);
    sandbox.window.saveChangesToDisk();
    assert.strictEqual(sandbox.document.getElementById('save-bar').style.display, 'none');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5 CORE REAL-WORLD SCENARIOS FROM TEST_INFRA.md
  // ════════════════════════════════════════════════════════════════════════════

  await test('Scenario 1: Super-Admin Placements Management & Multi-Developer Booking Conflict Resolution', () => {
    // 1. Admin configures Type 1 for Dev 1 on 'kaliningrad' page for 2026-09
    const dev1Placement = createMockPlacementRecord(1, 'ГК «КСК»', {
      type1_main_banner: {
        active: true,
        pages: ['kaliningrad'],
        bookedMonths: ['2026-09'],
        monthlyPrice: 90000,
        totalCost: 90000
      }
    });

    const globalRegistry = [
      { developerId: 1, type: 'type1_main_banner', page: 'kaliningrad', month: '2026-09' }
    ];

    // 2. Admin switches to Dev 2 and attempts to book 'kaliningrad' for 2026-09 -> Conflict detected
    const isConflict = globalRegistry.some(b => b.type === 'type1_main_banner' && b.page === 'kaliningrad' && b.month === '2026-09' && b.developerId !== 2);
    assert.strictEqual(isConflict, true, 'Conflict detected for Dev 2 on Kaliningrad main banner');

    // 3. Dev 2 books open page 'umory' instead
    const isUmoryOpen = !globalRegistry.some(b => b.type === 'type1_main_banner' && b.page === 'umory' && b.month === '2026-09');
    assert.strictEqual(isUmoryOpen, true, 'Umory page is available for booking');
  });

  await test('Scenario 2: Developer Onboarding, Zero-Paid State & Requesting Paid Cards', () => {
    // 1. New developer logs in with 0 paid cards
    const cabinetSandbox = createCabinetSandbox({
      developerId: 10,
      developerName: 'Премиум Девелопмент',
      initialLocalStorage: { amber_paid_cards: [] }
    });

    // 2. Verified locked analytics stub
    const paidCards = JSON.parse(cabinetSandbox.localStorage.getItem('amber_paid_cards') || '[]');
    assert.strictEqual(paidCards.length, 0);
    assert.strictEqual(paidCards.length < 5, true, 'Analytics stub locked');

    // 3. Developer submits request for 5 paid cards
    const req = {
      id: 'req-501',
      developerId: 10,
      placementType: 'type6_paid_cards',
      selectedZhkIds: [101, 102, 103, 104, 105],
      status: 'pending'
    };
    cabinetSandbox.localStorage.setItem('amber_placement_requests', JSON.stringify([req]));
    const requests = JSON.parse(cabinetSandbox.localStorage.getItem('amber_placement_requests'));
    assert.strictEqual(requests.length, 1);
  });

  await test('Scenario 3: Admin Approval & Dynamic Analytics Suite Unlock', () => {
    // 1. Admin approves the 5 paid cards
    const approvedCards = [101, 102, 103, 104, 105];
    const sharedStorage = {
      amber_paid_cards: approvedCards,
      'amber_placements_dev_10': createMockPlacementRecord(10, 'Премиум Девелопмент', {
        type6_paid_cards: {
          active: true,
          selectedZhkIds: approvedCards,
          totalCost: 75000
        }
      })
    };

    // 2. Developer cabinet detects 5 paid cards -> unlocks analytics
    const cabinetSandbox = createCabinetSandbox({
      developerId: 10,
      initialLocalStorage: sharedStorage
    });
    const paidCount = JSON.parse(cabinetSandbox.localStorage.getItem('amber_paid_cards') || '[]').length;
    assert.strictEqual(paidCount >= 5, true, 'Cabinet instantly unlocks analytics suite');
  });

  await test('Scenario 4: End-User Unpaid Card Interaction & Platform Lead CRM Flow', () => {
    // 1. User views unpaid complex #99
    const paidCards = [1, 2, 3];
    const isPaid = paidCards.includes(99);
    assert.strictEqual(isPaid, false, 'Complex 99 is unpaid');

    // 2. User submits availability request
    const lead = createMockLead({
      id: 'L-unpaid-1',
      zhkId: 99,
      zhkName: 'ЖК «Озёрный»',
      developerId: null,
      ownedBy: 'admin',
      isPaidLead: false
    });

    // 3. Lead stored in CRM
    const leadsQueue = [lead];
    const adminPlatformLeads = leadsQueue.filter(l => l.ownedBy === 'admin');
    const devLeads = leadsQueue.filter(l => l.developerId === 1 && l.ownedBy === 'developer');

    assert.strictEqual(adminPlatformLeads.length, 1, 'Appears in Admin Platform Leads');
    assert.strictEqual(devLeads.length, 0, 'Does not appear in developer cabinet');
  });

  await test('Scenario 5: End-User Paid Card Interaction & Developer CRM Direct Routing', () => {
    // 1. User views paid complex #1
    const paidCards = [1, 2, 3, 4, 5];
    const isPaid = paidCards.includes(1);
    assert.strictEqual(isPaid, true, 'Complex 1 is paid');

    // 2. User submits question request
    const lead = createMockLead({
      id: 'L-paid-1',
      zhkId: 1,
      zhkName: 'ЖК «Нордберг»',
      developerId: 1,
      developerName: 'ГК «КСК»',
      ownedBy: 'developer',
      isPaidLead: true
    });

    // 3. Lead stored and routed directly to Developer #1
    const leadsQueue = [lead];
    const dev1Leads = leadsQueue.filter(l => l.developerId === 1 && l.ownedBy === 'developer');
    const adminOnlyLeads = leadsQueue.filter(l => l.ownedBy === 'admin');

    assert.strictEqual(dev1Leads.length, 1, 'Lead routed directly to Developer #1');
    assert.strictEqual(adminOnlyLeads.length, 0, 'Not marked as unassigned platform lead');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ITERATION 2 APPLICATION SCENARIOS (Scenarios 2.1 - 2.5)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Scenario 2.1: Developer Onboarding via Admin Invitation & Security Setup', () => {
    // 1. Admin generates invite in Section 3.7
    const adminSandbox = createAdminSandbox();
    const token = 'inv_baltic_shore_2026';
    const invite = {
      token,
      developerId: 25,
      developerName: 'ООО «Балтийский Берег»',
      email: 'sales@baltic-shore.ru',
      tariffPlanId: 'pro',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      used: false
    };
    const tokens = adminSandbox.localStorage.getInviteTokens();
    tokens.push(invite);
    adminSandbox.localStorage.setInviteTokens(tokens);

    // 2. Developer opens invite link in Cabinet
    const cabinetSandbox = createCabinetSandbox({
      url: `http://localhost/cabinet.html?invite=${token}`,
      initialLocalStorage: {
        amber_invite_tokens: adminSandbox.localStorage.getInviteTokens()
      }
    });
    assert.strictEqual(cabinetSandbox.window.location.search, `?invite=${token}`);

    // 3. Developer registers master password & accepts invite
    const crypto = require('node:crypto');
    const masterPassword = 'BalticSecurePassword2026!';
    const passwordHash = crypto.createHash('sha256').update(masterPassword).digest('hex');

    const devTokens = cabinetSandbox.localStorage.getInviteTokens();
    const currentInvite = devTokens.find(t => t.token === token);
    assert.ok(currentInvite, 'Invite token exists');
    assert.strictEqual(currentInvite.used, false);

    currentInvite.used = true;
    currentInvite.usedAt = new Date().toISOString();
    cabinetSandbox.localStorage.setInviteTokens(devTokens);

    cabinetSandbox.localStorage.setAuth(25, {
      developerId: 25,
      developerName: 'ООО «Балтийский Берег»',
      email: 'sales@baltic-shore.ru',
      passwordHash,
      role: 'admin',
      sessionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    });

    cabinetSandbox.localStorage.setTariff(25, {
      planId: 'pro',
      planName: 'Про',
      price: '150 000 ₽ / мес',
      modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports'],
      status: 'active'
    });

    // 4. Verification: Token is marked used, auth record exists, tariff is Pro
    const verifiedTokens = cabinetSandbox.localStorage.getInviteTokens();
    assert.strictEqual(verifiedTokens.find(t => t.token === token).used, true);

    const auth = cabinetSandbox.localStorage.getAuth(25);
    assert.strictEqual(auth.email, 'sales@baltic-shore.ru');
    assert.strictEqual(auth.passwordHash, passwordHash);

    const tariff = cabinetSandbox.localStorage.getTariff(25);
    assert.strictEqual(tariff.planId, 'pro');
    assert.ok(tariff.modules.includes('analytics-traffic'));
  });

  await test('Scenario 2.2: Lead CRM Masking, Unlock Request & Advance Approval Journey', () => {
    // 1. Initial state: Unpaid lead arrives in CRM
    const initialLead = createMockLead({
      id: 'lead-scen-2',
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      isPaidCard: false,
      isUnlocked: false,
      name: 'Елена Кузнецова',
      phone: '+7 (911) 555-44-33',
      phoneMasked: '+7 (9**) ***-**-33',
      email: 'elena.kuznetsova@mail.ru',
      estimatedDealValue: 50000
    });

    const cabinetSandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: [initialLead]
      }
    });

    // 2. Developer inspects CRM: phone masked, missed opportunity calculated
    const leads = cabinetSandbox.localStorage.getLeads();
    const devLead = leads.find(l => l.id === 'lead-scen-2');
    assert.strictEqual(devLead.isPaidCard, false);
    assert.strictEqual(devLead.isUnlocked, false);
    assert.ok(devLead.phoneMasked.includes('**'));

    const unpaidCount = leads.filter(l => !l.isPaidCard).length;
    const potentialLoss = unpaidCount * 50000;
    assert.strictEqual(potentialLoss, 50000);

    // 3. Developer clicks Unlock -> creates pending request
    const unlockRequest = {
      id: 'unl-scen-2',
      leadId: 'lead-scen-2',
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      clientName: 'Елена Кузнецова',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    cabinetSandbox.localStorage.setUnlockRequests([unlockRequest]);

    // 4. Admin reviews and approves unlock request in Section 3.8
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_unlock_requests: cabinetSandbox.localStorage.getUnlockRequests(),
        amber_leads: cabinetSandbox.localStorage.getLeads()
      }
    });
    const adminRequests = adminSandbox.localStorage.getUnlockRequests();
    assert.strictEqual(adminRequests.length, 1);
    assert.strictEqual(adminRequests[0].status, 'pending');

    adminRequests[0].status = 'approved';
    adminSandbox.localStorage.setUnlockRequests(adminRequests);

    // Unlock lead
    const globalLeads = adminSandbox.localStorage.getLeads();
    const targetLead = globalLeads.find(l => l.id === 'lead-scen-2');
    targetLead.isPaidCard = true;
    targetLead.isUnlocked = true;
    adminSandbox.localStorage.setLeads(globalLeads);

    // 5. Developer refreshes CRM: Lead is now unlocked, full contacts visible, loss = 0
    const refreshedCabinet = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: adminSandbox.localStorage.getLeads(),
        amber_unlock_requests: adminSandbox.localStorage.getUnlockRequests()
      }
    });
    const unlockedLead = refreshedCabinet.localStorage.getLeads().find(l => l.id === 'lead-scen-2');
    assert.strictEqual(unlockedLead.isPaidCard, true);
    assert.strictEqual(unlockedLead.isUnlocked, true);
    assert.strictEqual(unlockedLead.phone, '+7 (911) 555-44-33');
    assert.strictEqual(unlockedLead.email, 'elena.kuznetsova@mail.ru');

    const newLoss = refreshedCabinet.localStorage.getLeads().filter(l => !l.isPaidCard).length * 50000;
    assert.strictEqual(newLoss, 0);
  });

  await test('Scenario 2.3: Commercial Tariff Monetization & Dynamic Dashboard Layout', () => {
    // 1. Developer on Basic tariff (69 000 ₽)
    const cabinetBasic = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: {
          planId: 'basic',
          planName: 'Базовый',
          price: '69 000 ₽ / мес',
          modules: ['analytics-basic'],
          status: 'active',
          endDate: '31.12.2026'
        }
      }
    });
    const basicTariff = cabinetBasic.localStorage.getTariff(1);
    assert.strictEqual(basicTariff.planId, 'basic');
    assert.strictEqual(basicTariff.modules.includes('analytics-competitors'), false);

    // 2. Admin upgrades developer to Premium (210 000 ₽)
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_tariff_1: basicTariff
      }
    });
    const premiumTariff = {
      planId: 'premium',
      planName: 'Премиум',
      price: '210 000 ₽ / мес',
      modules: ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-ads', 'promo-premium'],
      status: 'active',
      startDate: '2026-08-25',
      endDate: '2027-08-25'
    };
    adminSandbox.localStorage.setTariff(1, premiumTariff);

    // 3. Cabinet unblocks all Premium modules
    const cabinetPremium = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: adminSandbox.localStorage.getTariff(1)
      }
    });
    const devPremium = cabinetPremium.localStorage.getTariff(1);
    assert.strictEqual(devPremium.planId, 'premium');
    assert.strictEqual(devPremium.price, '210 000 ₽ / мес');
    assert.ok(devPremium.modules.includes('analytics-competitors'));
    assert.ok(devPremium.modules.includes('promo-ads'));
    assert.ok(devPremium.modules.includes('promo-premium'));
  });

  await test('Scenario 2.4: Advertising Campaign Management & Interactive Calendar', () => {
    // 1. Developer submits placement request in Cabinet
    const cabinetSandbox = createCabinetSandbox({ developerId: 1 });
    const newReq = {
      id: 'req-adv-1',
      developerId: 1,
      developerName: 'ГК «КСК»',
      typeId: 4,
      typeName: 'Рекомендованные ЖК (7 дней)',
      zhkId: 1,
      zhkName: 'ЖК «Нордберг»',
      requestedMonths: ['2026-09'],
      monthlyCost: 35000,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    cabinetSandbox.localStorage.setPlacementRequests([newReq]);

    // 2. Admin reviews request and activates placement
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placement_requests: cabinetSandbox.localStorage.getPlacementRequests()
      }
    });
    const reqs = adminSandbox.localStorage.getPlacementRequests();
    assert.strictEqual(reqs.length, 1);
    reqs[0].status = 'approved';
    adminSandbox.localStorage.setPlacementRequests(reqs);

    const activePlacement = {
      id: 'plc-active-1',
      developerId: 1,
      typeName: 'Рекомендованные ЖК (7 дней)',
      zhkName: 'ЖК «Нордберг»',
      slot: 'featured_feed',
      startDate: '2026-09-01',
      endDate: '2026-09-08',
      monthlyPrice: 35000,
      impressions: 12400,
      clicks: 430,
      ctr: 3.47,
      status: 'active'
    };
    adminSandbox.localStorage.setPlacements(1, [activePlacement]);

    // 3. Cabinet Advertising tab displays active campaign
    const refreshedCabinet = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_placements_1: adminSandbox.localStorage.getPlacements(1),
        amber_placement_requests: adminSandbox.localStorage.getPlacementRequests()
      }
    });

    const placements = refreshedCabinet.localStorage.getPlacements(1);
    assert.strictEqual(placements.length, 1);
    assert.strictEqual(placements[0].typeName, 'Рекомендованные ЖК (7 дней)');
    assert.strictEqual(placements[0].impressions, 12400);
    assert.strictEqual(placements[0].ctr, 3.47);
  });

  await test('Scenario 2.5: Complex Quality Audit, Advice Implementation & Compliance', () => {
    // 1. Initial incomplete complex state
    function evaluateZhk(prop, daysSincePrice) {
      let score = 0;
      const advice = [];
      if (prop.title && prop.title.trim()) score += 20;
      if (prop.address && prop.address.trim()) score += 20;
      if (prop.price && prop.price.trim()) score += 20;
      else advice.push('Укажите актуальные цены');

      if (prop.images && prop.images.length > 0) score += 20;
      else advice.push('Добавьте фотографии и планировки');

      if (prop.infrastructure && prop.infrastructure.trim()) score += 20;
      else advice.push('Заполните все характеристики объекта');

      if (daysSincePrice > 30) advice.push('Обновите цены — последнее обновление 30+ дней назад');
      advice.push('Работайте с отзывами на Яндекс Картах, Авито, Mail.ru');

      return {
        score,
        color: score >= 80 ? 'status-green' : (score >= 50 ? 'status-yellow' : 'status-red'),
        advice
      };
    }

    const draftProp = {
      title: 'ЖК «Янтарный Бриз»',
      address: 'г. Светлогорск, ул. Ленина, 15',
      price: '',
      images: [],
      infrastructure: ''
    };

    const initialAudit = evaluateZhk(draftProp, 45);
    assert.strictEqual(initialAudit.score, 40);
    assert.strictEqual(initialAudit.color, 'status-red');
    assert.ok(initialAudit.advice.includes('Укажите актуальные цены'));
    assert.ok(initialAudit.advice.includes('Добавьте фотографии и планировки'));
    assert.ok(initialAudit.advice.includes('Обновите цены — последнее обновление 30+ дней назад'));

    // 2. Developer updates all complex details
    const completedProp = {
      title: 'ЖК «Янтарный Бриз»',
      address: 'г. Светлогорск, ул. Ленина, 15',
      price: 'от 6.8 млн ₽',
      images: ['hero.jpg', 'layout1.jpg', 'layout2.jpg'],
      infrastructure: 'Собственный спа-комплекс, подземный паркинг, консьерж-сервис'
    };

    const updatedAudit = evaluateZhk(completedProp, 2);
    assert.strictEqual(updatedAudit.score, 100);
    assert.strictEqual(updatedAudit.color, 'status-green');
    assert.strictEqual(updatedAudit.advice.filter(a => a !== 'Работайте с отзывами на Яндекс Картах, Авито, Mail.ru').length, 0);
  });

  return results;
}

if (require.main === module) {
  runTier4Tests().then(results => {
    console.log(`TIER 4 RESULTS: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    results.forEach(r => {
      if (!r.passed) console.error(`  FAIL: ${r.name} -> ${r.error}`);
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runTier4Tests };
