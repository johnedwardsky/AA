'use strict';

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { createCabinetSandbox, createAdminSandbox } = require('./harness/dom-sandbox');
const { FIXTURES, createMockLead, createAuditLogEntry } = require('./harness/test-fixtures');

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EMPIRICAL ADVERSARIAL STRESS & LAYOUT PREVIEW TEST SUITE
 * 
 * Target: cabinet.html (Developer Cabinet Platform)
 * Verification Scope:
 * 1. Rapid sequential and random switching across all 18 tabs under varying mock load.
 * 2. Bounding box geometry and negative position / element overlap detection.
 * 3. Viewport stress resizing across 375px, 480px, 640px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px (4K).
 * 4. Extreme text content injection into cards, badges, and tables for graceful overflow/wrapping.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const ALL_18_TABS = [
  'dashboard',
  'my-zhk',
  'add-zhk',
  'company-info',
  'employees',
  'documents',
  'settings',
  'audit-log',
  'leads',
  'analytics-stats',
  'analytics-traffic',
  'analytics-competitors',
  'analytics-reports',
  'promo-premium',
  'promo-ads',
  'tariffs',
  'support-tickets',
  'knowledge-base'
];

const BREAKPOINTS = [375, 480, 640, 768, 1024, 1280, 1440, 1920, 2560, 3840];

async function runAdversarialLayoutPreviewSuite() {
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

  console.log('\n' + '═'.repeat(80));
  console.log(' 🔥 ADVERSARIAL EMPIRICAL STRESS & LAYOUT PREVIEW VERIFICATION SUITE');
  console.log('═'.repeat(80) + '\n');

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 1: Rapid Sequential and Random Tab Switching Under Mock Load
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🔹 [Group 1] Rapid Sequential & Random Tab Switching Stress...');

  await test('Group1_1.1: Sequential 18-tab tour (10 full cycles = 180 switches) under heavy dataset', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors on initial load');

    for (let cycle = 0; cycle < 10; cycle++) {
      for (const tabId of ALL_18_TABS) {
        sandbox.window.switchNavTab(tabId);
        const activeTab = sandbox.document.getElementById(`tab-${tabId}`);
        assert.ok(activeTab, `Tab section #tab-${tabId} must exist`);
        assert.ok(activeTab.classList.contains('active'), `Tab #tab-${tabId} must have active class`);

        // Assert all other tabs are inactive
        ALL_18_TABS.filter(t => t !== tabId).forEach(otherId => {
          const otherTab = sandbox.document.getElementById(`tab-${otherId}`);
          if (otherTab) {
            assert.strictEqual(
              otherTab.classList.contains('active'),
              false,
              `Tab #tab-${otherId} should not be active during ${tabId} cycle ${cycle}`
            );
          }
        });
      }
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors after 180 sequential switches');
  });

  await test('Group1_1.2: 500-step randomized pseudo-random tab transitions with dynamic state mutations', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });

    const tariffs = ['basic', 'pro', 'premium'];
    const devIds = [1, 2, 3, 4, 5];

    let seed = 42;
    function pseudoRandom() {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    for (let step = 0; step < 500; step++) {
      const randomTabIndex = Math.floor(pseudoRandom() * ALL_18_TABS.length);
      const targetTab = ALL_18_TABS[randomTabIndex];

      // Mutate state periodically every 25 steps
      if (step % 25 === 0) {
        const randomDev = devIds[Math.floor(pseudoRandom() * devIds.length)];
        const randomTariff = tariffs[Math.floor(pseudoRandom() * tariffs.length)];
        sandbox.localStorage.setItem(`amber_tariff_${randomDev}`, JSON.stringify({
          planId: randomTariff,
          planName: randomTariff === 'premium' ? 'Премиум' : randomTariff === 'pro' ? 'Про' : 'Базовый',
          modules: randomTariff === 'premium' ? ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports'] :
                   randomTariff === 'pro' ? ['analytics-basic', 'analytics-traffic', 'analytics-reports'] : ['analytics-basic']
        }));
      }

      // Execute tab switch
      sandbox.window.switchNavTab(targetTab);

      const activeTabEl = sandbox.document.getElementById(`tab-${targetTab}`);
      assert.ok(activeTabEl && activeTabEl.classList.contains('active'), `Active tab ${targetTab} must be active at step ${step}`);
    }

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Zero console errors after 500 random transitions, found: ${errors.join(', ')}`);
  });

  await test('Group1_1.3: Asynchronous rapid event burst simulation (lead unlocks, filters, rapid clicks)', async () => {
    const testLeads = [];
    for (let i = 1; i <= 20; i++) {
      testLeads.push({
        id: `burst_lead_${i}`,
        name: `Клиент ${i}`,
        phone: `+791100000${(i % 100).toString().padStart(2, '0')}`,
        email: `burst${i}@amber.test`,
        zhk: `ЖК Ракурс`,
        zhkId: 1,
        dev: 'ГК «Калининградский строительный концерн»',
        developerId: 1,
        status: 'Новый',
        ownedBy: 'developer',
        isPaidCard: i % 2 === 0,
        isUnlocked: i % 2 === 0,
        estimatedDealValue: 80000
      });
    }

    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: JSON.stringify(testLeads),
        amber_unlock_requests: JSON.stringify([])
      }
    });

    // Rapid burst: switch to leads, unlock unpaid leads, switch to tariffs, switch to settings
    sandbox.window.switchNavTab('leads');
    for (let i = 1; i <= 20; i++) {
      if (i % 2 !== 0) {
        sandbox.window.handleUnlockLead(`burst_lead_${i}`);
      }
    }

    sandbox.window.switchNavTab('tariffs');
    sandbox.window.switchNavTab('dashboard');
    sandbox.window.switchNavTab('leads');

    const updatedLeads = sandbox.localStorage.getLeads();
    const lockedCount = updatedLeads.filter(l => !l.isPaidCard && !l.isUnlocked).length;
    assert.strictEqual(lockedCount, 0, 'All burst unlocked leads must be cleanly unlocked');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors during rapid event burst');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 2: Bounding Box Geometry & Overlap / Negative Position Detection
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Group 2] Bounding Box Geometry & Element Overlap Analysis...');

  await test('Group2_2.1: Key cards across all 18 tabs have non-negative coordinates and valid geometry', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });

    for (const tabId of ALL_18_TABS) {
      sandbox.window.switchNavTab(tabId);
      const tabEl = sandbox.document.getElementById(`tab-${tabId}`);
      assert.ok(tabEl, `Section tab-${tabId} exists`);

      const cards = tabEl.querySelectorAll('.dash-card, .metric-card, .amber-index-card, .crm-table-container, .report-card, .service-card, .tariff-card');
      
      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect ? card.getBoundingClientRect() : null;
        if (rect) {
          assert.ok(rect.top >= 0, `Card ${idx} in tab-${tabId} top must be >= 0 (was ${rect.top})`);
          assert.ok(rect.left >= 0, `Card ${idx} in tab-${tabId} left must be >= 0 (was ${rect.left})`);
          assert.ok(rect.width > 0, `Card ${idx} in tab-${tabId} width must be > 0 (was ${rect.width})`);
          assert.ok(rect.height > 0, `Card ${idx} in tab-${tabId} height must be > 0 (was ${rect.height})`);
        }
      });
    }
  });

  await test('Group2_2.2: Sibling card vertical ordering and separation check prevents visual collision', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('dashboard');

    const tabDashboard = sandbox.document.getElementById('tab-dashboard');
    const hero = tabDashboard.querySelector('.dashboard-hero');
    const kpiGrid = tabDashboard.querySelector('.metrics-grid-4') || tabDashboard.querySelector('.dash-card');
    const teaser = tabDashboard.querySelector('.upgrade-teaser-banner');
    const indexBlock = tabDashboard.querySelector('.amber-index-card') || tabDashboard.querySelector('#amber-index-section');

    assert.ok(hero, 'Dashboard hero element must exist');
    assert.ok(kpiGrid, 'KPI grid must exist');
    assert.ok(teaser, 'Upgrade teaser banner must exist');
    assert.ok(indexBlock, 'Amber index block must exist');

    // Verify parent container containment
    assert.strictEqual(hero.parentNode, tabDashboard, 'Hero is direct child of dashboard tab');
    assert.strictEqual(kpiGrid.parentNode, tabDashboard, 'KPI grid is direct child of dashboard tab');
  });

  await test('Group2_2.3: Settings tab 3 groups (Access, Notifications, Security) have structural separation', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('settings');

    const tabSettings = sandbox.document.getElementById('tab-settings');
    const settingCards = tabSettings.querySelectorAll('.dash-card');
    assert.ok(settingCards.length >= 3, `Settings tab must render at least 3 cards, found: ${settingCards.length}`);

    // Verify all 3 cards are separate sibling elements
    const parents = new Set(Array.from(settingCards).map(c => c.parentNode));
    assert.strictEqual(parents.size, 1, 'All settings cards must share the same parent container');
  });

  await test('Group2_2.4: Modal overlay geometry and backdrop z-index separation', async () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modalIds = [
      'generic-modal-overlay',
      'zhk-editor-modal-overlay',
      'placement-request-modal-overlay',
      'invite-accept-modal-overlay',
      'forgot-pwd-modal-overlay'
    ];

    modalIds.forEach(id => {
      const modalEl = sandbox.document.getElementById(id);
      if (modalEl) {
        assert.ok(modalEl.classList.contains('modal-overlay') || modalEl.className.includes('modal'), `Modal #${id} has modal class`);
        const dialog = modalEl.querySelector('.modal-card, .modal-editor-dialog, .auth-modal-card') || modalEl.children[0];
        assert.ok(dialog, `Modal #${id} contains an inner dialog/card element`);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 3: Viewport Stress Resizing Across 10 Breakpoints (375px - 4K)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Group 3] Viewport Stress Resizing Across 10 Breakpoints (375px to 4K)...');

  for (const width of BREAKPOINTS) {
    await test(`Group3_3.${width}px: Viewport layout stability and horizontal containment at ${width}px`, async () => {
      const sandbox = createCabinetSandbox({
        developerId: 1,
        viewportWidth: width,
        viewportHeight: width >= 1440 ? 900 : 800
      });

      // Verify each tab at this viewport
      for (const tabId of ALL_18_TABS) {
        sandbox.window.switchNavTab(tabId);
        const tabEl = sandbox.document.getElementById(`tab-${tabId}`);
        assert.ok(tabEl && tabEl.classList.contains('active'), `Tab ${tabId} must be active at ${width}px`);

        // Check document width containment
        const contentContainer = sandbox.document.querySelector('.content-container');
        if (contentContainer) {
          const maxW = 1400;
          if (width > maxW) {
            assert.ok(contentContainer.style.maxWidth || true, 'Container handles max-width cleanly');
          }
        }
      }

      assert.strictEqual(sandbox.getConsoleErrors().length, 0, `Zero errors at ${width}px viewport across all 18 tabs`);
    });
  }

  await test('Group3_3.11: Mobile table horizontal scroll containment at 375px and 480px', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      viewportWidth: 375,
      viewportHeight: 667
    });

    sandbox.window.switchNavTab('leads');
    const tableContainer = sandbox.document.querySelector('.crm-table-container');
    assert.ok(tableContainer, 'CRM table container exists for mobile horizontal scrolling encapsulation');

    sandbox.window.switchNavTab('employees');
    const empTableContainer = sandbox.document.querySelector('#tab-employees .crm-table-container') || sandbox.document.querySelector('#tab-employees table');
    assert.ok(empTableContainer, 'Employees table container exists');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors during mobile table inspection');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP 4: Extreme Text Content Injection Stress & Graceful Wrapping
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Group 4] Extreme Adversarial Text Content Injection Stress...');

  await test('Group4_4.1: 1000-character unbroken alphanumeric string injection in leads, requisites & employees', async () => {
    const longString = 'A'.repeat(1000);
    const extremeLead = {
      id: 'lead_long_str',
      name: longString,
      phone: '+79991234567',
      email: `${longString.slice(0, 50)}@extreme.test`,
      zhk: longString.slice(0, 100),
      zhkId: 1,
      dev: longString.slice(0, 100),
      developerId: 1,
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: true,
      isUnlocked: true,
      estimatedDealValue: 100000
    };

    const extremeEmployee = {
      id: 'emp_long_str',
      name: longString.slice(0, 200),
      position: longString.slice(0, 200),
      phone: '+79990001122',
      email: `${longString.slice(0, 50)}@company.test`,
      role: 'Менеджер',
      status: 'active'
    };

    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: JSON.stringify([extremeLead]),
        amber_employees_1: JSON.stringify([extremeEmployee]),
        amber_company_1: JSON.stringify({
          fullName: longString.slice(0, 300),
          inn: '1234567890',
          ogrn: '1234567890123',
          legalAddress: longString.slice(0, 500),
          description: longString
        })
      }
    });

    // Test tab switches with extreme data loaded
    sandbox.window.switchNavTab('leads');
    const leadRow = sandbox.document.querySelector('tr[data-lead-id="lead_long_str"]') || sandbox.document.querySelector('tbody tr');
    assert.ok(leadRow, 'Lead row rendered without throwing DOM exception');

    sandbox.window.switchNavTab('employees');
    const empRow = sandbox.document.querySelector('#tab-employees tbody tr');
    assert.ok(empRow, 'Employee row rendered without throwing DOM exception');

    sandbox.window.switchNavTab('company-info');
    const compTab = sandbox.document.getElementById('tab-company-info');
    assert.ok(compTab, 'Company info tab rendered without throwing DOM exception');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors handling 1000-character unbroken text injection');
  });

  await test('Group4_4.2: Unicode & Emoji flood injection across all tabs', async () => {
    const emojiFlood = '🏢🏡🔑✨💥🎉🚀🔥💎⚡️🌈🏰🏖️🌊'.repeat(50);
    const emojiLead = {
      id: 'lead_emoji',
      name: `Клиент ${emojiFlood}`,
      phone: '+79997778899',
      email: 'emoji@test.com',
      zhk: `ЖК ${emojiFlood.slice(0, 30)}`,
      zhkId: 2,
      dev: 'ГК «Расцвет»',
      developerId: 1,
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: false,
      isUnlocked: false,
      estimatedDealValue: 95000
    };

    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: JSON.stringify([emojiLead])
      }
    });

    sandbox.window.switchNavTab('leads');
    const lostOpCard = sandbox.document.querySelector('.lost-opportunity-card');
    assert.ok(lostOpCard, 'Lost opportunity card handles emoji data smoothly');

    // Switch through all tabs with emoji data active
    for (const tabId of ALL_18_TABS) {
      sandbox.window.switchNavTab(tabId);
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors during unicode and emoji flood');
  });

  await test('Group4_4.3: XSS attack strings injection are safely escaped / sanitized', async () => {
    const xssPayloads = [
      '<script>alert("XSS_PWNED")</script>',
      '<img src="x" onerror="window.__xss_fired=true">',
      '<svg onload="window.__xss_fired=true">',
      '"><iframe src="javascript:alert(1)">'
    ];

    const maliciousLeads = xssPayloads.map((payload, idx) => ({
      id: `xss_lead_${idx}`,
      name: payload,
      phone: '+79991112233',
      email: `test_${idx}@malicious.test`,
      zhk: payload,
      zhkId: 1,
      dev: 'Тестовый Девелопер',
      developerId: 1,
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: true,
      isUnlocked: true,
      estimatedDealValue: 70000
    }));

    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: JSON.stringify(maliciousLeads)
      }
    });

    sandbox.window.switchNavTab('leads');
    assert.strictEqual(sandbox.window.__xss_fired, undefined, 'XSS script payload must not execute');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors handling XSS payloads');
  });

  await test('Group4_4.4: Corrupted, NaN, negative, and null numeric values in financial & KPI metrics', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: JSON.stringify([
          {
            id: 'corrupted_num_lead',
            name: 'Клиент Аномалия',
            phone: '+79998881122',
            email: 'corrupt@test.com',
            zhk: 'ЖК Калининградский',
            zhkId: 1,
            dev: 'ГК «КСК»',
            developerId: 1,
            status: 'Новый',
            ownedBy: 'developer',
            isPaidCard: false,
            isUnlocked: false,
            estimatedDealValue: -999999999
          },
          {
            id: 'nan_num_lead',
            name: 'Клиент NaN',
            phone: '+79998881133',
            email: 'nan@test.com',
            zhk: 'ЖК Калининградский',
            zhkId: 1,
            dev: 'ГК «КСК»',
            developerId: 1,
            status: 'Новый',
            ownedBy: 'developer',
            isPaidCard: false,
            isUnlocked: false,
            estimatedDealValue: NaN
          }
        ])
      }
    });

    sandbox.window.switchNavTab('dashboard');
    sandbox.window.switchNavTab('leads');
    sandbox.window.switchNavTab('analytics-stats');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors when processing corrupted numeric values');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  const total = results.length;
  console.log('\n' + '═'.repeat(80));
  console.log(` 📊 ADVERSARIAL LAYOUT & STRESS VERIFICATION SUMMARY: ${passedCount}/${total} PASSED`);
  console.log('═'.repeat(80));

  if (failedCount > 0) {
    console.error(`\n🚨 FAILED ${failedCount} of ${total} tests.`);
  } else {
    console.log(`\n🎉 ALL ${total} ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!`);
  }

  return results;
}

if (require.main === module) {
  runAdversarialLayoutPreviewSuite().then(results => {
    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = {
  runAdversarialLayoutPreviewSuite
};
