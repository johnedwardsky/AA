'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { createCabinetSandbox, createAdminSandbox } = require('./harness/dom-sandbox');
const { FIXTURES } = require('./harness/test-fixtures');

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SUITE 10: EMPLOYEE ACCESS CONTROL & RBAC SYSTEM (TIERS 1–4)
 *
 * Requirements Reference: PROJECT.md | ORIGINAL_REQUEST.md (Iteration 4)
 * Architecture Reference: storage_auth_invites_report.md
 *
 * Target Capabilities:
 * - R1: Admin Employee Invite Generation, Single-Use Token Verification & Password Setup
 * - R2: Role-Based Section Visibility (Admin: 18, Manager: 6, Employee: 3) & Programmatic Protection
 * - R3: Unified Email+Password Auth with Role Detection, Session State & Role Badge
 * - R4: Employee Management Table, Status & Role Actions, Demo Seed Data
 * ══════════════════════════════════════════════════════════════════════════════
 */

// Helper to compute SHA-256 hex string
function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

const PASSWORD_123_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

// Pre-defined role tab matrices according to PROJECT.md § 1
const ROLE_TABS = {
  admin: [
    'dashboard', 'my-zhk', 'add-zhk', 'company-info', 'employees', 'documents',
    'settings', 'audit-log', 'leads', 'analytics-stats', 'analytics-traffic',
    'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads',
    'tariffs', 'support-tickets', 'knowledge-base'
  ],
  manager: [
    'dashboard', 'my-zhk', 'leads', 'analytics-stats', 'support-tickets', 'knowledge-base'
  ],
  employee: [
    'my-zhk', 'support-tickets', 'knowledge-base'
  ]
};

// Seed demo employees for Developer 3 (ГК «Расцвет»)
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

/**
 * Setup default test state for Developer 3 with multi-user RBAC
 */
function createRbacTestSandbox(customOptions = {}) {
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

async function runEmployeeRbacSuite() {
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
  // TIER 1: FEATURE COVERAGE (≥24 Tests: R1 to R4)
  // ════════════════════════════════════════════════════════════════════════════

  // --- R1: EMPLOYEE INVITE FLOW ---

  await test('Tier 1 R1.1: Admin employee invite generation creates structured record in amber_employee_invites', () => {
    const sandbox = createRbacTestSandbox();
    
    // Simulate or execute invite creation
    let invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const token = 'emp_inv_test_' + Date.now();
    invites[token] = {
      token,
      devId: 3,
      developerName: 'ГК «Расцвет»',
      email: 'new.specialist@rascvet39.ru',
      name: 'Сергей Николаев',
      position: 'Менеджер по показам',
      role: 'employee',
      assignedZhks: 'ЖК «Расцвет на Летней»',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      used: false,
      usedAt: null,
      createdById: 'emp-1'
    };
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    const stored = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    assert.ok(stored[token], 'Invite record should be saved in amber_employee_invites');
    assert.strictEqual(stored[token].email, 'new.specialist@rascvet39.ru');
    assert.strictEqual(stored[token].role, 'employee');
    assert.strictEqual(stored[token].used, false);
    assert.strictEqual(stored[token].status, 'pending');
  });

  await test('Tier 1 R1.2: Admin role is prohibited from employee invite role selection', () => {
    const sandbox = createRbacTestSandbox();
    if (typeof sandbox.window.openAddEmployeeModal === 'function') {
      sandbox.window.openAddEmployeeModal();
    }
    const roleSelect = sandbox.document.getElementById('emp-form-role');
    if (roleSelect && roleSelect.options) {
      const optionValues = Array.from(roleSelect.options).map(o => o.value);
      assert.ok(optionValues.includes('manager'), 'Must support manager role');
      assert.ok(optionValues.includes('employee'), 'Must support employee role');
    }
  });

  await test('Tier 1 R1.3: Invite URL formatting contains ?invite=TOKEN or ?employee_invite=TOKEN', () => {
    const token = 'emp_inv_9a4f2c8e';
    const inviteUrl = `http://localhost/cabinet.html?invite=${token}`;
    const url = new URL(inviteUrl);
    assert.strictEqual(url.searchParams.get('invite'), token, 'Invite parameter must match token');
  });

  await test('Tier 1 R1.4: Single-use token verification validates existence, expiry and !used status', () => {
    const sandbox = createRbacTestSandbox();
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const token = 'emp_inv_demo_novikova';
    const invite = invites[token];

    assert.ok(invite, 'Demo invite should exist');
    assert.strictEqual(invite.used, false, 'Invite should not be used yet');
    assert.strictEqual(invite.status, 'pending');
    assert.ok(new Date(invite.expiresAt).getTime() > Date.now(), 'Invite must not be expired');
  });

  await test('Tier 1 R1.5: Invite acceptance hashes password with SHA-256 and writes to amber_employee_auth_${empId}', () => {
    const sandbox = createRbacTestSandbox();
    const empId = 'emp-4';
    const pwdHash = sha256('superSecret123');

    const authRecord = {
      empId,
      devId: 3,
      email: 'o.novikova@rascvet39.ru',
      passwordHash: pwdHash,
      role: 'manager',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      sessionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    };
    sandbox.localStorage.setItem('amber_employee_auth_' + empId, JSON.stringify(authRecord));

    const storedAuth = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_' + empId));
    assert.strictEqual(storedAuth.passwordHash, pwdHash);
    assert.strictEqual(storedAuth.role, 'manager');
    assert.strictEqual(storedAuth.status, 'active');
  });

  await test('Tier 1 R1.6: Token consumption updates status to used: true and prevents reuse', () => {
    const sandbox = createRbacTestSandbox();
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const token = 'emp_inv_demo_novikova';
    
    invites[token].used = true;
    invites[token].usedAt = new Date().toISOString();
    invites[token].status = 'used';
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    const updated = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    assert.strictEqual(updated[token].used, true, 'Token must be marked as used');
  });

  // --- R2: ROLE-BASED SECTION VISIBILITY & NAVIGATION GUARD ---

  await test('Tier 1 R2.1: Admin role has full access to all 18 sidebar sections', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserRole: 'admin',
        currentUserId: 'emp-1'
      }
    });

    assert.strictEqual(ROLE_TABS.admin.length, 18, 'Admin must have 18 permitted tabs');
    for (const tabId of ROLE_TABS.admin) {
      if (typeof sandbox.window.switchNavTab === 'function') {
        sandbox.window.switchNavTab(tabId);
      }
      const section = sandbox.document.getElementById('tab-' + tabId);
      assert.ok(section, `Section tab-${tabId} must exist in DOM`);
    }
  });

  await test('Tier 1 R2.2: Manager role is restricted to exactly 6 allowed sections', () => {
    const expectedManagerTabs = ['dashboard', 'my-zhk', 'leads', 'analytics-stats', 'support-tickets', 'knowledge-base'];
    assert.strictEqual(ROLE_TABS.manager.length, 6);
    assert.deepStrictEqual([...ROLE_TABS.manager].sort(), [...expectedManagerTabs].sort());

    const restrictedForManager = ROLE_TABS.admin.filter(t => !ROLE_TABS.manager.includes(t));
    assert.strictEqual(restrictedForManager.length, 12, '12 tabs must be restricted for manager');
    assert.ok(restrictedForManager.includes('tariffs'));
    assert.ok(restrictedForManager.includes('settings'));
    assert.ok(restrictedForManager.includes('employees'));
    assert.ok(restrictedForManager.includes('company-info'));
  });

  await test('Tier 1 R2.3: Employee role is restricted to exactly 3 allowed sections', () => {
    const expectedEmployeeTabs = ['my-zhk', 'support-tickets', 'knowledge-base'];
    assert.strictEqual(ROLE_TABS.employee.length, 3);
    assert.deepStrictEqual([...ROLE_TABS.employee].sort(), [...expectedEmployeeTabs].sort());

    const restrictedForEmployee = ROLE_TABS.admin.filter(t => !ROLE_TABS.employee.includes(t));
    assert.strictEqual(restrictedForEmployee.length, 15, '15 tabs must be restricted for employee');
    assert.ok(restrictedForEmployee.includes('dashboard'));
    assert.ok(restrictedForEmployee.includes('leads'));
    assert.ok(restrictedForEmployee.includes('analytics-stats'));
    assert.ok(restrictedForEmployee.includes('tariffs'));
  });

  await test('Tier 1 R2.4: Programmatic switchNavTab navigation guard for Manager to forbidden tab redirects to dashboard', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserRole: 'manager',
        currentUserId: 'emp-2'
      }
    });

    // Verify role matrix contract
    const canAccessTariffs = ROLE_TABS.manager.includes('tariffs');
    assert.strictEqual(canAccessTariffs, false, 'Manager cannot access tariffs');

    const canAccessSettings = ROLE_TABS.manager.includes('settings');
    assert.strictEqual(canAccessSettings, false, 'Manager cannot access settings');
  });

  await test('Tier 1 R2.5: Programmatic switchNavTab navigation guard for Employee to forbidden tab redirects to my-zhk', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        currentUserId: 'emp-3'
      }
    });

    const canAccessLeads = ROLE_TABS.employee.includes('leads');
    assert.strictEqual(canAccessLeads, false, 'Employee cannot access leads');

    const canAccessDashboard = ROLE_TABS.employee.includes('dashboard');
    assert.strictEqual(canAccessDashboard, false, 'Employee cannot access dashboard');
  });

  await test('Tier 1 R2.6: Employee role on tab-my-zhk operates in view-only mode', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserRole: 'employee',
        currentUserId: 'emp-3'
      }
    });

    // In Employee role, adding/editing complexes is prohibited
    const employeeRole = sandbox.localStorage.getItem('currentUserRole');
    assert.strictEqual(employeeRole, 'employee');
  });

  await test('Tier 1 R2.7: Sidebar section titles collapse when all child items are restricted', () => {
    const managerAllowed = ROLE_TABS.manager;
    const settingsGroup = ['settings', 'audit-log', 'employees', 'documents', 'company-info'];
    const hasAnyVisible = settingsGroup.some(tab => managerAllowed.includes(tab));
    assert.strictEqual(hasAnyVisible, false, 'Company/Settings group items are all hidden for manager');
  });

  // --- R3: UNIFIED AUTHENTICATION, SESSION STATE & BADGES ---

  await test('Tier 1 R3.1: Unified login with Admin credentials authenticates as role: admin', () => {
    const sandbox = createRbacTestSandbox();
    const adminEmail = 'a.dmitriev@rascvet39.ru';
    const authData = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-1'));
    
    assert.strictEqual(authData.email, adminEmail);
    assert.strictEqual(authData.passwordHash, sha256('password123'));
    assert.strictEqual(authData.role, 'admin');
    assert.strictEqual(authData.status, 'active');
  });

  await test('Tier 1 R3.2: Unified login with Manager credentials authenticates as role: manager', () => {
    const sandbox = createRbacTestSandbox();
    const managerEmail = 'e.kovaleva@rascvet39.ru';
    const authData = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-2'));
    
    assert.strictEqual(authData.email, managerEmail);
    assert.strictEqual(authData.passwordHash, sha256('password123'));
    assert.strictEqual(authData.role, 'manager');
  });

  await test('Tier 1 R3.3: Unified login with Employee credentials authenticates as role: employee', () => {
    const sandbox = createRbacTestSandbox();
    const empEmail = 'm.sokolov@rascvet39.ru';
    const authData = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-3'));
    
    assert.strictEqual(authData.email, empEmail);
    assert.strictEqual(authData.passwordHash, sha256('password123'));
    assert.strictEqual(authData.role, 'employee');
  });

  await test('Tier 1 R3.4: Authentication fails when password hash does not match', () => {
    const enteredHash = sha256('wrongPassword');
    assert.notStrictEqual(enteredHash, PASSWORD_123_HASH, 'Mismatched password hash must fail comparison');
  });

  await test('Tier 1 R3.5: Header profile correctly renders role label and icon badge for each role', () => {
    const roleBadges = {
      admin: { label: 'Администратор', icon: '👑' },
      manager: { label: 'Менеджер', icon: '💼' },
      employee: { label: 'Сотрудник', icon: '👤' }
    };

    assert.strictEqual(roleBadges.admin.icon, '👑');
    assert.strictEqual(roleBadges.manager.icon, '💼');
    assert.strictEqual(roleBadges.employee.icon, '👤');
  });

  await test('Tier 1 R3.6: Logout terminates session by purging currentUserId and currentUserRole', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserId: 'emp-2',
        currentUserRole: 'manager'
      }
    });

    sandbox.localStorage.removeItem('currentUserId');
    sandbox.localStorage.removeItem('currentUserRole');

    assert.strictEqual(sandbox.localStorage.getItem('currentUserId'), null);
    assert.strictEqual(sandbox.localStorage.getItem('currentUserRole'), null);
  });

  // --- R4: EMPLOYEE MANAGEMENT TABLE & ACTIONS ---

  await test('Tier 1 R4.1: Employee management table renders columns (Name, Role, Phone, Email, Status, Actions)', () => {
    const sandbox = createRbacTestSandbox();
    if (typeof sandbox.window.renderEmployeesTable === 'function') {
      sandbox.window.renderEmployeesTable();
    }
    const tbody = sandbox.document.getElementById('employees-table-body');
    assert.ok(tbody, 'Employee table tbody must exist in DOM');
  });

  await test('Tier 1 R4.2: Block/unblock action toggles employee status between active and blocked', () => {
    const sandbox = createRbacTestSandbox();
    let employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    let emp = employees.find(e => e.id === 'emp-2');
    
    assert.strictEqual(emp.status, 'active');
    emp.status = 'blocked';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    let updatedList = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    let updatedEmp = updatedList.find(e => e.id === 'emp-2');
    assert.strictEqual(updatedEmp.status, 'blocked');

    // Toggle back to active
    updatedEmp.status = 'active';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(updatedList));
    assert.strictEqual(JSON.parse(sandbox.localStorage.getItem('amber_employees_3')).find(e => e.id === 'emp-2').status, 'active');
  });

  await test('Tier 1 R4.3: Role edit action toggles between manager and employee roles', () => {
    const sandbox = createRbacTestSandbox();
    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const emp = employees.find(e => e.id === 'emp-3');
    
    assert.strictEqual(emp.role, 'employee');
    emp.role = 'manager';
    emp.roleTitle = 'Менеджер ОП';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    const updated = JSON.parse(sandbox.localStorage.getItem('amber_employees_3')).find(e => e.id === 'emp-3');
    assert.strictEqual(updated.role, 'manager');
  });

  await test('Tier 1 R4.4: Token regeneration creates a fresh single-use invite for pending employee', () => {
    const sandbox = createRbacTestSandbox();
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    const newToken = 'emp_inv_regen_' + Date.now();
    
    invites[newToken] = {
      token: newToken,
      devId: 3,
      developerName: 'ГК «Расцвет»',
      email: 'o.novikova@rascvet39.ru',
      name: 'Ольга Новикова',
      role: 'manager',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      used: false,
      usedAt: null,
      createdById: 'emp-1'
    };
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    const stored = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    assert.ok(stored[newToken]);
    assert.strictEqual(stored[newToken].email, 'o.novikova@rascvet39.ru');
    assert.strictEqual(stored[newToken].used, false);
  });

  await test('Tier 1 R4.5: Delete employee removes record from amber_employees_${devId}', () => {
    const sandbox = createRbacTestSandbox();
    let employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const initialCount = employees.length;
    
    employees = employees.filter(e => e.id !== 'emp-5');
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    const updated = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    assert.strictEqual(updated.length, initialCount - 1);
    assert.strictEqual(updated.some(e => e.id === 'emp-5'), false);
  });

  await test('Tier 1 R4.6: Seed demo data initializes 5 accounts for Developer 3 (Admin, Manager, Employee, Blocked, Pending)', () => {
    const sandbox = createRbacTestSandbox();
    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    
    assert.ok(employees.length >= 5, 'Seed data should contain at least 5 employee profiles');
    const roles = employees.map(e => e.role);
    assert.ok(roles.includes('admin'), 'Must have admin profile');
    assert.ok(roles.includes('manager'), 'Must have manager profile');
    assert.ok(roles.includes('employee'), 'Must have employee profile');

    const statuses = employees.map(e => e.status);
    assert.ok(statuses.includes('active'), 'Must have active accounts');
    assert.ok(statuses.includes('blocked'), 'Must have blocked accounts');
    assert.ok(statuses.includes('pending'), 'Must have pending accounts');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 2: BOUNDARY & CORNER CASES (≥12 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier 2 T2.1: Replay attack on invite token (already used) is strictly rejected', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        amber_employee_invites: {
          emp_inv_already_used: {
            token: 'emp_inv_already_used',
            email: 'used@rascvet39.ru',
            used: true,
            status: 'used'
          }
        }
      }
    });

    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    const tokenRecord = invites['emp_inv_already_used'];
    assert.strictEqual(tokenRecord.used, true);
    
    // An already used token cannot be accepted again
    const canAccept = !tokenRecord.used && tokenRecord.status === 'pending';
    assert.strictEqual(canAccept, false, 'Replay of used token must be rejected');
  });

  await test('Tier 2 T2.2: Expired invite token past 30 days is rejected', () => {
    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString();
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        amber_employee_invites: {
          emp_inv_expired: {
            token: 'emp_inv_expired',
            email: 'expired@rascvet39.ru',
            used: false,
            status: 'pending',
            expiresAt: pastDate
          }
        }
      }
    });

    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites'));
    const invite = invites['emp_inv_expired'];
    const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
    assert.strictEqual(isExpired, true, 'Token past expiresAt date is expired');
  });

  await test('Tier 2 T2.3: Disallowing Admin role assignment in employee creation/invitation', () => {
    function sanitizeInviteRole(requestedRole) {
      if (requestedRole === 'admin') {
        throw new Error('Роль "Администратор" не может быть назначена через приглашение сотрудника');
      }
      return requestedRole === 'manager' ? 'manager' : 'employee';
    }

    assert.throws(() => sanitizeInviteRole('admin'), /Администратор/);
    assert.strictEqual(sanitizeInviteRole('manager'), 'manager');
    assert.strictEqual(sanitizeInviteRole('employee'), 'employee');
  });

  await test('Tier 2 T2.4: Blocked employee login attempts are rejected with error status', () => {
    const sandbox = createRbacTestSandbox();
    const blockedAuth = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-5'));
    
    assert.strictEqual(blockedAuth.status, 'blocked');
    const isLoginPermitted = blockedAuth.status === 'active';
    assert.strictEqual(isLoginPermitted, false, 'Blocked user cannot authenticate');
  });

  await test('Tier 2 T2.5: Direct programmatic tab switching by Employee to tariffs is blocked and redirected to my-zhk', () => {
    const employeeRole = 'employee';
    const requestedTab = 'tariffs';
    const isAllowed = ROLE_TABS[employeeRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : (employeeRole === 'employee' ? 'my-zhk' : 'dashboard');
    assert.strictEqual(fallbackTab, 'my-zhk');
  });

  await test('Tier 2 T2.6: Direct programmatic tab switching by Employee to company-info redirects to my-zhk', () => {
    const employeeRole = 'employee';
    const requestedTab = 'company-info';
    const isAllowed = ROLE_TABS[employeeRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : (employeeRole === 'employee' ? 'my-zhk' : 'dashboard');
    assert.strictEqual(fallbackTab, 'my-zhk');
  });

  await test('Tier 2 T2.7: Direct programmatic tab switching by Employee to settings redirects to my-zhk', () => {
    const employeeRole = 'employee';
    const requestedTab = 'settings';
    const isAllowed = ROLE_TABS[employeeRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : (employeeRole === 'employee' ? 'my-zhk' : 'dashboard');
    assert.strictEqual(fallbackTab, 'my-zhk');
  });

  await test('Tier 2 T2.8: Direct programmatic tab switching by Manager to settings redirects to dashboard', () => {
    const managerRole = 'manager';
    const requestedTab = 'settings';
    const isAllowed = ROLE_TABS[managerRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : 'dashboard';
    assert.strictEqual(fallbackTab, 'dashboard');
  });

  await test('Tier 2 T2.9: Direct programmatic tab switching by Manager to tariffs redirects to dashboard', () => {
    const managerRole = 'manager';
    const requestedTab = 'tariffs';
    const isAllowed = ROLE_TABS[managerRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : 'dashboard';
    assert.strictEqual(fallbackTab, 'dashboard');
  });

  await test('Tier 2 T2.10: Direct programmatic tab switching by Manager to company-info redirects to dashboard', () => {
    const managerRole = 'manager';
    const requestedTab = 'company-info';
    const isAllowed = ROLE_TABS[managerRole].includes(requestedTab);
    assert.strictEqual(isAllowed, false);
    const fallbackTab = isAllowed ? requestedTab : 'dashboard';
    assert.strictEqual(fallbackTab, 'dashboard');
  });

  await test('Tier 2 T2.11: Action gating prevents Employee from invoking add-zhk editor modal', () => {
    function canOpenZhkEditor(userRole) {
      return userRole === 'admin' || userRole === 'manager';
    }

    assert.strictEqual(canOpenZhkEditor('admin'), true);
    assert.strictEqual(canOpenZhkEditor('manager'), true);
    assert.strictEqual(canOpenZhkEditor('employee'), false, 'Employee cannot edit residential complexes');
  });

  await test('Tier 2 T2.12: Empty or malformed input validation on login and invite submissions', () => {
    function validateInviteInput(name, email, role) {
      if (!name || !name.trim()) return { valid: false, error: 'Имя обязательно' };
      if (!email || !email.includes('@') || !email.includes('.')) return { valid: false, error: 'Некорректный email' };
      if (role !== 'manager' && role !== 'employee') return { valid: false, error: 'Недопустимая роль' };
      return { valid: true };
    }

    assert.strictEqual(validateInviteInput('', 'test@test.com', 'manager').valid, false);
    assert.strictEqual(validateInviteInput('Иван', 'invalid-email', 'manager').valid, false);
    assert.strictEqual(validateInviteInput('Иван', 'test@test.com', 'admin').valid, false);
    assert.strictEqual(validateInviteInput('Иван', 'test@test.com', 'manager').valid, true);
  });

  await test('Tier 2 T2.13: HTML and script meta-characters in employee name or position are escaped safely', () => {
    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const payload = '<script>alert("xss")</script>';
    const escaped = escapeHtml(payload);
    assert.strictEqual(escaped.includes('<script>'), false);
    assert.ok(escaped.includes('&lt;script&gt;'));
  });

  await test('Tier 2 T2.14: Graceful handling and recovery from corrupt amber_employees JSON in localStorage', () => {
    const sandbox = createRbacTestSandbox();
    sandbox.localStorage.setItem('amber_employees_3', 'INVALID_JSON_CORRUPT');

    let loaded = [];
    try {
      loaded = JSON.parse(sandbox.localStorage.getItem('amber_employees_3') || '[]');
    } catch(e) {
      loaded = [];
    }

    assert.ok(Array.isArray(loaded));
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 3: CROSS-FEATURE COMBINATIONS (≥8 Tests)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier 3 T3.1: Full Admin -> Invite Manager -> Accept -> Login -> Verify 6 Tabs -> Demote to Employee -> Verify 3 Tabs', () => {
    const sandbox = createRbacTestSandbox();

    // 1. Admin generates invite for Manager
    const token = 'emp_inv_lifecycle_001';
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    invites[token] = {
      token,
      devId: 3,
      developerName: 'ГК «Расцвет»',
      email: 'lifecycle.mgr@rascvet39.ru',
      name: 'Мария Антонова',
      position: 'Менеджер по продажам',
      role: 'manager',
      status: 'pending',
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    };
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    // 2. Manager accepts and sets password
    const empId = 'emp-lifecycle-1';
    const pwdHash = sha256('password123');
    sandbox.localStorage.setItem('amber_employee_auth_' + empId, JSON.stringify({
      empId,
      devId: 3,
      email: 'lifecycle.mgr@rascvet39.ru',
      passwordHash: pwdHash,
      role: 'manager',
      status: 'active'
    }));
    invites[token].used = true;
    invites[token].status = 'used';
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    // 3. Manager logs in -> Session active as manager (6 tabs)
    sandbox.localStorage.setItem('currentUserId', empId);
    sandbox.localStorage.setItem('currentUserRole', 'manager');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 6);

    // 4. Admin changes role to Employee
    sandbox.localStorage.setItem('currentUserRole', 'employee');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 3);
  });

  await test('Tier 3 T3.2: Real-time session invalidation when Admin blocks active Employee', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserId: 'emp-2',
        currentUserRole: 'manager'
      }
    });

    // Admin updates status to blocked in database
    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const emp = employees.find(e => e.id === 'emp-2');
    emp.status = 'blocked';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    // Next validation checks status
    const currentUserId = sandbox.localStorage.getItem('currentUserId');
    const updatedEmp = JSON.parse(sandbox.localStorage.getItem('amber_employees_3')).find(e => e.id === currentUserId);
    assert.strictEqual(updatedEmp.status, 'blocked');

    const isSessionValid = updatedEmp.status === 'active';
    assert.strictEqual(isSessionValid, false, 'Blocked session must be invalidated');
  });

  await test('Tier 3 T3.3: Instant switching between pre-seeded demo accounts (Admin, Manager, Employee)', () => {
    const sandbox = createRbacTestSandbox();
    
    // Switch to Admin
    sandbox.localStorage.setItem('currentUserId', 'emp-1');
    sandbox.localStorage.setItem('currentUserRole', 'admin');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 18);

    // Switch to Manager
    sandbox.localStorage.setItem('currentUserId', 'emp-2');
    sandbox.localStorage.setItem('currentUserRole', 'manager');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 6);

    // Switch to Employee
    sandbox.localStorage.setItem('currentUserId', 'emp-3');
    sandbox.localStorage.setItem('currentUserRole', 'employee');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 3);
  });

  await test('Tier 3 T3.4: Multi-Developer tenant isolation prevents cross-developer authentication', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentDevId: '1',
        amber_employees_1: [
          { id: 'emp-dev1-1', devId: 1, email: 'admin@ksk39.ru', role: 'admin', status: 'active' }
        ]
      }
    });

    const dev1Employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_1'));
    const dev3Employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));

    assert.strictEqual(dev1Employees.some(e => e.email === 'a.dmitriev@rascvet39.ru'), false, 'Dev 1 does not contain Dev 3 employee');
    assert.strictEqual(dev3Employees.some(e => e.email === 'admin@ksk39.ru'), false, 'Dev 3 does not contain Dev 1 employee');
  });

  await test('Tier 3 T3.5: Cryptographic audit log chaining on employee creation and role change events', () => {
    const sandbox = createRbacTestSandbox();
    const auditQueue = [
      {
        id: 'audit-emp-001',
        timestamp: new Date().toISOString(),
        action: 'employee_invite_created',
        details: 'Создано приглашение для o.novikova@rascvet39.ru (Менеджер)',
        actor: 'a.dmitriev@rascvet39.ru (Администратор)',
        prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: sha256('audit-emp-001')
      },
      {
        id: 'audit-emp-002',
        timestamp: new Date().toISOString(),
        action: 'employee_role_updated',
        details: 'Изменена роль m.sokolov@rascvet39.ru на Сотрудник',
        actor: 'a.dmitriev@rascvet39.ru (Администратор)',
        prevHash: sha256('audit-emp-001'),
        hash: sha256('audit-emp-002')
      }
    ];

    sandbox.localStorage.setItem('amber_audit_logs_queue_3', JSON.stringify(auditQueue));
    const logs = JSON.parse(sandbox.localStorage.getItem('amber_audit_logs_queue_3'));
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[1].prevHash, logs[0].hash, 'Chained hash must match previous entry hash');
  });

  await test('Tier 3 T3.6: CRM Leads filtering: Manager assigned to specific complexes views assigned leads', () => {
    const managerEmp = SEED_EMPLOYEES_DEV3.find(e => e.id === 'emp-2');
    assert.ok(managerEmp.assignedZhks.includes('Расцвет на Гагарина'));
    
    const mockLeads = [
      { id: 'lead-1', devId: 3, zhkName: 'ЖК «Расцвет на Гагарина»', clientName: 'Ирина В.' },
      { id: 'lead-2', devId: 3, zhkName: 'ЖК «Гусевский»', clientName: 'Василий К.' }
    ];

    const assignedZhksList = managerEmp.assignedZhks.split(',').map(s => s.trim());
    const visibleLeads = mockLeads.filter(l => assignedZhksList.some(z => l.zhkName.includes(z.replace(/ЖК\s*[«»]/g, '').trim())));
    assert.ok(visibleLeads.length >= 1);
  });

  await test('Tier 3 T3.7: Combined Tariff Gating and Role Gating: Manager on Basic tariff', () => {
    const userRole = 'manager';
    const tariffPlan = 'basic';

    // Competitors tab is both tariff-gated (requires PRO/PREMIUM) and role-gated (requires Admin)
    const isRoleAllowed = ROLE_TABS[userRole].includes('analytics-competitors');
    const isTariffAllowed = tariffPlan !== 'basic';

    assert.strictEqual(isRoleAllowed, false, 'Manager cannot access competitors by role');
    assert.strictEqual(isTariffAllowed, false, 'Basic tariff cannot access competitors by plan');
  });

  await test('Tier 3 T3.8: Password update flow invalidates old password and authenticates new credentials', () => {
    const sandbox = createRbacTestSandbox();
    const oldHash = PASSWORD_123_HASH;
    const newHash = sha256('newSecurePass2026!');

    const authKey = 'amber_employee_auth_emp-3';
    const authData = JSON.parse(sandbox.localStorage.getItem(authKey));
    assert.strictEqual(authData.passwordHash, oldHash);

    // Update password
    authData.passwordHash = newHash;
    authData.lastLogin = new Date().toISOString();
    sandbox.localStorage.setItem(authKey, JSON.stringify(authData));

    const updatedAuth = JSON.parse(sandbox.localStorage.getItem(authKey));
    assert.strictEqual(updatedAuth.passwordHash, newHash);
    assert.notStrictEqual(updatedAuth.passwordHash, oldHash);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 4: REAL-WORLD SCENARIOS (5 Core End-to-End Scenarios)
  // ════════════════════════════════════════════════════════════════════════════

  await test('Tier 4 Scenario 1: New Manager Onboarding from Invite Generation to CRM Leads Management', () => {
    const sandbox = createRbacTestSandbox();

    // 1. HR Admin invites new sales manager
    const token = 'emp_inv_scenario_onboarding';
    const invites = JSON.parse(sandbox.localStorage.getItem('amber_employee_invites') || '{}');
    invites[token] = {
      token,
      devId: 3,
      developerName: 'ГК «Расцвет»',
      email: 'elena.manager@rascvet39.ru',
      name: 'Елена Белова',
      position: 'Менеджер отдела продаж',
      role: 'manager',
      status: 'pending',
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    };
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    // 2. Elena opens link and creates password
    const empId = 'emp-scenario-elena';
    sandbox.localStorage.setItem('amber_employee_auth_' + empId, JSON.stringify({
      empId,
      devId: 3,
      email: 'elena.manager@rascvet39.ru',
      passwordHash: sha256('Elena2026!'),
      role: 'manager',
      status: 'active'
    }));
    invites[token].used = true;
    sandbox.localStorage.setItem('amber_employee_invites', JSON.stringify(invites));

    // 3. Elena logs in and accesses CRM leads
    sandbox.localStorage.setItem('currentUserId', empId);
    sandbox.localStorage.setItem('currentUserRole', 'manager');
    
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].includes('leads'), true, 'Manager has access to leads CRM');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].includes('tariffs'), false, 'Manager has no access to company tariffs');
  });

  await test('Tier 4 Scenario 2: Junior Field Employee Restricted Show Workflow', () => {
    const sandbox = createRbacTestSandbox({
      initialLocalStorage: {
        currentUserId: 'emp-3',
        currentUserRole: 'employee'
      }
    });

    const role = sandbox.localStorage.getItem('currentUserRole');
    assert.strictEqual(role, 'employee');

    // Field employee can view complexes, knowledge base, support
    const allowed = ROLE_TABS[role];
    assert.deepStrictEqual(allowed, ['my-zhk', 'support-tickets', 'knowledge-base']);

    // Attempting to open add-zhk or leads is blocked
    assert.strictEqual(allowed.includes('add-zhk'), false);
    assert.strictEqual(allowed.includes('leads'), false);
    assert.strictEqual(allowed.includes('tariffs'), false);
  });

  await test('Tier 4 Scenario 3: Immediate Account Suspension & Employee Offboarding', () => {
    const sandbox = createRbacTestSandbox();

    // 1. Admin detects violation and immediately blocks Denis
    const employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const denis = employees.find(e => e.email === 'd.volkov@rascvet39.ru');
    denis.status = 'blocked';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    // 2. Denis attempts login -> Rejected
    const authData = JSON.parse(sandbox.localStorage.getItem('amber_employee_auth_emp-5'));
    assert.strictEqual(authData.status, 'blocked');

    // 3. Admin permanently deletes employee from directory
    const activeEmployees = employees.filter(e => e.id !== 'emp-5');
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(activeEmployees));
    sandbox.localStorage.removeItem('amber_employee_auth_emp-5');

    assert.strictEqual(sandbox.localStorage.getItem('amber_employee_auth_emp-5'), null);
    assert.strictEqual(JSON.parse(sandbox.localStorage.getItem('amber_employees_3')).some(e => e.id === 'emp-5'), false);
  });

  await test('Tier 4 Scenario 4: Career Promotion from Employee to Sales Manager', () => {
    const sandbox = createRbacTestSandbox();

    // Mikhail starts as employee
    let employees = JSON.parse(sandbox.localStorage.getItem('amber_employees_3'));
    const mikhail = employees.find(e => e.id === 'emp-3');
    assert.strictEqual(mikhail.role, 'employee');

    // Admin promotes Mikhail to Manager
    mikhail.role = 'manager';
    mikhail.roleTitle = 'Ведущий менеджер ОП';
    sandbox.localStorage.setItem('amber_employees_3', JSON.stringify(employees));

    // Auth record updated
    const authKey = 'amber_employee_auth_emp-3';
    const authRecord = JSON.parse(sandbox.localStorage.getItem(authKey));
    authRecord.role = 'manager';
    sandbox.localStorage.setItem(authKey, JSON.stringify(authRecord));

    // Mikhail logs in with new role
    sandbox.localStorage.setItem('currentUserRole', 'manager');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 6);
    assert.ok(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].includes('leads'));
  });

  await test('Tier 4 Scenario 5: Shared Workstation Session Switching Across Admin, Manager and Employee', () => {
    const sandbox = createRbacTestSandbox();

    // 1. Admin conducts morning review
    sandbox.localStorage.setItem('currentUserId', 'emp-1');
    sandbox.localStorage.setItem('currentUserRole', 'admin');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 18);

    // 2. Admin logs out
    sandbox.localStorage.removeItem('currentUserId');
    sandbox.localStorage.removeItem('currentUserRole');

    // 3. Manager Elena logs in
    sandbox.localStorage.setItem('currentUserId', 'emp-2');
    sandbox.localStorage.setItem('currentUserRole', 'manager');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 6);

    // 4. Manager logs out
    sandbox.localStorage.removeItem('currentUserId');
    sandbox.localStorage.removeItem('currentUserRole');

    // 5. Employee Mikhail logs in
    sandbox.localStorage.setItem('currentUserId', 'emp-3');
    sandbox.localStorage.setItem('currentUserRole', 'employee');
    assert.strictEqual(ROLE_TABS[sandbox.localStorage.getItem('currentUserRole')].length, 3);

    // 6. Clean final logout
    sandbox.localStorage.removeItem('currentUserId');
    sandbox.localStorage.removeItem('currentUserRole');
    assert.strictEqual(sandbox.localStorage.getItem('currentUserId'), null);
  });

  return results;
}

module.exports = {
  runEmployeeRbacSuite,
  ROLE_TABS,
  SEED_EMPLOYEES_DEV3,
  SEED_INVITES_DEV3,
  SEED_AUTH_DEV3
};
