
'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { createCabinetSandbox } = require('./harness/dom-sandbox');

/**
 * ==============================================================================
 * CHALLENGER 2: ADVERSARIAL STRESS TEST SUITE
 * 
 * Target Verification:
 * 1. Multi-Tenant Data Isolation (amber_employees_3 vs amber_employees_999)
 * 2. UI Responsiveness, Role Switching, DOM Reactivity & State Restoration After Reload
 * 3. Seed Demo Data Functionality for all 5 pre-configured accounts
 * 4. Zero Console Errors & Robustness across all execution paths
 * ==============================================================================
 */

async function runChallenger2StressSuite() {
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

  // ============================================================================
  // 1. MULTI-TENANT DATA ISOLATION (amber_employees_3 vs amber_employees_999)
  // ============================================================================

  await test('Isolation 1.1: Distinct employee partitions for Dev 3 vs Dev 999', () => {
    const sandbox3 = createCabinetSandbox({ developerId: 3 });
    const sandbox999 = createCabinetSandbox({ developerId: 999, developerName: 'Девелопмент 999', developerCode: 'DEV999' });

    const emps3 = sandbox3.window.loadEmployees(3);
    const emps999 = sandbox999.window.loadEmployees(999);

    assert.strictEqual(emps3.length, 5, 'Dev 3 should have 5 seeded demo accounts');
    assert.strictEqual(emps999.length, 3, 'Dev 999 should have 3 default accounts');
    assert.strictEqual(emps3[0].devId, 3, 'Dev 3 employees belong to devId 3');
    assert.strictEqual(emps999[0].devId, 999, 'Dev 999 employees belong to devId 999');

    // Storage keys must be isolated
    const raw3 = sandbox3.localStorage.getItem('amber_employees_3');
    const raw999 = sandbox999.localStorage.getItem('amber_employees_999');
    assert.ok(raw3, 'amber_employees_3 exists');
    assert.ok(raw999, 'amber_employees_999 exists');
    assert.notStrictEqual(raw3, raw999, 'Dev 3 and Dev 999 employee storage must differ');
  });

  await test('Isolation 1.2: Cross-tenant authentication rejection', async () => {
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

  await test('Isolation 1.3: Multi-tenant invite creation scopes devId properly', () => {
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

  await test('Isolation 1.4: Cross-tenant invite acceptance updates only designated developer', async () => {
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

  await test('Isolation 1.5: Cross-tenant mutation isolation (Admin 3 actions do not mutate Dev 999)', () => {
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

  // ============================================================================
  // 2. UI RESPONSIVENESS, ROLE SWITCHING & STATE RESTORATION AFTER PAGE RELOAD
  // ============================================================================

  await test('StateRestoration 2.1: Page reload under Admin role restores 18 tabs, badge and edit capabilities', () => {
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

    const visibleTitles = Array.from(sandbox.document.querySelectorAll('.nav-section-title'))
      .filter(el => el.style.display !== 'none');
    assert.ok(visibleTitles.length >= 4, 'All section titles must remain visible for Admin');

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

  await test('StateRestoration 2.2: Page reload under Manager role restores exactly 6 tabs, badge and dashboard default', () => {
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

  await test('StateRestoration 2.3: Page reload under Employee role restores 3 tabs, badge, my-zhk fallback and view-only', () => {
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

  await test('StateRestoration 2.4: Backward compatibility with legacy storage (auth_developer_id only defaults to admin)', () => {
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

  await test('StateRestoration 2.5: Admin demoting manager to employee triggers instant UI and storage update', () => {
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
    sandbox.window.handleUnifiedLogin();

    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), 'employee', 'Session role must now be employee');
    const visibleNavItems = Array.from(sandbox.document.querySelectorAll('.sidebar-nav .nav-item'))
      .filter(el => el.style.display !== 'none');
    assert.strictEqual(visibleNavItems.length, 3, 'Demoted user must now see exactly 3 tabs');
  });

  await test('StateRestoration 2.6: Rapid consecutive role-switching stress test (50 iterations)', () => {
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

  // ============================================================================
  // 3. SEED DEMO DATA FUNCTIONALITY FOR ALL 5 PRE-CONFIGURED ACCOUNTS
  // ============================================================================

  await test('DemoAccounts 3.1: Seed Account 1 (Admin: a.dmitriev@rascvet39.ru) logs in as admin with 18 tabs', async () => {
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

  await test('DemoAccounts 3.2: Seed Account 2 (Manager: e.kovaleva@rascvet39.ru) logs in as manager with 6 tabs', async () => {
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

  await test('DemoAccounts 3.3: Seed Account 3 (Employee: m.sokolov@rascvet39.ru) logs in as employee with 3 tabs', async () => {
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

  await test('DemoAccounts 3.4: Seed Account 4 (Blocked Employee: d.volkov@rascvet39.ru) is rejected with «Аккаунт заблокирован»', async () => {
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

  await test('DemoAccounts 3.5: Seed Account 4 Unblock by Admin enables subsequent login', async () => {
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

  await test('DemoAccounts 3.6: Seed Account 5 (Pending Invite: o.novikova@rascvet39.ru) completes invite acceptance', async () => {
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

  await test('DemoAccounts 3.7: Seed Account 5 Token Replay Prevention (used token cannot be accepted again)', async () => {
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

  // ============================================================================
  // 4. ZERO CONSOLE ERRORS & CORRUPTION ROBUSTNESS ACROSS ALL PATHS
  // ============================================================================

  await test('Robustness 4.1: Full 18-tab traversal cycle under Admin role produces 0 console errors', () => {
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

  await test('Robustness 4.2: Full 18-tab traversal cycle under Manager role produces 0 console errors', () => {
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

  await test('Robustness 4.3: Full 18-tab traversal cycle under Employee role produces 0 console errors', () => {
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

  await test('Robustness 4.4: Adversarial login input payloads do not throw unhandled exceptions', async () => {
    const sandbox = createCabinetSandbox({ developerId: 3 });
    sandbox.window.initDeveloperSession();
    sandbox.window.openLoginModal();

    const maliciousInputs = [
      { email: "' OR '1'='1", pwd: "' OR '1'='1" },
      { email: '<script>alert("xss")</script>', pwd: '<svg/onload=alert(1)>' },
      { email: 'admin@dev3.ru malicious', pwd: 'pass word' },
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

  await test('Robustness 4.5: Corrupted JSON in employee localStorage recovered gracefully without crashes', () => {
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

  await test('Robustness 4.6: Rapid concurrent authentication & state mutations cycle without memory leaks or crashes', async () => {
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

  return results;
}

if (require.main === module) {
  (async () => {
    console.log('\n================================================================================');
    console.log('  ⚔️  CHALLENGER 2: ADVERSARIAL STRESS & EMPIRICAL RBAC VERIFICATION  ');
    console.log('================================================================================\n');

    const results = await runChallenger2StressSuite();
    let passed = 0;
    let failed = 0;

    results.forEach(r => {
      if (r.passed) {
        passed++;
        console.log('  ✅ PASS: ' + r.name + ' (' + r.duration + 'ms)');
      } else {
        failed++;
        console.error('  ❌ FAIL: ' + r.name + ' (' + r.duration + 'ms)');
        console.error('     Error: ' + r.error);
        if (r.stack) console.error(r.stack.split('\n').slice(1, 3).join('\n'));
      }
    });

    console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed out of ' + results.length + ' total tests.');
    process.exit(failed > 0 ? 1 : 0);
  })();
}

module.exports = { runChallenger2StressSuite };
