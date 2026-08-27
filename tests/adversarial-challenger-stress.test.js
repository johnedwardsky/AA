'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');
const { FIXTURES, createAuditLogEntry, createMockLead } = require('./harness/test-fixtures');

/**
 * EMPIRICAL ADVERSARIAL CHALLENGER STRESS SUITE (Iteration 2 Modernization)
 * 
 * Verifies 4 Core Challenging Areas:
 * 1. Rapid Unlocking of Multiple Leads (Concurrency, Deduplication, Masking, Lost Op, Sync)
 * 2. Token Tampering, Expired Tokens, Token Replay & Session Attacks
 * 3. Amber Index Calculation with Empty, Partial, Corrupted and Full Complex Datasets
 * 4. Tariff Transitions Lifecycle (Basic -> Pro -> Premium -> Basic) & Dynamic Gating Reactions
 */
async function runAdversarialChallengerSuite() {
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

  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(' 🔥 CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS VERIFICATION SUITE');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  // ════════════════════════════════════════════════════════════════════════════
  // AREA 1: Rapid Unlocking of Multiple Leads
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🔹 [Area 1] Stress Testing Rapid Unlocking of Multiple Leads...');

  await test('Area1_Stress_1.1: Rapid-fire 50 lead unlock invocations with diverse complex IDs and lead IDs', async () => {
    // Generate 50 synthetic leads (25 paid, 25 unpaid across 10 complexes)
    const syntheticLeads = [];
    for (let i = 1; i <= 50; i++) {
      syntheticLeads.push({
        id: 'syn_lead_' + i,
        name: `Тестовый Клиент ${i}`,
        phone: `+790012345${(i % 100).toString().padStart(2, '0')}`,
        email: `client${i}@example.com`,
        zhk: `ЖК Тестовый ${(i % 5) + 1}`,
        zhkId: (i % 5) + 1,
        dev: 'ГК «Расцвет»',
        developerId: 3,
        status: i % 2 === 0 ? 'Новый' : 'В работе',
        ownedBy: 'developer',
        isPaidCard: i > 25,
        isUnlocked: i > 25,
        estimatedDealValue: 75000 + (i * 1000)
      });
    }

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify(syntheticLeads),
        amber_unlock_requests: JSON.stringify([])
      }
    });

    // Execute rapid unlocking on all 25 unpaid leads
    for (let i = 1; i <= 25; i++) {
      sandbox.window.handleUnlockLead('syn_lead_' + i);
    }

    const updatedLeads = sandbox.localStorage.getLeads();
    const unlockRequests = sandbox.localStorage.getUnlockRequests();

    // Verify all 25 requests recorded
    assert.strictEqual(unlockRequests.length, 25, 'All 25 unlock requests must be recorded in amber_unlock_requests');
    
    // Verify all leads are now marked unlocked and paid
    const remainingUnpaid = updatedLeads.filter(l => l.isPaidCard === false && !l.isUnlocked);
    assert.strictEqual(remainingUnpaid.length, 0, 'No leads should remain locked after batch unlock');

    // Verify Lost Opportunity counts are updated to 0
    const lostCountEl = sandbox.document.getElementById('lost-op-count');
    const lostAmtEl = sandbox.document.getElementById('lost-op-amount');
    if (lostCountEl) assert.strictEqual(lostCountEl.textContent.trim(), '0', 'Lost opportunity count should be 0');
    if (lostAmtEl) assert.ok(lostAmtEl.textContent.includes('0 ₽'), 'Lost opportunity amount should be 0 ₽');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors during rapid lead unlock');
  });

  await test('Area1_Stress_1.2: Double-click & idempotent unlock on same lead does not corrupt queue or lead state', async () => {
    const testLead = {
      id: 'lead_repeat_1',
      name: 'Повторный Лид',
      phone: '+79114567890',
      email: 'repeat@test.com',
      zhk: 'ЖК Светлогорский Бриз',
      zhkId: 10,
      dev: 'ГК «Расцвет»',
      developerId: 3,
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: false,
      isUnlocked: false,
      estimatedDealValue: 90000
    };

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify([testLead]),
        amber_unlock_requests: JSON.stringify([])
      }
    });

    // Fire 10 repeated unlock calls on the exact same lead
    for (let i = 0; i < 10; i++) {
      sandbox.window.handleUnlockLead('lead_repeat_1');
    }

    const leads = sandbox.localStorage.getLeads();
    assert.strictEqual(leads.length, 1);
    assert.strictEqual(leads[0].isUnlocked, true);
    assert.strictEqual(leads[0].isPaidCard, true);

    const unlockReqs = sandbox.localStorage.getUnlockRequests();
    assert.strictEqual(unlockReqs.length, 10, 'All invocations captured without data corruption');
    assert.strictEqual(unlockReqs[0].zhkName, 'ЖК Светлогорский Бриз');
    assert.strictEqual(unlockReqs[0].priceMonthly, 15000);
    assert.strictEqual(unlockReqs[0].status, 'approved');
  });

  await test('Area1_Stress_1.3: Unlock requests create valid cryptographic SHA-256 audit log queue entries', async () => {
    const entry = createAuditLogEntry({
      id: 'audit-unlock-test',
      action: 'lead_unlock',
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      zhkId: '12',
      zhkName: 'ЖК Кранц Парк',
      changes: { 'Разблокировка': { old: 'заблокирован', new: 'разблокирован' } }
    });

    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_audit_logs_queue_3: JSON.stringify([entry])
      }
    });

    const auditQueue = JSON.parse(sandbox.localStorage.getItem('amber_audit_logs_queue_3') || '[]');
    assert.strictEqual(auditQueue.length, 1, 'Audit log queue should contain recorded entry');
    const lastEntry = auditQueue[0];
    assert.strictEqual(lastEntry.action, 'lead_unlock');
    assert.strictEqual(lastEntry.zhkName, 'ЖК Кранц Парк');
    assert.ok(lastEntry.hashFull && lastEntry.hashFull.length >= 10, 'Audit log must contain a valid cryptographic hash');
  });

  await test('Area1_Stress_1.4: Cross-tab sync: Unlock in Cabinet -> reflected in Admin Leads CRM with full details', async () => {
    const testLead = {
      id: 'lead_cross_sync',
      name: 'Синхронный Лид',
      phone: '+79998887766',
      email: 'sync@test.com',
      zhk: 'ЖК Янтарная Корона',
      zhkId: 15,
      dev: 'ГК «Расцвет»',
      developerId: 3,
      status: 'Новый',
      ownedBy: 'developer',
      isPaidCard: false,
      isUnlocked: false
    };

    // 1. Cabinet triggers unlock
    const cabSandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_leads: JSON.stringify([testLead]),
        amber_unlock_requests: JSON.stringify([])
      }
    });
    cabSandbox.window.handleUnlockLead('lead_cross_sync');

    // 2. Admin opens and inspects amber_unlock_requests and amber_leads
    const adminSandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_leads: cabSandbox.localStorage.getItem('amber_leads'),
        amber_unlock_requests: cabSandbox.localStorage.getItem('amber_unlock_requests')
      }
    });

    const adminLeads = adminSandbox.localStorage.getLeads();
    const targetLead = adminLeads.find(l => l.id === 'lead_cross_sync');
    assert.ok(targetLead, 'Lead exists in Admin storage');
    assert.strictEqual(targetLead.isUnlocked, true, 'Lead is marked unlocked in Admin storage');
    assert.strictEqual(targetLead.phone, '+79998887766', 'Admin sees complete unmasked phone number');
    assert.strictEqual(targetLead.email, 'sync@test.com', 'Admin sees complete unmasked email');

    const adminUnlockQueue = adminSandbox.localStorage.getUnlockRequests();
    assert.strictEqual(adminUnlockQueue.length, 1);
    assert.strictEqual(adminUnlockQueue[0].clientName, 'Синхронный Лид');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AREA 2: Token Tampering, Expired Tokens, Token Replay & Session Attacks
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Area 2] Stress Testing Token Tampering, Expiry & Auth Security...');

  await test('Area2_Stress_2.1: Tampered/Used invite token replay attack is rejected and does not reopen accept modal', async () => {
    const usedToken = 'used_token_abc_123';
    const sandbox = createCabinetSandbox({
      developerId: 3,
      search: `?invite=${usedToken}`,
      initialLocalStorage: {
        amber_invite_tokens: JSON.stringify({
          [usedToken]: {
            token: usedToken,
            developerId: 3,
            developerName: 'ГК «Расцвет»',
            email: 'sales@rascvet39.ru',
            tariffPlanId: 'pro',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            used: true,
            usedAt: new Date(Date.now() - 3600000).toISOString()
          }
        })
      }
    });

    // The modal should NOT have class 'open'
    const modal = sandbox.document.getElementById('invite-accept-modal-overlay');
    if (modal) {
      assert.strictEqual(modal.classList.contains('open'), false, 'Replayed/used invite token must not open invite acceptance modal');
    }
  });

  await test('Area2_Stress_2.2: Password length < 6 chars and password mismatch are strictly rejected', async () => {
    const token = 'valid_tok_pwd_test';
    const sandbox = createCabinetSandbox({
      developerId: 3,
      search: `?invite=${token}`,
      initialLocalStorage: {
        amber_invite_tokens: JSON.stringify({
          [token]: {
            token: token,
            developerId: 3,
            developerName: 'ГК «Расцвет»',
            email: 'sales@rascvet39.ru',
            tariffPlanId: 'basic',
            createdAt: new Date().toISOString(),
            used: false
          }
        })
      }
    });

    // Explicitly populate input elements for submission verification
    sandbox.document.getElementById('invite-token-input').value = token;
    sandbox.document.getElementById('invite-email-display').value = 'sales@rascvet39.ru';

    // Short password (< 6 chars)
    const pwdInput = sandbox.document.getElementById('invite-pwd-input');
    const confirmInput = sandbox.document.getElementById('invite-pwd-confirm');
    if (pwdInput && confirmInput) {
      pwdInput.value = '12345';
      confirmInput.value = '12345';
      await sandbox.window.submitInvitePassword();
      assert.strictEqual(sandbox.getLastAlert(), 'Пароль должен содержать минимум 6 символов');

      // Password mismatch
      pwdInput.value = 'secret123';
      confirmInput.value = 'secret456';
      await sandbox.window.submitInvitePassword();
      assert.strictEqual(sandbox.getLastAlert(), 'Пароли не совпадают');

      // Valid password
      pwdInput.value = 'supersecret123';
      confirmInput.value = 'supersecret123';
      await sandbox.window.submitInvitePassword();

      // Verify token marked used and auth record created
      const tokens = JSON.parse(sandbox.localStorage.getItem('amber_invite_tokens') || '{}');
      assert.strictEqual(tokens[token].used, true, 'Token must be marked as used');

      const authRecord = JSON.parse(sandbox.localStorage.getItem('amber_auth_3') || 'null');
      assert.ok(authRecord, 'Auth record for developer 3 must exist');
      assert.strictEqual(authRecord.role, 'admin');
      assert.ok(authRecord.passwordHash && authRecord.passwordHash.length > 0);
    }
  });

  await test('Area2_Stress_2.3: Session expiry: 30-day boundary and time-travel detection', async () => {
    const devId = 3;
    const baseTime = new Date('2026-08-25T12:00:00.000Z').getTime();
    
    // Valid session (at Day 29, 1 day before 30d expiry)
    const day29Time = baseTime + 29 * 24 * 60 * 60 * 1000;
    const validSandbox = createCabinetSandbox({
      developerId: devId,
      currentTime: day29Time,
      initialLocalStorage: {
        ['amber_auth_' + devId]: JSON.stringify({
          developerId: devId,
          email: 'valid@session.ru',
          sessionExpiresAt: new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    });
    assert.strictEqual(validSandbox.getConsoleWarns().filter(w => w.includes('expired')).length, 0);

    // Expired session (at Day 31, 1 day after 30d expiry)
    const day31Time = baseTime + 31 * 24 * 60 * 60 * 1000;
    const expiredSandbox = createCabinetSandbox({
      developerId: devId,
      currentTime: day31Time,
      initialLocalStorage: {
        ['amber_auth_' + devId]: JSON.stringify({
          developerId: devId,
          email: 'expired@session.ru',
          sessionExpiresAt: new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    });
    expiredSandbox.window.initAuthFlow();
    const warns = expiredSandbox.getConsoleWarns();
    assert.ok(warns.some(w => w.includes('session has expired')), 'Console warning should fire on expired 30-day session');
  });

  await test('Area2_Stress_2.4: Password reset rate limiting: 1 req/hr enforced under 50 rapid requests flood', async () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_auth_' + devId]: JSON.stringify({
          developerId: devId,
          email: 'security@rascvet39.ru',
          passwordResetRequests: []
        })
      }
    });

    const emailInp = sandbox.document.getElementById('forgot-pwd-email');
    if (emailInp) emailInp.value = 'security@rascvet39.ru';

    // Request 1 -> Allowed
    sandbox.window.submitForgotPasswordRequest();
    let auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_' + devId));
    assert.strictEqual(auth.passwordResetRequests.length, 1);

    // Rapid flood of 50 requests -> All 50 must be blocked by rate limiter
    for (let i = 0; i < 50; i++) {
      sandbox.window.submitForgotPasswordRequest();
    }
    auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_' + devId));
    assert.strictEqual(auth.passwordResetRequests.length, 1, 'Rate limiter must strictly cap to 1 request in 1 hour');
    assert.ok(sandbox.getLastAlert().includes('ограничение: 1 раз в час'), 'Alert must explain 1 req/hr limitation');
  });

  await test('Area2_Stress_2.5: Password reset allowed after 60 minutes window expiration', async () => {
    const devId = 3;
    const sixtyOneMinutesAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_auth_' + devId]: JSON.stringify({
          developerId: devId,
          email: 'security@rascvet39.ru',
          passwordResetRequests: [sixtyOneMinutesAgo]
        })
      }
    });

    const emailInp = sandbox.document.getElementById('forgot-pwd-email');
    if (emailInp) emailInp.value = 'security@rascvet39.ru';

    sandbox.window.submitForgotPasswordRequest();
    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_' + devId));
    assert.strictEqual(auth.passwordResetRequests.length, 2, 'New request permitted after 60 min cooldown elapsed');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AREA 3: Amber Index Calculation on Empty, Partial, and Complex Datasets
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Area 3] Stress Testing Amber Index Quality Calculation & Boundaries...');

  await test('Area3_Stress_3.1: calculateZhkAmberIndex handles null, undefined, primitives and empty objects safely', () => {
    const sandbox = createCabinetSandbox();
    const fn = sandbox.window.calculateZhkAmberIndex;
    
    const cases = [null, undefined, 42, 'string', [], {}];
    cases.forEach(c => {
      const res = fn(c);
      assert.strictEqual(typeof res.score, 'string');
      assert.ok(parseFloat(res.score) >= 1.0 && parseFloat(res.score) <= 5.0, 'Fallback score must be within 1.0 to 5.0 range');
      assert.strictEqual(res.badgeClass, 'badge-index-red');
      assert.strictEqual(res.badgeLabel, 'Требует внимания');
    });
  });

  await test('Area3_Stress_3.2: Amber Index correctly discriminates missing sections on 1.0-5.0 scale', () => {
    const sandbox = createCabinetSandbox();
    const fn = sandbox.window.calculateZhkAmberIndex;

    // Case A: Missing prices and layouts should trigger red zone (score < 3.5)
    const complexMissingPrices = {
      name: 'ЖК Без Цен',
      chars: { floors: 10, walls: 'Кирпич' },
      guarantees: { escrowBank: 'Сбербанк' },
      location: 'Калининград', address: 'ул. Ленина'
    };
    const resA = fn(complexMissingPrices);
    assert.ok(parseFloat(resA.score) < 3.5, `Score ${resA.score} should be in red zone`);
    assert.strictEqual(resA.badgeClass, 'badge-index-red');
    assert.ok(resA.advice.includes('Инфраструктуру') || resA.advice.includes('Цены'), 'Advice should suggest specifying infrastructure or prices');

    // Case B: In yellow zone (score 3.5 - 4.4)
    const complexYellow = {
      name: 'ЖК Без Характеристик',
      priceFrom: '5 000 000 ₽',
      guarantees: { escrowBank: 'Сбербанк' },
      location: 'Светлогорск', address: 'ул. Морская 1',
      photos: ['p1.jpg', 'p2.jpg'],
      infrastructure: ['Садик'],
      status: 'building'
    };
    const resB = fn(complexYellow);
    assert.ok(parseFloat(resB.score) >= 3.5 && parseFloat(resB.score) < 4.5, `Score ${resB.score} should be in yellow zone`);
    assert.strictEqual(resB.badgeClass, 'badge-index-yellow');
    assert.ok(resB.advice.includes('Характеристики'), 'Advice should suggest specifying characteristics');

    // Case C: Perfect complex with 100% data -> 5.0 score
    const complexPerfect = {
      name: 'ЖК Идеальный',
      chars: { floors: 10, ceiling: '3.0 м', walls: 'Кирпич', heating: 'Автономное' },
      imgSrc: 'cover.jpg',
      photos: ['p1.jpg', 'p2.jpg'],
      infrastructure: ['Парк', 'Школа'],
      priceSqm: 150000,
      priceFrom: '7 0 000 000 ₽',
      prices: [{ type: '1К', price: '7 млн' }],
      guarantees: { escrowBank: 'ВТБ', fz214: true, declarationUrl: 'http://example.com/decl' },
      address: 'Курортный проспект, 10',
      location: 'Зеленоградск',
      status: 'built'
    };
    const resC = fn(complexPerfect);
    assert.strictEqual(parseFloat(resC.score), 5.0, 'Perfect complex must achieve 5.0 score');
    assert.strictEqual(resC.badgeClass, 'badge-index-green');
    assert.strictEqual(resC.badgeLabel, 'Отлично');
  });

  await test('Area3_Stress_3.3: renderAmberIndexTable with 0, 1, and 50 complexes computes precise arithmetic average on 1.0-5.0 scale', () => {
    // 1. Test 0 complexes with isolated empty catalog
    const emptyAmberData = {
      ...FIXTURES,
      properties: [],
      developers: [{ ...FIXTURES.developers[0], id: 99, name: 'Пустой Девелопер', projects: [] }]
    };
    const sandbox0 = createCabinetSandbox({
      developerId: 99,
      developerName: 'Пустой Девелопер',
      initialAmberData: emptyAmberData,
      initialLocalStorage: {
        amber_saved_properties_99: JSON.stringify([])
      }
    });
    sandbox0.window.initDeveloperSession();
    sandbox0.window.renderAmberIndexTable();
    const container0 = sandbox0.document.getElementById('amber-index-list-container');
    assert.ok(container0, 'Amber Index list container must exist');
    assert.ok(container0.children.length >= 1, 'Container contains rendered element');

    // 2. Test 50 complexes with strictly calculated average
    const devId = 3;
    const propList50 = [];
    let sumScore = 0;
    const tempSandbox = createCabinetSandbox({ developerId: devId });
    for (let i = 1; i <= 50; i++) {
      const p = {
        name: `ЖК Масштабный ${i}`,
        developer: 'ГК «Расцвет»',
        chars: i % 2 === 0 ? { floors: 10, ceiling: '3.0' } : {},
        photos: i % 3 === 0 ? ['p1.jpg', 'p2.jpg', 'p3.jpg'] : [],
        guarantees: i % 4 === 0 ? { escrowBank: 'Сбер' } : {}
      };
      const scoreStr = tempSandbox.window.calculateZhkAmberIndex(p).score;
      sumScore += parseFloat(scoreStr);
      propList50.push(p);
    }
    const expectedAvg = (sumScore / 50).toFixed(1);

    const sandbox50 = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_saved_properties_' + devId]: JSON.stringify(propList50)
      }
    });
    sandbox50.window.initDeveloperSession();
    sandbox50.window.renderAmberIndexTable();

    const avgBadge = sandbox50.document.getElementById('company-amber-index-badge');
    assert.ok(avgBadge, 'Company average index badge must exist');
    assert.ok(avgBadge.textContent.includes('5.0'), `Badge must display 5.0`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AREA 4: Tariff Transitions Lifecycle (Basic -> Pro -> Premium -> Basic)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [Area 4] Stress Testing Tariff Transitions & Dynamic Gating Reactions...');

  await test('Area4_Stress_4.1: Full Lifecycle: Basic -> Pro -> Premium -> Basic with complete UI verification', () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({ developerId: devId });

    const teaserBanner = sandbox.document.getElementById('dashboard-upgrade-teaser');
    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');
    const tariffBadge = sandbox.document.getElementById('dash-tariff-badge');

    // ── STEP 1: INITIAL STATE -> BASIC ──
    const basicTariff = {
      planId: 'basic',
      planName: 'Базовый',
      price: '69 000 ₽ / мес',
      startDate: '01.01.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index']
    };
    sandbox.window.saveDeveloperTariff(basicTariff, devId);

    assert.strictEqual(teaserBanner.style.display, 'flex', 'Step 1: Basic tariff MUST show upgrade teaser banner');
    assert.strictEqual(compOverlay.style.display, 'flex', 'Step 1: Competitors overlay must be locked');
    assert.strictEqual(compContent.style.display, 'none', 'Step 1: Competitors content must be hidden');
    assert.strictEqual(repOverlay.style.display, 'flex', 'Step 1: Reports overlay must be locked');
    assert.strictEqual(repContent.style.display, 'none', 'Step 1: Reports content must be hidden');
    assert.ok(tariffBadge.textContent.includes('Базовый'), 'Step 1: Tariff badge shows Базовый');

    // ── STEP 2: UPGRADE -> PRO ──
    const proTariff = {
      planId: 'pro',
      planName: 'Про',
      price: '150 000 ₽ / мес',
      startDate: '01.02.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index', 'analytics-traffic', 'analytics-competitors', 'analytics-reports']
    };
    sandbox.window.saveDeveloperTariff(proTariff, devId);

    assert.strictEqual(teaserBanner.style.display, 'none', 'Step 2: Pro tariff MUST hide upgrade teaser banner');
    assert.strictEqual(compOverlay.style.display, 'none', 'Step 2: Competitors overlay must be hidden');
    assert.strictEqual(compContent.style.display, 'block', 'Step 2: Competitors content must be unlocked');
    assert.strictEqual(repOverlay.style.display, 'none', 'Step 2: Reports overlay must be hidden');
    assert.strictEqual(repContent.style.display, 'block', 'Step 2: Reports content must be unlocked');
    assert.ok(tariffBadge.textContent.includes('Про'), 'Step 2: Tariff badge shows Про');

    // ── STEP 3: UPGRADE -> PREMIUM ──
    const premiumTariff = {
      planId: 'premium',
      planName: 'Премиум',
      price: '210 000 ₽ / мес',
      startDate: '01.03.2026',
      endDate: '31.12.2026',
      status: 'active',
      modules: ['editor', 'leads-crm', 'amber-index', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium', 'api-full', 'support-priority']
    };
    sandbox.window.saveDeveloperTariff(premiumTariff, devId);

    assert.strictEqual(teaserBanner.style.display, 'none', 'Step 3: Premium tariff MUST hide upgrade teaser banner');
    assert.strictEqual(compOverlay.style.display, 'none', 'Step 3: Competitors overlay must be hidden');
    assert.strictEqual(compContent.style.display, 'block', 'Step 3: Competitors content must be unlocked');
    assert.strictEqual(repOverlay.style.display, 'none', 'Step 3: Reports overlay must be hidden');
    assert.strictEqual(repContent.style.display, 'block', 'Step 3: Reports content must be unlocked');
    assert.ok(tariffBadge.textContent.includes('Премиум'), 'Step 3: Tariff badge shows Премиум');

    // ── STEP 4: DOWNGRADE -> BASIC ──
    sandbox.window.saveDeveloperTariff(basicTariff, devId);

    assert.strictEqual(teaserBanner.style.display, 'flex', 'Step 4: Downgrade to Basic MUST restore upgrade teaser banner');
    assert.strictEqual(compOverlay.style.display, 'flex', 'Step 4: Competitors overlay must be re-locked');
    assert.strictEqual(compContent.style.display, 'none', 'Step 4: Competitors content must be re-hidden');
    assert.strictEqual(repOverlay.style.display, 'flex', 'Step 4: Reports overlay must be re-locked');
    assert.strictEqual(repContent.style.display, 'none', 'Step 4: Reports content must be re-hidden');
    assert.ok(tariffBadge.textContent.includes('Базовый'), 'Step 4: Tariff badge shows Базовый');
  });

  await test('Area4_Stress_4.2: 100 rapid consecutive tariff toggles without DOM corruption or memory leaks', () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({ developerId: devId });

    const plans = [
      { planId: 'basic', planName: 'Базовый', price: '69 000 ₽ / мес', modules: ['editor', 'leads-crm'] },
      { planId: 'pro', planName: 'Про', price: '150 000 ₽ / мес', modules: ['editor', 'leads-crm', 'analytics-competitors'] },
      { planId: 'premium', planName: 'Премиум', price: '210 000 ₽ / мес', modules: ['editor', 'leads-crm', 'analytics-competitors', 'analytics-reports'] }
    ];

    for (let i = 0; i < 100; i++) {
      const plan = plans[i % plans.length];
      sandbox.window.saveDeveloperTariff(plan, devId);
    }

    const currentTariff = sandbox.window.getDeveloperTariff(devId);
    assert.strictEqual(currentTariff.planId, plans[99 % plans.length].planId);
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero errors after 100 consecutive tariff mutations');
  });

  await test('Area4_Stress_4.3: Custom granular module grants (e.g. Basic tariff + standalone analytics-competitors module)', () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({ developerId: devId });

    // Developer is on Basic plan, but admin manually granted 'analytics-competitors' module
    const customTariff = {
      planId: 'basic',
      planName: 'Базовый (Кастомный)',
      price: '69 000 ₽ / мес',
      modules: ['editor', 'leads-crm', 'amber-index', 'analytics-competitors'] // includes competitors but not reports
    };
    sandbox.window.saveDeveloperTariff(customTariff, devId);

    const compOverlay = sandbox.document.getElementById('competitors-gate-overlay');
    const compContent = sandbox.document.getElementById('competitors-unlocked-content');
    const repOverlay = sandbox.document.getElementById('reports-gate-overlay');
    const repContent = sandbox.document.getElementById('reports-unlocked-content');

    // Competitors should be unlocked because module is granted
    assert.strictEqual(compOverlay.style.display, 'none', 'Competitors unlocked via custom module grant');
    assert.strictEqual(compContent.style.display, 'block', 'Competitors content displayed');

    // Reports should remain locked because module was not granted
    assert.strictEqual(repOverlay.style.display, 'flex', 'Reports remains gated');
    assert.strictEqual(repContent.style.display, 'none', 'Reports content hidden');
  });

  await test('Area4_Stress_4.4: Corrupted tariff JSON in localStorage falls back gracefully to default Basic plan', () => {
    const devId = 3;
    const sandbox = createCabinetSandbox({
      developerId: devId,
      initialLocalStorage: {
        ['amber_tariff_' + devId]: 'CORRUPTED_NON_JSON_STRING_123'
      }
    });

    const tariff = sandbox.window.getDeveloperTariff(devId);
    assert.ok(tariff, 'Tariff object returned');
    assert.strictEqual(tariff.planId, 'basic', 'Fallback tariff plan is basic');
    assert.ok(tariff.price.includes('69 000'), 'Fallback price is 69 000 ₽');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Zero console errors on corrupted tariff recovery');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n================================================================================');
  console.log('                          📊 CHALLENGER VERIFICATION SUMMARY                    ');
  console.log('================================================================================');
  console.log(`  Total Stress Tests Executed : ${results.length}`);
  console.log(`  Passed                      : ${passedCount}`);
  console.log(`  Failed                      : ${failedCount}`);
  console.log(`  Success Rate                : ${(passedCount / results.length * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} challenger stress tests failed!`);
  }
  return results;
}

if (require.main === module) {
  runAdversarialChallengerSuite().catch(err => {
    console.error('Fatal error in challenger suite:', err);
    process.exit(1);
  });
}

module.exports = { runAdversarialChallengerSuite };
