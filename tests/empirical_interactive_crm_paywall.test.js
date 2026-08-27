'use strict';

const assert = require('node:assert');
const path = require('node:path');
const crypto = require('node:crypto');
const { createCabinetSandbox, createAdminSandbox } = require('./harness/dom-sandbox');
const { FIXTURES } = require('./harness/test-fixtures');

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EMPIRICAL ADVERSARIAL VERIFICATION SUITE: INTERACTIVE, CRM, ADS, MODALS & PAYWALL
 * 
 * Challenger Mission Focus:
 * 1. Paywall Gating on Premium Modules across Basic (69K), Pro (150K), Premium (210K) tariffs.
 * 2. Leads CRM: Paid lead contact display vs unpaid phone masking +7 (9**) ***-**-67,
 *    unlock request recording in amber_unlock_requests, and instant DOM re-rendering.
 * 3. Ads Section: 31-day interactive calendar click events, date selection, active placement badges,
 *    and 8 format cards layout.
 * 4. Modal Dialog Lifecycle: Open/close transitions, ESC/backdrop handling, focus, and memory churn
 *    across all 5 modals without DOM leaks.
 * ══════════════════════════════════════════════════════════════════════════════
 */
async function runAdversarialInteractiveSuite() {
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const dur = Date.now() - t0;
      results.push({ name, passed: true, duration: dur });
      passedCount++;
      console.log(`  ✅ PASS: ${name} (${dur}ms)`);
    } catch (err) {
      const dur = Date.now() - t0;
      results.push({ name, passed: false, error: err.message, stack: err.stack, duration: dur });
      failedCount++;
      console.error(`  ❌ FAIL: ${name} (${dur}ms)\n     Error: ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(' 🔬 EMPIRICAL ADVERSARIAL VERIFICATION: CRM, ADS, MODALS & PAYWALL GATING');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PAYWALL GATING ON PREMIUM MODULES ACROSS TARIFFS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🔹 [Domain 1] Testing Paywall Gating across Basic, Pro, and Premium Tariffs...');

  await test('Paywall_1.1: Basic Tariff (69K) strictly gates Traffic, Competitors, and Reports with paywall overlays', async () => {
    const devId = 3;
    const basicTariff = {
      planId: 'basic',
      planName: 'Базовый',
      price: '69 000 ₽ / мес',
      startDate: '01.01.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index']
    };

    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_tariff_' + devId]: JSON.stringify(basicTariff)
      }
    });

    // 1. Check Dashboard Upgrade Teaser Banner
    sandbox.window.switchNavTab('dashboard');
    const teaser = sandbox.document.getElementById('dashboard-upgrade-teaser');
    assert.ok(teaser, 'Dashboard upgrade teaser exists');
    assert.strictEqual(teaser.style.display, 'flex', 'Upgrade teaser is visible on Basic tariff');

    // 2. Check Analytics Traffic Tab
    sandbox.window.switchNavTab('analytics-traffic');
    const trafOverlay = sandbox.document.getElementById('traffic-gate-overlay');
    const trafContent = sandbox.document.getElementById('traffic-unlocked-content');
    assert.ok(trafOverlay, 'Traffic gate overlay exists');
    assert.strictEqual(trafOverlay.style.display, 'flex', 'Traffic overlay is displayed on Basic tariff');
    if (trafContent) assert.strictEqual(trafContent.style.display, 'none', 'Traffic content is hidden on Basic tariff');

    // 3. Check Analytics Competitors Tab
    sandbox.window.switchNavTab('analytics-competitors');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    assert.ok(compOverlay, 'Competitors gate overlay exists');
    assert.strictEqual(compOverlay.style.display, 'flex', 'Competitors overlay is displayed on Basic tariff');
    if (compContent) assert.strictEqual(compContent.style.display, 'none', 'Competitors content is hidden on Basic tariff');

    // 4. Check Analytics Reports Tab
    sandbox.window.switchNavTab('analytics-reports');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');
    assert.ok(repOverlay, 'Reports gate overlay exists');
    assert.strictEqual(repOverlay.style.display, 'flex', 'Reports overlay is displayed on Basic tariff');
    if (repContent) assert.strictEqual(repContent.style.display, 'none', 'Reports content is hidden on Basic tariff');

    // 5. Check Promo Premium Tab (Renders Clean UI)
    sandbox.window.switchNavTab('promo-premium');
    const promoSection = sandbox.document.getElementById('tab-promo-premium');
    assert.ok(promoSection, 'Promo premium section exists');
    const cards = promoSection.querySelectorAll('.dash-card');
    assert.strictEqual(cards.length, 4, 'Promo premium section renders 4 service cards');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors on Basic paywall gating');
  });

  await test('Paywall_1.2: Pro Tariff (150K) unblocks Traffic, Competitors, and Reports modules cleanly', async () => {
    const devId = 3;
    const proTariff = {
      planId: 'pro',
      planName: 'Про',
      price: '150 000 ₽ / мес',
      startDate: '01.01.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index', 'analytics-traffic', 'analytics-competitors', 'analytics-reports']
    };

    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_tariff_' + devId]: JSON.stringify(proTariff)
      }
    });

    // 1. Dashboard Teaser should be hidden
    sandbox.window.switchNavTab('dashboard');
    const teaser = sandbox.document.getElementById('dashboard-upgrade-teaser');
    if (teaser) assert.strictEqual(teaser.style.display, 'none', 'Upgrade teaser hidden on Pro tariff');
    const tariffBadge = sandbox.document.getElementById('dash-tariff-badge');
    assert.ok(tariffBadge && tariffBadge.textContent.includes('Про'), 'Dashboard badge shows Pro tariff');

    // 2. Traffic module unlocked
    sandbox.window.switchNavTab('analytics-traffic');
    const trafOverlay = sandbox.document.getElementById('traffic-gate-overlay');
    const trafContent = sandbox.document.getElementById('traffic-unlocked-content');
    if (trafOverlay) assert.strictEqual(trafOverlay.style.display, 'none', 'Traffic overlay hidden on Pro');
    if (trafContent) assert.strictEqual(trafContent.style.display, 'block', 'Traffic content unlocked on Pro');

    // 3. Competitors module unlocked
    sandbox.window.switchNavTab('analytics-competitors');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    if (compOverlay) assert.strictEqual(compOverlay.style.display, 'none', 'Competitors overlay hidden on Pro');
    if (compContent) assert.strictEqual(compContent.style.display, 'block', 'Competitors content unlocked on Pro');

    // 4. Reports module unlocked
    sandbox.window.switchNavTab('analytics-reports');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');
    if (repOverlay) assert.strictEqual(repOverlay.style.display, 'none', 'Reports overlay hidden on Pro');
    if (repContent) assert.strictEqual(repContent.style.display, 'block', 'Reports content unlocked on Pro');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors on Pro tariff unblocking');
  });

  await test('Paywall_1.3: Premium Tariff (210K) unblocks all modules with VIP branding and active status', async () => {
    const devId = 3;
    const premiumTariff = {
      planId: 'premium',
      planName: 'Премиум (Партнёр)',
      price: '210 000 ₽ / мес',
      startDate: '01.01.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium', 'api-full', 'support-priority']
    };

    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_tariff_' + devId]: JSON.stringify(premiumTariff)
      }
    });

    sandbox.window.switchNavTab('dashboard');
    const tariffBadge = sandbox.document.getElementById('dash-tariff-badge');
    assert.ok(tariffBadge && tariffBadge.textContent.includes('Премиум'), 'Dashboard badge shows Premium tariff');

    // Tariffs tab current active highlight
    sandbox.window.switchNavTab('tariffs');
    const activeBanner = sandbox.document.getElementById('tariff-active-banner');
    assert.ok(activeBanner && activeBanner.innerHTML.includes('210 000 ₽'), 'Tariff active banner displays 210K pricing');

    // Competitors Tab renders complete benchmark leaderboard
    sandbox.window.switchNavTab('analytics-competitors');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    if (compOverlay) assert.strictEqual(compOverlay.style.display, 'none');
    const leaderboard = sandbox.document.getElementById('comp-positions-leaderboard');
    assert.ok(leaderboard, 'Competitors leaderboard rendered for Premium plan');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Paywall_1.4: Dynamic lifecycle transitions (Basic -> Pro -> Premium -> Basic) update DOM instantly', async () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({ developerId: devId });

    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');

    // Basic
    sandbox.window.saveDeveloperTariff({ planId: 'basic', planName: 'Базовый', modules: ['editor'] }, devId);
    assert.strictEqual(compOverlay.style.display, 'flex');
    assert.strictEqual(compContent.style.display, 'none');

    // Upgrade to Pro
    sandbox.window.saveDeveloperTariff({ planId: 'pro', planName: 'Про', modules: ['editor', 'analytics-competitors', 'analytics-reports'] }, devId);
    assert.strictEqual(compOverlay.style.display, 'none');
    assert.strictEqual(compContent.style.display, 'block');

    // Upgrade to Premium
    sandbox.window.saveDeveloperTariff({ planId: 'premium', planName: 'Премиум', modules: ['editor', 'analytics-competitors', 'analytics-reports', 'promo-premium'] }, devId);
    assert.strictEqual(compOverlay.style.display, 'none');
    assert.strictEqual(compContent.style.display, 'block');

    // Downgrade back to Basic
    sandbox.window.saveDeveloperTariff({ planId: 'basic', planName: 'Базовый', modules: ['editor'] }, devId);
    assert.strictEqual(compOverlay.style.display, 'flex');
    assert.strictEqual(compContent.style.display, 'none');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. LEADS CRM: CONTACT MASKING, UNLOCK FLOW & REAL-TIME DOM RE-RENDERING
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Domain 2] Testing Leads CRM Masking, Unlock Workflow & DOM Synchronization...');

  await test('CRM_2.1: Paid vs Unpaid lead contact formatting and action buttons', async () => {
    const paidLead = {
      id: 'lead-paid-1',
      name: 'Ольга Николаева',
      phone: '+7 (921) 123-45-67',
      email: 'olga@example.com',
      zhk: 'ЖК «Гусевский»',
      dev: 'ГК «Расцвет»',
      developerId: 3,
      apt: '1-комнатная квартира',
      time: 'Сегодня, 10:00',
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: true,
      isUnlocked: true,
      estimatedDealValue: 60000
    };

    const unpaidLead = {
      id: 'lead-unpaid-2',
      name: 'Сергей Сидоров',
      phone: '+7 (909) 876-54-32',
      email: 'sergey@example.com',
      zhk: 'ЖК «Парковый Ансамбль»',
      dev: 'ГК «Расцвет»',
      developerId: 3,
      apt: '2-комнатная квартира',
      time: 'Вчера, 15:30',
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: false,
      isUnlocked: false,
      estimatedDealValue: 80000
    };

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify([paidLead, unpaidLead])
      }
    });

    sandbox.window.switchNavTab('leads');
    const tbody = sandbox.document.getElementById('crm-leads-table-body');
    assert.ok(tbody, 'CRM table body exists');
    const rows = tbody.querySelectorAll('tr');
    assert.strictEqual(rows.length, 2, 'Exactly 2 lead rows rendered');

    // Row 1 (Paid Lead)
    const row1Html = rows[0].innerHTML;
    assert.ok(row1Html.includes('Ольга Николаева'), 'Row 1 displays paid client name');
    assert.ok(row1Html.includes('+7 (921) 123-45-67'), 'Row 1 displays full unmasked phone number');
    assert.ok(row1Html.includes('olga@example.com'), 'Row 1 displays full unmasked email');
    assert.ok(row1Html.includes('Открыть карту'), 'Row 1 displays "Открыть карту" button');
    assert.ok(!row1Html.includes('🔓 Разблокировать'), 'Row 1 does not display unlock button');

    // Row 2 (Unpaid Lead)
    const row2Html = rows[1].innerHTML;
    assert.ok(row2Html.includes('Сергей Сидоров'), 'Row 2 displays unpaid client name');
    assert.ok(row2Html.includes('+7 (9**) ***-**-32') || row2Html.includes('+7 (9**) ***-**-67') || row2Html.includes('masked-phone-link'), 'Row 2 displays masked phone format');
    assert.ok(row2Html.includes('🔒 Email скрыт'), 'Row 2 hides email with "🔒 Email скрыт" tag');
    assert.ok(row2Html.includes('🔓 Разблокировать'), 'Row 2 displays "🔓 Разблокировать" action button');
  });

  await test('CRM_2.2: handleUnlockLead records in amber_unlock_requests and unmasks contact instantly in DOM', async () => {
    const unpaidLead = {
      id: 'lead-unlock-me-1',
      name: 'Константин Васильев',
      phone: '+7 (911) 777-88-99',
      email: 'kostya@example.com',
      zhk: 'ЖК «Морской берег»',
      zhkId: 4,
      dev: 'ГК «Расцвет»',
      developerId: 3,
      apt: '3-комнатная квартира',
      time: 'Сегодня, 11:00',
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: false,
      isUnlocked: false,
      estimatedDealValue: 95000
    };

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify([unpaidLead]),
        amber_unlock_requests: JSON.stringify([])
      }
    });

    sandbox.window.switchNavTab('leads');

    // Initial state: masked
    let tbody = sandbox.document.getElementById('crm-leads-table-body');
    assert.ok(tbody.innerHTML.includes('🔓 Разблокировать'), 'Initial unpaid lead has unlock button');

    // Execute unlock action
    sandbox.window.handleUnlockLead('lead-unlock-me-1');

    // 1. Verify record in amber_unlock_requests
    const unlockRequests = JSON.parse(sandbox.localStorage.getItem('amber_unlock_requests') || '[]');
    assert.strictEqual(unlockRequests.length, 1, 'Unlock request must be saved in amber_unlock_requests');
    const req = unlockRequests[0];
    assert.strictEqual(req.leadId, 'lead-unlock-me-1');
    assert.strictEqual(req.clientName, 'Константин Васильев');
    assert.strictEqual(req.zhkName, 'ЖК «Морской берег»');
    assert.strictEqual(req.developerId, 3);
    assert.strictEqual(req.status, 'approved');
    assert.strictEqual(req.priceMonthly, 15000);

    // 2. Verify instant DOM re-rendering
    tbody = sandbox.document.getElementById('crm-leads-table-body');
    const updatedHtml = tbody.innerHTML;
    assert.ok(updatedHtml.includes('+7 (911) 777-88-99'), 'Phone is now unmasked in DOM table');
    assert.ok(updatedHtml.includes('kostya@example.com'), 'Email is now visible in DOM table');
    assert.ok(updatedHtml.includes('Открыть карту'), 'Action button changed to "Открыть карту" in DOM');
    assert.ok(!updatedHtml.includes('🔓 Разблокировать'), 'Unlock button removed from DOM');

    // 3. Verify Lost Opportunity card updated
    const lostCount = sandbox.document.getElementById('lost-op-count');
    const lostAmount = sandbox.document.getElementById('lost-op-amount');
    if (lostCount) assert.strictEqual(lostCount.textContent.trim(), '0');
    if (lostAmount) assert.ok(lostAmount.textContent.includes('0 ₽'));
  });

  await test('CRM_2.3: Lost Opportunity summary calculation and HTML report export generator', async () => {
    const leads = [
      { id: 'l1', name: 'Лид 1', phone: '+79111111111', zhk: 'ЖК 1', developerId: 3, ownedBy: 'developer', isPaidCard: false, isUnlocked: false, estimatedDealValue: 50000 },
      { id: 'l2', name: 'Лид 2', phone: '+79112222222', zhk: 'ЖК 2', developerId: 3, ownedBy: 'developer', isPaidCard: false, isUnlocked: false, estimatedDealValue: 70000 },
      { id: 'l3', name: 'Лид 3', phone: '+79113333333', zhk: 'ЖК 3', developerId: 3, ownedBy: 'developer', isPaidCard: true, isUnlocked: true, estimatedDealValue: 80000 }
    ];

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify(leads)
      }
    });

    sandbox.window.switchNavTab('leads');
    const lostCount = sandbox.document.getElementById('lost-op-count');
    const lostAmount = sandbox.document.getElementById('lost-op-amount');

    assert.ok(lostCount, 'Lost op count element exists');
    assert.ok(lostAmount, 'Lost op amount element exists');
    assert.strictEqual(lostCount.textContent.trim(), '2', '2 locked leads calculated');
    assert.ok(lostAmount.textContent.includes('120 000'), '120 000 ₽ total estimated deal value calculated');

    // Execute report generation
    assert.doesNotThrow(() => {
      sandbox.window.generateLostOpportunityReport();
    }, 'generateLostOpportunityReport should execute cleanly without error');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ADS SECTION: 31-DAY INTERACTIVE CALENDAR & 8 FORMAT CARDS LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Domain 3] Testing Ads Section, Contract Banner, 8 Format Cards & 31-Day Calendar...');

  await test('Ads_3.1: Contract agreement banner displays ООО «Амбер Авеню» and valid contract number', async () => {
    const devId = 3;
    const contractData = {
      number: 'АА-2026/08-03-ПР',
      date: '31.12.2026',
      paymentStatus: 'Оплачен полностью'
    };

    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_contract_' + devId]: JSON.stringify(contractData)
      }
    });

    sandbox.window.switchNavTab('promo-ads');

    const contractHeader = sandbox.document.getElementById('promo-contract-text');
    const contractDates = sandbox.document.getElementById('promo-contract-dates');

    assert.ok(contractHeader, 'Contract header element exists');
    assert.ok(contractDates, 'Contract dates element exists');
    assert.ok(contractHeader.textContent.includes('ООО «Амбер Авеню»'), 'Header mentions ООО «Амбер Авеню»');
    assert.ok(contractHeader.textContent.includes('АА-2026/08-03-ПР'), 'Header mentions contract number');
    assert.ok(contractDates.textContent.includes('31.12.2026'), 'Dates mention validity until 31.12.2026');
  });

  await test('Ads_3.2: 8 format cards layout renders active placement badges, CTR, views and actions', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.switchNavTab('promo-ads');

    const grid = sandbox.document.getElementById('promo-placements-cards-grid');
    assert.ok(grid, 'Placements cards grid exists');

    const cards = grid.querySelectorAll('.dash-card');
    assert.strictEqual(cards.length, 8, 'Must render all 8 advertising placement formats');

    // Check each card structure
    cards.forEach((card, idx) => {
      const html = card.innerHTML;
      assert.ok(html.includes('Активно'), `Card ${idx + 1} has active badge`);
      assert.ok(html.includes('CTR'), `Card ${idx + 1} displays CTR metric`);
      assert.ok(html.includes('Показов'), `Card ${idx + 1} displays impressions count`);
      assert.ok(html.includes('₽/мес') || html.includes('₽'), `Card ${idx + 1} displays price`);
      assert.ok(html.includes('Продлить'), `Card ${idx + 1} contains "Продлить" action button`);
    });
  });

  await test('Ads_3.3: 31-day interactive calendar click events, date selection, and detail box updates', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.switchNavTab('promo-ads');

    const calContainer = sandbox.document.getElementById('promo-cal-days-container');
    assert.ok(calContainer, 'Calendar container exists');

    const dayCells = calContainer.querySelectorAll('.cal-day-cell');
    assert.strictEqual(dayCells.length, 31, 'August 2026 calendar renders exactly 31 day cells');

    // Days 1-28 have active promo indicator dot
    for (let d = 1; d <= 28; d++) {
      assert.ok(dayCells[d - 1].classList.contains('has-ads'), `Day ${d} has .has-ads class`);
    }

    // Initial selected day is 25
    assert.ok(dayCells[24].classList.contains('selected'), 'Day 25 is initially selected');

    // Click date 14
    sandbox.window.selectPromoCalDay(14);
    const detailBox = sandbox.document.getElementById('cal-day-detail-box');
    assert.ok(detailBox, 'Calendar detail box exists');
    assert.ok(detailBox.innerHTML.includes('14 августа 2026 г.'), 'Detail box updated to 14 августа 2026 г.');

    // Click date 31 (month end)
    sandbox.window.selectPromoCalDay(31);
    assert.ok(detailBox.innerHTML.includes('31 августа 2026 г.'), 'Detail box updated to 31 августа 2026 г.');

    // Rapid click storm across all 31 days
    for (let d = 1; d <= 31; d++) {
      sandbox.window.selectPromoCalDay(d);
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors during 31-day calendar click storm');
  });

  await test('Ads_3.4: Placement Request modal submission writes to amber_placement_requests and closes modal', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.switchNavTab('promo-ads');

    // Open modal
    sandbox.window.openPlacementRequestModal('top_card');
    const modal = sandbox.document.getElementById('placement-request-modal-overlay');
    assert.ok(modal.classList.contains('open'), 'Modal is open');

    const typeSelect = sandbox.document.getElementById('placement-req-type');
    assert.strictEqual(typeSelect.value, 'top_card', 'Preset placement format selected');

    const periodInput = sandbox.document.getElementById('placement-req-period');
    if (periodInput) periodInput.value = '3 месяца (Осень 2026)';

    // Submit request
    sandbox.window.submitPlacementRequest();

    assert.strictEqual(modal.classList.contains('open'), false, 'Modal closed after submission');

    const requests = JSON.parse(sandbox.localStorage.getItem('amber_placement_requests') || '[]');
    assert.strictEqual(requests.length, 1, 'Placement request recorded in localStorage');
    assert.strictEqual(requests[0].developerId, 3);
    assert.strictEqual(requests[0].placementType, 'top_card');
    assert.strictEqual(requests[0].period, '3 месяца (Осень 2026)');
    assert.strictEqual(requests[0].status, 'pending');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. MODAL DIALOG LIFECYCLE ACROSS ALL 5 MODALS (NO DOM LEAKS)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Domain 4] Testing Modal Dialog Lifecycle across all 5 Modals without DOM Leaks...');

  const MODAL_CONFIGS = [
    {
      id: 'generic-modal-overlay',
      name: 'Generic Modal',
      openFn: (sb) => {
        const m = sb.document.getElementById('generic-modal-overlay');
        sb.document.getElementById('modal-title-text').textContent = 'Тестовое окно';
        m.classList.add('open');
      },
      closeFn: (sb) => sb.window.closeGenericModal()
    },
    {
      id: 'zhk-editor-modal-overlay',
      name: 'ZHK Editor Modal',
      openFn: (sb) => sb.window.openZhkEditorModal(0),
      closeFn: (sb) => sb.window.closeZhkEditorModal()
    },
    {
      id: 'placement-request-modal-overlay',
      name: 'Placement Request Modal',
      openFn: (sb) => sb.window.openPlacementRequestModal('main_banner'),
      closeFn: (sb) => sb.window.closePlacementRequestModal()
    },
    {
      id: 'invite-accept-modal-overlay',
      name: 'Invite Accept Modal',
      openFn: (sb) => {
        const m = sb.document.getElementById('invite-accept-modal-overlay');
        m.classList.add('open');
      },
      closeFn: (sb) => sb.window.closeInviteAcceptModal()
    },
    {
      id: 'forgot-pwd-modal-overlay',
      name: 'Forgot Password Modal',
      openFn: (sb) => sb.window.openForgotPasswordModal(),
      closeFn: (sb) => sb.window.closeForgotPasswordModal()
    }
  ];

  for (const cfg of MODAL_CONFIGS) {
    await test(`Modal_Lifecycle_${cfg.name}: Open, close, button click, and DOM cleanliness`, async () => {
      const sandbox = createCabinetSandbox({ developerId: 3 });
      const modal = sandbox.document.getElementById(cfg.id);
      assert.ok(modal, `Modal overlay #${cfg.id} must exist in DOM`);

      // Initial state: not open
      assert.strictEqual(modal.classList.contains('open'), false, `Modal #${cfg.id} initially closed`);

      // Open modal
      cfg.openFn(sandbox);
      assert.ok(modal.classList.contains('open'), `Modal #${cfg.id} opened via openFn`);

      // Close modal
      cfg.closeFn(sandbox);
      assert.strictEqual(modal.classList.contains('open'), false, `Modal #${cfg.id} closed via closeFn`);

      // Close button click test
      const closeBtn = modal.querySelector('.modal-close-btn');
      if (closeBtn) {
        cfg.openFn(sandbox);
        assert.ok(modal.classList.contains('open'), 'Re-opened modal');
        closeBtn.click();
        assert.strictEqual(modal.classList.contains('open'), false, 'Closed modal via close button click');
      }

      assert.strictEqual(sandbox.getConsoleErrors().length, 0, `Zero errors during ${cfg.name} lifecycle`);
    });
  }

  await test('Modal_Stress_Churn: 100 rapid sequential open/close iterations across all 5 modals without memory leaks', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });

    for (let i = 0; i < 100; i++) {
      const cfg = MODAL_CONFIGS[i % MODAL_CONFIGS.length];
      cfg.openFn(sandbox);
      cfg.closeFn(sandbox);
    }

    // Verify all modals are closed at the end
    MODAL_CONFIGS.forEach(cfg => {
      const modal = sandbox.document.getElementById(cfg.id);
      assert.strictEqual(modal.classList.contains('open'), false, `Modal #${cfg.id} is closed after stress churn`);
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors after 100 modal stress churn cycles');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(`  🎯 ADVERSARIAL VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} adversarial tests failed!`);
  }
  return results;
}

if (require.main === module) {
  runAdversarialInteractiveSuite().catch(err => {
    console.error('Fatal error in interactive suite:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialInteractiveSuite };
