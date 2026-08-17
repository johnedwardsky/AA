
const fs = require('fs');

let code = fs.readFileSync('properties-data.js', 'utf8')
  .replace("'use strict';", "")
  .replace("var PROPERTIES =", "global.PROPERTIES =");
eval(code);

let code2 = fs.readFileSync('data.js', 'utf8')
  .replace("'use strict';", "")
  .replace("const AMBER_DATA =", "global.AMBER_DATA =");
eval(code2);

const allProps = [...(global.PROPERTIES || []), ...(global.AMBER_DATA ? global.AMBER_DATA.properties : [])];

const makrostroyProps = [];
const seenIds = new Set();

for (const p of allProps) {
  const devStr = (p.developer || '').toLowerCase();
  if (devStr.includes('макрострой') || devStr.includes('макро строй')) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      makrostroyProps.push(p);
    }
  }
}

fs.writeFileSync(
  '/Users/johnsky/.gemini/antigravity/brain/f88cdfd8-9dba-4382-b7df-143e6c04f1d0/scratch/makrostroy_all.json',
  JSON.stringify(makrostroyProps, null, 2),
  'utf8'
);

console.log('Successfully saved ' + makrostroyProps.length + ' properties.');
makrostroyProps.forEach(p => console.log('ID:', p.id, '| Name:', p.name, '| Location:', p.location));
