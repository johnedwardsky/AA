'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function runDiagnostic() {
  console.log('--- STARTING ADVERSARIAL BENCHMARK & DIAGNOSTIC ---');

  const suites = [
    { name: 'Tier 1', path: '../tier1-feature-coverage.test.js' },
    { name: 'Tier 2', path: '../tier2-boundary-corner.test.js' },
    { name: 'Tier 3', path: '../tier3-cross-feature.test.js' },
    { name: 'Tier 4', path: '../tier4-application-scenarios.test.js' },
    { name: 'Tier 5', path: '../tier5-adversarial-hardening.test.js' },
    { name: 'Responsive', path: '../responsiveness-and-runtime.test.js' }
  ];

  for (const s of suites) {
    const memBefore = process.memoryUsage();
    const t0 = Date.now();
    process.stdout.write(`\nTesting suite ${s.name}... `);

    try {
      const suiteModule = require(s.path);
      const runner = Object.values(suiteModule).find(fn => typeof fn === 'function');
      if (!runner) {
        console.log('No runner function found!');
        continue;
      }

      const results = await runner();
      const duration = Date.now() - t0;
      const memAfter = process.memoryUsage();
      const heapDiffMB = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);

      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      console.log(`DONE in ${duration}ms (Heap diff: ${heapDiffMB} MB)`);
      console.log(`  Passed: ${passed}, Failed: ${failed}, Total: ${results.length}`);

      if (failed > 0) {
        console.log('  Failures:');
        results.filter(r => !r.passed).forEach(f => {
          console.log(`    - ${f.name}: ${f.error}`);
        });
      }
    } catch (err) {
      console.log(`CRASHED: ${err.message}`);
      console.error(err.stack);
    }
  }

  console.log('\n--- ADVERSARIAL BENCHMARK COMPLETED ---');
  process.exit(0);
}

runDiagnostic();
