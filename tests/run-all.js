'use strict';

const { runTier1Tests } = require('./tier1-feature-coverage.test');
const { runTier2Tests } = require('./tier2-boundary-corner.test');
const { runTier3Tests } = require('./tier3-cross-feature.test');
const { runTier4Tests } = require('./tier4-application-scenarios.test');
const { runTier5Tests } = require('./tier5-adversarial-hardening.test');
const { runResponsiveAndRuntimeTests } = require('./responsiveness-and-runtime.test');

async function main() {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log('  🏛️  AMBER AVENUE PLATFORM MODERNIZATION — E2E TEST SUITE RUNNER  ');
  console.log('  Requirements: R1 (Removal), R2 (Placements), R3 (Analytics), R4 (Cabinet), R5 (Catalog), R6 (Sidebar)');
  console.log('  Target: admin.html | cabinet.html | app.js | analytics.js | data.js');
  console.log('='.repeat(80) + '\n');

  const suiteConfigs = [
    { name: 'Tier 1: Feature Coverage (R1-R6 Core Modules & 8 Placements)', runner: runTier1Tests },
    { name: 'Tier 2: Boundary & Corner Cases (Limits, Caps, Cooldowns, Dates)', runner: runTier2Tests },
    { name: 'Tier 3: Cross-Feature Integration (Placements -> Gating -> Catalog -> CRM)', runner: runTier3Tests },
    { name: 'Tier 4: Real-World Scenarios (5 Core End-to-End Operational Workflows)', runner: runTier4Tests },
    { name: 'Tier 5: Adversarial Hardening (Stress, Proto, XSS, 10k Events)', runner: runTier5Tests },
    { name: 'Responsive Breakpoints (375px - 4K) & Zero-Console-Error Assertions', runner: runResponsiveAndRuntimeTests }
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteSummaries = [];

  for (const suite of suiteConfigs) {
    console.log(`\n🔹 Running [${suite.name}]...`);
    const suiteStart = Date.now();
    const results = await suite.runner();
    const suiteDuration = Date.now() - suiteStart;

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    totalTests += results.length;
    totalPassed += passed;
    totalFailed += failed;

    suiteSummaries.push({
      name: suite.name,
      total: results.length,
      passed,
      failed,
      duration: suiteDuration
    });

    results.forEach(r => {
      const statusIcon = r.passed ? '  ✅ PASS' : '  ❌ FAIL';
      const durationStr = `(${r.duration}ms)`;
      console.log(`${statusIcon} ${r.name} ${durationStr}`);
      if (!r.passed) {
        console.error(`     Error: ${r.error}`);
        if (r.stack) {
          const firstStackLine = r.stack.split('\n')[1] || '';
          console.error(`     Location: ${firstStackLine.trim()}`);
        }
      }
    });
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log('                          📊 TEST EXECUTION SUMMARY                          ');
  console.log('='.repeat(80));
  console.log(`  ${'Suite Name'.padEnd(52)} | ${'Total'.padStart(5)} | ${'Pass'.padStart(5)} | ${'Fail'.padStart(5)} | ${'Time'.padStart(7)}`);
  console.log('-'.repeat(80));

  suiteSummaries.forEach(s => {
    const shortName = s.name.length > 50 ? s.name.substring(0, 47) + '...' : s.name;
    console.log(`  ${shortName.padEnd(52)} | ${String(s.total).padStart(5)} | ${String(s.passed).padStart(5)} | ${String(s.failed).padStart(5)} | ${(s.duration + 'ms').padStart(7)}`);
  });

  console.log('-'.repeat(80));
  console.log(`  ${'TOTALS'.padEnd(52)} | ${String(totalTests).padStart(5)} | ${String(totalPassed).padStart(5)} | ${String(totalFailed).padStart(5)} | ${(totalDuration + 'ms').padStart(7)}`);
  console.log('='.repeat(80));

  if (totalFailed === 0) {
    console.log(`\n🎉 ALL ${totalTests} E2E TESTS PASSED SUCCESSFULLY in ${totalDuration}ms!`);
    console.log('✨ 100% Pass Rate across Requirements R1–R6, Zero Console Errors, Robust Multi-Tier Coverage.\n');
    process.exit(0);
  } else {
    console.error(`\n🚨 TEST SUITE FAILED: ${totalFailed} of ${totalTests} tests failed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
