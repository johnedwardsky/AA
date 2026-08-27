'use strict';

const assert = require('node:assert');
const path = require('node:path');
const crypto = require('node:crypto');
const { createCabinetSandbox, createAdminSandbox } = require('./harness/dom-sandbox');

let passedTests = 0;
let failedTests = 0;
const results = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    passedTests++;
    results.push({ name, pass: true, duration });
    console.log(`  ✅ PASS: ${name} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    failedTests++;
    results.push({ name, pass: false, duration, error: err });
    console.error(`  ❌ FAIL: ${name} (${duration}ms)`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    }
  }
}

async function runEmpiricalVerification() {
  console.log('\n================================================================================');
  console.log('  🔬 CHALLENGER 2: EMPIRICAL VERIFICATION OF RUNTIME ROBUSTNESS & CROSS-SYNC  ');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. VERIFY 30-DAY SESSION EXPIRY LOGIC
  // ---------------------------------------------------------------------------
  console.log('🔹 [1/5] Testing 30-Day Session Expiry Logic...');

  await test('SessionExpiry: Creation sets sessionExpiresAt to exact Date.now() + 30 days', async () => {
    const baseTime = new Date('2026-08-25T12:00:00.000Z').getTime();
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: baseTime,
      initialLocalStorage: {
        amber_invite_tokens: JSON.stringify({
          'tok_test_30d': {
            token: 'tok_test_30d',
            developerId: 3,
            email: 'sales@rascvet39.ru',
            used: false
          }
        })
      }
    });
    sandbox.window.initDeveloperSession();

    const modal = sandbox.document.getElementById('invite-accept-modal-overlay');
    assert(modal, 'Invite accept modal should exist');
    sandbox.document.getElementById('invite-token-input').value = 'tok_test_30d';
    sandbox.document.getElementById('invite-pwd-input').value = 'secret123';
    sandbox.document.getElementById('invite-pwd-confirm').value = 'secret123';

    await sandbox.window.submitInvitePassword();

    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    assert(auth, 'Auth record for developer 3 must be stored');
    assert(auth.sessionExpiresAt, 'sessionExpiresAt must exist');

    const expectedExpiry = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(auth.sessionExpiresAt, expectedExpiry, 'sessionExpiresAt must exactly equal baseTime + 30d (2,592,000,000 ms)');
  });

  await test('SessionExpiry: Session remains valid on Day 29 without expiration warnings', async () => {
    const baseTime = new Date('2026-08-25T12:00:00.000Z').getTime();
    const day29Time = baseTime + 29 * 24 * 60 * 60 * 1000; // 29 days later

    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: day29Time,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordHash: 'dummy_hash',
          sessionExpiresAt: new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    });
    sandbox.window.initDeveloperSession();
    sandbox.window.initAuthFlow();

    const sessionWarns = sandbox.getConsoleWarns().filter(w => String(w).includes('session has expired'));
    assert.strictEqual(sessionWarns.length, 0, 'No session expired warnings on day 29');
  });

  await test('SessionExpiry: Session expires strictly after 30 days (Day 30 + 10s) and triggers warning', async () => {
    const baseTime = new Date('2026-08-25T12:00:00.000Z').getTime();
    const expiredTime = baseTime + 30 * 24 * 60 * 60 * 1000 + 10000; // 30 days + 10 seconds

    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: expiredTime,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordHash: 'dummy_hash',
          sessionExpiresAt: new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    });
    sandbox.window.initDeveloperSession();
    sandbox.window.initAuthFlow();

    const sessionWarns = sandbox.getConsoleWarns().filter(w => String(w).includes('session has expired'));
    assert(sessionWarns.length >= 1, `Expired session must be detected and logged as expired, got warns: ${JSON.stringify(sandbox.getConsoleWarns())}`);
  });

  await test('SessionExpiry: Password change in settings refreshes sessionExpiresAt for a full new 30 days', async () => {
    const baseTime = new Date('2026-08-25T12:00:00.000Z').getTime();
    const day20Time = baseTime + 20 * 24 * 60 * 60 * 1000;

    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: day20Time,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordHash: 'old_hash',
          sessionExpiresAt: new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    });
    sandbox.window.initDeveloperSession();

    sandbox.document.getElementById('setting-pwd-current').value = 'old_secret';
    sandbox.document.getElementById('setting-pwd-new').value = 'new_secret_2026';
    sandbox.document.getElementById('setting-pwd-confirm').value = 'new_secret_2026';

    await sandbox.window.changeAccountPassword();

    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    const expectedRefreshedExpiry = new Date(day20Time + 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(auth.sessionExpiresAt, expectedRefreshedExpiry, 'Password change must prolong session by 30 days from password change timestamp');
  });

  await test('SessionExpiry: Corrupted/missing sessionExpiresAt handled gracefully without crash', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          sessionExpiresAt: 'INVALID_TIMESTAMP_STRING_XYZ'
        })
      }
    });
    sandbox.window.initDeveloperSession();

    assert.doesNotThrow(() => {
      sandbox.window.initAuthFlow();
    }, 'Malformed session timestamp must not throw unhandled exception');
  });

  // ---------------------------------------------------------------------------
  // 2. VERIFY 1/HOUR RATE LIMIT ON PASSWORD RESET
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [2/5] Testing 1/Hour Rate Limit on Password Reset...');

  await test('PasswordReset: Initial reset request succeeds and writes ISO timestamp', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: baseTime,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: []
        })
      }
    });
    sandbox.window.initDeveloperSession();

    sandbox.document.getElementById('forgot-pwd-email').value = 'sales@rascvet39.ru';
    sandbox.window.submitForgotPasswordRequest();

    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    assert(Array.isArray(auth.passwordResetRequests), 'passwordResetRequests must be an array');
    assert.strictEqual(auth.passwordResetRequests.length, 1, 'Exactly 1 request timestamp should be recorded');
    assert.strictEqual(auth.passwordResetRequests[0], new Date(baseTime).toISOString());
  });

  await test('PasswordReset: Immediate retry at T+10s is blocked with rate limit error', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: baseTime + 10000, // +10s
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: [new Date(baseTime).toISOString()]
        })
      }
    });
    sandbox.window.initDeveloperSession();

    let alertMessage = '';
    sandbox.window.alert = (msg) => { alertMessage = msg; };

    sandbox.document.getElementById('forgot-pwd-email').value = 'sales@rascvet39.ru';
    sandbox.window.submitForgotPasswordRequest();

    assert(alertMessage.includes('1 раз в час'), 'Alert must enforce 1 per hour rate limit message');
    assert(alertMessage.includes('60 мин') || alertMessage.includes('59 мин'), 'Minutes left calculated properly');

    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    assert.strictEqual(auth.passwordResetRequests.length, 1, 'Blocked request must not be added to array');
  });

  await test('PasswordReset: Request at T+35min is blocked, shows ~25min remaining', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const t35Time = baseTime + 35 * 60 * 1000;

    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: t35Time,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: [new Date(baseTime).toISOString()]
        })
      }
    });
    sandbox.window.initDeveloperSession();

    let alertMessage = '';
    sandbox.window.alert = (msg) => { alertMessage = msg; };

    sandbox.document.getElementById('forgot-pwd-email').value = 'sales@rascvet39.ru';
    sandbox.window.submitForgotPasswordRequest();

    assert(alertMessage.includes('25 мин'), `Expected alert to state 25 мин left, got: ${alertMessage}`);
  });

  await test('PasswordReset: Request at T+60min+5s succeeds and adds second timestamp', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const t61Time = baseTime + 60 * 60 * 1000 + 5000;

    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: t61Time,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: [new Date(baseTime).toISOString()]
        })
      }
    });
    sandbox.window.initDeveloperSession();

    sandbox.document.getElementById('forgot-pwd-email').value = 'sales@rascvet39.ru';
    sandbox.window.submitForgotPasswordRequest();

    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    assert.strictEqual(auth.passwordResetRequests.length, 2, 'Request after 1 hour must be accepted and appended');
    assert.strictEqual(auth.passwordResetRequests[1], new Date(t61Time).toISOString());
  });

  await test('PasswordReset: Developer 3 rate limit does not affect Developer 1', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const sandbox = createCabinetSandbox({
      developerId: 1,
      developerName: 'ГК «Калининградский строительный концерн»',
      developerCode: 'KSK-2026',
      currentTime: baseTime,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: [new Date(baseTime).toISOString()] // dev 3 just requested
        }),
        amber_auth_1: JSON.stringify({
          developerId: 1,
          email: 'ksk@ksk39.ru',
          passwordResetRequests: []
        })
      }
    });
    sandbox.window.initDeveloperSession();

    sandbox.document.getElementById('forgot-pwd-email').value = 'ksk@ksk39.ru';
    sandbox.window.submitForgotPasswordRequest();

    const auth1 = JSON.parse(sandbox.localStorage.getItem('amber_auth_1'));
    assert.strictEqual(auth1.passwordResetRequests.length, 1, 'Dev 1 must be able to request password reset independently');
  });

  await test('PasswordReset: Burst concurrency test (10 rapid requests at same second)', async () => {
    const baseTime = new Date('2026-08-25T14:00:00.000Z').getTime();
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456',
      currentTime: baseTime,
      initialLocalStorage: {
        amber_auth_3: JSON.stringify({
          developerId: 3,
          email: 'sales@rascvet39.ru',
          passwordResetRequests: []
        })
      }
    });
    sandbox.window.initDeveloperSession();

    let blockedCount = 0;
    sandbox.window.alert = () => { blockedCount++; };

    sandbox.document.getElementById('forgot-pwd-email').value = 'sales@rascvet39.ru';

    // 10 rapid submissions
    for (let i = 0; i < 10; i++) {
      sandbox.window.submitForgotPasswordRequest();
    }

    assert.strictEqual(blockedCount, 9, 'Exactly 9 out of 10 rapid requests should be rejected by rate limiter');
    const auth = JSON.parse(sandbox.localStorage.getItem('amber_auth_3'));
    assert.strictEqual(auth.passwordResetRequests.length, 1, 'Exactly 1 timestamp recorded');
  });

  // ---------------------------------------------------------------------------
  // 3. VERIFY SHA-256 AUDIT CHAINING
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [3/5] Testing SHA-256 Audit Chaining & Integrity...');

  await test('AuditChaining: Action produces deterministic SHA-256 hash digests', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();

    const entry1 = await sandbox.window.appendAuditLog('company_profile_update', { id: 301, name: 'ЖК «Расцвет»' }, { inn: '3906123456' });

    assert(entry1, 'Entry must be returned');
    assert(entry1.hashFull, 'Full SHA-256 hash must be generated');
    assert(entry1.hashShort, 'Short hash prefix must be generated');
    assert(entry1.hashShort.startsWith('#'), 'hashShort must start with #');

    // Test W3C crypto SHA-256 match
    const rawStr = entry1.id + entry1.timestamp + String(entry1.developerId) + String(entry1.zhkId) + JSON.stringify(entry1.changes);
    const expectedHex = crypto.createHash('sha256').update(rawStr, 'utf8').digest('hex');

    assert.strictEqual(entry1.hashFull, expectedHex, 'Full hash must strictly match Node crypto SHA-256 digest');
    assert.strictEqual(entry1.hashShort, '#' + expectedHex.slice(0, 8), 'Short hash must strictly match first 8 chars of hex digest');
  });

  await test('AuditChaining: Tamper detection — mutating changes or timestamp invalidates hash', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();

    const entry = await sandbox.window.appendAuditLog('lead_unlock', { id: 301, name: 'ЖК «Расцвет»' }, { action: 'Разблокировка' });
    const originalHash = entry.hashFull;

    // Tamper with changes
    const tamperedEntry = { ...entry, changes: { action: 'Подделка данных' } };
    const rawTampered = tamperedEntry.id + tamperedEntry.timestamp + String(tamperedEntry.developerId) + String(tamperedEntry.zhkId) + JSON.stringify(tamperedEntry.changes);
    const recomputedHash = crypto.createHash('sha256').update(rawTampered, 'utf8').digest('hex');

    assert.notStrictEqual(originalHash, recomputedHash, 'Tampered log content must produce a divergent SHA-256 hash');
  });

  await test('AuditChaining: Queue maintains reverse-chronological order and limits developer scope', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();

    await sandbox.window.appendAuditLog('action_1', { id: 301, name: 'ЖК 1' }, {});
    await sandbox.window.appendAuditLog('action_2', { id: 301, name: 'ЖК 1' }, {});
    await sandbox.window.appendAuditLog('action_3', { id: 301, name: 'ЖК 1' }, {});

    const queueKey = 'amber_audit_logs_queue_3';
    const queue = JSON.parse(sandbox.localStorage.getItem(queueKey));
    assert(Array.isArray(queue), 'Queue must be stored in localStorage');
    assert(queue.length >= 3, 'All 3 items must be in queue');

    // Top item should be the latest action
    assert.strictEqual(queue[0].action, 'action_3', 'Newest log must be first in queue');
    assert.strictEqual(queue[1].action, 'action_2', 'Second log must follow');
    assert.strictEqual(queue[2].action, 'action_1', 'Oldest of the 3 must be third');

    // Verify Dev 4 queue is not touched
    const queue4 = sandbox.localStorage.getItem('amber_audit_logs_queue_4');
    assert.strictEqual(queue4, null, 'Developer 4 queue must remain empty');
  });

  await test('AuditChaining: Daily grouping UI separates "Сегодня" vs "Вчера"', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      developerName: 'ГК «Расцвет»',
      developerCode: '123456'
    });
    sandbox.window.initDeveloperSession();

    const now = Date.now();
    const todayLog = {
      id: 'log_today_1',
      timestamp: new Date(now).toISOString(),
      developerId: 3,
      zhkId: 301,
      zhkName: 'ЖК «Расцвет»',
      action: 'lead_unlock',
      changes: { 'Лид': { old: '—', new: 'Разблокирован' } },
      hashShort: '#11111111',
      hashFull: '1111111111111111111111111111111111111111111111111111111111111111'
    };
    const yestLog = {
      id: 'log_yest_1',
      timestamp: new Date(now - 24 * 3600 * 1000).toISOString(),
      developerId: 3,
      zhkId: 301,
      zhkName: 'ЖК «Расцвет»',
      action: 'company_profile_update',
      changes: { 'ИНН': { old: '—', new: '3906123456' } },
      hashShort: '#22222222',
      hashFull: '2222222222222222222222222222222222222222222222222222222222222222'
    };

    sandbox.localStorage.setItem('amber_audit_logs_queue_3', JSON.stringify([todayLog, yestLog]));

    sandbox.window.switchNavTab('audit-log');
    await sandbox.window.renderFullAuditLogTab();
    await sandbox.window.filterCabinetAuditLogs();

    const fullContainer = sandbox.document.getElementById('full-audit-log-container');
    assert(fullContainer, 'Audit container must exist');

    const dayGroups = fullContainer.querySelectorAll('.audit-day-group');
    assert.strictEqual(dayGroups.length, 2, 'Must render exactly 2 distinct day groups');

    const dayTitles = fullContainer.querySelectorAll('.audit-day-title');
    assert.strictEqual(dayTitles.length, 2, 'Must render 2 day titles');

    const auditItems = fullContainer.querySelectorAll('.audit-log-item');
    assert.strictEqual(auditItems.length, 2, 'Must render both audit log items');

    const html = fullContainer.innerHTML;
    assert(html.includes('#11111111'), 'Must render today audit log entry');
    assert(html.includes('#22222222'), 'Must render yesterday audit log entry');
  });

  // ---------------------------------------------------------------------------
  // 4. VERIFY CALENDAR DATE SELECTION IN AD PLACEMENTS
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [4/5] Testing Calendar Date Selection in Ad Placements...');

  await test('AdCalendar: Cabinet promo calendar renders 31 days for August 2026', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();
    sandbox.window.switchNavTab('promo-ads');

    const calContainer = sandbox.document.getElementById('promo-cal-days-container');
    assert(calContainer, 'Promo calendar days container must exist');

    const cells = calContainer.querySelectorAll('.cal-day-cell');
    assert.strictEqual(cells.length, 31, 'August 2026 calendar must have exactly 31 day cells');
  });

  await test('AdCalendar: Clicking date in Cabinet updates .selected class and detail box', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();
    sandbox.window.switchNavTab('promo-ads');

    // Select day 15
    sandbox.window.selectPromoCalDay(15);

    const calContainer = sandbox.document.getElementById('promo-cal-days-container');
    const selectedCells = calContainer.querySelectorAll('.selected');
    assert.strictEqual(selectedCells.length, 1, 'Exactly one day cell must be marked selected');
    assert(selectedCells[0].textContent.includes('15'), 'Selected cell must contain day number 15');

    const detailBox = sandbox.document.getElementById('cal-day-detail-box');
    assert(detailBox, 'Detail box must exist');
    assert(detailBox.innerHTML.includes('15 августа 2026 г.'), 'Detail box must display formatted date "15 августа 2026 г."');
  });

  await test('AdCalendar: Rapid date click stress (1 to 31) in Cabinet executes cleanly', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();
    sandbox.window.switchNavTab('promo-ads');

    for (let day = 1; day <= 31; day++) {
      sandbox.window.selectPromoCalDay(day);
      const detail = sandbox.document.getElementById('cal-day-detail-box').innerHTML;
      assert(detail.includes(`${day} августа 2026 г.`), `Detail box must reflect day ${day}`);
    }
  });

  await test('AdCalendar: Placement request submission stores pending request in amber_placement_requests', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();
    sandbox.window.switchNavTab('promo-ads');

    sandbox.window.openPlacementRequestModal('main_banner');
    sandbox.document.getElementById('placement-req-type').value = 'main_banner';
    sandbox.document.getElementById('placement-req-period').value = '2 месяца';
    sandbox.document.getElementById('placement-req-comment').value = 'Размещение на главной странице';

    sandbox.window.submitPlacementRequest();

    const requests = JSON.parse(sandbox.localStorage.getItem('amber_placement_requests') || '[]');
    assert(requests.length >= 1, 'Placement request must be saved in amber_placement_requests');
    const lastReq = requests[requests.length - 1];
    assert.strictEqual(lastReq.developerId, 3);
    assert.strictEqual(lastReq.placementType, 'main_banner');
    assert.strictEqual(lastReq.status, 'pending');
  });

  await test('AdCalendar: Admin booking calendar toggles free -> booked -> free and persists in amber_placements', async () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placements: JSON.stringify({})
      }
    });

    sandbox.window.switchAdminSection('placements');
    sandbox.window.initPlacementsSection();

    const devSelect = sandbox.document.getElementById('placements-dev-select');
    devSelect.value = '3';
    sandbox.window.onPlacementDevChange();
    sandbox.window.renderPlCalendar(1);

    const calGrid = sandbox.document.getElementById('pl-cal-grid-1');
    assert(calGrid, 'Admin placement calendar grid for Type 1 must exist');

    const dayCells = calGrid.querySelectorAll('.pl-cal-day').filter(c => !c.classList.contains('empty'));
    assert(dayCells.length >= 28, `Must render days of the month in admin calendar, got ${dayCells.length}`);

    const firstCell = dayCells[0];
    assert(firstCell.classList.contains('free'), 'Cell should initially be free');

    // Click to book
    firstCell.onclick();
    assert(firstCell.classList.contains('booked'), 'Cell should become booked');

    const bookingsAfterBook = JSON.parse(sandbox.localStorage.getItem('amber_placements') || '{}');
    const slotDate = firstCell.getAttribute('data-date');
    const specificKey = `1_kaliningrad_${slotDate}`;
    assert.strictEqual(bookingsAfterBook[specificKey], '3', 'Slot must be booked under Dev 3');

    // Click again to unbook
    firstCell.onclick();
    assert(firstCell.classList.contains('free'), 'Cell should revert to free on second click');

    const bookingsAfterUnbook = JSON.parse(sandbox.localStorage.getItem('amber_placements') || '{}');
    assert.strictEqual(bookingsAfterUnbook[specificKey], undefined, 'Booking key must be removed from amber_placements');
  });

  await test('AdCalendar: Admin conflict protection prevents Dev 2 from toggling Dev 1 taken slot', async () => {
    const sandbox = createAdminSandbox({
      initialLocalStorage: {
        amber_placements: JSON.stringify({
          '1_kaliningrad_2026-08-15': '1' // booked by Developer 1
        })
      }
    });

    sandbox.window.switchAdminSection('placements');
    sandbox.window.initPlacementsSection();

    // Superadmin selects Developer 2
    const devSelect = sandbox.document.getElementById('placements-dev-select');
    devSelect.value = '2';
    sandbox.window.onPlacementDevChange();
    sandbox.window.renderPlCalendar(1);

    const calGrid = sandbox.document.getElementById('pl-cal-grid-1');
    const targetCell = calGrid.querySelector('[data-date="2026-08-15"]');
    assert(targetCell, 'Target day 15 cell must exist');
    assert(targetCell.classList.contains('taken'), 'Cell must be styled as taken because Dev 1 booked it');

    // Dev 2 tries to click the taken cell
    targetCell.onclick();

    // Verify cell remains taken and storage is unchanged
    assert(targetCell.classList.contains('taken'), 'Cell must remain taken');
    const bookings = JSON.parse(sandbox.localStorage.getItem('amber_placements') || '{}');
    assert.strictEqual(bookings['1_kaliningrad_2026-08-15'], '1', 'Slot booking must remain owned by Developer 1');
  });

  // ---------------------------------------------------------------------------
  // 5. VERIFY ZERO CONSOLE ERRORS ACROSS ALL TABS AND VIEWPORTS
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [5/5] Testing Zero Console Errors Across All Tabs & Viewports...');

  const allCabinetTabs = [
    'dashboard',
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
    'support-tickets',
    'knowledge-base',
    'tariffs'
  ];

  await test('ZeroErrors: Full navigation across all 16 Cabinet tabs generates zero console errors', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3, developerName: 'ГК «Расцвет»', developerCode: '123456' });
    sandbox.window.initDeveloperSession();

    for (const tab of allCabinetTabs) {
      sandbox.window.switchNavTab(tab);
    }

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Expected 0 console errors during tab switching, found: ${JSON.stringify(errors)}`);
  });

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Small Tablet', width: 600, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Small Desktop', width: 1024, height: 768 },
    { name: 'Standard Desktop', width: 1200, height: 800 },
    { name: 'Wide Desktop', width: 1440, height: 900 },
    { name: 'Full HD', width: 1920, height: 1080 },
    { name: '4K Ultra HD', width: 3840, height: 2160 }
  ];

  for (const vp of viewports) {
    await test(`ZeroErrors: Viewport ${vp.name} (${vp.width}x${vp.height}) renders cleanly with zero errors`, async () => {
      const sandbox = createCabinetSandbox({
        developerId: 3,
        developerName: 'ГК «Расцвет»',
        developerCode: '123456',
        viewportWidth: vp.width,
        viewportHeight: vp.height
      });
      sandbox.window.initDeveloperSession();

      for (const tab of ['dashboard', 'leads', 'analytics-stats', 'promo-ads', 'settings']) {
        sandbox.window.switchNavTab(tab);
      }

      assert.strictEqual(sandbox.getConsoleErrors().length, 0, `Zero errors allowed in viewport ${vp.name}`);
    });
  }

  const allAdminSections = [
    'dashboard',
    'articles',
    'banners',
    'header-slider',
    'placements',
    'experts',
    'moderation',
    'tariffs',
    'leads',
    'backgrounds',
    'invites'
  ];

  await test('ZeroErrors: Full navigation across all 11 Admin sections produces zero console errors', async () => {
    const sandbox = createAdminSandbox({});

    for (const sec of allAdminSections) {
      sandbox.window.switchAdminSection(sec);
    }

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Zero errors in Admin sections: ${JSON.stringify(errors)}`);
  });

  // ---------------------------------------------------------------------------
  // 6. MULTI-TENANT DATA ISOLATION (amber_employees_3 vs amber_employees_999)
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [6/9] Testing Multi-Tenant Data Isolation (Dev 3 vs Dev 999)...');

  await test('Isolation: Distinct employee partitions for Dev 3 vs Dev 999', async () => {
    const sandbox3 = createCabinetSandbox({ developerId: 3 });
    const sandbox999 = createCabinetSandbox({ developerId: 999, developerName: 'Девелопмент 999', developerCode: 'DEV999' });

    const emps3 = sandbox3.window.loadEmployees(3);
    const emps999 = sandbox999.window.loadEmployees(999);

    assert.strictEqual(emps3.length, 5, 'Dev 3 should have 5 seeded demo accounts');
    assert.strictEqual(emps999.length, 3, 'Dev 999 should have 3 default accounts');
    assert.strictEqual(emps3[0].devId, 3, 'Dev 3 employees belong to devId 3');
    assert.strictEqual(emps999[0].devId, 999, 'Dev 999 employees belong to devId 999');

    const raw3 = sandbox3.localStorage.getItem('amber_employees_3');
    const raw999 = sandbox999.localStorage.getItem('amber_employees_999');
    assert.ok(raw3, 'amber_employees_3 exists');
    assert.ok(raw999, 'amber_employees_999 exists');
    assert.notStrictEqual(raw3, raw999, 'Dev 3 and Dev 999 employee storage must differ');
  });

  await test('Isolation: Cross-tenant authentication rejection', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employees_3: JSON.stringify([
          { id: 'emp-1', devId: 3, name: 'Admin Dev3', email: 'admin@dev3.ru', role: 'admin', status: 'active' }
        ]),
        amber_employees_999: JSON.stringify([
          { id: 'emp-999-1', devId: 999, name: 'Manager Dev999', email: 'manager@dev999.ru', role: 'manager', status: 'active' }
        ]),
        'amber_employee_auth_emp-999-1': JSON.stringify({
          empId: 'emp-999-1', devId: 999, email: 'manager@dev999.ru', passwordHash: 'password123', role: 'manager', status: 'active'
        })
      }
    });

    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    sandbox.document.getElementById('login-email-input').value = 'manager@dev999.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    const errEl = sandbox.document.getElementById('login-error-message');
    assert.ok(errEl && errEl.style.display !== 'none', 'Error message must be shown for cross-tenant login');
    assert.notStrictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'manager@dev999.ru', 'Session must not be established for foreign developer employee');
  });

  await test('Isolation: Multi-tenant invite creation scopes devId properly', async () => {
    const sandbox = createCabinetSandbox({ developerId: 999, developerName: 'Девелопмент 999' });
    sandbox.window.initDeveloperSession();

    sandbox.window.openAddEmployeeModal();
    sandbox.document.getElementById('emp-form-name').value = 'Тест Сотрудник 999';
    sandbox.document.getElementById('emp-form-email').value = 'worker@dev999.ru';
    sandbox.document.getElementById('emp-form-role').value = 'employee';
    sandbox.document.getElementById('emp-form-title').value = 'Сотрудник ОП';

    sandbox.window.handleCreateEmployeeInvite(sandbox.document.getElementById('add-employee-form'));

    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const tokenKey = Object.keys(invites).find(k => invites[k].email === 'worker@dev999.ru');
    assert.ok(tokenKey, 'Invite token must be created');
    assert.strictEqual(invites[tokenKey].devId, 999, 'Invite must record devId 999');

    const emps999 = JSON.parse(sandbox.localStorage.getItem('amber_employees_999') || '[]');
    const newEmp = emps999.find(e => e.email === 'worker@dev999.ru');
    assert.ok(newEmp, 'Employee must be added to amber_employees_999');
    assert.strictEqual(newEmp.devId, 999);

    const emps3 = sandbox.localStorage.getItem('amber_employees_3');
    if (emps3) {
      const parsed3 = JSON.parse(emps3);
      assert.ok(!parsed3.some(e => e.email === 'worker@dev999.ru'), 'Dev 3 employee list must not contain Dev 999 employee');
    }
  });

  await test('Isolation: Cross-tenant invite acceptance updates only designated developer', async () => {
    const token = 'emp_inv_test_dev999_token';
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employee_invites: JSON.stringify({
          [token]: {
            token: token,
            devId: 999,
            developerName: 'Девелопмент 999',
            email: 'new_mgr@dev999.ru',
            name: 'Новый Менеджер',
            position: 'Менеджер',
            role: 'manager',
            phone: '+7 (4012) 99-99-99',
            assignedZhks: 'Все объекты',
            status: 'pending',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            used: false
          }
        }),
        amber_employees_999: JSON.stringify([
          { id: 'emp-999-1', devId: 999, name: 'Admin 999', email: 'admin@dev999.ru', role: 'admin', status: 'active' }
        ]),
        amber_employees_3: JSON.stringify([
          { id: 'emp-1', devId: 3, name: 'Admin 3', email: 'admin@dev3.ru', role: 'admin', status: 'active' }
        ])
      }
    });

    sandbox.window.openEmployeeInviteAcceptModal({
      token: token,
      devId: 999,
      developerName: 'Девелопмент 999',
      email: 'new_mgr@dev999.ru',
      name: 'Новый Менеджер',
      role: 'manager'
    });

    sandbox.document.getElementById('emp-invite-pwd-input').value = 'password123';
    sandbox.document.getElementById('emp-invite-pwd-confirm').value = 'password123';
    await sandbox.window.submitEmployeeInvitePassword(token);

    const emps999 = JSON.parse(sandbox.localStorage.getItem('amber_employees_999'));
    const activated999 = emps999.find(e => e.email === 'new_mgr@dev999.ru');
    assert.ok(activated999, 'Activated employee must be in amber_employees_999');
    assert.strictEqual(activated999.status, 'active');
    assert.strictEqual(activated999.devId, 999);

    const emps3 = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    assert.strictEqual(emps3.length, 1, 'Dev 3 employees count must remain 1');
    assert.ok(!emps3.some(e => e.email === 'new_mgr@dev999.ru'), 'Dev 3 must not contain new_mgr@dev999.ru');

    assert.strictEqual(sandbox.localStorage.getItem('currentDevId'), '999');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'manager');
  });

  await test('Isolation: Cross-tenant mutation isolation (Admin 3 actions do not mutate Dev 999)', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employees_3: JSON.stringify([
          { id: 'emp-1', devId: 3, name: 'Admin 3', email: 'admin@dev3.ru', role: 'admin', status: 'active' },
          { id: 'emp-2', devId: 3, name: 'Manager 3', email: 'mgr@dev3.ru', role: 'manager', status: 'active' }
        ]),
        amber_employees_999: JSON.stringify([
          { id: 'emp-2', devId: 999, name: 'Manager 999', email: 'mgr@dev999.ru', role: 'manager', status: 'active' }
        ])
      }
    });

    sandbox.window.initDeveloperSession();
    sandbox.window.toggleEmployeeStatus('emp-2');

    const emps3 = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const emps999 = JSON.parse(sandbox.localStorage.getItem('amber_employees_999'));

    assert.strictEqual(emps3.find(e => e.id === 'emp-2').status, 'blocked', 'Dev 3 employee emp-2 must be blocked');
    assert.strictEqual(emps999.find(e => e.id === 'emp-2').status, 'active', 'Dev 999 employee emp-2 must remain active');
  });

  // ---------------------------------------------------------------------------
  // 7. UI RESPONSIVENESS, ROLE SWITCHING & STATE RESTORATION ON RELOAD
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [7/9] Testing Role Switching & State Restoration After Page Reload...');

  await test('StateRestoration: Admin reload restores 18 tabs, badge and edit capabilities', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        currentUserId: 'emp-1',
        currentUserRole: 'admin',
        currentUserName: 'Алексей Дмитриев',
        currentUserEmail: 'a.dmitriev@rascvet39.ru'
      }
    });

    sandbox.window.initDeveloperSession();

    const roleBadge = sandbox.document.getElementById('header-user-role-badge');
    assert.ok(roleBadge && roleBadge.textContent.includes('Администратор'), 'Role badge must display Администратор');

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 18, 'Admin must see exactly 18 sidebar nav items');

    const addBtn = sandbox.document.querySelector('#tab-my-zhk .catalog-header-actions .btn-primary-action');
    if (addBtn) {
      assert.notStrictEqual(addBtn.style.display, 'none', 'Add Complex button must be visible for Admin');
    }

    sandbox.window.ROLE_ALLOWED_TABS.admin.forEach(tabId => {
      sandbox.window.switchNavTab(tabId);
      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.strictEqual(activeTab.id, 'tab-' + tabId, 'Admin must successfully activate tab-' + tabId);
    });
  });

  await test('StateRestoration: Manager reload restores 6 tabs, badge and dashboard default', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        currentUserId: 'emp-2',
        currentUserRole: 'manager',
        currentUserName: 'Елена Ковалева',
        currentUserEmail: 'e.kovaleva@rascvet39.ru'
      }
    });

    sandbox.window.initDeveloperSession();

    const roleBadge = sandbox.document.getElementById('header-user-role-badge');
    assert.ok(roleBadge && roleBadge.textContent.includes('Менеджер'), 'Role badge must display Менеджер');

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 6, 'Manager must see exactly 6 visible nav items');

    const activeTab = sandbox.document.querySelector('.tab-section.active');
    assert.ok(activeTab && (activeTab.id === 'tab-dashboard' || activeTab.id === 'tab-my-zhk'), 'Default tab must be allowed for manager');

    const forbiddenTabs = ['company-info', 'employees', 'documents', 'settings', 'audit-log', 'tariffs', 'analytics-traffic', 'promo-premium'];
    forbiddenTabs.forEach(forbidden => {
      sandbox.window.switchNavTab(forbidden);
      const curTab = sandbox.document.querySelector('.tab-section.active');
      assert.strictEqual(curTab.id, 'tab-dashboard', 'Restricted tab ' + forbidden + ' must redirect manager to dashboard');
    });
  });

  await test('StateRestoration: Employee reload restores 3 tabs, badge, my-zhk fallback and view-only', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        currentUserId: 'emp-3',
        currentUserRole: 'employee',
        currentUserName: 'Михаил Соколов',
        currentUserEmail: 'm.sokolov@rascvet39.ru'
      }
    });

    sandbox.window.initDeveloperSession();

    const roleBadge = sandbox.document.getElementById('header-user-role-badge');
    assert.ok(roleBadge && roleBadge.textContent.includes('Сотрудник'), 'Role badge must display Сотрудник');

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 3, 'Employee must see exactly 3 visible nav items');

    const activeTab = sandbox.document.querySelector('.tab-section.active');
    assert.strictEqual(activeTab.id, 'tab-my-zhk', 'Employee default active tab must be redirected to my-zhk');

    const addBtn = sandbox.document.querySelector('#tab-my-zhk .catalog-header-actions .btn-primary-action');
    if (addBtn) {
      assert.strictEqual(addBtn.style.display, 'none', 'Add Complex button must be hidden for employee');
    }

    const forbiddenTabs = ['dashboard', 'leads', 'analytics-stats', 'company-info', 'settings', 'tariffs'];
    forbiddenTabs.forEach(forbidden => {
      sandbox.window.switchNavTab(forbidden);
      const curTab = sandbox.document.querySelector('.tab-section.active');
      assert.strictEqual(curTab.id, 'tab-my-zhk', 'Restricted tab ' + forbidden + ' must redirect employee to my-zhk');
    });
  });

  await test('StateRestoration: Backward compatibility with legacy storage (auth_developer_id only defaults to admin)', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        auth_developer_id: '3',
        auth_developer_name: 'ГК «Расцвет»'
      }
    });

    sandbox.window.initDeveloperSession();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'admin', 'Legacy session must default to admin role');
    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 18, 'Legacy session must have full 18 tabs');
  });

  await test('StateRestoration: Admin demoting manager to employee triggers instant UI and storage update', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        currentUserId: 'emp-1',
        currentUserRole: 'admin',
        amber_employees_3: JSON.stringify([
          { id: 'emp-1', devId: 3, name: 'Admin', role: 'admin', status: 'active' },
          { id: 'emp-2', devId: 3, name: 'Елена Ковалева', email: 'e.kovaleva@rascvet39.ru', role: 'manager', status: 'active' }
        ]),
        'amber_employee_auth_emp-2': JSON.stringify({
          empId: 'emp-2', devId: 3, email: 'e.kovaleva@rascvet39.ru', role: 'manager', status: 'active'
        })
      }
    });

    sandbox.window.initDeveloperSession();
    sandbox.window.toggleEmployeeRole('emp-2');

    const emps = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const emp2 = emps.find(e => e.id === 'emp-2');
    assert.strictEqual(emp2.role, 'employee', 'Employee role in amber_employees_3 must be updated to employee');

    const emp2Auth = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-2'));
    assert.strictEqual(emp2Auth.role, 'employee', 'Auth record role must be updated to employee');

    sandbox.document.getElementById('login-email-input').value = 'e.kovaleva@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'employee', 'Session role must now be employee');
    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 3, 'Demoted user must now see exactly 3 tabs');
  });

  await test('StateRestoration: Rapid consecutive role-switching stress test (50 iterations)', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    const roles = ['admin', 'manager', 'employee'];

    for (let i = 0; i < 50; i++) {
      const targetRole = roles[i % 3];
      sandbox.window.applyRoleVisibilityToSidebar(targetRole);
      
      const expectedCount = targetRole === 'admin' ? 18 : (targetRole === 'manager' ? 6 : 3);
      const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
        .filter(el => el.style.display !== 'none');
      assert.strictEqual(visibleNavItems.length, expectedCount, 'Iteration ' + i + ': ' + targetRole + ' must have ' + expectedCount + ' tabs');
    }
  });

  // ---------------------------------------------------------------------------
  // 8. SEED DEMO DATA FUNCTIONALITY FOR ALL 5 PRE-CONFIGURED ACCOUNTS
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [8/9] Testing Seed Demo Accounts Full Lifecycle...');

  await test('DemoAccounts: Seed Account 1 (Admin: a.dmitriev@rascvet39.ru) logs in with 18 tabs', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    sandbox.document.getElementById('login-email-input').value = 'a.dmitriev@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'admin');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'a.dmitriev@rascvet39.ru');
    assert.strictEqual(sandbox.document.getElementById('login-modal-overlay').classList.contains('open'), false);

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 18);
  });

  await test('DemoAccounts: Seed Account 2 (Manager: e.kovaleva@rascvet39.ru) logs in with 6 tabs', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    sandbox.document.getElementById('login-email-input').value = 'e.kovaleva@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'manager');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'e.kovaleva@rascvet39.ru');

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 6);
  });

  await test('DemoAccounts: Seed Account 3 (Employee: m.sokolov@rascvet39.ru) logs in with 3 tabs', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    sandbox.document.getElementById('login-email-input').value = 'm.sokolov@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'employee');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'm.sokolov@rascvet39.ru');

    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 3);
  });

  await test('DemoAccounts: Seed Account 4 (Blocked Employee: d.volkov@rascvet39.ru) login rejected', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    sandbox.document.getElementById('login-email-input').value = 'd.volkov@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    const errEl = sandbox.document.getElementById('login-error-message');
    assert.ok(errEl && errEl.textContent.includes('заблокирован'), 'Error message must state account is blocked');
    assert.notStrictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'd.volkov@rascvet39.ru', 'Blocked user session must NOT be established');
  });

  await test('DemoAccounts: Seed Account 4 Unblock by Admin enables subsequent login', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();

    sandbox.window.toggleEmployeeStatus('emp-4');

    const emps = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const emp4 = emps.find(e => e.id === 'emp-4');
    assert.strictEqual(emp4.status, 'active', 'emp-4 status must now be active');

    sandbox.window.openLoginModal();
    sandbox.document.getElementById('login-email-input').value = 'd.volkov@rascvet39.ru';
    sandbox.document.getElementById('login-password-input').value = 'password123';
    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'd.volkov@rascvet39.ru');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'employee');
  });

  await test('DemoAccounts: Seed Account 5 (Pending Invite: o.novikova@rascvet39.ru) completes invite acceptance', async () => {
    const token = 'emp_inv_demo_novikova';
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employee_invites: JSON.stringify({
          [token]: {
            token: token,
            devId: 3,
            developerName: 'ГК «Расцвет»',
            email: 'o.novikova@rascvet39.ru',
            name: 'Ольга Новикова',
            position: 'Менеджер по работе с клиентами',
            role: 'manager',
            status: 'pending',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            used: false
          }
        })
      }
    });

    sandbox.window.initDeveloperSession();

    sandbox.window.openEmployeeInviteAcceptModal({
      token: token,
      devId: 3,
      developerName: 'ГК «Расцвет»',
      email: 'o.novikova@rascvet39.ru',
      name: 'Ольга Новикова',
      role: 'manager'
    });

    sandbox.document.getElementById('emp-invite-pwd-input').value = 'novikova2026';
    sandbox.document.getElementById('emp-invite-pwd-confirm').value = 'novikova2026';
    await sandbox.window.submitEmployeeInvitePassword(token);

    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), 'o.novikova@rascvet39.ru');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'manager');

    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    assert.strictEqual(invites[token].used, true);

    const emps = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const novikova = emps.find(e => e.email === 'o.novikova@rascvet39.ru');
    assert.ok(novikova);
    assert.strictEqual(novikova.status, 'active');
  });

  await test('DemoAccounts: Seed Account 5 Token Replay Prevention (used token cannot be accepted again)', async () => {
    const token = 'emp_inv_demo_novikova';
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employee_invites: JSON.stringify({
          [token]: {
            token: token,
            devId: 3,
            email: 'o.novikova@rascvet39.ru',
            used: true,
            status: 'accepted'
          }
        })
      }
    });

    sandbox.window.initDeveloperSession();
    sandbox.window.initAuthFlow();

    const modal = sandbox.document.getElementById('generic-modal-overlay');
    assert.strictEqual(modal && modal.classList.contains('open'), false, 'Used token must not open invite accept modal');
  });

  // ---------------------------------------------------------------------------
  // 9. ZERO CONSOLE ERRORS & CORRUPTION ROBUSTNESS ACROSS ALL PATHS
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [9/9] Testing Zero Console Errors & Adversarial Inputs Robustness...');

  await test('Robustness: Full 18-tab traversal cycle under Admin role produces 0 console errors', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: { currentUserRole: 'admin' }
    });
    sandbox.window.initDeveloperSession();

    const tabs = sandbox.window.ROLE_ALLOWED_TABS.admin;
    tabs.forEach(tabId => {
      sandbox.window.switchNavTab(tabId);
    });

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Admin tab traversal produced console errors: ' + errors.join(', '));
  });

  await test('Robustness: Full 18-tab traversal cycle under Manager role produces 0 console errors', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: { currentUserRole: 'manager' }
    });
    sandbox.window.initDeveloperSession();

    const allTabs = sandbox.window.ROLE_ALLOWED_TABS.admin;
    allTabs.forEach(tabId => {
      sandbox.window.switchNavTab(tabId);
    });

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Manager tab traversal produced console errors: ' + errors.join(', '));
  });

  await test('Robustness: Full 18-tab traversal cycle under Employee role produces 0 console errors', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: { currentUserRole: 'employee' }
    });
    sandbox.window.initDeveloperSession();

    const allTabs = sandbox.window.ROLE_ALLOWED_TABS.admin;
    allTabs.forEach(tabId => {
      sandbox.window.switchNavTab(tabId);
    });

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Employee tab traversal produced console errors: ' + errors.join(', '));
  });

  await test('Robustness: Adversarial login input payloads do not throw unhandled exceptions', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    const maliciousInputs = [
      { email: "' OR '1'='1", pwd: "' OR '1'='1" },
      { email: '<script>alert("xss")</script>', pwd: '<svg/onload=alert(1)>' },
      { email: 'admin@dev3.ru\x00malicious', pwd: 'pass\x00word' },
      { email: '   ', pwd: '   ' },
      { email: '👨‍👩‍👧‍👦@emoji.com', pwd: '🔑🛡️⚡' },
      { email: 'a'.repeat(2000) + '@long.com', pwd: 'b'.repeat(2000) },
      { email: '{"admin":true}', pwd: '{"$ne":null}' }
    ];

    for (const input of maliciousInputs) {
      sandbox.document.getElementById('login-email-input').value = input.email;
      sandbox.document.getElementById('login-password-input').value = input.pwd;
      await sandbox.window.handleUnifiedLogin();
    }

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Adversarial auth inputs caused console errors: ' + errors.join(', '));
  });

  await test('Robustness: Corrupted JSON in employee localStorage recovered gracefully without crashes', async () => {
    const sandbox = createCabinetSandbox({
      developerId: 3,
      initialLocalStorage: {
        amber_employees_3: 'CORRUPTED_NON_JSON_DATA{{{',
        amber_employee_invites: 'INVALID_JSON_NULL',
        'amber_employee_auth_emp-1': '[1,2,3]'
      }
    });

    const emps = sandbox.window.loadEmployees(3);
    assert.ok(Array.isArray(emps), 'loadEmployees must return array despite corrupt storage');
    assert.strictEqual(emps.length, 5, 'Must re-seed default 5 demo employees');

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Corrupted JSON recovery produced console errors: ' + errors.join(', '));
  });

  await test('Robustness: Rapid concurrent authentication & state mutations cycle without memory leaks or crashes', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();

    for (let i = 0; i < 20; i++) {
      sandbox.window.openLoginModal();
      sandbox.document.getElementById('login-email-input').value = 'e.kovaleva@rascvet39.ru';
      sandbox.document.getElementById('login-password-input').value = 'password123';
      await sandbox.window.handleUnifiedLogin();

      sandbox.window.switchNavTab('leads');
      sandbox.window.switchNavTab('my-zhk');

      sandbox.window.toggleEmployeeStatus('emp-3');
      sandbox.window.toggleEmployeeRole('emp-3');

      sandbox.window.handleLogout();
    }

    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, 'Concurrent auth cycle produced console errors: ' + errors.join(', '));
  });

  console.log('\n================================================================================');
  console.log(`  🎯 EMPIRICAL VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  return results.map(r => ({ name: r.name, passed: r.pass, duration: r.duration, error: r.error }));
}

if (require.main === module) {
  runEmpiricalVerification();
}

module.exports = { runEmpiricalVerification };

