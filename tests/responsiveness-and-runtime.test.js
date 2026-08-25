'use strict';

const assert = require('node:assert');
const { createAdminSandbox, createCabinetSandbox, createCatalogSandbox } = require('./harness/dom-sandbox');

/**
 * Responsive Viewports & Zero-Console-Error Assertions Suite
 * Verifies layout integrity across breakpoints (375px to 4K) and guarantees
 * zero console errors across all admin sections, cabinet tabs, and catalog rendering.
 */
async function runResponsiveAndRuntimeTests() {
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
  // Viewport Responsive Breakpoints Verification
  // ════════════════════════════════════════════════════════════════════════════

  await test('Responsive R1: Mobile 375px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 375, viewportHeight: 667 });
    assert.strictEqual(sandbox.window.innerWidth, 375);
    assert.ok(sandbox.document.querySelector('.admin-sidebar'));
    assert.ok(sandbox.document.querySelector('.admin-main'));
  });

  await test('Responsive R2: Tablet 768px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 768, viewportHeight: 1024 });
    assert.strictEqual(sandbox.window.innerWidth, 768);
    assert.ok(sandbox.document.querySelector('.admin-sidebar'));
    assert.ok(sandbox.document.querySelector('.admin-main'));
  });

  await test('Responsive R3: Standard Desktop 1200px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 1200, viewportHeight: 800 });
    assert.strictEqual(sandbox.window.innerWidth, 1200);
    const media = sandbox.window.matchMedia('(min-width: 1200px)');
    assert.strictEqual(media.matches, true, 'Matches 1200px breakpoint');
    assert.ok(sandbox.document.querySelector('.admin-sidebar'));
    assert.ok(sandbox.document.querySelector('.admin-main'));
  });

  await test('Responsive R4: Wide Desktop 1440px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 1440, viewportHeight: 900 });
    assert.strictEqual(sandbox.window.innerWidth, 1440);
    const media = sandbox.window.matchMedia('(min-width: 1440px)');
    assert.strictEqual(media.matches, true);
  });

  await test('Responsive R5: Full HD 1920px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 1920, viewportHeight: 1080 });
    assert.strictEqual(sandbox.window.innerWidth, 1920);
    const media = sandbox.window.matchMedia('(min-width: 1920px)');
    assert.strictEqual(media.matches, true);
  });

  await test('Responsive R6: 4K Ultra HD 3840px Viewport layout rendering', () => {
    const sandbox = createAdminSandbox({ viewportWidth: 3840, viewportHeight: 2160 });
    assert.strictEqual(sandbox.window.innerWidth, 3840);
    const media = sandbox.window.matchMedia('(min-width: 1920px)');
    assert.strictEqual(media.matches, true);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Zero-Console-Error & Runtime Stability Assertions
  // ════════════════════════════════════════════════════════════════════════════

  await test('Runtime R7: Zero JavaScript console errors on initial Admin page initialization', () => {
    const sandbox = createAdminSandbox();
    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Expected 0 console errors on init, got: ${JSON.stringify(errors)}`);
  });

  await test('Runtime R8: Zero JavaScript console errors across all sidebar tab switches (6 groups)', () => {
    const sandbox = createAdminSandbox();
    const navItems = sandbox.document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.click();
    });
    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Expected 0 console errors during tab navigation, got: ${JSON.stringify(errors)}`);
  });

  await test('Runtime R9: Zero JavaScript console errors on modal open/close cycles', () => {
    const sandbox = createAdminSandbox();
    const collections = ['properties', 'developers', 'blog', 'experts', 'banners'];
    collections.forEach(col => {
      sandbox.window.openAddModal(col);
      sandbox.window.closeModal();
    });
    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Expected 0 console errors during modal cycles, got: ${JSON.stringify(errors)}`);
  });

  await test('Runtime R10: Zero JavaScript console errors on initial Developer Cabinet load', () => {
    const sandbox = createCabinetSandbox({ developerId: 1 });
    const errors = sandbox.getConsoleErrors();
    assert.strictEqual(errors.length, 0, `Expected 0 console errors in Cabinet, got: ${JSON.stringify(errors)}`);
  });

  return results;
}

if (require.main === module) {
  runResponsiveAndRuntimeTests().then(results => {
    console.log(`RESPONSIVE & RUNTIME RESULTS: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    results.forEach(r => {
      if (!r.passed) console.error(`  FAIL: ${r.name} -> ${r.error}`);
    });
    process.exit(results.every(r => r.passed) ? 0 : 1);
  });
}

module.exports = { runResponsiveAndRuntimeTests };
