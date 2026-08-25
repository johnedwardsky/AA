'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { runTier1Tests } = require('../tier1-feature-coverage.test');
const { runTier2Tests } = require('../tier2-boundary-corner.test');
const { runTier3Tests } = require('../tier3-cross-feature.test');
const { runTier4Tests } = require('../tier4-application-scenarios.test');
const { runTier5Tests } = require('../tier5-adversarial-hardening.test');
const { runResponsiveAndRuntimeTests } = require('../responsiveness-and-runtime.test');

async function main() {
  const outputFile = path.resolve(__dirname, 'diagnostic-output.json');
  const logFile = path.resolve(__dirname, 'diagnostic-output.txt');
  fs.writeFileSync(logFile, 'Starting Test Diagnostic Run...\n');

  function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
  }

  const suites = [
    { name: 'Tier 1: Feature Coverage', runner: runTier1Tests },
    { name: 'Tier 2: Boundary & Corner', runner: runTier2Tests },
    { name: 'Tier 3: Cross-Feature', runner: runTier3Tests },
    { name: 'Tier 4: Application Scenarios', runner: runTier4Tests },
    { name: 'Tier 5: Adversarial Hardening', runner: runTier5Tests },
    { name: 'Responsive & Runtime', runner: runResponsiveAndRuntimeTests }
  ];

  const allResults = {};
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  for (const s of suites) {
    log(`\n=== RUNNING ${s.name} ===`);
    const t0 = Date.now();
    const mem0 = process.memoryUsage();

    try {
      const results = await s.runner();
      const dur = Date.now() - t0;
      const mem1 = process.memoryUsage();
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      grandTotal += results.length;
      grandPassed += passed;
      grandFailed += failed;

      allResults[s.name] = {
        total: results.length,
        passed,
        failed,
        durationMs: dur,
        heapDiffMB: ((mem1.heapUsed - mem0.heapUsed) / (1024 * 1024)).toFixed(2),
        failures: results.filter(r => !r.passed).map(f => ({ name: f.name, error: f.error, stack: f.stack }))
      };

      log(`${s.name}: ${passed}/${results.length} passed in ${dur}ms`);
      if (failed > 0) {
        log(`  FAILURES in ${s.name}:`);
        results.filter(r => !r.passed).forEach(f => {
          log(`    - ${f.name} -> ${f.error}`);
        });
      }
    } catch (err) {
      log(`SUITE CRASH: ${s.name} -> ${err.message}\n${err.stack}`);
      allResults[s.name] = { crash: err.message, stack: err.stack };
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    grandTotal,
    grandPassed,
    grandFailed,
    suites: allResults
  };

  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
  log(`\n=== COMPLETED: ${grandPassed}/${grandTotal} passed, ${grandFailed} failed ===`);
  process.exit(grandFailed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
