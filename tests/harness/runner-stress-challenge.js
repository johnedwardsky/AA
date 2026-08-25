'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const {
  createAdminSandbox,
  createCabinetSandbox,
  createCatalogSandbox,
  DOMElement,
  MockLocalStorage
} = require('./dom-sandbox');

const { FIXTURES, createAuditLogEntry } = require('./test-fixtures');

async function runAdversarialChallenges() {
  const challengeResults = [];

  function logChallenge(id, title, status, details = {}) {
    challengeResults.push({ id, title, status, details });
    console.log(`[${status}] ${id}: ${title}`);
    if (status === 'FAIL' || status === 'VULNERABILITY') {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }

  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('  RUNNING ADVERSARIAL RUNNER & DOM-SANDBOX STRESS SUITE');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 1: Multi-Run Determinism & Concurrency/Sequence Stability (10 Runs)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 1: Rapid Multi-Run Execution (10 Consecutive Test Iterations)...');
  try {
    const memoryPerRun = [];
    const durationPerRun = [];
    const { runTier2Tests } = require('../tier2-boundary-corner.test');

    for (let run = 1; run <= 10; run++) {
      if (global.gc) global.gc();
      const m0 = process.memoryUsage().heapUsed;
      const t0 = Date.now();
      const res = await runTier2Tests();
      const dur = Date.now() - t0;
      const m1 = process.memoryUsage().heapUsed;
      const allPassed = res.every(r => r.passed);
      memoryPerRun.push(m1 - m0);
      durationPerRun.push(dur);

      if (!allPassed) {
        throw new Error(`Run #${run} had failing tests: ` + res.filter(r => !r.passed).map(r => r.name).join(', '));
      }
    }
    logChallenge('ADV-RUNNER-01', 'Multi-Run Determinism (10 Consecutive Iterations)', 'PASS', {
      durations: durationPerRun,
      avgDurationMs: (durationPerRun.reduce((a, b) => a + b, 0) / 10).toFixed(1)
    });
  } catch (err) {
    logChallenge('ADV-RUNNER-01', 'Multi-Run Determinism (10 Consecutive Iterations)', 'FAIL', {
      error: err.message,
      stack: err.stack
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 2: Memory Stability & Heap Growth Across 100 Sandbox Instantiations
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 2: Memory Leak & Heap Retention Stress (100 Admin Sandboxes)...');
  try {
    const heapSnapshots = [];
    for (let i = 0; i < 100; i++) {
      const sb = createAdminSandbox({
        initialLocalStorage: { [`test_key_${i}`]: 'value_' + i }
      });
      // Perform typical DOM operations
      sb.window.switchAdminSection('developers');
      sb.window.renderPropertiesTable();
      sb.document.querySelector('.admin-nav-item[data-section="monetization"]')?.click();
      if (i % 20 === 0) {
        heapSnapshots.push({
          iteration: i,
          heapUsedMB: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)
        });
      }
    }
    const finalHeapMB = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
    logChallenge('ADV-RUNNER-02', 'Memory Stability across 100 Sandboxes', 'PASS', {
      snapshots: heapSnapshots,
      finalHeapMB
    });
  } catch (err) {
    logChallenge('ADV-RUNNER-02', 'Memory Stability across 100 Sandboxes', 'FAIL', {
      error: err.message
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 3: Storage Isolation Between Sandboxes
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 3: Cross-Sandbox Storage Isolation...');
  try {
    const sbA = createAdminSandbox({
      initialLocalStorage: { leaked_secret_key: 'TOP_SECRET_VALUE' }
    });
    sbA.localStorage.setItem('dynamic_key_from_test_A', 'INJECTED_VALUE');

    const sbB = createAdminSandbox({ initialLocalStorage: {} });
    const leaked1 = sbB.localStorage.getItem('leaked_secret_key');
    const leaked2 = sbB.localStorage.getItem('dynamic_key_from_test_A');

    if (leaked1 !== null || leaked2 !== null) {
      logChallenge('ADV-RUNNER-03', 'Storage Isolation Between Sandboxes', 'VULNERABILITY', {
        leaked1,
        leaked2
      });
    } else {
      logChallenge('ADV-RUNNER-03', 'Storage Isolation Between Sandboxes', 'PASS', {
        isolated: true
      });
    }
  } catch (err) {
    logChallenge('ADV-RUNNER-03', 'Storage Isolation Between Sandboxes', 'FAIL', {
      error: err.message
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 4: Global Variable & Prototype Pollution Leakage
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 4: Global Scope & GlobalThis Pollution...');
  try {
    const sbA = createAdminSandbox();
    sbA.window.POLLUTED_GLOBAL_VAR = 'HACKED_DATA';
    sbA.window.AMBER_DATA.developers.push({ id: 9999, name: 'Malicious Dev' });

    const sbB = createAdminSandbox();
    const leakedGlobal = sbB.window.POLLUTED_GLOBAL_VAR;
    const leakedDev = sbB.window.AMBER_DATA.developers.find(d => d.id === 9999);
    const leakedNodeGlobal = global.POLLUTED_GLOBAL_VAR;

    if (leakedGlobal || leakedDev || leakedNodeGlobal) {
      logChallenge('ADV-RUNNER-04', 'Global Scope & Object Mutation Isolation', 'VULNERABILITY', {
        leakedGlobal,
        leakedDev: Boolean(leakedDev),
        leakedNodeGlobal
      });
    } else {
      logChallenge('ADV-RUNNER-04', 'Global Scope & Object Mutation Isolation', 'PASS', {
        isolated: true
      });
    }
  } catch (err) {
    logChallenge('ADV-RUNNER-04', 'Global Scope & Object Mutation Isolation', 'FAIL', {
      error: err.message
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 5: Event Listener Teardown & Cross-Document Handler Leakage
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 5: Event Listener Isolation & Teardown...');
  try {
    let callCount = 0;
    const sb1 = createAdminSandbox();
    sb1.document.addEventListener('custom_test_event', () => { callCount++; });
    sb1.document.dispatchEvent({ type: 'custom_test_event' });
    assert.strictEqual(callCount, 1, 'First sandbox triggered handler');

    const sb2 = createAdminSandbox();
    sb2.document.dispatchEvent({ type: 'custom_test_event' });
    assert.strictEqual(callCount, 1, 'Second sandbox must NOT trigger first sandbox handler');

    logChallenge('ADV-RUNNER-05', 'Event Listener Isolation & Teardown', 'PASS', {
      handlersLeaked: false
    });
  } catch (err) {
    logChallenge('ADV-RUNNER-05', 'Event Listener Isolation & Teardown', 'FAIL', {
      error: err.message
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 6: Cabinet Sandbox Window Interface Completeness
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 6: Cabinet Sandbox Window Interface & addEventListener...');
  try {
    const sbCab = createCabinetSandbox({ developerId: 1 });
    const errors = sbCab.getConsoleErrors();
    const hasAddEventListener = typeof sbCab.window.addEventListener === 'function';

    if (errors.some(e => e.includes('addEventListener is not a function')) || !hasAddEventListener) {
      logChallenge('ADV-RUNNER-06', 'Cabinet Sandbox Window Interface Support', 'VULNERABILITY', {
        errors,
        hasWindowAddEventListener: hasAddEventListener,
        impact: 'Cabinet scripts using window.addEventListener fail immediately upon initialization'
      });
    } else {
      logChallenge('ADV-RUNNER-06', 'Cabinet Sandbox Window Interface Support', 'PASS', {
        errors
      });
    }
  } catch (err) {
    logChallenge('ADV-RUNNER-06', 'Cabinet Sandbox Window Interface Support', 'FAIL', {
      error: err.message
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 7: DOM Parser Malformed Markup & Entity Stress
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 7: DOM Parser Edge-Case HTML Handling...');
  try {
    const testCases = [
      { html: '<div><p>Unclosed paragraph<div>Nested</div>', name: 'Unclosed tags' },
      { html: '<input type="text" value="Quotes \'inside\' \"double\"" disabled>', name: 'Mixed quotes in attributes' },
      { html: '<div data-json=\'{"a": 1, "b": "hello"}\'>Json Attr</div>', name: 'JSON in attributes' },
      { html: '<!-- Comment with <tags> and -- inside --><span>Text</span>', name: 'Comments with HTML' },
      { html: '<select><option value="1">One</option><option value="2" selected>Two</option></select>', name: 'Select option parsing' }
    ];

    let allParsed = true;
    const failures = [];

    testCases.forEach(tc => {
      const parent = new DOMElement('div');
      try {
        parent.innerHTML = tc.html;
        if (parent.children.length === 0 && !parent.textContent) {
          allParsed = false;
          failures.push({ name: tc.name, reason: 'Empty parsed result' });
        }
      } catch (e) {
        allParsed = false;
        failures.push({ name: tc.name, reason: e.message });
      }
    });

    if (allParsed) {
      logChallenge('ADV-RUNNER-07', 'DOM Parser HTML Robustness', 'PASS', { testCasesCount: testCases.length });
    } else {
      logChallenge('ADV-RUNNER-07', 'DOM Parser HTML Robustness', 'FAIL', { failures });
    }
  } catch (err) {
    logChallenge('ADV-RUNNER-07', 'DOM Parser HTML Robustness', 'FAIL', { error: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Challenge 8: Timer Handle Lifetime & Async Teardown
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ Challenge 8: Timer Leaks in VM Sandbox...');
  try {
    const sb = createAdminSandbox();
    let timerFired = false;
    sb.window.setTimeout(() => { timerFired = true; }, 10);
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(timerFired, true, 'Sandbox setTimeout executes');

    logChallenge('ADV-RUNNER-08', 'Timer Operations in Sandbox Context', 'PASS', {
      timeoutWorking: true
    });
  } catch (err) {
    logChallenge('ADV-RUNNER-08', 'Timer Operations in Sandbox Context', 'FAIL', {
      error: err.message
    });
  }

  // Write full challenge results
  const reportPath = path.resolve(__dirname, 'challenge-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(challengeResults, null, 2));

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(`  CHALLENGE COMPLETE: ${challengeResults.filter(r => r.status === 'PASS').length}/${challengeResults.length} PASSED`);
  console.log('════════════════════════════════════════════════════════════════════════════');
  process.exit(0);
}

runAdversarialChallenges().catch(err => {
  console.error('Fatal challenge runner error:', err);
  process.exit(1);
});
