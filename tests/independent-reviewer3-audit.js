const assert = require('node:assert');
const { createAdminSandbox } = require('./harness/dom-sandbox');

async function runReviewer3Audit() {
  console.log('================================================================================');
  console.log(' 🔬 REVIEWER ROUND 3 (FINAL AUDIT): ZHK 9-TAB EDITOR & WIZARD VERIFICATION');
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

  // ── TEST 1: Wizard & Editor Modal Wire-Up and Generic Modal Dispatch ──
  test('Test 1: Wizard, 9-tab editor, and generic modals dispatch properly', () => {
    const sandbox = createAdminSandbox();

    // 1.1 openZhkWizardModal opens wizard modal
    sandbox.window.openZhkWizardModal();
    const wizardOverlay = sandbox.document.getElementById('zhk-wizard-modal-overlay');
    assert.ok(wizardOverlay, '#zhk-wizard-modal-overlay found');
    assert.strictEqual(wizardOverlay.style.display, 'flex');
    sandbox.window.closeZhkWizardModal();
    assert.strictEqual(wizardOverlay.style.display, 'none');

    // 1.2 openEditPropertyModal opens 9-tab editor modal
    sandbox.window.openEditPropertyModal(1);
    const editorOverlay = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.ok(editorOverlay, '#zhk-editor-modal-overlay found');
    assert.strictEqual(editorOverlay.style.display, 'flex');
    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(editorOverlay.style.display, 'none');

    // 1.3 Quick Action / Add button is wired to openZhkWizardModal
    const addZhkBtn = sandbox.document.querySelector('button[onclick="openZhkWizardModal()"]');
    assert.ok(addZhkBtn, '+ Добавить ЖК button exists and is wired to openZhkWizardModal');

    // 1.4 Generic edit modal still works for developers/banners/etc.
    sandbox.window.openAddModal('developers');
    assert.strictEqual(sandbox.document.getElementById('edit-modal').style.display, 'flex');
    sandbox.window.closeModal();

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 2: .admin-zhk-editor-overlay CSS Class & Structure Conformance ──
  test('Test 2: .admin-zhk-editor-overlay CSS class and structural markup conformance', () => {
    const sandbox = createAdminSandbox();
    const editorOverlay = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.ok(editorOverlay, '#zhk-editor-modal-overlay exists');
    assert.ok(editorOverlay.classList.contains('admin-zhk-editor-overlay'), 'Contains admin-zhk-editor-overlay class');
    assert.ok(editorOverlay.classList.contains('modal-overlay'), 'Contains modal-overlay class');

    const dialog = editorOverlay.querySelector('.modal-dialog-large');
    assert.ok(dialog, 'Contains .modal-dialog-large container');

    const tabsBar = editorOverlay.querySelector('.modal-editor-tabs-bar');
    assert.ok(tabsBar, 'Contains .modal-editor-tabs-bar');

    const tabPills = tabsBar.querySelectorAll('.editor-tab-pill');
    assert.strictEqual(tabPills.length, 9, 'Exactly 9 tab pills rendered in header');

    const footer = editorOverlay.querySelector('.modal-editor-footer');
    assert.ok(footer, 'Contains .modal-editor-footer');
    assert.ok(footer.innerHTML.includes('Сохранить изменения'), 'Footer has "Сохранить изменения" button');
    assert.ok(footer.innerHTML.includes('Отмена'), 'Footer has "Отмена" button');
  });

  // ── TEST 3: All 9 Tabs Field Parity and Exact Form Elements ──
  test('Test 3: All 9 tabs contain all required form inputs matching cabinet.html specification', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const requiredFields = {
      'pane-main': ['edit-zhk-name', 'edit-zhk-developer', 'edit-zhk-location', 'edit-zhk-address', 'edit-zhk-status', 'edit-zhk-delivery', 'edit-zhk-walk-sea', 'edit-zhk-price-sqm', 'edit-zhk-price-from', 'edit-zhk-price-range', 'edit-zhk-img', 'edit-zhk-desc'],
      'pane-chars': ['edit-zhk-char-class', 'edit-zhk-char-type', 'edit-zhk-char-floors', 'edit-zhk-char-corpus', 'edit-zhk-char-apartments', 'edit-zhk-char-ceiling', 'edit-zhk-char-ap-area', 'edit-zhk-char-kit-area', 'edit-zhk-char-walls', 'edit-zhk-char-finishing', 'edit-zhk-char-heating'],
      'pane-infra': ['infra-chk-sea', 'infra-chk-shops', 'infra-chk-schools', 'infra-chk-kindergartens', 'infra-chk-hospital', 'infra-chk-transport', 'infra-chk-gym', 'infra-chk-park', 'infra-chk-restaurants'],
      'pane-yard': ['edit-zhk-yard-carfree', 'edit-zhk-yard-playground', 'edit-zhk-yard-sport', 'edit-zhk-yard-parking', 'edit-zhk-yard-parking-spots', 'edit-zhk-yard-bike', 'edit-zhk-yard-greenery', 'edit-zhk-yard-walk'],
      'pane-engineering': ['edit-zhk-eng-water', 'edit-zhk-eng-gas', 'edit-zhk-eng-vent', 'edit-zhk-eng-ac', 'edit-zhk-eng-meters', 'edit-zhk-eng-power'],
      'pane-comfort': ['edit-zhk-comf-window', 'edit-zhk-comf-panoramic', 'edit-zhk-comf-views', 'edit-zhk-comf-sound', 'edit-zhk-comf-soundrw', 'edit-zhk-comf-soundln'],
      'pane-security': ['edit-zhk-sec-lifts', 'edit-zhk-sec-liftbrand', 'edit-zhk-sec-cctv', 'edit-zhk-sec-guard', 'edit-zhk-sec-access', 'edit-zhk-sec-stroller'],
      'pane-mgmt': ['edit-zhk-mgmt-company', 'edit-zhk-mgmt-utilities', 'edit-zhk-mgmt-internet', 'edit-zhk-mgmt-commerce', 'edit-zhk-guar-constructive', 'edit-zhk-guar-eng', 'edit-zhk-guar-finish', 'edit-zhk-guar-bank', 'edit-zhk-guar-fz214', 'edit-zhk-guar-decl']
    };

    for (const [paneId, fields] of Object.entries(requiredFields)) {
      const pane = sandbox.document.getElementById(paneId);
      assert.ok(pane, `Tab pane #${paneId} exists`);
      for (const fId of fields) {
        const el = sandbox.document.getElementById(fId);
        assert.ok(el, `Field #${fId} exists in #${paneId}`);
      }
    }

    const priceRows = sandbox.document.getElementById('editor-price-rows-container');
    assert.ok(priceRows, 'Price rows container exists in pane-prices');
    assert.ok(sandbox.document.querySelector('.btn-add-price-row'), 'Add price row button exists');

    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 4: Full End-to-End 9-Tab Mutation and Verification ──
  test('Test 4: Mutate every field across all 9 tabs and verify deep persistence', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    // Tab 1: Main
    sandbox.document.getElementById('edit-zhk-name').value = 'ЖК «Адмиралтейский Резиденс»';
    sandbox.document.getElementById('edit-zhk-developer').value = 'ООО «Балтик Строй»';
    sandbox.document.getElementById('edit-zhk-location').value = 'Светлогорск';
    sandbox.document.getElementById('edit-zhk-address').value = 'г. Светлогорск, ул. Ленина, 42';
    sandbox.document.getElementById('edit-zhk-status').value = 'building';
    sandbox.document.getElementById('edit-zhk-delivery').value = '3 кв. 2027';
    sandbox.document.getElementById('edit-zhk-walk-sea').value = '3 мин пешком';
    sandbox.document.getElementById('edit-zhk-price-sqm').value = '220 тыс. ₽/м²';
    sandbox.document.getElementById('edit-zhk-price-from').value = 'от 12.5 млн ₽';
    sandbox.document.getElementById('edit-zhk-price-range').value = 'от 12.5 до 35.0 млн ₽';
    sandbox.document.getElementById('edit-zhk-img').value = 'premium_baltic_residence.png';
    sandbox.document.getElementById('edit-zhk-desc').value = 'Эксклюзивный комплекс на первой линии Балтийского побережья.';

    // Tab 2: Chars
    sandbox.document.getElementById('edit-zhk-char-class').value = 'премиум';
    sandbox.document.getElementById('edit-zhk-char-type').value = 'монолит-кирпич';
    sandbox.document.getElementById('edit-zhk-char-floors').value = '5 этажей';
    sandbox.document.getElementById('edit-zhk-char-corpus').value = '3 корпуса';
    sandbox.document.getElementById('edit-zhk-char-apartments').value = '84';
    sandbox.document.getElementById('edit-zhk-char-ceiling').value = '3.3 м';
    sandbox.document.getElementById('edit-zhk-char-ap-area').value = '54–180 м²';
    sandbox.document.getElementById('edit-zhk-char-kit-area').value = 'от 18 м²';
    sandbox.document.getElementById('edit-zhk-char-walls').value = 'кер. блок Wienerberger';
    sandbox.document.getElementById('edit-zhk-char-finishing').value = 'white box';
    sandbox.document.getElementById('edit-zhk-char-heating').value = 'автономное';

    // Tab 3: Infra
    ['sea', 'shops', 'park', 'restaurants'].forEach(k => {
      sandbox.window.toggleEditorInfra(k, true);
      const chk = sandbox.document.getElementById(`infra-chk-${k}`);
      if (chk) chk.checked = true;
      const inp = sandbox.document.getElementById(`infra-input-${k}`);
      if (inp) inp.value = '150 метров';
    });
    ['schools', 'kindergartens', 'hospital', 'transport', 'gym'].forEach(k => {
      sandbox.window.toggleEditorInfra(k, false);
      const chk = sandbox.document.getElementById(`infra-chk-${k}`);
      if (chk) chk.checked = false;
    });

    // Tab 4: Prices
    const priceContainer = sandbox.document.getElementById('editor-price-rows-container');
    priceContainer.innerHTML = '';
    sandbox.window.addEditorPriceRow();
    sandbox.window.addEditorPriceRow();
    const rows = priceContainer.querySelectorAll('.editor-price-row');
    rows[0].querySelector('.price-row-type').value = '2-комнатные';
    rows[0].querySelector('.price-row-from').value = 'от 12.5 млн ₽';
    rows[0].querySelector('.price-row-area').value = '54–68 м²';
    rows[1].querySelector('.price-row-type').value = 'Пентхаусы';
    rows[1].querySelector('.price-row-from').value = 'от 28.0 млн ₽';
    rows[1].querySelector('.price-row-area').value = '140–180 м²';

    // Tab 5: Yard
    sandbox.document.getElementById('edit-zhk-yard-carfree').value = 'Да, двор без машин';
    sandbox.document.getElementById('edit-zhk-yard-playground').value = 'Эко-площадка Richter Spielgeräte';
    sandbox.document.getElementById('edit-zhk-yard-sport').value = 'Outdoor фитнес с тренажерами';
    sandbox.document.getElementById('edit-zhk-yard-parking').value = 'Подземный отапливаемый паркинг';
    sandbox.document.getElementById('edit-zhk-yard-parking-spots').value = '120 мест';
    sandbox.document.getElementById('edit-zhk-yard-bike').value = 'Велобокс на 40 велосипедов';
    sandbox.document.getElementById('edit-zhk-yard-greenery').value = 'Ландшафтный парк с соснами';
    sandbox.document.getElementById('edit-zhk-yard-walk').value = 'Променадные аллеи с освещением';

    // Tab 6: Engineering
    sandbox.document.getElementById('edit-zhk-eng-water').value = 'Индивидуальные котлы Viessmann';
    sandbox.document.getElementById('edit-zhk-eng-gas').value = 'Природный газ магистральный';
    sandbox.document.getElementById('edit-zhk-eng-vent').value = 'Приточно-вытяжная с рекуперацией и HEPA';
    sandbox.document.getElementById('edit-zhk-eng-ac').value = 'Мультизональная система VRV Daikin';
    sandbox.document.getElementById('edit-zhk-eng-meters').value = 'Автоматическая телеметрия LoRaWAN';
    sandbox.document.getElementById('edit-zhk-eng-power').value = '15 кВт на квартиру';

    // Tab 7: Comfort
    sandbox.document.getElementById('edit-zhk-comf-window').value = 'Дерево-алюминиевые Schuco';
    sandbox.document.getElementById('edit-zhk-comf-panoramic').value = 'Да, панорамное остекление';
    sandbox.document.getElementById('edit-zhk-comf-views').value = 'Панорамный вид на море и сосновый бор';
    sandbox.document.getElementById('edit-zhk-comf-sound').value = 'Шумоизоляция Acoustic Group SoundGuard';
    sandbox.document.getElementById('edit-zhk-comf-soundrw').value = '58';
    sandbox.document.getElementById('edit-zhk-comf-soundln').value = '46';

    // Tab 8: Security
    sandbox.document.getElementById('edit-zhk-sec-lifts').value = '2 бесшумных лифта';
    sandbox.document.getElementById('edit-zhk-sec-liftbrand').value = 'Schindler 5500';
    sandbox.document.getElementById('edit-zhk-sec-cctv').value = '4K AI-камеры по всему периметру';
    sandbox.document.getElementById('edit-zhk-sec-guard').value = 'Охрана 24/7 и консьерж-сервис';
    sandbox.document.getElementById('edit-zhk-sec-access').value = 'Face ID и BLE-метки';
    sandbox.document.getElementById('edit-zhk-sec-stroller').value = 'Колясочные с лапомойками';

    // Tab 9: Management & Guarantees
    sandbox.document.getElementById('edit-zhk-mgmt-company').value = 'Amber Hospitality Management';
    sandbox.document.getElementById('edit-zhk-mgmt-utilities').value = '~65 ₽/м²';
    sandbox.document.getElementById('edit-zhk-mgmt-internet').value = 'Оптоволокно 1 Гбит/с';
    sandbox.document.getElementById('edit-zhk-mgmt-commerce').value = 'Ресторан авторской кухни, SPA-салон';
    sandbox.document.getElementById('edit-zhk-guar-constructive').value = '10 лет';
    sandbox.document.getElementById('edit-zhk-guar-eng').value = '5 лет';
    sandbox.document.getElementById('edit-zhk-guar-finish').value = '2 года';
    sandbox.document.getElementById('edit-zhk-guar-bank').value = 'ДОМ.РФ';
    sandbox.document.getElementById('edit-zhk-guar-fz214').value = 'Да, эскроу-счета 214-ФЗ';
    sandbox.document.getElementById('edit-zhk-guar-decl').value = 'https://наш.дом.рф/сервисы/каталог-новостроек/объект/99999';

    sandbox.window.saveZhkEditorChanges();

    // Verification of persistence in data store
    const p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(p.name, 'ЖК «Адмиралтейский Резиденс»');
    assert.strictEqual(p.developer, 'ООО «Балтик Строй»');
    assert.strictEqual(p.location, 'Светлогорск');
    assert.strictEqual(p.address, 'г. Светлогорск, ул. Ленина, 42');
    assert.strictEqual(p.delivery, '3 кв. 2027');
    assert.strictEqual(p.walkToSea, '3 мин пешком');
    assert.strictEqual(p.priceSqm, '220 тыс. ₽/м²');
    assert.strictEqual(p.priceFrom, 'от 12.5 млн ₽');
    assert.strictEqual(p.priceRange, 'от 12.5 до 35.0 млн ₽');
    assert.strictEqual(p.imgSrc, 'premium_baltic_residence.png');
    assert.strictEqual(p.description, 'Эксклюзивный комплекс на первой линии Балтийского побережья.');

    assert.strictEqual(p.chars.class, 'премиум');
    assert.strictEqual(p.chars.type, 'монолит-кирпич');
    assert.strictEqual(p.chars.floors, '5 этажей');
    assert.strictEqual(p.chars.corpus, '3 корпуса');
    assert.strictEqual(p.chars.apartments, 84);
    assert.strictEqual(p.chars.ceiling, '3.3 м');
    assert.strictEqual(p.chars.apArea, '54–180 м²');
    assert.strictEqual(p.chars.kitArea, 'от 18 м²');
    assert.strictEqual(p.chars.walls, 'кер. блок Wienerberger');
    assert.strictEqual(p.chars.finishing, 'white box');
    assert.strictEqual(p.chars.heating, 'автономное');

    assert.strictEqual(p.infraDetails.sea, '150 метров');
    assert.strictEqual(p.infraDetails.shops, '150 метров');
    assert.strictEqual(p.infraDetails.park, '150 метров');
    assert.strictEqual(p.infraDetails.restaurants, '150 метров');
    assert.strictEqual(p.infraDetails.schools, undefined);

    assert.strictEqual(p.prices.length, 2);
    assert.strictEqual(p.prices[0].type, '2-комнатные');
    assert.strictEqual(p.prices[1].type, 'Пентхаусы');

    assert.strictEqual(p.yard.carFree, 'Да, двор без машин');
    assert.strictEqual(p.yard.playground, 'Эко-площадка Richter Spielgeräte');
    assert.strictEqual(p.yard.parking, 'Подземный отапливаемый паркинг');
    assert.strictEqual(p.yard.parkingSpots, '120 мест');

    assert.strictEqual(p.engineering.hotWater, 'Индивидуальные котлы Viessmann');
    assert.strictEqual(p.engineering.airConditioning, 'Мультизональная система VRV Daikin');
    assert.strictEqual(p.engineering.electricPower, '15 кВт на квартиру');

    assert.strictEqual(p.comfort.windowType, 'Дерево-алюминиевые Schuco');
    assert.strictEqual(p.comfort.soundRw, 58);
    assert.strictEqual(p.comfort.soundLn, 46);

    assert.strictEqual(p.security.liftBrand, 'Schindler 5500');
    assert.strictEqual(p.security.accessControl, 'Face ID и BLE-метки');

    assert.strictEqual(p.management.company, 'Amber Hospitality Management');
    assert.strictEqual(p.management.utilities, '~65 ₽/м²');
    assert.strictEqual(p.guarantees.constructive, '10 лет');
    assert.strictEqual(p.guarantees.escrowBank, 'ДОМ.РФ');
    assert.strictEqual(p.guarantees.declarationUrl, 'https://наш.дом.рф/сервисы/каталог-новостроек/объект/99999');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 5: Tag Key ('sea') vs Tag Russian Word ('море') Ingestion ──
  test('Test 5: Infrastructure tag key vs Russian label matching', () => {
    const sandbox = createAdminSandbox();
    const tagProp = {
      id: 7777,
      name: 'ЖК «Балтийский Тест»',
      tags: ['sea', 'shops', 'парк', 'рестораны'],
      infraDetails: { sea: '200 м' },
      chars: {}, yard: {}, engineering: {}, comfort: {}, security: {}, management: {}, guarantees: {}, prices: []
    };
    sandbox.window.AMBER_DATA.properties.push(tagProp);

    sandbox.window.openZhkEditorModal(7777);

    // Verify checked states for both key ('sea', 'shops') and Russian label ('парк', 'рестораны')
    assert.strictEqual(sandbox.document.getElementById('infra-chk-sea').checked, true);
    assert.strictEqual(sandbox.document.getElementById('infra-chk-shops').checked, true);
    assert.strictEqual(sandbox.document.getElementById('infra-chk-park').checked, true);
    assert.strictEqual(sandbox.document.getElementById('infra-chk-restaurants').checked, true);
    assert.strictEqual(sandbox.document.getElementById('infra-chk-hospital').checked, false);

    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 6: String-based Complex IDs and Prefixed IDs ──
  test('Test 6: Resolution of string IDs (e.g. "zhk-leningrad", "custom-id-99")', () => {
    const sandbox = createAdminSandbox();
    const stringIdProp = {
      id: 'zhk-leningrad-elite',
      name: 'ЖК «Ленинградский Элит»',
      developer: 'ГК «Расцвет»',
      chars: { floors: '12 этажей' },
      yard: {}, engineering: {}, comfort: {}, security: {}, management: {}, guarantees: {}, prices: []
    };
    sandbox.window.AMBER_DATA.properties.push(stringIdProp);

    sandbox.window.openEditPropertyModal('zhk-leningrad-elite');
    const overlay = sandbox.document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(overlay.style.display, 'flex');

    const floorsEl = sandbox.document.getElementById('edit-zhk-char-floors');
    assert.strictEqual(floorsEl.value, '12 этажей');

    sandbox.document.getElementById('edit-zhk-char-floors').value = '14 этажей';
    sandbox.window.saveZhkEditorChanges();

    assert.strictEqual(stringIdProp.chars.floors, '14 этажей');
    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 7: Wizard Stepper, Developer Selection, and Validation ──
  test('Test 7: Wizard developer selection options and step progression', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkWizardModal();

    const devSelect = sandbox.document.getElementById('wizard-zhk-developer');
    assert.ok(devSelect, 'Developer select element exists');
    assert.ok(devSelect.children.length > 0, 'Developer select options are populated');

    // Test blank name prevention
    sandbox.document.getElementById('wizard-zhk-name').value = '   ';
    sandbox.window.handleWizardSubmit({ preventDefault: () => {} });
    assert.strictEqual(sandbox.document.getElementById('zhk-wizard-modal-overlay').style.display, 'flex');

    // Test valid creation with second developer
    const secondDev = devSelect.children[1] ? devSelect.children[1].value : devSelect.children[0].value;
    devSelect.value = secondDev;
    sandbox.document.getElementById('wizard-zhk-name').value = 'ЖК «Новый Рассвет»';
    sandbox.document.getElementById('wizard-zhk-loc').value = 'Гурьевск (Пригород)';
    sandbox.document.getElementById('wizard-zhk-class').value = 'комфорт-класс';
    sandbox.document.getElementById('wizard-zhk-status').value = 'building';
    sandbox.document.getElementById('wizard-zhk-price-from').value = 'от 4.2 млн ₽';
    sandbox.document.getElementById('wizard-zhk-delivery').value = '2 кв. 2027';

    sandbox.window.handleWizardSubmit({ preventDefault: () => {} });

    assert.strictEqual(sandbox.document.getElementById('zhk-wizard-modal-overlay').style.display, 'none');
    assert.strictEqual(sandbox.document.getElementById('zhk-editor-modal-overlay').style.display, 'flex');

    const created = sandbox.window.AMBER_DATA.properties[0];
    assert.strictEqual(created.name, 'ЖК «Новый Рассвет»');
    assert.strictEqual(created.developer, secondDev);
    assert.strictEqual(created.location, 'Гурьевск (Пригород)');
    assert.strictEqual(created.status, 'building');

    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 8: Tab Switching & Scroll Reset ──
  test('Test 8: Interactive tab navigation across all 9 tabs', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const tabIds = ['main', 'chars', 'infra', 'prices', 'yard', 'engineering', 'comfort', 'security', 'mgmt'];

    tabIds.forEach(tabId => {
      sandbox.window.switchZhkEditorTab(tabId);
      const activePane = sandbox.document.getElementById(`pane-${tabId}`);
      assert.ok(activePane.classList.contains('active'), `Pane #${tabId} has active class`);

      const otherPanes = tabIds.filter(t => t !== tabId);
      otherPanes.forEach(otherId => {
        const otherPane = sandbox.document.getElementById(`pane-${otherId}`);
        assert.ok(!otherPane.classList.contains('active'), `Pane #${otherId} is not active`);
      });
    });

    sandbox.window.closeZhkEditorModal();
    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 9: Empty Price Rows & Dynamic Re-Addition ──
  test('Test 9: Can delete all price rows and re-add from blank state', () => {
    const sandbox = createAdminSandbox();
    sandbox.window.openZhkEditorModal(1);

    const container = sandbox.document.getElementById('editor-price-rows-container');
    container.querySelectorAll('.btn-remove-price-row').forEach(btn => {
      sandbox.window.removeEditorPriceRow(btn);
    });
    assert.strictEqual(container.querySelectorAll('.editor-price-row').length, 0);

    sandbox.window.saveZhkEditorChanges();
    let p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(p.prices.length, 0);

    // Re-opening editor with empty prices provides the 2 default starter templates (matching cabinet.html)
    sandbox.window.openZhkEditorModal(1);
    const freshContainer = sandbox.document.getElementById('editor-price-rows-container');
    assert.strictEqual(freshContainer.querySelectorAll('.editor-price-row').length, 2, 'Starter templates rendered when prices array was empty');

    // Add a 3rd custom row
    sandbox.window.addEditorPriceRow();
    const rows = freshContainer.querySelectorAll('.editor-price-row');
    assert.strictEqual(rows.length, 3);
    rows[2].querySelector('.price-row-type').value = 'Студии';
    rows[2].querySelector('.price-row-from').value = 'от 3.5 млн ₽';
    rows[2].querySelector('.price-row-area').value = '25 м²';

    sandbox.window.saveZhkEditorChanges();
    p = sandbox.window.AMBER_DATA.properties.find(x => x.id === 1);
    assert.strictEqual(p.prices.length, 3);
    assert.strictEqual(p.prices[2].type, 'Студии');

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  // ── TEST 10: Non-Property Entities in Generic Modal ──
  test('Test 10: Non-property types (developers, banners, experts, blog) remain functional', () => {
    const sandbox = createAdminSandbox();

    // Developers edit
    sandbox.window.openEditModal('developers', 1);
    assert.strictEqual(sandbox.document.getElementById('edit-modal').style.display, 'flex');
    assert.strictEqual(sandbox.document.getElementById('modal-title').textContent, 'Редактирование #1');
    sandbox.window.closeModal();

    // Banners edit
    sandbox.window.openEditModal('banners', 1);
    assert.strictEqual(sandbox.document.getElementById('edit-modal').style.display, 'flex');
    sandbox.window.closeModal();

    // Experts edit
    sandbox.window.openEditModal('experts', 1);
    assert.strictEqual(sandbox.document.getElementById('edit-modal').style.display, 'flex');
    sandbox.window.closeModal();

    // Blog edit
    sandbox.window.openEditModal('blog', 1);
    assert.strictEqual(sandbox.document.getElementById('telegraph-editor-container').style.display, 'block');
    sandbox.window.closeTelegraphEditor();

    assert.strictEqual(sandbox.getConsoleErrors().length, 0);
  });

  console.log('\n================================================================================');
  console.log(`  FINAL AUDIT SUMMARY: ${passed}/${passed + failed} PASSED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    console.error('FAILURES:');
    failures.forEach(f => console.error(` - ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

runReviewer3Audit();
