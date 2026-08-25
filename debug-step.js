'use strict';

const fs = require('fs');
const htmlContent = fs.readFileSync('admin.html', 'utf8');

const t0 = Date.now();
const bStart = htmlContent.indexOf('<body');
const bodyTagClose = htmlContent.indexOf('>', bStart);
const bEnd = htmlContent.lastIndexOf('</body>');
const bodyMarkup = htmlContent.substring(bodyTagClose + 1, bEnd !== -1 ? bEnd : htmlContent.length);

console.log('Body extracted in', Date.now() - t0, 'ms, length:', bodyMarkup.length);
