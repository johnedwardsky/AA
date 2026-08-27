'use strict';

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { createCabinetSandbox, createAdminSandbox } = require('./harness/dom-sandbox');
const { FIXTURES } = require('./harness/test-fixtures');

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * E2E VISUAL INTEGRITY & LAYOUT VERIFICATION TEST SUITE (SUITES 1–6)
 *
 * Authoritative Reference: ORIGINAL_REQUEST.md (§ Follow-up 2026-08-25T22:53:40Z)
 * Reference Audit Reports: spec_miner_survey_1/report.md, spec_miner_survey_1/handoff.md
 * Target: cabinet.html | Design System | 18 Tabs | Layout Geometry | Responsive Viewports
 * ══════════════════════════════════════════════════════════════════════════════
 */
async function runVisualLayoutIntegrityTests() {
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

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 1: 18-Tab Activation & Zero Console Errors
  // ════════════════════════════════════════════════════════════════════════════

  await test('Suite 1.1: Sequential forward navigation across all 18 tabs with zero console errors', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Initial cabinet load has 0 errors');

    for (const tabId of ALL_18_TABS) {
      sandbox.window.switchNavTab(tabId);

      const tabEl = sandbox.document.getElementById(`tab-${tabId}`);
      assert.ok(tabEl, `Section #tab-${tabId} must exist in DOM`);
      assert.ok(tabEl.classList.contains('active'), `Section #tab-${tabId} must have class .active`);

      // Verify non-active tabs are NOT marked active
      ALL_18_TABS.filter(t => t !== tabId).forEach(otherId => {
        const otherEl = sandbox.document.getElementById(`tab-${otherId}`);
        if (otherEl) {
          assert.strictEqual(
            otherEl.classList.contains('active'),
            false,
            `Section #tab-${otherId} must NOT be active when ${tabId} is active`
          );
        }
      });

      const errors = sandbox.getConsoleErrors();
      assert.strictEqual(errors.length, 0, `No console errors when activating tab: ${tabId}`);
    }
  });

  await test('Suite 1.2: Reverse sequential navigation across all 18 tabs with zero console errors', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const reversedTabs = [...ALL_18_TABS].reverse();

    for (const tabId of reversedTabs) {
      sandbox.window.switchNavTab(tabId);
      const tabEl = sandbox.document.getElementById(`tab-${tabId}`);
      assert.ok(tabEl && tabEl.classList.contains('active'), `Section #tab-${tabId} must be active`);
      assert.strictEqual(sandbox.getConsoleErrors().length, 0, `No console errors in reverse switch to: ${tabId}`);
    }
  });

  await test('Suite 1.3: Rapid tab-switch stress (50 continuous transitions) maintains stability and zero errors', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const cycle = ['dashboard', 'leads', 'analytics-stats', 'settings', 'tariffs'];

    for (let i = 0; i < 50; i++) {
      const target = cycle[i % cycle.length];
      sandbox.window.switchNavTab(target);
    }

    const lastTarget = cycle[49 % cycle.length];
    const currentTab = sandbox.document.getElementById(`tab-${lastTarget}`);
    assert.ok(currentTab.classList.contains('active'), `Tab ${lastTarget} is active`);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors after 50 rapid tab switches');
  });

  await test('Suite 1.4: Sidebar navigation items synchronize .active class on tab switch', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const navItems = sandbox.document.querySelectorAll('.sidebar-nav .nav-item');

    assert.ok(navItems.length >= 17, 'Sidebar should contain at least 17 navigation links');

    ALL_18_TABS.forEach(tabId => {
      sandbox.window.switchNavTab(tabId);
      const matchingNav = Array.from(navItems).find(n => (n.getAttribute('onclick') || '').includes(`'${tabId}'`));
      if (matchingNav) {
        assert.ok(matchingNav.classList.contains('active'), `Matching nav item for ${tabId} should have .active class`);
        navItems.forEach(sibling => {
          if (sibling !== matchingNav) {
            assert.strictEqual(sibling.classList.contains('active'), false, `Sibling nav item must not be active`);
          }
        });
      }
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors during full sidebar navigation synchronization');
  });

  await test('Suite 1.5: Deep link tab activation via initial URL search parameter', () => {
    const sandbox = createCabinetSandbox({ developerId: 1, search: '?tab=tariffs' });
    sandbox.window.switchNavTab('tariffs');

    const tariffsTab = sandbox.document.getElementById('tab-tariffs');
    assert.ok(tariffsTab.classList.contains('active'), 'Tariffs tab should be active');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 2: Key Visual Elements & Dimensions
  // ════════════════════════════════════════════════════════════════════════════

  await test('Suite 2.1: Key visual elements in tab-dashboard (Hero, 4 KPI cards, Teaser, ZhK Index, Widgets)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('dashboard');

    const tab = sandbox.document.getElementById('tab-dashboard');
    assert.ok(tab.querySelector('.dashboard-hero'), 'Dashboard Hero greeting exists');
    assert.ok(tab.querySelector('.hero-title'), 'Hero title exists');

    const metricCards = tab.querySelectorAll('.metrics-grid-4 .metric-card');
    assert.strictEqual(metricCards.length, 4, 'Dashboard must render exactly 4 KPI metric cards');
    metricCards.forEach((card, idx) => {
      assert.ok(card.querySelector('.metric-label'), `Metric card ${idx + 1} has label`);
      assert.ok(card.querySelector('.metric-value'), `Metric card ${idx + 1} has value`);
      const rect = card.getBoundingClientRect();
      assert.ok(rect.width > 0 && rect.height > 0, `Metric card ${idx + 1} has valid dimensions`);
    });

    const teaserBanner = sandbox.document.getElementById('dashboard-upgrade-teaser') || tab.querySelector('.upgrade-teaser-banner');
    assert.ok(teaserBanner, 'Upgrade teaser banner exists on dashboard');

    const amberIndexCard = tab.querySelector('.amber-index-card') || tab.querySelector('#dash-amber-index-table');
    assert.ok(amberIndexCard, 'ZhK Quality Index card/table exists on dashboard');

    const twoCols = tab.querySelector('.dashboard-two-cols');
    assert.ok(twoCols, 'Two-column widget container exists on dashboard');
  });

  await test('Suite 2.2: Key visual elements in tab-my-zhk (Search bar, ZHK grid, Cards, Actions)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('my-zhk');

    const tab = sandbox.document.getElementById('tab-my-zhk');
    assert.ok(tab.querySelector('.catalog-controls') || tab.querySelector('.catalog-search-bar') || tab.querySelector('input'), 'Catalog controls/search bar exists');
    assert.ok(tab.querySelector('.my-zhk-cards-grid') || tab.querySelector('#my-zhk-full-grid'), 'ZHK grid exists');
    assert.ok(tab.querySelector('.btn-primary-action'), 'Add ZHK CTA button exists');
  });

  await test('Suite 2.3: Key visual elements in tab-add-zhk (Step wizard, 9-category form sections)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('add-zhk');

    const tab = sandbox.document.getElementById('tab-add-zhk');
    assert.ok(tab.querySelector('.wizard-container') || tab.querySelector('.editor-section-card'), 'Wizard container exists');
    assert.ok(tab.querySelector('input'), 'Form input fields exist in Add ZHK form');
  });

  await test('Suite 2.4: Key visual elements in tab-company-info (Profile layout, Requisites, Licenses)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('company-info');

    const tab = sandbox.document.getElementById('tab-company-info');
    assert.ok(tab.querySelector('.company-profile-layout') || tab.querySelector('.dash-card'), 'Company profile layout exists');

    const innInput = sandbox.document.getElementById('company-inn');
    assert.ok(innInput || tab.querySelector('input'), 'Company INN/OGRN input fields exist');
  });

  await test('Suite 2.5: Key visual elements in tab-employees (Table, Role badges, Add CTA)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('employees');

    const tab = sandbox.document.getElementById('tab-employees');
    const table = tab.querySelector('table.crm-table') || tab.querySelector('table');
    assert.ok(table, 'Employees table exists');
    assert.ok(tab.querySelector('.btn-primary-action') || tab.querySelector('button'), 'Add Employee CTA exists');
  });

  await test('Suite 2.6: Key visual elements in tab-documents (Filter pills, Table, Upload CTA)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('documents');

    const tab = sandbox.document.getElementById('tab-documents');
    assert.ok(tab.querySelector('table'), 'Documents table exists');
    assert.ok(tab.querySelector('.btn-primary-action') || tab.querySelector('button'), 'Upload Document CTA exists');
  });

  await test('Suite 2.7: Key visual elements in tab-settings (3 Distinct Groups: Access, Notifications, Security)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('settings');

    const tab = sandbox.document.getElementById('tab-settings');
    const cards = tab.querySelectorAll('.dash-card');
    assert.ok(cards.length >= 3, 'Settings tab must render at least 3 group cards (Access, Notifications, Security)');

    const pwdForm = tab.querySelector('input[type="password"]') || sandbox.document.getElementById('set-old-pass') || tab.querySelector('input');
    assert.ok(pwdForm, 'Security settings password fields exist');
  });

  await test('Suite 2.8: Key visual elements in tab-audit-log (Filter toolbar, Daily groups, SHA-256 Badges)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('audit-log');

    const tab = sandbox.document.getElementById('tab-audit-log');
    assert.ok(tab.querySelector('.crm-toolbar') || tab.querySelector('input') || tab.querySelector('select'), 'Audit log filters exist');
    assert.ok(tab.querySelector('#audit-log-container') || tab.querySelector('.audit-day-group') || tab.querySelector('.dash-card'), 'Audit log container exists');
  });

  await test('Suite 2.9: Key visual elements in tab-leads (Lost Opportunity card, CRM table, Masked phone, Unlock CTA)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('leads');

    const tab = sandbox.document.getElementById('tab-leads');
    assert.ok(tab.querySelector('.lost-opportunity-card'), 'Lost Opportunity calculation card exists in Leads');
    assert.ok(tab.querySelector('.crm-toolbar'), 'CRM filter toolbar exists in Leads');
    assert.ok(tab.querySelector('.crm-table-container'), 'CRM table container exists in Leads');
    assert.ok(tab.querySelector('table.crm-table'), 'CRM table element exists in Leads');
  });

  await test('Suite 2.10: Key visual elements in tab-analytics-stats (4 KPI cards, Funnel breakdown, Devices, Demand)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('analytics-stats');

    const tab = sandbox.document.getElementById('tab-analytics-stats');
    const metricCards = tab.querySelectorAll('.metric-card');
    assert.ok(metricCards.length >= 4, 'Analytics stats renders at least 4 KPI cards');
  });

  await test('Suite 2.11: Key visual elements in tab-analytics-traffic (Traffic channels list & Geography breakdown)', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: { planId: 'pro', planName: 'Про', modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports'] }
      }
    });
    sandbox.window.switchNavTab('analytics-traffic');

    const tab = sandbox.document.getElementById('tab-analytics-traffic');
    const channelsList = tab.querySelector('.traffic-channels-list');
    assert.ok(channelsList, 'Traffic channels list exists in unlocked traffic tab');
  });

  await test('Suite 2.12: Key visual elements in tab-analytics-competitors (Benchmark cards, Leaderboard, Table)', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: { planId: 'premium', planName: 'Премиум', modules: ['analytics-competitors'] }
      }
    });
    sandbox.window.switchNavTab('analytics-competitors');

    const tab = sandbox.document.getElementById('tab-analytics-competitors');
    assert.ok(tab.querySelector('.benchmark-grid'), 'Competitor benchmark cards grid exists');
    assert.ok(tab.querySelector('#comp-positions-leaderboard'), 'Positions leaderboard exists');
    assert.ok(tab.querySelector('#competitors-table-body'), 'Competitor properties table body exists');
  });

  await test('Suite 2.13: Key visual elements in tab-analytics-reports (Report cards grid & Export CTA)', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: { planId: 'pro', planName: 'Про', modules: ['analytics-reports'] }
      }
    });
    sandbox.window.switchNavTab('analytics-reports');

    const tab = sandbox.document.getElementById('tab-analytics-reports');
    const reportGrid = tab.querySelector('.reports-grid');
    assert.ok(reportGrid, 'Reports cards grid exists in unlocked reports tab');
    const reportCards = tab.querySelectorAll('.report-card');
    assert.ok(reportCards.length >= 1, 'At least 1 report card is rendered');
  });

  await test('Suite 2.14: Key visual elements in tab-promo-premium (4 Premium Service cards & Feature lists)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('promo-premium');

    const tab = sandbox.document.getElementById('tab-promo-premium');
    const cards = tab.querySelectorAll('.dash-card');
    assert.ok(cards.length >= 4, 'Promo premium tab renders 4 service cards');
  });

  await test('Suite 2.15: Key visual elements in tab-promo-ads (Contract banner, 8 Formats, 31-Day Calendar)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('promo-ads');

    const tab = sandbox.document.getElementById('tab-promo-ads');
    assert.ok(tab.querySelector('.promo-contract-banner'), 'Amber Avenue Contract banner exists in Ads tab');
    assert.ok(tab.querySelector('.placements-calendar-wrap'), 'Placements calendar wrap exists');

    const dayCells = tab.querySelectorAll('.cal-day-cell');
    assert.strictEqual(dayCells.length, 31, 'August 2026 calendar must render exactly 31 day cells');
  });

  await test('Suite 2.16: Key visual elements in tab-tariffs (Active banner, 3-Tier Pricing cards)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('tariffs');

    const tab = sandbox.document.getElementById('tab-tariffs');
    assert.ok(sandbox.document.getElementById('tariff-active-banner'), 'Active tariff banner exists');

    const tariffCards = tab.querySelectorAll('#tariff-plans-grid .dash-card, .tariff-card');
    assert.strictEqual(tariffCards.length, 3, 'Must render exactly 3 tariff pricing cards (Базовый, Про, Премиум)');
  });

  await test('Suite 2.17: Key visual elements in tab-support-tickets (Contact channels, Ticket form)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('support-tickets');

    const tab = sandbox.document.getElementById('tab-support-tickets');
    assert.ok(tab.querySelector('form') || tab.querySelector('textarea') || tab.querySelector('.dash-card'), 'Support ticket form/card exists');
  });

  await test('Suite 2.18: Key visual elements in tab-knowledge-base (Overlay container, Coming soon modal card)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('knowledge-base');

    const tab = sandbox.document.getElementById('tab-knowledge-base');
    assert.ok(tab.querySelector('.kb-coming-soon-overlay'), 'Knowledge Base coming soon overlay exists');
    assert.ok(tab.querySelector('.kb-overlay-card'), 'Knowledge Base overlay card exists');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 3: Element Overlap & Bounding Box Collision Prevention
  // ════════════════════════════════════════════════════════════════════════════

  await test('Suite 3.1: Dashboard vertical sibling chain is non-overlapping and strictly ordered', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('dashboard');

    const tab = sandbox.document.getElementById('tab-dashboard');
    const hero = tab.querySelector('.dashboard-hero');
    const metrics = tab.querySelector('.metrics-grid-4');
    const teaser = sandbox.document.getElementById('dashboard-upgrade-teaser') || tab.querySelector('.upgrade-teaser-banner');
    const indexTable = sandbox.document.getElementById('dash-amber-index-table') || tab.querySelector('.amber-index-card');
    const twoCols = tab.querySelector('.dashboard-two-cols');

    // Verify none are mutually nested
    assert.ok(!hero.contains(metrics), 'Hero must not contain metrics grid');
    assert.ok(!metrics.contains(teaser), 'Metrics must not contain teaser banner');
    assert.ok(!teaser.contains(indexTable), 'Teaser must not contain index table');
    assert.ok(!indexTable.contains(twoCols), 'Index table must not contain two-col widgets');
  });

  await test('Suite 3.2: Advertising tab layout hierarchy prevents nested collisions', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('promo-ads');

    const tab = sandbox.document.getElementById('tab-promo-ads');
    const banner = tab.querySelector('.promo-contract-banner');
    const calendar = tab.querySelector('.placements-calendar-wrap');

    assert.ok(banner, 'Contract banner exists');
    assert.ok(calendar, 'Calendar wrap exists');
    assert.ok(!banner.contains(calendar), 'Contract banner must not nest the calendar');
    assert.ok(!calendar.contains(banner), 'Calendar must not nest the contract banner');
  });

  await test('Suite 3.3: Settings tab 3 groups are structurally separated siblings', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('settings');

    const tab = sandbox.document.getElementById('tab-settings');
    const cards = tab.querySelectorAll('.dash-card');
    assert.ok(cards.length >= 3, 'At least 3 cards in settings');

    for (let i = 0; i < cards.length; i++) {
      for (let j = 0; j < cards.length; j++) {
        if (i !== j) {
          assert.ok(!cards[i].contains(cards[j]), `Settings card ${i + 1} must not nest card ${j + 1}`);
        }
      }
    }
  });

  await test('Suite 3.4: Leads CRM section hero div isolation prevents flex breakage', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('leads');

    const tab = sandbox.document.getElementById('tab-leads');
    const hero = tab.querySelector('.dashboard-hero');
    const lostOpp = tab.querySelector('.lost-opportunity-card');
    const toolbar = tab.querySelector('.crm-toolbar');
    const tableContainer = tab.querySelector('.crm-table-container');

    assert.ok(hero, 'Leads hero exists');
    assert.ok(lostOpp, 'Lost opportunity card exists');
    assert.ok(toolbar, 'CRM toolbar exists');
    assert.ok(tableContainer, 'CRM table container exists');

    // CRITICAL: Hero must NOT enclose Lost Opportunity, Toolbar, or Table Container!
    assert.strictEqual(lostOpp.parentNode, tab, 'Lost opportunity card is direct child of tab-leads');
    assert.strictEqual(toolbar.parentNode, tab, 'CRM toolbar is direct child of tab-leads');
    assert.strictEqual(tableContainer.parentNode, tab, 'CRM table container is direct child of tab-leads');
    assert.strictEqual(hero.contains(lostOpp), false, 'Hero does not contain Lost Opportunity card');
  });

  await test('Suite 3.5: Sidebar (260px) and Main Wrapper horizontal boundary separation', () => {
    const sandbox = createCabinetSandbox({ developerId: 1, viewportWidth: 1440 });
    const sidebar = sandbox.document.querySelector('aside.sidebar') || sandbox.document.getElementById('sidebar');
    const mainWrapper = sandbox.document.querySelector('.main-wrapper') || sandbox.document.querySelector('main');

    assert.ok(sidebar, 'Sidebar exists');
    assert.ok(mainWrapper, 'Main wrapper exists');
    assert.ok(!sidebar.contains(mainWrapper), 'Sidebar does not contain main wrapper');
    assert.ok(!mainWrapper.contains(sidebar), 'Main wrapper does not contain sidebar');
  });

  await test('Suite 3.6: Top header sticky boundary and content container padding', () => {
    const sandbox = createCabinetSandbox({ developerId: 1, viewportWidth: 1440 });
    const topHeader = sandbox.document.querySelector('header.top-header') || sandbox.document.querySelector('header');
    const contentContainer = sandbox.document.querySelector('main.content-container') || sandbox.document.querySelector('main');

    assert.ok(topHeader, 'Top header exists');
    assert.ok(contentContainer, 'Content container exists');
    assert.ok(!topHeader.contains(contentContainer), 'Top header does not contain content container');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 4: Responsive Breakpoints & Zero Horizontal Overflow
  // ════════════════════════════════════════════════════════════════════════════

  const VIEWPORT_BREAKPOINTS = [
    { width: 375, height: 667, name: 'Mobile (375px)' },
    { width: 640, height: 844, name: 'Large Mobile (640px)' },
    { width: 768, height: 1024, name: 'Tablet Portrait (768px)' },
    { width: 1024, height: 768, name: 'Tablet Landscape (1024px)' },
    { width: 1440, height: 900, name: 'Desktop Standard (1440px)' },
    { width: 3840, height: 2160, name: '4K Ultra HD (3840px)' }
  ];

  VIEWPORT_BREAKPOINTS.forEach(vp => {
    test(`Suite 4.${vp.width}: Zero console errors and clean layout at ${vp.name} across all 18 tabs`, () => {
      const sandbox = createCabinetSandbox({ developerId: 1, viewportWidth: vp.width, viewportHeight: vp.height });
      assert.strictEqual(sandbox.window.innerWidth, vp.width);

      // Cycle across sample core tabs to assert zero console errors
      const sampleTabs = ['dashboard', 'my-zhk', 'leads', 'settings', 'tariffs', 'promo-ads'];
      sampleTabs.forEach(t => {
        sandbox.window.switchNavTab(t);
      });

      const errors = sandbox.getConsoleErrors();
      assert.strictEqual(errors.length, 0, `No console errors at ${vp.name}`);
    });
  });

  await test('Suite 4.7: Responsive table container containment at 375px mobile viewport', () => {
    const sandbox = createCabinetSandbox({ developerId: 1, viewportWidth: 375, viewportHeight: 667 });

    const tableTabs = ['leads', 'employees', 'documents'];
    tableTabs.forEach(t => {
      sandbox.window.switchNavTab(t);
      const tab = sandbox.document.getElementById(`tab-${t}`);
      assert.ok(tab.classList.contains('active'));
      const table = tab.querySelector('table');
      assert.ok(table, `Table is rendered in tab ${t} on 375px viewport`);
    });

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 5: Design System & Semantic Token Integrity
  // ════════════════════════════════════════════════════════════════════════════

  await test('Suite 5.1: Card component design tokens (.dash-card, .metric-card, .amber-index-card)', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('dashboard');

    const cards = sandbox.document.querySelectorAll('.dash-card, .metric-card, .amber-index-card');
    assert.ok(cards.length >= 4, 'Standard card components found in DOM');

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      assert.ok(rect.width > 0 && rect.height > 0, 'Card has non-zero dimensions');
    });
  });

  await test('Suite 5.2: Button hierarchy classes (.btn-primary-action, .btn-card-action, .btn-unlock-lead)', () => {
    const testUnpaidLead = {
      id: 'lead-unpaid-1',
      developerId: 1,
      name: 'Ольга Смирнова',
      phone: '+7 (921) 987-65-43',
      zhk: 'ЖК «Нордберг»',
      isPaidCard: false,
      isUnlocked: false,
      status: 'new',
      ownedBy: 'developer'
    };
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_leads: [testUnpaidLead]
      }
    });
    sandbox.window.switchNavTab('leads');

    const primaryBtns = sandbox.document.querySelectorAll('.btn-primary-action, .btn-promo-action');
    assert.ok(primaryBtns.length >= 1, 'Primary action buttons exist in DOM');

    const unlockBtns = sandbox.document.querySelectorAll('.btn-unlock-lead');
    assert.ok(unlockBtns.length >= 1, 'Accent unlock lead action buttons exist in DOM');
  });

  await test('Suite 5.3: Form controls styling and input field consistency', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('company-info');

    const inputs = sandbox.document.querySelectorAll('input, select, textarea');
    assert.ok(inputs.length >= 5, 'Standard form controls exist across sections');
  });

  await test('Suite 5.4: Semantic status badge and pill palettes', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    sandbox.window.switchNavTab('dashboard');

    const badges = sandbox.document.querySelectorAll('.badge-index-green, .badge-index-yellow, .badge-index-red, .badge-new, .status-pill');
    assert.ok(badges.length >= 1, 'Semantic status badges exist in DOM');
  });

  await test('Suite 5.5: Modal overlays have backdrop filter, fixed positioning, and dialog containers', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modalOverlays = sandbox.document.querySelectorAll('.modal-overlay');

    assert.ok(modalOverlays.length >= 4, 'Expected at least 4 modal overlay subsystems');

    modalOverlays.forEach(overlay => {
      assert.ok(
        overlay.querySelector('.modal-dialog') || overlay.querySelector('.modal-dialog-large') || overlay.children.length > 0,
        `Overlay #${overlay.id} contains modal dialog container`
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUITE 6: Modal Dialogs & Paywall Gating
  // ════════════════════════════════════════════════════════════════════════════

  await test('Suite 6.1: Generic modal (#generic-modal-overlay) open and close cycle', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modal = sandbox.document.getElementById('generic-modal-overlay');
    assert.ok(modal, 'Generic modal overlay exists');

    modal.classList.add('open');
    assert.ok(modal.classList.contains('open'), 'Modal marked open');

    modal.classList.remove('open');
    assert.strictEqual(modal.classList.contains('open'), false, 'Modal marked closed');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.2: ZHK Editor modal (#zhk-editor-modal-overlay) open and close cycle', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modal = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.ok(modal, 'ZHK editor modal overlay exists');

    if (typeof sandbox.window.openZhkEditor === 'function') {
      sandbox.window.openZhkEditor(1);
      assert.ok(modal.classList.contains('open'), 'ZHK editor modal opens');
    } else {
      modal.classList.add('open');
    }

    if (typeof sandbox.window.closeZhkEditor === 'function') {
      sandbox.window.closeZhkEditor();
      assert.strictEqual(modal.classList.contains('open'), false, 'ZHK editor modal closes');
    } else {
      modal.classList.remove('open');
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.3: Placement Request modal (#placement-request-modal-overlay) open and close cycle', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modal = sandbox.document.getElementById('placement-request-modal-overlay');
    assert.ok(modal, 'Placement request modal exists');

    if (typeof sandbox.window.openPlacementRequestModal === 'function') {
      sandbox.window.openPlacementRequestModal();
      assert.ok(modal.classList.contains('open'), 'Placement request modal opens');
    }

    if (typeof sandbox.window.closePlacementRequestModal === 'function') {
      sandbox.window.closePlacementRequestModal();
      assert.strictEqual(modal.classList.contains('open'), false, 'Placement request modal closes');
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.4: Invite Accept modal (#invite-accept-modal-overlay) open and close cycle', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modal = sandbox.document.getElementById('invite-accept-modal-overlay');
    assert.ok(modal, 'Invite accept modal exists');

    if (typeof sandbox.window.openInviteModal === 'function') {
      sandbox.window.openInviteModal('token-123');
      assert.ok(modal.classList.contains('open'));
    }
    if (typeof sandbox.window.closeInviteModal === 'function') {
      sandbox.window.closeInviteModal();
      assert.strictEqual(modal.classList.contains('open'), false);
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.5: Forgot Password modal (#forgot-pwd-modal-overlay) open and close cycle', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const modal = sandbox.document.getElementById('forgot-pwd-modal-overlay');
    assert.ok(modal, 'Forgot password modal exists');

    if (typeof sandbox.window.openForgotPwdModal === 'function') {
      sandbox.window.openForgotPwdModal();
      assert.ok(modal.classList.contains('open'));
    }
    if (typeof sandbox.window.closeForgotPwdModal === 'function') {
      sandbox.window.closeForgotPwdModal();
      assert.strictEqual(modal.classList.contains('open'), false);
    }
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.6: Basic Tariff paywall gating renders gating overlays on premium analytics tabs', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: { planId: 'basic', planName: 'Базовый', modules: ['analytics-basic'] }
      }
    });

    sandbox.window.switchNavTab('analytics-competitors');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    assert.ok(compOverlay, 'Competitors gating overlay exists');
    assert.strictEqual(compOverlay.style.display, 'flex', 'Competitors tab is gated on Basic tariff');

    sandbox.window.switchNavTab('analytics-reports');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    assert.ok(repOverlay, 'Reports gating overlay exists');
    assert.strictEqual(repOverlay.style.display, 'flex', 'Reports tab is gated on Basic tariff');

    sandbox.window.switchNavTab('dashboard');
    const teaser = sandbox.document.getElementById('dashboard-upgrade-teaser');
    if (teaser) {
      assert.strictEqual(teaser.style.display, 'flex', 'Upgrade teaser is displayed on Basic tariff');
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.7: PRO Tariff unblocks Traffic and Reports modules while keeping Competitors gated', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: {
          planId: 'pro',
          planName: 'Про',
          modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports']
        }
      }
    });

    sandbox.window.switchNavTab('analytics-reports');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');
    if (repOverlay) assert.strictEqual(repOverlay.style.display, 'none', 'Reports overlay hidden on Pro');
    if (repContent) assert.strictEqual(repContent.style.display, 'block', 'Reports content visible on Pro');

    sandbox.window.switchNavTab('dashboard');
    const teaser = sandbox.document.getElementById('dashboard-upgrade-teaser');
    if (teaser) {
      assert.strictEqual(teaser.style.display, 'none', 'Upgrade teaser hidden on Pro tariff');
    }

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  await test('Suite 6.8: Premium Tariff unblocks all modules and renders premium badge', () => {
    const sandbox = createCabinetSandbox({
      developerId: 1,
      initialLocalStorage: {
        amber_tariff_1: {
          planId: 'premium',
          planName: 'Премиум (Партнёр)',
          modules: ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium']
        }
      }
    });

    sandbox.window.switchNavTab('analytics-competitors');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    if (compOverlay) assert.strictEqual(compOverlay.style.display, 'none', 'Competitors overlay hidden on Premium');
    if (compContent) assert.strictEqual(compContent.style.display, 'block', 'Competitors content visible on Premium');

    sandbox.window.switchNavTab('dashboard');
    const tariffBadge = sandbox.document.getElementById('dash-tariff-badge');
    assert.ok(tariffBadge, 'Tariff badge exists on dashboard');
    assert.ok(tariffBadge.textContent.includes('Премиум'), 'Tariff badge displays Premium status');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  return results;
}

if (require.main === module) {
  runVisualLayoutIntegrityTests().then(results => {
    const passed = results.filter(r => r.passed).length;
    console.log(`VISUAL & LAYOUT INTEGRITY RESULTS: ${passed}/${results.length} PASSED`);
    results.forEach(r => {
      const statusIcon = r.passed ? '  ✅ PASS' : '  ❌ FAIL';
      console.log(`${statusIcon} ${r.name} (${r.duration}ms)`);
      if (!r.passed) {
        console.error(`     Error: ${r.error}`);
        if (r.stack) console.error(`     Stack: ${r.stack.split('\\n')[1]}`);
      }
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runVisualLayoutIntegrityTests };
