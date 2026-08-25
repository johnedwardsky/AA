'use strict';

const { createAdminSandbox } = require('./tests/harness/dom-sandbox');

try {
  const sandbox = createAdminSandbox();
  console.log('Sandbox created successfully!');
  console.log('Document title:', sandbox.document.title);
  console.log('Console errors count:', sandbox.getConsoleErrors().length);
  if (sandbox.getConsoleErrors().length > 0) {
    console.log('Errors:', sandbox.getConsoleErrors());
  }
  const navItems = sandbox.document.querySelectorAll('.admin-nav-item');
  console.log('Nav items found:', navItems.length);
  process.exit(0);
} catch (e) {
  console.error('Smoke test failure:', e);
  process.exit(1);
}
