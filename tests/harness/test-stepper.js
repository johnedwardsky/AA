'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Step through tier 1 tests one by one
const logFile = path.resolve(__dirname, 'stepper.log');
fs.writeFileSync(logFile, 'Stepper started\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

async function testStepper() {
  log('Loading dom-sandbox...');
  const { createAdminSandbox } = require('./dom-sandbox');
  log('dom-sandbox loaded.');

  const t0 = Date.now();
  log('Creating admin sandbox 1...');
  const sb1 = createAdminSandbox();
  log('Admin sandbox 1 created in ' + (Date.now() - t0) + 'ms');

  log('Creating admin sandbox 2...');
  const t1 = Date.now();
  const sb2 = createAdminSandbox();
  log('Admin sandbox 2 created in ' + (Date.now() - t1) + 'ms');

  log('Testing audit log SHA256 in sandbox...');
  const t2 = Date.now();
  const { createAuditLogEntry } = require('./test-fixtures');
  const entry = createAuditLogEntry();
  const valid = await sb1.window.verifyHash(entry);
  log('verifyHash result: ' + valid + ' in ' + (Date.now() - t2) + 'ms');

  log('All basic checks completed successfully.');
  process.exit(0);
}

testStepper().catch(err => {
  log('ERROR: ' + err.message + '\n' + err.stack);
  process.exit(1);
});
