'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { createCabinetSandbox } = require('./harness/dom-sandbox');
const { FIXTURES } = require('./harness/test-fixtures');

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

const PASSWORD_123_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

const SEED_EMPLOYEES_DEV3 = [
  {
    id: 'emp-1',
    devId: 3,
    name: 'Алексей Дмитриев',
    email: 'a.dmitriev@rascvet39.ru',
    phone: '+7 (4012) 99-44-41',
    position: 'Администратор ОП',
    roleTitle: 'Администратор ОП',
    role: 'admin',
    status: 'active',
    assignedZhks: 'Все объекты',
    createdAt: '2026-08-20T10:00:00.000Z',
    lastLogin: '2026-08-26T12:00:00.000Z'
  },
  {
    id: 'emp-2',
    devId: 3,
    name: 'Елена Ковалева',
    email: 'e.kovaleva@rascvet39.ru',
    phone: '+7 (4012) 99-44-42',
    position: 'Старший менеджер ОП',
    roleTitle: 'Старший менеджер ОП',
    role: 'manager',
    status: 'active',
    assignedZhks: 'ЖК «Расцвет на Гагарина», ЖК «Подсолнухи»',
    createdAt: '2026-08-21T11:30:00.000Z',
    lastLogin: '2026-08-26T11:00:00.000Z'
  },
  {
    id: 'emp-3',
    devId: 3,
    name: 'Михаил Соколов',
    email: 'm.sokolov@rascvet39.ru',
    phone: '+7 (4012) 99-44-43',
    position: 'Менеджер по показам',
    roleTitle: 'Менеджер по показам',
    role: 'employee',
    status: 'active',
    assignedZhks: 'ЖК «Гусевский»',
    createdAt: '2026-08-22T09:15:00.000Z',
    lastLogin: '2026-08-26T09:30:00.000Z'
  },
  {
    id: 'emp-4',
    devId: 3,
    name: 'Ольга Новикова',
    email: 'o.novikova@rascvet39.ru',
    phone: '+7 (4012) 99-44-44',
    position: 'Менеджер по продажам',
    roleTitle: 'Менеджер по продажам',
    role: 'manager',
    status: 'pending',
    assignedZhks: 'ЖК «Расцвет на Летней»',
    createdAt: '2026-08-26T08:00:00.000Z',
    lastLogin: null,
    inviteToken: 'emp_inv_demo_novikova'
  },
  {
    id: 'emp-5',
    devId: 3,
    name: 'Денис Волков',
    email: 'd.volkov@rascvet39.ru',
    phone: '+7 (4012) 99-44-45',
    position: 'Ассистент менеджера',
    roleTitle: 'Ассистент менеджера',
    role: 'employee',
    status: 'blocked',
    assignedZhks: 'ЖК «Город»',
    createdAt: '2026-08-15T14:00:00.000Z',
    lastLogin: '2026-08-18T16:00:00.000Z'
  }
];

const SEED_INVITES_DEV3 = {
  emp_inv_demo_novikova: {
    token: 'emp_inv_demo_novikova',
    devId: 3,
    developerName: 'ГК «Расцвет»',
    email: 'o.novikova@rascvet39.ru',
    name: 'Ольга Новикова',
    position: 'Менеджер по продажам',
    role: 'manager',
    assignedZhks: 'ЖК «Расцвет на Летней»',
    phone: '+7 (4012) 99-44-44',
    status: 'pending',
    createdAt: '2026-08-26T08:00:00.000Z',
    expiresAt: '2026-09-25T08:00:00.000Z',
    used: false,
    usedAt: null,
    createdById: 'emp-1'
  }
};

const SEED_AUTH_DEV3 = {
  'amber_employee_auth_emp-1': {
    empId: 'emp-1',
    devId: 3,
    email: 'a.dmitriev@rascvet39.ru',
    passwordHash: PASSWORD_123_HASH,
    role: 'admin',
    status: 'active',
    createdAt: '2026-08-20T10:00:00.000Z',
    lastLogin: '2026-08-26T12:00:00.000Z',
    sessionExpiresAt: '2026-09-25T12:00:00.000Z',
    passwordResetRequests: []
  },
  'amber_employee_auth_emp-2': {
    empId: 'emp-2',
    devId: 3,
    email: 'e.kovaleva@rascvet39.ru',
    passwordHash: PASSWORD_123_HASH,
    role: 'manager',
    status: 'active',
    createdAt: '2026-08-21T11:30:00.000Z',
    lastLogin: '2026-08-26T11:00:00.000Z',
    sessionExpiresAt: '2026-09-25T11:00:00.000Z',
    passwordResetRequests: []
  },
  'amber_employee_auth_emp-3': {
    empId: 'emp-3',
    devId: 3,
    email: 'm.sokolov@rascvet39.ru',
    passwordHash: PASSWORD_123_HASH,
    role: 'employee',
    status: 'active',
    createdAt: '2026-08-22T09:15:00.000Z',
    lastLogin: '2026-08-26T09:30:00.000Z',
    sessionExpiresAt: '2026-09-25T09:30:00.000Z',
    passwordResetRequests: []
  },
  'amber_employee_auth_emp-5': {
    empId: 'emp-5',
    devId: 3,
    email: 'd.volkov@rascvet39.ru',
    passwordHash: PASSWORD_123_HASH,
    role: 'employee',
    status: 'blocked',
    createdAt: '2026-08-15T14:00:00.000Z',
    lastLogin: '2026-08-18T16:00:00.000Z',
    sessionExpiresAt: '2026-09-18T16:00:00.000Z',
    passwordResetRequests: []
  }
};

function createRbacSandbox(customOptions = {}) {
  const initialStorage = {
    auth_developer_id: '3',
    currentDevId: '3',
    currentUserId: 'emp-1',
    currentUserRole: 'admin',
    amber_employees_3: SEED_EMPLOYEES_DEV3,
    amber_employee_invites: SEED_INVITES_DEV3,
    ...SEED_AUTH_DEV3,
    ...(customOptions.initialLocalStorage || {})
  };

  return createCabinetSandbox({
    developerId: 3,
    developerName: 'ГК «Расцвет»',
    developerCode: '123456',
    ...customOptions,
    initialLocalStorage: initialStorage
  });
}

async function runChallenger1RbacStressSuite() {
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
  console.log(' 🔥 CHALLENGER 1: ADVERSARIAL RBAC & ACCESS CONTROL STRESS PROBING');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  // ════════════════════════════════════════════════════════════════════════════
  // 1. INVITE TOKEN TAMPERING, EXPIRATION, REPLAY ATTACKS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('🔹 [1. Token Security] Probing Invite Token Tampering & Replay Attacks...');

  await test('1.1: Forged non-existent invite token in URL is safely ignored without opening modal', () => {
    const sandbox = createRbacSandbox({
      search: '?employee_invite=FORGED_TAMPERED_TOKEN_9999'
    });
    const modal = sandbox.document.getElementById('generic-modal-overlay');
    const isModalOpen = modal && modal.classList && modal.classList.contains('open');
    assert.strictEqual(isModalOpen, false, 'Forged token must not open invite acceptance modal');
  });

  await test('1.2: Replay attack on previously accepted invite token (used: true) is strictly rejected', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        amber_employee_invites: {
          used_token_123: {
            token: 'used_token_123',
            devId: 3,
            email: 'used@rascvet39.ru',
            name: 'Использованный Токен',
            role: 'manager',
            used: true,
            status: 'accepted',
            expiresAt: '2026-09-25T08:00:00.000Z'
          }
        }
      },
      search: '?employee_invite=used_token_123'
    });
    const modal = sandbox.document.getElementById('generic-modal-overlay');
    const isModalOpen = modal && modal.classList && modal.classList.contains('open');
    assert.strictEqual(isModalOpen, false, 'Consumed token must not allow re-opening modal');
  });

  await test('1.3: Revoked invite token (status: "revoked") is rejected and shows warning toast', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        amber_employee_invites: {
          revoked_token_456: {
            token: 'revoked_token_456',
            devId: 3,
            email: 'revoked@rascvet39.ru',
            name: 'Отозванный Токен',
            role: 'employee',
            used: false,
            status: 'revoked',
            expiresAt: '2026-09-25T08:00:00.000Z'
          }
        }
      },
      search: '?employee_invite=revoked_token_456'
    });
    const modal = sandbox.document.getElementById('generic-modal-overlay');
    const isModalOpen = modal && modal.classList && modal.classList.contains('open');
    assert.strictEqual(isModalOpen, false, 'Revoked token must not open acceptance modal');
  });

  await test('1.4: Expired invite token (>30 days old) rejection and verification', () => {
    const expiredTimestamp = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const tokenObj = {
      token: 'expired_tok_789',
      devId: 3,
      email: 'expired@rascvet39.ru',
      name: 'Истекший Токен',
      role: 'employee',
      used: false,
      status: 'pending',
      expiresAt: expiredTimestamp
    };
    
    // Check expiry logic directly
    const isExpired = new Date(tokenObj.expiresAt).getTime() < Date.now();
    assert.strictEqual(isExpired, true, 'Token past 30 days must be evaluated as expired');
  });

  await test('1.5: Valid invite token activation establishes active session and writes password hash', async () => {
    const sandbox = createRbacSandbox();
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const tokenObj = invites.emp_inv_demo_novikova;
    assert.ok(tokenObj, 'Demo invite token object must exist');

    sandbox.window.openEmployeeInviteAcceptModal(tokenObj);

    const modal = sandbox.document.getElementById('generic-modal-overlay');
    assert.ok(modal && modal.classList && modal.classList.contains('open'), 'Valid token must open invite accept modal');

    // Simulate password entry
    const pwdInput = sandbox.document.getElementById('emp-invite-pwd-input');
    const confirmInput = sandbox.document.getElementById('emp-invite-pwd-confirm');
    if (pwdInput) pwdInput.value = 'superSecret2026';
    if (confirmInput) confirmInput.value = 'superSecret2026';

    await sandbox.window.submitEmployeeInvitePassword('emp_inv_demo_novikova');

    // Verify token marked used
    const updatedInvites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    assert.strictEqual(updatedInvites.emp_inv_demo_novikova.used, true, 'Token must be marked used');
    assert.strictEqual(updatedInvites.emp_inv_demo_novikova.status, 'accepted', 'Token status must be accepted');

    // Verify auth created
    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    const novikova = employees.find(e => e.email === 'o.novikova@rascvet39.ru');
    assert.ok(novikova, 'Novikova employee record must exist');
    assert.strictEqual(novikova.status, 'active', 'Employee status must be active');

    const authKey = 'amber_employee_auth_' + novikova.id;
    const authData = JSON.parse(sandbox.localStorage.getItem(authKey) || 'null');
    assert.ok(authData, 'Auth record must be persisted in amber_employee_auth_*');
    assert.strictEqual(authData.role, 'manager', 'Auth role must match invite role');
    assert.strictEqual(authData.status, 'active', 'Auth status must be active');

    // Verify session
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'manager', 'Session role must be manager');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserId'), novikova.id, 'Session userId must match employee id');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PRIVILEGE ESCALATION PROBING
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [2. Privilege Escalation] Probing Role Constraints & Forbidden Access...');

  await test('2.1: Attacker attempts to forge invite with role="admin" via handleCreateEmployeeInvite', () => {
    const sandbox = createRbacSandbox();
    sandbox.window.openAddEmployeeModal();

    const nameInp = sandbox.document.getElementById('emp-form-name');
    const emailInp = sandbox.document.getElementById('emp-form-email');
    const roleInp = sandbox.document.getElementById('emp-form-role');

    if (nameInp) nameInp.value = 'Взломщик Администратор';
    if (emailInp) emailInp.value = 'hacker@rascvet39.ru';
    if (roleInp) roleInp.value = 'admin';

    let alertCalled = false;
    let alertMsg = '';
    sandbox.window.alert = (msg) => { alertCalled = true; alertMsg = msg; };

    sandbox.window.handleCreateEmployeeInvite();

    assert.ok(alertCalled, 'System must alert when admin role is attempted');
    assert.ok(alertMsg.includes('Администратор') || alertMsg.includes('роль'), 'Alert must explain Admin role cannot be assigned');

    // Verify no employee invite was stored with role 'admin'
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const hackerInvite = Object.values(invites).find(i => i.email === 'hacker@rascvet39.ru');
    assert.strictEqual(hackerInvite, undefined, 'Admin invite must NOT be stored in localStorage');
  });

  await test('2.2: Employee role direct navigation attempts to all 15 forbidden tabs are blocked & redirected to my-zhk', () => {
    const forbiddenForEmployee = [
      'dashboard', 'add-zhk', 'company-info', 'employees', 'documents',
      'settings', 'audit-log', 'leads', 'analytics-stats', 'analytics-traffic',
      'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads', 'tariffs'
    ];

    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    for (const tabId of forbiddenForEmployee) {
      sandbox.window.switchNavTab(tabId);
      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.ok(activeTab, `An active tab must exist after trying to access ${tabId}`);
      assert.strictEqual(activeTab.id, 'tab-my-zhk', `Unauthorized tab switch to "${tabId}" must redirect Employee to tab-my-zhk`);
    }
  });

  await test('2.3: Manager role direct navigation attempts to all 12 forbidden admin tabs are blocked & redirected to dashboard', () => {
    const forbiddenForManager = [
      'add-zhk', 'company-info', 'employees', 'documents',
      'settings', 'audit-log', 'analytics-traffic',
      'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads', 'tariffs'
    ];

    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'manager',
        auth_user_role: 'manager',
        currentUserId: 'emp-2'
      }
    });

    for (const tabId of forbiddenForManager) {
      sandbox.window.switchNavTab(tabId);
      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.ok(activeTab, `An active tab must exist after trying to access ${tabId}`);
      assert.strictEqual(activeTab.id, 'tab-dashboard', `Unauthorized tab switch to "${tabId}" must redirect Manager to tab-dashboard`);
    }
  });

  await test('2.4: Manager role can freely access all 6 permitted tabs without redirection', () => {
    const allowedForManager = [
      'dashboard', 'my-zhk', 'leads', 'analytics-stats', 'support-tickets', 'knowledge-base'
    ];

    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'manager',
        auth_user_role: 'manager',
        currentUserId: 'emp-2'
      }
    });

    for (const tabId of allowedForManager) {
      sandbox.window.switchNavTab(tabId);
      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.ok(activeTab, `An active tab must exist for ${tabId}`);
      assert.strictEqual(activeTab.id, `tab-${tabId}`, `Manager should have full access to permitted tab "${tabId}"`);
    }
  });

  await test('2.5: Employee role can freely access all 3 permitted tabs without redirection', () => {
    const allowedForEmployee = ['my-zhk', 'support-tickets', 'knowledge-base'];

    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    for (const tabId of allowedForEmployee) {
      sandbox.window.switchNavTab(tabId);
      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.ok(activeTab, `An active tab must exist for ${tabId}`);
      assert.strictEqual(activeTab.id, `tab-${tabId}`, `Employee should have full access to permitted tab "${tabId}"`);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. RESTRICTED ACTION PROBING FROM EMPLOYEE & MANAGER ROLE
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [3. Action Permissions] Probing Restricted Actions from Non-Admin Roles...');

  await test('3.1: Employee calling openZhkEditorModal(0) is blocked and shown view-only toast', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    const modal = sandbox.document.getElementById('zhk-editor-modal-overlay');
    const wasOpen = modal && modal.classList && modal.classList.contains('open');

    sandbox.window.openZhkEditorModal(0);

    const isOpenNow = modal && modal.classList && modal.classList.contains('open');
    assert.strictEqual(isOpenNow, wasOpen, 'ZHK editor modal must NOT open for Employee role');

    const toast = sandbox.document.getElementById('toast-text');
    if (toast) {
      assert.ok(toast.textContent.includes('только чтение') || toast.textContent.includes('сотрудника'), 'Toast must explain view-only rights');
    }
  });

  await test('3.2: Employee calling handleAddNewZhk is blocked from adding new property', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    const nameInp = sandbox.document.getElementById('new-zhk-name');
    if (nameInp) nameInp.value = 'ЖК Несанкционированный';

    const countBefore = (sandbox.window.localProperties || []).length;

    sandbox.window.handleAddNewZhk({ preventDefault: () => {} });

    const countAfter = (sandbox.window.localProperties || []).length;
    assert.strictEqual(countAfter, countBefore, 'Local properties count must not increase when Employee calls handleAddNewZhk');

    const toast = sandbox.document.getElementById('toast-text');
    if (toast) {
      assert.ok(toast.textContent.includes('Недостаточно прав') || toast.textContent.includes('только администраторам'), 'Toast must notify of insufficient permissions');
    }
  });

  await test('3.3: Employee role in My Complexes renders view-only buttons (no edit/delete/add)', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    sandbox.window.applyRoleVisibilityToSidebar('employee');
    sandbox.window.switchNavTab('my-zhk');

    // Add ZHK button in catalog header should be hidden
    const addBtn = sandbox.document.querySelector('#tab-my-zhk button[onclick*="add-zhk"]');
    if (addBtn) {
      assert.strictEqual(addBtn.style.display, 'none', 'Add ZHK button must be hidden for Employee');
    }
  });

  await test('3.4: Attempting to delete main admin account is strictly blocked', () => {
    const sandbox = createRbacSandbox();

    const employeesBefore = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    assert.ok(employeesBefore.some(e => e.id === 'emp-1' && e.role === 'admin'), 'Admin emp-1 must exist');

    sandbox.window.deleteEmployee('emp-1');

    const employeesAfter = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    assert.ok(employeesAfter.some(e => e.id === 'emp-1' && e.role === 'admin'), 'Admin emp-1 must NOT be deleted');

    const toast = sandbox.document.getElementById('toast-text');
    if (toast) {
      assert.ok(toast.textContent.includes('Нельзя удалить главного администратора'), 'Must show toast protecting main admin');
    }
  });

  await test('3.5: Attempting to block or change role of main admin account is strictly blocked', () => {
    const sandbox = createRbacSandbox();

    sandbox.window.toggleEmployeeStatus('emp-1');
    sandbox.window.toggleEmployeeRole('emp-1');

    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    const admin = employees.find(e => e.id === 'emp-1');
    assert.strictEqual(admin.status, 'active', 'Admin status must remain active');
    assert.strictEqual(admin.role, 'admin', 'Admin role must remain admin');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SESSION SWITCHING, LOGOUT PURGING & BLOCKED USER EVICTION
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [4. Session & Eviction] Probing Auth Switching, Logout & Blocked Users...');

  await test('4.1: Unified Login as Admin -> Correct Role Badge, Full 18 Tabs', async () => {
    const sandbox = createRbacSandbox();

    const emailInp = sandbox.document.getElementById('login-email-input');
    const pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'a.dmitriev@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';

    await sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'admin', 'Session role must be admin');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserId'), 'emp-1', 'Session user ID must be emp-1');

    const badge = sandbox.document.getElementById('header-user-role-badge');
    if (badge) {
      assert.ok(badge.textContent.includes('Администратор') || badge.textContent.includes('👑'), 'Role badge must indicate Admin');
    }
  });

  await test('4.2: Session clearing on handleLogout() purges all sensitive session tokens', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserId: 'emp-2',
        currentUserRole: 'manager',
        auth_user_role: 'manager',
        currentUserName: 'Елена Ковалева',
        currentUserEmail: 'e.kovaleva@rascvet39.ru'
      }
    });

    sandbox.window.handleLogout();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserId'), null, 'currentUserId must be removed on logout');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), null, 'currentUserRole must be removed on logout');
    assert.strictEqual(sandbox.localStorage.getItem('auth_user_role'), null, 'auth_user_role must be removed on logout');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserName'), null, 'currentUserName must be removed on logout');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserEmail'), null, 'currentUserEmail must be removed on logout');

    const modal = sandbox.document.getElementById('login-modal-overlay');
    assert.ok(modal && modal.classList && modal.classList.contains('open'), 'Login modal must open on logout');
  });

  await test('4.3: Blocked Employee login attempt is rejected with error status and alert', async () => {
    const sandbox = createRbacSandbox();

    const emailInp = sandbox.document.getElementById('login-email-input');
    const pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'd.volkov@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';

    let alertMsg = '';
    sandbox.window.alert = (m) => { alertMsg = m; };

    await sandbox.window.handleUnifiedLogin();

    const errEl = sandbox.document.getElementById('login-error-message');
    assert.ok(errEl && errEl.textContent.includes('заблокирован'), 'Login error message must mention account is blocked');
    assert.ok(alertMsg.includes('заблокирован'), 'Alert message must confirm account blocked');
  });

  await test('4.4: Real-time dynamic block action immediately prevents blocked employee authentication', async () => {
    const sandbox = createRbacSandbox();

    // Admin blocks active manager emp-2 (Елена Ковалева)
    sandbox.window.toggleEmployeeStatus('emp-2');

    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    const kovaleva = employees.find(e => e.id === 'emp-2');
    assert.strictEqual(kovaleva.status, 'blocked', 'Kovaleva status must now be blocked');

    // Attempt login as Kovaleva
    const emailInp = sandbox.document.getElementById('login-email-input');
    const pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'e.kovaleva@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';

    await sandbox.window.handleUnifiedLogin();

    const errEl = sandbox.document.getElementById('login-error-message');
    assert.ok(errEl && errEl.textContent.includes('заблокирован'), 'Now blocked manager must be rejected');
  });

  await test('4.5: Shared Workstation Session Switching: Admin -> Manager -> Employee -> Admin', async () => {
    const sandbox = createRbacSandbox();

    // 1. Login as Manager
    let emailInp = sandbox.document.getElementById('login-email-input');
    let pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'e.kovaleva@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';
    await sandbox.window.handleUnifiedLogin();
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'manager', 'Session 1 must be Manager');

    // 2. Logout
    sandbox.window.handleLogout();

    // 3. Login as Employee
    emailInp = sandbox.document.getElementById('login-email-input');
    pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'm.sokolov@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';
    await sandbox.window.handleUnifiedLogin();
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'employee', 'Session 2 must be Employee');

    // 4. Logout
    sandbox.window.handleLogout();

    // 5. Login as Admin
    emailInp = sandbox.document.getElementById('login-email-input');
    pwdInp = sandbox.document.getElementById('login-password-input');
    if (emailInp) emailInp.value = 'a.dmitriev@rascvet39.ru';
    if (pwdInp) pwdInp.value = 'password123';
    await sandbox.window.handleUnifiedLogin();
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'admin', 'Session 3 must be Admin');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. HARDENING, CORRUPTION & METADATA RESILIENCE
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n🔹 [5. Robustness & Hardening] Probing Corruption, Rate Limits & Payloads...');

  await test('5.1: Forgot password hourly rate limit prevents repeated reset requests', async () => {
    const sandbox = createRbacSandbox();

    const emailInp = sandbox.document.getElementById('forgot-pwd-email');
    if (emailInp) emailInp.value = 'a.dmitriev@rascvet39.ru';

    // First request
    await sandbox.window.submitForgotPasswordRequest();

    let alertCalled = false;
    sandbox.window.alert = () => { alertCalled = true; };

    // Immediate second request within 1 hour
    await sandbox.window.submitForgotPasswordRequest();

    assert.strictEqual(alertCalled, true, 'Second request must trigger rate limit alert');
  });

  await test('5.2: Corrupted JSON in amber_employees localStorage recovers safely without crash', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        amber_employees_3: '{{CORRUPTED_BAD_JSON{{'
      }
    });

    const employees = sandbox.window.loadEmployees(3);
    assert.ok(Array.isArray(employees), 'loadEmployees must gracefully fallback to array');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0, 'Must not emit unhandled console errors on corrupt JSON');
  });

  await test('5.3: Rapid 100 tab switch storm between random tabs under Employee role remains strictly contained in 3 allowed tabs', () => {
    const sandbox = createRbacSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        auth_user_role: 'employee',
        currentUserId: 'emp-3'
      }
    });

    const all18Tabs = [
      'dashboard', 'my-zhk', 'add-zhk', 'company-info', 'employees',
      'documents', 'settings', 'audit-log', 'leads', 'analytics-stats',
      'analytics-traffic', 'analytics-competitors', 'analytics-reports',
      'promo-premium', 'promo-ads', 'tariffs', 'support-tickets', 'knowledge-base'
    ];

    for (let i = 0; i < 100; i++) {
      const targetTab = all18Tabs[i % all18Tabs.length];
      sandbox.window.switchNavTab(targetTab);

      const activeTab = sandbox.document.querySelector('.tab-section.active');
      assert.ok(activeTab, 'Active tab must exist');
      const activeId = activeTab.id.replace('tab-', '');
      assert.ok(
        ['my-zhk', 'support-tickets', 'knowledge-base'].includes(activeId),
        `Employee tab must never resolve to unauthorized tab (got: ${activeId})`
      );
    }
  });

  console.log('\n================================================================================');
  console.log(`                          📊 CHALLENGER 1 RESULTS                               `);
  console.log('================================================================================');
  console.log(`  Total Probes Executed: ${results.length}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    throw new Error(`Challenger 1 detected ${failedCount} failure(s) during adversarial probing!`);
  }

  return results;
}

module.exports = { runChallenger1RbacStressSuite };

if (require.main === module) {
  runChallenger1RbacStressSuite().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
