/**
 * Automated Verification Suite: 9-Tab ZHK Editor Modal, Moderation Comments & Actions
 */
'use strict';

const { createAdminSandbox, createCabinetSandbox } = require('./harness/dom-sandbox');
const assert = require('assert');

async function runZhk9TabEditorSuite() {
  const results = [];

  async function test(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const dur = Date.now() - t0;
      console.log(`  ✅ PASS: ${name} (${dur}ms)`);
      results.push({ name, passed: true, duration: dur });
    } catch (err) {
      const dur = Date.now() - t0;
      console.error(`  ❌ FAIL: ${name} (${dur}ms)`);
      console.error(err);
      results.push({ name, passed: false, duration: dur, error: err.message });
    }
  }

  const sandbox = createAdminSandbox();
  const window = sandbox.window;
  const document = sandbox.document;
  const localStorage = sandbox.localStorage;

  console.log('🔹 [1/6] Testing 9-Tab Editor Structure and Global Exports...');

  await test('Admin window exports all required editor and moderation functions', () => {
    assert.strictEqual(typeof window.openZhkEditorModal, 'function');
    assert.strictEqual(typeof window.closeZhkEditorModal, 'function');
    assert.strictEqual(typeof window.switchZhkEditorTab, 'function');
    assert.strictEqual(typeof window.saveZhkEditorChanges, 'function');
    assert.strictEqual(typeof window.adminSendEditorToRevision, 'function');
    assert.strictEqual(typeof window.adminPublishFromEditor, 'function');
    assert.strictEqual(typeof window.adminSendPropertyToRevision, 'function');
    assert.strictEqual(typeof window.adminApproveZhk, 'function');
    assert.strictEqual(typeof window.openZhkWizardModal, 'function');
    assert.strictEqual(typeof window.closeZhkWizardModal, 'function');
    assert.strictEqual(typeof window.handleWizardSubmit, 'function');
    assert.strictEqual(typeof window.getAdminPropModeration, 'function');
    assert.strictEqual(typeof window.saveAdminPropModeration, 'function');
    assert.strictEqual(typeof window.openEditPropertyModal, 'function');
    assert.strictEqual(typeof window.applyEditorPreset, 'function');
    assert.strictEqual(typeof window.applyEditorPresetSelect, 'function');
    assert.strictEqual(typeof window.addEditorPriceRow, 'function');
    assert.strictEqual(typeof window.removeEditorPriceRow, 'function');
    assert.strictEqual(typeof window.toggleEditorInfra, 'function');
  });

  await test('Editor modal DOM structure contains 9 tab pills with step numbers', () => {
    const tabsBar = document.querySelector('#zhk-editor-modal-overlay .modal-editor-tabs-bar');
    assert.ok(tabsBar, 'Tabs bar exists');
    const pills = tabsBar.querySelectorAll('.editor-tab-pill');
    assert.strictEqual(pills.length, 9, 'Exactly 9 tab pills present');

    const expectedTabs = [
      { key: 'main', step: '1', title: 'Основное' },
      { key: 'chars', step: '2', title: 'Характеристики' },
      { key: 'infra', step: '3', title: 'Инфраструктура' },
      { key: 'prices', step: '4', title: 'Цены' },
      { key: 'yard', step: '5', title: 'Территория' },
      { key: 'engineering', step: '6', title: 'Инженерия' },
      { key: 'comfort', step: '7', title: 'Комфорт' },
      { key: 'security', step: '8', title: 'Безопасность' },
      { key: 'mgmt', step: '9', title: 'УК и гарантии' }
    ];

    expectedTabs.forEach((tab, i) => {
      const pill = pills[i];
      assert.ok(pill.getAttribute('onclick').includes(tab.key), `Pill ${i+1} maps to ${tab.key}`);
      assert.ok(pill.textContent.includes(tab.step), `Pill ${i+1} has step number ${tab.step}`);
      assert.ok(pill.textContent.includes(tab.title), `Pill ${i+1} has title ${tab.title}`);
    });
  });

  await test('Editor modal footer contains Save, Revise, Publish and Cancel buttons', () => {
    const footer = document.querySelector('#zhk-editor-modal-overlay .modal-editor-footer');
    assert.ok(footer, 'Modal footer exists');
    const buttons = footer.querySelectorAll('button');
    assert.strictEqual(buttons.length, 4, 'Exactly 4 footer buttons present');

    const buttonTexts = Array.from(buttons).map(b => b.textContent.trim());
    assert.ok(buttonTexts.some(t => t.includes('Сохранить изменения')));
    assert.ok(buttonTexts.some(t => t.includes('Доработать')));
    assert.ok(buttonTexts.some(t => t.includes('Опубликовать')));
    assert.ok(buttonTexts.some(t => t.includes('Отмена')));
  });

  console.log('🔹 [2/6] Testing 9 Panes and Collapsible Moderator Comment Boxes...');

  await test('openZhkEditorModal renders all 9 panes with correct fields', () => {
    window.openZhkEditorModal(1);
    const modal = document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(modal.style.display, 'flex');

    const paneIds = [
      'pane-main', 'pane-chars', 'pane-infra', 'pane-prices',
      'pane-yard', 'pane-engineering', 'pane-comfort', 'pane-security', 'pane-mgmt'
    ];

    paneIds.forEach(id => {
      const pane = document.getElementById(id);
      assert.ok(pane, `Pane ${id} rendered in DOM`);
    });

    assert.ok(document.getElementById('edit-zhk-name'));
    assert.ok(document.getElementById('edit-zhk-developer'));
    assert.ok(document.getElementById('edit-zhk-location'));
    assert.ok(document.getElementById('edit-zhk-char-class'));
    assert.ok(document.getElementById('editor-price-rows-container'));
    assert.ok(document.getElementById('edit-zhk-yard-carfree'));
    assert.ok(document.getElementById('edit-zhk-eng-water'));
    assert.ok(document.getElementById('edit-zhk-comf-window'));
    assert.ok(document.getElementById('edit-zhk-sec-lifts'));
    assert.ok(document.getElementById('edit-zhk-mgmt-company'));
  });

  await test('Collapsible moderator comment textareas exist on all 9 tabs', () => {
    window.openZhkEditorModal(1);

    const commentKeys = [
      'main', 'chars', 'infra', 'prices',
      'yard', 'engineering', 'comfort', 'security', 'management'
    ];

    commentKeys.forEach(k => {
      const textarea = document.getElementById(`edit-mod-comment-${k}`);
      assert.ok(textarea, `Textarea edit-mod-comment-${k} exists`);
      assert.strictEqual(textarea.tagName.toLowerCase(), 'textarea');
      const details = textarea.closest('details');
      assert.ok(details, `Textarea edit-mod-comment-${k} is inside a <details> container`);
    });
  });

  console.log('🔹 [3/6] Testing Preset Chips, Dynamic Price Rows & Infrastructure Toggles...');

  await test('Preset chips apply values to text inputs and select elements', () => {
    window.openZhkEditorModal(1);

    // Test text input preset chip
    const delInput = document.getElementById('edit-zhk-delivery');
    assert.ok(delInput);
    window.applyEditorPreset('edit-zhk-delivery', '3 кв. 2027', null);
    assert.strictEqual(delInput.value, '3 кв. 2027');

    // Test select preset chip
    const classSelect = document.getElementById('edit-zhk-char-class');
    assert.ok(classSelect);
    window.applyEditorPresetSelect('edit-zhk-char-class', 'премиум', null);
    assert.strictEqual(classSelect.value, 'премиум');
  });

  await test('Dynamic price rows addition, removal, and serialization', () => {
    window.openZhkEditorModal(1);
    const container = document.getElementById('editor-price-rows-container');
    assert.ok(container);
    const initialRowCount = container.querySelectorAll('.editor-price-row').length;

    window.addEditorPriceRow();
    const rowsAfterAdd = container.querySelectorAll('.editor-price-row');
    assert.strictEqual(rowsAfterAdd.length, initialRowCount + 1, 'Price row added');

    const lastRow = rowsAfterAdd[rowsAfterAdd.length - 1];
    const typeSelect = lastRow.querySelector('.price-row-type');
    const fromInput = lastRow.querySelector('.price-row-from');
    const areaInput = lastRow.querySelector('.price-row-area');
    const removeBtn = lastRow.querySelector('.btn-remove-price-row');

    assert.ok(typeSelect);
    assert.ok(fromInput);
    assert.ok(areaInput);
    assert.ok(removeBtn);

    typeSelect.value = 'Пентхаусы';
    fromInput.value = 'от 18.5 млн ₽';
    areaInput.value = '110–140 м²';

    window.saveZhkEditorChanges();

    const prop = (window.AMBER_DATA.properties || []).find(p => p.id === 1);
    assert.ok(prop);
    const savedPenthouse = prop.prices.find(pr => pr.type === 'Пентхаусы');
    assert.ok(savedPenthouse, 'Penthouse price row saved');
    assert.strictEqual(savedPenthouse.from, 'от 18.5 млн ₽');
    assert.strictEqual(savedPenthouse.area, '110–140 м²');

    // Remove row
    window.openZhkEditorModal(1);
    const removeBtns = document.querySelectorAll('#editor-price-rows-container .btn-remove-price-row');
    const lastRemoveBtn = removeBtns[removeBtns.length - 1];
    window.removeEditorPriceRow(lastRemoveBtn);

    window.saveZhkEditorChanges();
    const propAfterRemove = (window.AMBER_DATA.properties || []).find(p => p.id === 1);
    assert.ok(!propAfterRemove.prices.some(pr => pr.type === 'Пентхаусы'), 'Penthouse removed after delete');
  });

  await test('Infrastructure toggling shows/hides inputs and updates property tags and details', () => {
    window.openZhkEditorModal(1);
    const propBefore = (window.AMBER_DATA.properties || []).find(p => p.id === 1);
    // Add legacy russian tags to simulate real dataset
    propBefore.tags = ['У моря', 'Рядом пляж', 'комфорт-класс'];

    window.openZhkEditorModal(1);
    const chkSeaInitial = document.getElementById('infra-chk-sea');
    assert.strictEqual(chkSeaInitial.checked, true, 'Matches initial russian sea tag');

    window.toggleEditorInfra('sea', false);
    const seaInputOff = document.getElementById('infra-input-sea');
    assert.strictEqual(seaInputOff.style.display, 'none');

    const chkSea = document.getElementById('infra-chk-sea');
    if (chkSea) chkSea.checked = false;

    window.saveZhkEditorChanges();
    const propOff = (window.AMBER_DATA.properties || []).find(p => p.id === 1);
    assert.ok(!propOff.tags.includes('sea'), 'English key removed');
    assert.ok(!propOff.tags.some(t => t.toLowerCase().includes('море')), 'Russian synonym "море" removed');
    assert.ok(!propOff.tags.some(t => t.toLowerCase().includes('пляж')), 'Russian synonym "пляж" removed');
    assert.ok(propOff.tags.includes('комфорт-класс'), 'Non-infra tag preserved');
    assert.strictEqual(propOff.infraDetails.sea, undefined);

    // Toggle on again
    window.openZhkEditorModal(1);
    window.toggleEditorInfra('sea', true);
    const seaInputOn = document.getElementById('infra-input-sea');
    assert.strictEqual(seaInputOn.style.display, 'block');
    seaInputOn.value = '450 метров до променада';

    window.saveZhkEditorChanges();
    const propOn = (window.AMBER_DATA.properties || []).find(p => p.id === 1);
    assert.ok(propOn.tags.includes('sea'));
    assert.strictEqual(propOn.infraDetails.sea, '450 метров до променада');
  });

  console.log('🔹 [4/6] Testing Moderation Comments Save, Revision, and Publish...');

  await test('Saving changes preserves edits and section comments in localStorage under dual keys', () => {
    window.openZhkEditorModal(1);

    const nameInput = document.getElementById('edit-zhk-name');
    nameInput.value = 'ЖК «Тестовый Квартал»';

    document.getElementById('edit-mod-comment-main').value = 'Загрузите более качественный главный рендер';
    document.getElementById('edit-mod-comment-prices').value = 'Уточните стоимость 2-комнатных квартир';
    document.getElementById('edit-mod-comment-yard').value = 'Добавьте число машиномест';

    window.saveZhkEditorChanges();

    const prop = (window.AMBER_DATA.properties || []).find(p => p.name === 'ЖК «Тестовый Квартал»');
    assert.ok(prop, 'Property name updated in AMBER_DATA');

    const modData = window.getAdminPropModeration(1, 'ЖК «Тестовый Квартал»');
    assert.ok(modData, 'Moderation record saved');
    assert.strictEqual(modData.adminComments.main, 'Загрузите более качественный главный рендер');
    assert.strictEqual(modData.adminComments.prices, 'Уточните стоимость 2-комнатных квартир');
    assert.strictEqual(modData.adminComments.yard, 'Добавьте число машиномест');
    assert.strictEqual(modData.adminComments.chars, null);

    // Verify dual keys in localStorage
    const rawKey1 = localStorage.getItem('amber_moderation_1');
    const rawKeyZhk1 = localStorage.getItem('amber_moderation_zhk-1');
    assert.ok(rawKey1, 'amber_moderation_1 key populated in localStorage');
    assert.ok(rawKeyZhk1, 'amber_moderation_zhk-1 key populated in localStorage');
  });

  await test('adminSendEditorToRevision sets status to needs_correction and saves comments', () => {
    window.openZhkEditorModal(1);
    document.getElementById('edit-mod-comment-chars').value = 'Проверьте высоту потолков';

    window.adminSendEditorToRevision();

    const modData = window.getAdminPropModeration(1);
    assert.ok(modData);
    assert.strictEqual(modData.status, 'needs_correction');
    assert.strictEqual(modData.adminComments.chars, 'Проверьте высоту потолков');
  });

  await test('adminPublishFromEditor sets status to approved and resets comments', () => {
    window.openZhkEditorModal(1);
    window.adminPublishFromEditor();

    const modData = window.getAdminPropModeration(1);
    assert.ok(modData);
    assert.strictEqual(modData.status, 'approved');
    assert.strictEqual(modData.adminComments.main, null);
    assert.strictEqual(modData.adminComments.chars, null);
  });

  console.log('🔹 [5/6] Testing Grid Cards & 3-Button Actions & Wizard...');

  await test('renderPropertiesCards renders exactly 3 buttons per ZHK card in properties grid', () => {
    window.renderPropertiesCards(1);
    const cards = document.querySelectorAll('#properties-cards-grid .zhk-full-card');
    assert.ok(cards.length > 0, 'ZHK cards rendered in properties grid');

    cards.forEach((card, idx) => {
      const actions = card.querySelector('.zhk-card-actions');
      assert.ok(actions, `Card ${idx} has actions container`);
      const buttons = actions.querySelectorAll('button');
      assert.strictEqual(buttons.length, 3, `Card ${idx} has exactly 3 buttons`);

      const b1 = buttons[0].textContent.trim();
      const b2 = buttons[1].textContent.trim();
      const b3 = buttons[2].textContent.trim();

      assert.ok(b1.includes('Редактировать'), `Button 1 is Редактировать: "${b1}"`);
      assert.ok(b2.includes('Доработать'), `Button 2 is Доработать: "${b2}"`);
      assert.ok(b3.includes('Опубликовать'), `Button 3 is Опубликовать: "${b3}"`);
    });
  });

  await test('adminSendPropertyToRevision updates status to needs_correction', () => {
    window.adminSendPropertyToRevision(2);
    const modData = window.getAdminPropModeration(2);
    assert.ok(modData);
    assert.strictEqual(modData.status, 'needs_correction');
  });

  await test('adminApproveZhk updates status to approved', () => {
    window.adminApproveZhk(2);
    const modData = window.getAdminPropModeration(2);
    assert.ok(modData);
    assert.strictEqual(modData.status, 'approved');
  });

  await test('openZhkWizardModal opens wizard with Developer select as first field', () => {
    window.openZhkWizardModal();
    const wizardModal = document.getElementById('zhk-wizard-modal-overlay');
    assert.strictEqual(wizardModal.style.display, 'flex');

    const devSelect = document.getElementById('wizard-zhk-developer');
    assert.ok(devSelect, 'Developer select exists in wizard');
    assert.ok(devSelect.options.length > 0, 'Developer options populated');
  });

  await test('Submitting wizard creates property and opens 9-tab editor', () => {
    const devSelect = document.getElementById('wizard-zhk-developer');
    if (devSelect && devSelect.options.length > 0) {
      devSelect.value = devSelect.options[0].value;
    }
    const expectedDev = devSelect ? devSelect.value : 'ГК «Расцвет»';

    document.getElementById('wizard-zhk-name').value = 'ЖК «Янтарный Бриз»';
    document.getElementById('wizard-zhk-loc').value = 'Светлогорск';
    document.getElementById('wizard-zhk-class').value = 'бизнес-класс';
    document.getElementById('wizard-zhk-status').value = 'building';
    document.getElementById('wizard-zhk-price-from').value = 'от 6.5 млн ₽';
    document.getElementById('wizard-zhk-delivery').value = '2 кв. 2027';

    window.handleWizardSubmit({ preventDefault: () => {} });

    const created = window.AMBER_DATA.properties.find(p => p.name === 'ЖК «Янтарный Бриз»');
    assert.ok(created, 'New property created in data store');
    assert.strictEqual(created.location, 'Светлогорск');
    assert.strictEqual(created.class, 'бизнес-класс');
    assert.strictEqual(created.status, 'building');

    assert.ok(created.chars, 'chars initialized');
    assert.ok(created.infraDetails, 'infraDetails initialized');
    assert.ok(Array.isArray(created.prices), 'prices initialized');
    assert.ok(created.yard, 'yard initialized');
    assert.ok(created.engineering, 'engineering initialized');
    assert.ok(created.comfort, 'comfort initialized');
    assert.ok(created.security, 'security initialized');
    assert.ok(created.management, 'management initialized');
    assert.ok(created.guarantees, 'guarantees initialized');

    assert.ok(created.developerId, 'developerId populated');
    assert.strictEqual(created.developer, expectedDev);

    const editorModal = document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(editorModal.style.display, 'flex');
    assert.strictEqual(document.getElementById('edit-zhk-name').value, 'ЖК «Янтарный Бриз»');
  });

  await test('openEditPropertyModal opens 9-tab editor and non-property types open simple edit modal', () => {
    window.closeZhkEditorModal();
    window.openEditPropertyModal(1);
    const editorModal = document.getElementById('zhk-editor-modal-overlay');
    assert.strictEqual(editorModal.style.display, 'flex', 'openEditPropertyModal opens 9-tab editor');
    window.closeZhkEditorModal();

    window.openEditModal('banners', 1);
    const simpleModal = document.getElementById('edit-modal');
    assert.strictEqual(simpleModal.style.display, 'flex', 'openEditModal(banners, 1) opens simple edit modal');
    window.closeModal();
  });

  await test('Photo gallery previews and slots safely escape URLs and zhkId against injection', () => {
    window.openZhkEditorModal(1);
    const xssUrl = 'https://example.com/pic.png" onerror="alert(1)"';
    const renderedHtml = window.renderGallerySlotsHtml({ id: 'zhk-1', photos: [xssUrl] });
    assert.ok(renderedHtml.includes('&quot;'), 'Quotes are escaped in slot HTML');
    assert.ok(!renderedHtml.includes('onerror="alert(1)"'), 'Raw onerror is not injected in rendered slot HTML');

    window.updateGallerySlot('1', 0, xssUrl, false);
    const galleryGrid = document.getElementById('gallery-grid-1');
    assert.ok(galleryGrid);
    assert.ok(!galleryGrid.innerHTML.includes('onerror="alert(1)"'), 'Raw onerror is not injected in gallery grid');
  });

  console.log('🔹 [6/6] Testing Developer Cabinet Sync & XSS Prevention in Moderation Comments...');

  await test('Moderator comments with HTML special characters are safely escaped and displayed in Cabinet', () => {
    // Admin sends complex comments with HTML/XSS payloads
    window.openZhkEditorModal(1);
    const testComment = '<script>alert("xss")</script> & <b>Проверить планировки</b> "категории А"';
    document.getElementById('edit-mod-comment-chars').value = testComment;
    window.adminSendEditorToRevision();

    // Now instantiate Cabinet Sandbox with shared localStorage state
    const cabinetSandbox = createCabinetSandbox({
      initialLocalStorage: {
        'amber_moderation_1': localStorage.getItem('amber_moderation_1'),
        'amber_moderation_zhk-1': localStorage.getItem('amber_moderation_zhk-1')
      }
    });

    const cabWindow = cabinetSandbox.window;

    // In Cabinet, check moderation badge and tab comment
    const badgeHtml = cabWindow.buildModerationBadgeHtml(1);
    assert.ok(badgeHtml.includes('Требует корректировки'), 'Cabinet badge shows correction status');

    const commentHtml = cabWindow.buildTabCommentHtml(1, 'chars');
    assert.ok(commentHtml, 'Comment banner returned for chars tab');
    assert.ok(commentHtml.includes('&lt;script&gt;alert'), 'Script tags escaped safely into &lt;script&gt;');
    assert.ok(!commentHtml.includes('<script>'), 'Unescaped raw <script> is NOT present');
    assert.ok(commentHtml.includes('&amp;'), '& escaped into &amp;');
    assert.ok(commentHtml.includes('&quot;'), '" escaped into &quot;');
  });

  await test('Custom developer names and custom locations are preserved when opening and saving editor', () => {
    // Add property with custom dev and custom location
    const customProp = {
      id: 9999,
      name: 'ЖК «Калининградский Замок»',
      developer: 'ООО «Новый Город Экспресс»',
      location: 'Полесский район, пос. Заливино',
      status: 'building'
    };
    window.AMBER_DATA.properties.push(customProp);

    window.openZhkEditorModal(9999);
    const devSelect = document.getElementById('edit-zhk-developer');
    assert.ok(devSelect);
    assert.strictEqual(devSelect.value, 'ООО «Новый Город Экспресс»', 'Custom developer preserved in select');

    const locSelect = document.getElementById('edit-zhk-location');
    assert.ok(locSelect);
    assert.strictEqual(locSelect.value, 'Полесский район, пос. Заливино', 'Custom location preserved in select');

    window.saveZhkEditorChanges();
    const saved = window.AMBER_DATA.properties.find(p => p.id === 9999);
    assert.ok(saved);
    assert.strictEqual(saved.developer, 'ООО «Новый Город Экспресс»');
    assert.strictEqual(saved.location, 'Полесский район, пос. Заливино');
  });

  await test('DeveloperId is automatically synchronized when developer is changed in the editor', () => {
    window.openZhkEditorModal(1);
    const devs = window.getAdminDevelopers();
    assert.ok(devs.length > 1, 'Multiple developers available in test environment');
    const targetDev = devs[1];

    const devSelect = document.getElementById('edit-zhk-developer');
    assert.ok(devSelect);
    devSelect.value = targetDev.name;

    window.saveZhkEditorChanges();

    const prop = window.AMBER_DATA.properties.find(p => p.id === 1);
    assert.ok(prop);
    assert.strictEqual(prop.developer, targetDev.name);
    assert.strictEqual(prop.developerId, String(targetDev.id), `developerId updated to ${targetDev.id}`);

    const mod = window.getAdminPropModeration(1);
    assert.ok(mod);
    assert.strictEqual(mod.developerId, String(targetDev.id), `Moderation record developerId updated to ${targetDev.id}`);
  });

  return results;
}

if (require.main === module) {
  runZhk9TabEditorSuite().then(results => {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n📊 Verification Result: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
  });
}

module.exports = { runZhk9TabEditorSuite };

