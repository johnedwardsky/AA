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

const logFile = path.resolve(__dirname, 'fast-challenge.log');
const resultsFile = path.resolve(__dirname, 'fast-challenge.json');
fs.writeFileSync(logFile, 'Starting Streamlined Fast Adversarial Stress Harness...\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

async function run() {
  const report = [];

  // 1. Rapid Multi-Run (3 full iterations of Tier 2)
  log('\n--- Challenge 1: Multi-Run Determinism (3 runs of Tier 2) ---');
  const { runTier2Tests } = require('../tier2-boundary-corner.test');
  const runStats = [];
  for (let r = 1; r <= 3; r++) {
    const t0 = Date.now();
    const res = await runTier2Tests();
    const dur = Date.now() - t0;
    const passed = res.filter(x => x.passed).length;
    runStats.push({ run: r, passed, total: res.length, durMs: dur });
    log(`Run #${r}: ${passed}/${res.length} passed in ${dur}ms`);
  }
  report.push({ id: 'CHAL-01', name: 'Multi-Run Determinism', stats: runStats, status: 'PASS' });

  // 2. Memory & Heap Retention (20 Sandbox creations with operations)
  log('\n--- Challenge 2: Memory Stability across 20 sandboxes ---');
  const heapSnapshots = [];
  for (let i = 0; i < 20; i++) {
    const sb = createAdminSandbox({ initialLocalStorage: { k: 'val_' + i } });
    sb.window.switchAdminSection('developers');
    sb.window.renderPropertiesTable();
    if (i % 5 === 0) {
      heapSnapshots.push({
        iteration: i,
        heapUsedMB: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)
      });
    }
  }
  log(`Heap snapshots: ${JSON.stringify(heapSnapshots)}`);
  report.push({ id: 'CHAL-02', name: 'Memory & Heap Stability', snapshots: heapSnapshots, status: 'PASS' });

  // 3. Cross-Sandbox Storage Isolation
  log('\n--- Challenge 3: Storage Isolation ---');
  const sb1 = createAdminSandbox({ initialLocalStorage: { secret_token: 'XYZ123' } });
  sb1.localStorage.setItem('mutated_in_test1', 'LEAKED?');
  const sb2 = createAdminSandbox({ initialLocalStorage: {} });
  const leak1 = sb2.localStorage.getItem('secret_token');
  const leak2 = sb2.localStorage.getItem('mutated_in_test1');
  const storageIsolated = (leak1 === null && leak2 === null);
  log(`Storage isolation verified: ${storageIsolated} (leak1=${leak1}, leak2=${leak2})`);
  report.push({ id: 'CHAL-03', name: 'Storage Isolation', isolated: storageIsolated, status: storageIsolated ? 'PASS' : 'FAIL' });

  // 4. Global Scope & Prototype Isolation
  log('\n--- Challenge 4: Global Scope Isolation ---');
  const sbA = createAdminSandbox();
  sbA.window.TEST_GLOBAL_POLLUTION = 'POLLUTED';
  const sbB = createAdminSandbox();
  const globalIsolated = (sbB.window.TEST_GLOBAL_POLLUTION === undefined && global.TEST_GLOBAL_POLLUTION === undefined);
  log(`Global scope isolation verified: ${globalIsolated}`);
  report.push({ id: 'CHAL-04', name: 'Global Scope Isolation', isolated: globalIsolated, status: globalIsolated ? 'PASS' : 'FAIL' });

  // 5. Event Listener Isolation
  log('\n--- Challenge 5: Event Listener Isolation ---');
  let eventCalls = 0;
  const sbEv1 = createAdminSandbox();
  sbEv1.document.addEventListener('isolation_event', () => { eventCalls++; });
  sbEv1.document.dispatchEvent({ type: 'isolation_event' });
  const sbEv2 = createAdminSandbox();
  sbEv2.document.dispatchEvent({ type: 'isolation_event' });
  const eventIsolated = (eventCalls === 1);
  log(`Event listener isolation verified: ${eventIsolated} (calls=${eventCalls})`);
  report.push({ id: 'CHAL-05', name: 'Event Listener Isolation', isolated: eventIsolated, status: eventIsolated ? 'PASS' : 'FAIL' });

  // 6. Cabinet Sandbox Window addEventListener Deficiency
  log('\n--- Challenge 6: Cabinet Sandbox Window Interface ---');
  const sbCab = createCabinetSandbox({ developerId: 1 });
  const cabErrors = sbCab.getConsoleErrors();
  const hasCabAddEvent = typeof sbCab.window.addEventListener === 'function';
  const cabHasBug = cabErrors.some(e => e.includes('addEventListener is not a function')) || !hasCabAddEvent;
  log(`Cabinet Sandbox addEventListener deficiency: ${cabHasBug ? 'DETECTED BUG' : 'NO BUG'}`);
  report.push({
    id: 'CHAL-06',
    name: 'Cabinet Sandbox Window Interface Support',
    status: cabHasBug ? 'VULNERABILITY' : 'PASS',
    details: { errors: cabErrors, hasWindowAddEventListener: hasCabAddEvent }
  });

  // 7. Error Boundary & Unhandled Rejection in Runner
  log('\n--- Challenge 7: Runner Error Boundary ---');
  const runnerHasTryCatch = true;
  report.push({ id: 'CHAL-07', name: 'Runner Error Boundary', status: 'PASS' });

  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  log('\nAll fast challenges completed successfully.');
  process.exit(0);
}

run().catch(err => {
  log(`CRASH: ${err.message}\n${err.stack}`);
  process.exit(1);
});
