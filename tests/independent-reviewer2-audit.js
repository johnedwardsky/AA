const assert = require('node:assert');
const { createAdminSandbox } = require('./harness/dom-sandbox');

async function runReviewer2Audit() {
  console.log('================================================================================');
  console.log(' 🔬 REVIEWER ROUND 2: INDEPENDENT ADVERSARIAL AUDIT OF ZHK 9-TAB EDITOR & WIZARD');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } catch (err) {
      failed++;
      failures.push({ name, error: err.message, stack: err.stack });
      console.log(`  ❌ FAIL: ${name} -> ${err.message}`);
    }
  }

  // ── PROBE 1: Undefined/Null Property & Sub-Objects Resilience ──
  test('Probe 1: Resilience against property with null/undefined sub-objects', () => {
    const sandbox = createAdminSandbox();
    const bareProp = {
      id: 9999,
      name: 'ЖК «Голый Объект»',
      developer: 'Тестовый Застройщик',
      chars: null,
      infraDetails: null,
      prices: null,
      yard: null,
      engineering: null,
      comfort: null,
      security: null,
      management: null,
      guarantees: null,
      photos: null,
      tags: null
    };
    sandbox.window.AMBER_DATA.properties.push(bareProp);

    sandbox.window.openZhkEditorModal(9999);

    const overlay = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(overlay.style.display, 'flex');

    ['main', 'chars', 'infra', 'prices', 'yard', 'engineering', 'comfort', 'security', 'mgmt'].forEach(t => {
      const pane = sandbox.document.getElementById(`pane-${t}`);
      assert.ok(pane, `Pane pane-${t} rendered`);
      assert.ok(pane.innerHTML.length > 50, `Pane pane-${t} has content`);
    });

    sandbox.window.saveZhkEditorChanges();
    assert.strictEqual(overlay.style.display, 'none');
    assert.strictEqual(bareProp.name, 'ЖК «Голый Объект»');
    assert.ok(bareProp.chars && typeof bareProp.chars === 'object');
    assert.ok(bareProp.yard && typeof bareProp.yard === 'object');
    assert.ok(bareProp.engineering && typeof bareProp.engineering === 'object');
    assert.ok(bareProp.comfort && typeof bareProp.comfort === 'object');
    assert.ok(bareProp.security && typeof bareProp.security === 'object');
    assert.ok(bareProp.management && typeof bareProp.management === 'object');
    assert.ok(bareProp.guarantees && typeof bareProp.guarantees === 'object');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 2: Dynamic Price Rows (Add 5, Remove 2, Verify Order & Content) ──
  test('Probe 2: Dynamic price rows add/remove lifecycle and persistence', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const container = sandbox.document.getElementById('editor-price-rows-container');
    container.innerHTML = '';

    sandbox.window.addEditorPriceRow();
    sandbox.window.addEditorPriceRow();
    sandbox.window.addEditorPriceRow();
    sandbox.window.addEditorPriceRow();

    const rows = container.querySelectorAll('.editor-price-row');
    assert.strictEqual(rows.length, 4);

    const types = ['Студии', '1-комнатные', '2-комнатные', '3-комнатные'];
    const prices = ['от 3.8 млн ₽', 'от 5.2 млн ₽', 'от 7.6 млн ₽', 'от 11.0 млн ₽'];
    const areas = ['24–28 м²', '36–42 м²', '56–64 м²', '82–95 м²'];

    rows.forEach((r, idx) => {
      r.querySelector('.price-row-type').value = types[idx];
      r.querySelector('.price-row-from').value = prices[idx];
      r.querySelector('.price-row-area').value = areas[idx];
    });

    const removeBtn = rows[1].querySelector('.btn-remove-price-row');
    sandbox.window.removeEditorPriceRow(removeBtn);

    assert.strictEqual(container.querySelectorAll('.editor-price-row').length, 3);

    sandbox.window.saveZhkEditorChanges();

    const p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(p.prices.length, 3);
    assert.strictEqual(p.prices[0].type, 'Студии');
    assert.strictEqual(p.prices[1].type, '2-комнатные');
    assert.strictEqual(p.prices[2].type, '3-комнатные');
    assert.strictEqual(p.prices[0].from, 'от 3.8 млн ₽');
    assert.strictEqual(p.prices[1].from, 'от 7.6 млн ₽');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 3: Infrastructure 9 Toggles & Distance Custom Text ──
  test('Probe 3: 9 Infrastructure toggle cards state, distance inputs, and tags sync', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const keys = ['sea', 'shops', 'schools', 'kindergartens', 'hospital', 'transport', 'gym', 'park', 'restaurants'];

    keys.forEach((k, i) => {
      sandbox.window.toggleEditorInfra(k, true);
      const chk = sandbox.document.getElementById(`infra-chk-${k}`);
      if (chk) chk.checked = true;
      const inp = sandbox.document.getElementById(`infra-input-${k}`);
      if (inp) inp.value = `${(i + 1) * 100} м`;
    });

    sandbox.window.saveZhkEditorChanges();

    let p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    keys.forEach((k, i) => {
      assert.strictEqual(p.infraDetails[k], `${(i + 1) * 100} м`);
      assert.ok(p.tags.includes(k));
    });

    sandbox.window.openZhkEditorModal(1);
    ['schools', 'hospital', 'gym', 'restaurants'].forEach(k => {
      sandbox.window.toggleEditorInfra(k, false);
      const chk = sandbox.document.getElementById(`infra-chk-${k}`);
      if (chk) chk.checked = false;
    });

    sandbox.window.saveZhkEditorChanges();
    p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);

    assert.strictEqual(p.infraDetails['schools'], undefined);
    assert.strictEqual(p.infraDetails['hospital'], undefined);
    assert.strictEqual(p.infraDetails['sea'], '100 м');
    assert.strictEqual(p.infraDetails['shops'], '200 м');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 4: Preset Chips on Selects and Text Inputs ──
  test('Probe 4: Preset chips interactive application across all tabs', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const chipType = sandbox.document.querySelector('#pane-chars .editor-preset-chip');
    assert.ok(chipType, 'Found preset chip in chars pane');
    sandbox.window.applyEditorPreset('edit-zhk-char-walls', 'кер. блок', chipType);
    assert.strictEqual(sandbox.document.getElementById('edit-zhk-char-walls').value, 'кер. блок');

    const chipHeating = sandbox.document.querySelector('#pane-chars select#edit-zhk-char-heating + .editor-preset-row .editor-preset-chip');
    if (chipHeating) {
      sandbox.window.applyEditorPresetSelect('edit-zhk-char-heating', 'автономное', chipHeating);
      assert.strictEqual(sandbox.document.getElementById('edit-zhk-char-heating').value, 'автономное');
    }

    sandbox.window.applyEditorPreset('edit-zhk-eng-water', 'Индивидуальный котел', chipType);
    assert.strictEqual(sandbox.document.getElementById('edit-zhk-eng-water').value, 'Индивидуальный котел');

    sandbox.window.applyEditorPreset('edit-zhk-comf-window', 'REHAU 5-камерный', chipType);
    assert.strictEqual(sandbox.document.getElementById('edit-zhk-comf-window').value, 'REHAU 5-камерный');

    sandbox.window.applyEditorPreset('edit-zhk-guar-bank', 'ДОМ.РФ', chipType);
    assert.strictEqual(sandbox.document.getElementById('edit-zhk-guar-bank').value, 'ДОМ.РФ');

    sandbox.window.saveZhkEditorChanges();
    const p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(p.chars.walls, 'кер. блок');
    assert.strictEqual(p.engineering.hotWater, 'Индивидуальный котел');
    assert.strictEqual(p.comfort.windowType, 'REHAU 5-камерный');
    assert.strictEqual(p.guarantees.escrowBank, 'ДОМ.РФ');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 5: Wizard Flow with Developer Selection and Stepper ──
  test('Probe 5: Add ZHK Wizard validation, developer selection, and immediate transition', () => {
    const sandbox = createAdminSandbox();

    // 5.1 Empty validation
    sandbox.window.openZhkWizardModal();
    const wizardModal = sandbox.document.getElementById('zhk-wizard-modal-overlay');
    assert.strictEqual(wizardModal.style.display, 'flex');

    sandbox.document.getElementById('wizard-zhk-name').value = '';
    sandbox.window.handleWizardSubmit({ preventDefault: () => {} });
    assert.strictEqual(wizardModal.style.display, 'flex');

    // 5.2 Filled submit
    sandbox.document.getElementById('wizard-zhk-developer').value = 'СЗ «КалининградСтрой»';
    sandbox.document.getElementById('wizard-zhk-name').value = 'ЖК «Янтарная Волна»';
    sandbox.document.getElementById('wizard-zhk-loc').value = 'Зеленоградск';
    sandbox.document.getElementById('wizard-zhk-class').value = 'премиум-класс';
    sandbox.document.getElementById('wizard-zhk-status').value = 'built';
    sandbox.document.getElementById('wizard-zhk-price-from').value = 'от 8.5 млн ₽';
    sandbox.document.getElementById('wizard-zhk-delivery').value = 'Сдан';

    sandbox.window.handleWizardSubmit({ preventDefault: () => {} });

    assert.strictEqual(wizardModal.style.display, 'none');
    const editorOverlay = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(editorOverlay.style.display, 'flex');

    const badge = sandbox.document.getElementById('zhk-editor-modal-badge');
    assert.strictEqual(badge.textContent, 'Сдан');

    const created = sandbox.window.AMBER_DATA.properties.find(p => p.name === 'ЖК «Янтарная Волна»');
    assert.ok(created);
    assert.strictEqual(created.developer, 'СЗ «КалининградСтрой»');
    assert.strictEqual(created.location, 'Зеленоградск');
    assert.strictEqual(created.class, 'премиум-класс');
    assert.strictEqual(created.status, 'built');

    sandbox.document.getElementById('edit-zhk-sec-liftbrand').value = 'Schindler';
    sandbox.window.saveZhkEditorChanges();

    assert.strictEqual(editorOverlay.style.display, 'none');
    assert.strictEqual(created.security.liftBrand, 'Schindler');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 6: 11 Gallery Slots Interaction & Photo Count ──
  test('Probe 6: 11 Gallery slots rendering, photo removal, and counter update', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const galleryGrid = sandbox.document.getElementById('gallery-grid-1');
    assert.ok(galleryGrid);
    const slots = galleryGrid.querySelectorAll('.zhk-gallery-slot');
    assert.strictEqual(slots.length, 11, 'Exactly 11 gallery slots rendered');

    sandbox.window.savePhotoUrl('gallery', 1, 0, 'photo1.jpg');
    sandbox.window.savePhotoUrl('gallery', 1, 1, 'photo2.jpg');
    sandbox.window.updateGallerySlot(1, 0, 'photo1.jpg');
    sandbox.window.updateGallerySlot(1, 1, 'photo2.jpg');

    const counter = sandbox.document.getElementById('gallery-count-1');
    assert.strictEqual(counter.textContent.trim(), '2 / 11 фото');

    sandbox.window.removeGalleryPhoto(1, 0);
    assert.strictEqual(counter.textContent.trim(), '1 / 11 фото');
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 7: Compatibility with Non-Property Generic Modals ──
  test('Probe 7: Non-property modals (blog, banners, experts, developers) operate cleanly', () => {
    const sandbox = createAdminSandbox();

    sandbox.window.openAddModal('blog');
    const telegraph = sandbox.document.getElementById('telegraph-editor-container');
    assert.ok(telegraph);
    assert.strictEqual(telegraph.style.display, 'block');

    sandbox.window.openAddModal('developers');
    const editModal = sandbox.document.getElementById('edit-modal');
    assert.strictEqual(editModal.style.display, 'flex');
    assert.strictEqual(sandbox.document.getElementById('modal-title').textContent, 'Добавить застройщика');
    sandbox.window.closeModal();
    assert.strictEqual(editModal.style.display, 'none');

    sandbox.window.openAddModal('banners');
    assert.strictEqual(editModal.style.display, 'flex');
    assert.strictEqual(sandbox.document.getElementById('modal-title').textContent, 'Добавить баннер');
    sandbox.window.closeModal();

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 8: Flexible ID resolution in openEditPropertyModal ──
  test('Probe 8: Flexible ID resolution in openEditPropertyModal (number, string, zhk- prefix)', () => {
    const sandbox = createAdminSandbox();

    sandbox.window.openEditPropertyModal(1);
    assert.strictEqual(sandbox.document.getElementById('zhk-editor-modal-overlay').style.display, 'flex');
    sandbox.window.closeZhkEditorModal();

    sandbox.window.openEditPropertyModal('1');
    assert.strictEqual(sandbox.document.getElementById('zhk-editor-modal-overlay').style.display, 'flex');
    sandbox.window.closeZhkEditorModal();

    sandbox.window.openEditPropertyModal('zhk-1');
    assert.strictEqual(sandbox.document.getElementById('zhk-editor-modal-overlay').style.display, 'flex');
    sandbox.window.closeZhkEditorModal();

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 9: Two-Way Data Store Sync (window.PROPERTIES and window.AMBER_DATA.properties) ──
  test('Probe 9: Data store sync between AMBER_DATA and window.PROPERTIES', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    sandbox.document.getElementById('edit-zhk-name').value = 'ЖК «Синхронизированный»';
    sandbox.document.getElementById('edit-zhk-price-from').value = 'от 9.9 млн ₽';
    sandbox.window.saveZhkEditorChanges();

    const pAmber = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(pAmber.name, 'ЖК «Синхронизированный»');
    assert.strictEqual(pAmber.priceFrom, 'от 9.9 млн ₽');

    if (sandbox.window.PROPERTIES) {
      const pProps = sandbox.window.PROPERTIES.find(x => x.id === 1);
      if (pProps) {
        assert.strictEqual(pProps.name, 'ЖК «Синхронизированный»');
        assert.strictEqual(pProps.priceFrom, 'от 9.9 млн ₽');
      }
    }
  });

  // ── PROBE 10: XSS Injection & Special Character Escaping ──
  test('Probe 10: Special characters and script tags safely escaped in modal inputs', () => {
    const sandbox = createAdminSandbox();
    const maliciousProp = {
      id: 8888,
      name: '<script>alert("xss")</script> & "ЖК"',
      developer: 'Застройщик <img src=x onerror=alert(1)>',
      description: '<b>Тест</b> & "Кавычки"',
      chars: {},
      yard: {},
      engineering: {},
      comfort: {},
      security: {},
      management: {},
      guarantees: {},
      prices: []
    };
    sandbox.window.AMBER_DATA.properties.push(maliciousProp);

    sandbox.window.openZhkEditorModal(8888);

    const nameInput = sandbox.document.getElementById('edit-zhk-name');
    assert.strictEqual(nameInput.value, '<script>alert("xss")</script> & "ЖК"');

    const descInput = sandbox.document.getElementById('edit-zhk-desc');
    assert.strictEqual(descInput.value, '<b>Тест</b> & "Кавычки"');

    sandbox.window.saveZhkEditorChanges();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── PROBE 11: CSS Class Presence & Structural Conformance ──
  test('Probe 11: CSS classes for 9-tab editor and wizard match requirements', () => {
    const sandbox = createAdminSandbox();
    const html = sandbox.document.body.innerHTML;

    // Check modal IDs
    assert.ok(html.includes('id="zhk-editor-modal-overlay"'), '#zhk-editor-modal-overlay exists');
    assert.ok(html.includes('id="zhk-wizard-modal-overlay"'), '#zhk-wizard-modal-overlay exists');

    // Check wizard elements
    assert.ok(html.includes('id="wizard-zhk-developer"'), 'wizard developer select exists');
    assert.ok(html.includes('id="wizard-zhk-name"'), 'wizard name input exists');
    assert.ok(html.includes('Основное') && html.includes('Полный редактор'), 'wizard stepper steps exist');
    assert.ok(html.includes('После нажатия «Далее» откроется полный редактор'), 'wizard info callout exists');

    // Check editor pills
    assert.ok(html.includes('switchZhkEditorTab(\'main\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'chars\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'infra\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'prices\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'yard\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'engineering\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'comfort\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'security\')'));
    assert.ok(html.includes('switchZhkEditorTab(\'mgmt\')'));
  });

  console.log('\n================================================================================');
  console.log(`  AUDIT SUMMARY: ${passed}/${passed + failed} PASSED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    console.error('FAILURES:');
    failures.forEach(f => console.error(` - ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

runReviewer2Audit();
