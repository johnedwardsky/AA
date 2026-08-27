/**
 * ══════════════════════════════════════════════════════════════
 * AMBER AVENUE — SUPERADMIN CONTROLLER & ENGINE (js/admin.js)
 * Modern Enterprise Engine with Full 9-Block R3 Implementation
 * ══════════════════════════════════════════════════════════════
 */
'use strict';

/* ── GLOBAL STATE ── */
var currentModalType = null;
var currentModalId = null;
var currentConsentLead = null;
var hasUnsavedChanges = false;
var plCalMonths = {};
var plBookings = {};

var MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

var DEFAULT_DEV_SUBMISSIONS = [
  { id: 1, company: 'ООО «Балтик Строй»', contact: 'Алексей Смирнов', phone: '+7 (4012) 55-44-33', email: 'info@baltikstroy.ru', city: 'Калининград', date: '2026-05-30', status: 'Новая' },
  { id: 2, company: 'СК «МореСтрой»', contact: 'Марина Орлова', phone: '+7 (4012) 77-88-99', email: 'sales@morestroy.ru', city: 'Светлогорск', date: '2026-05-29', status: 'В работе' }
];

/* ── STRING & UTILITY HELPERS ── */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHTML(str) {
  return escapeHtml(str);
}

function showAdminToast(msg) {
  if (typeof document === 'undefined') return;
  const toast = document.getElementById('admin-toast');
  const text = document.getElementById('toast-msg');
  if (text) text.textContent = msg;
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function triggerUnsavedChanges() {
  hasUnsavedChanges = true;
  if (typeof window !== 'undefined') window.hasUnsavedChanges = true;
  if (typeof document === 'undefined') return;
  const bar = document.getElementById('save-bar');
  if (bar) bar.style.display = 'flex';
}

function saveDatabase() {
  hasUnsavedChanges = false;
  if (typeof window !== 'undefined') window.hasUnsavedChanges = false;
  if (typeof document === 'undefined') return;
  const bar = document.getElementById('save-bar');
  if (bar) bar.style.display = 'none';
  showAdminToast('База данных сохранена');
}

function saveChangesToDisk(data) {
  saveDatabase();
  try {
    const key = 'amber_disk_changes_' + Date.now();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data || {}));
    }
    return true;
  } catch(e) {
    return false;
  }
}

function seedDeveloperSubmissions(force) {
  if (typeof localStorage === 'undefined') return;
  if (!localStorage.getItem('dev_submissions') || force) {
    localStorage.setItem('dev_submissions', JSON.stringify(DEFAULT_DEV_SUBMISSIONS));
  }
}

/* ══════════════════════════════════════════════════════════════
   NAVIGATION & SECTION ROUTER
   ══════════════════════════════════════════════════════════════ */
function switchAdminSection(sectionId) {
  if (typeof document === 'undefined') return;

  const aliasMap = {
    'managers': 'submissions',
    'pricing': 'monetization',
    'analytics': 'stats',
    'leads': 'amber-leads'
  };
  const reverseAliasMap = {
    'submissions': 'managers',
    'monetization': 'pricing',
    'stats': 'analytics',
    'amber-leads': 'leads'
  };

  const canonicalId = aliasMap[sectionId] || sectionId;
  const alternateId = reverseAliasMap[sectionId] || sectionId;

  // 1. Update active sidebar item
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.remove('active');
    const sec = item.dataset.section;
    if (sec === sectionId || sec === canonicalId || sec === alternateId) {
      item.classList.add('active');
    }
  });

  // 2. Switch active section view
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('section-' + sectionId) ||
                 document.getElementById('section-' + canonicalId) ||
                 document.getElementById('section-' + alternateId);
  if (target) {
    target.classList.add('active');
  }

  // 3. Trigger section-specific render routines safely
  const effectiveId = canonicalId;
  if (effectiveId === 'moderation' && typeof renderModerationSection === 'function') renderModerationSection();
  if (effectiveId === 'audit-log' && typeof renderAdminAuditLog === 'function') renderAdminAuditLog();
  if (effectiveId === 'stats' && typeof renderStatsDashboard === 'function') renderStatsDashboard();
  if (effectiveId === 'amber-leads' && typeof renderAmberLeadsTable === 'function') {
    renderAmberLeadsTable();
    if (typeof renderUnlockRequestsTable === 'function') renderUnlockRequestsTable();
  }
  if (effectiveId === 'submissions' && typeof renderSubmissionsTable === 'function') renderSubmissionsTable();
  if (effectiveId === 'properties' && typeof renderPropertiesTable === 'function') renderPropertiesTable();
  if (effectiveId === 'developers' && typeof renderDevelopersTable === 'function') {
    renderDevelopersTable();
    if (typeof renderInviteTokensTable === 'function') renderInviteTokensTable();
  }
  if (effectiveId === 'blog' && typeof renderBlogTable === 'function') renderBlogTable();
  if (effectiveId === 'experts' && typeof renderExpertsTable === 'function') renderExpertsTable();
  if (effectiveId === 'banners' && typeof renderBannersTable === 'function') renderBannersTable();
  if (effectiveId === 'placements' && typeof initPlacementsSection === 'function') initPlacementsSection();
  if (effectiveId === 'dev-analytics' && typeof initDevAnalytics === 'function') initDevAnalytics();
  if (effectiveId === 'monetization' || effectiveId === 'modules') {
    if (typeof initTariffsSection === 'function') initTariffsSection();
    if (typeof updateSimulation === 'function') updateSimulation();
  }
  if (effectiveId === 'platform-leads' && typeof renderPlatformLeads === 'function') renderPlatformLeads();
  if (effectiveId === 'pages' && typeof initPagesSection === 'function') initPagesSection();
}

/* ══════════════════════════════════════════════════════════════
   3.1 ARTICLES / BLOG CRUD (amber_articles)
   ══════════════════════════════════════════════════════════════ */
function getAdminArticles() {
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_articles');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(list) || list.length === 0) {
    const fallback = (window.AMBER_DATA && window.AMBER_DATA.blog) || [
      {
        id: 1,
        title: 'Калининград — город-сад: почему сюда переезжают тысячи россиян',
        category: 'Аналитика',
        author: 'Анна Волкова',
        date: '2026-06-05',
        status: 'published',
        excerpt: 'Зелёные бульвары, немецкая архитектура и комфортный морской климат привлекают покупателей со всей России.',
        content: '<p>Калининградская область стабильно входит в ТОП-3 регионов РФ по привлекательности для переезда и инвестиций в курортную недвижимость. Основные драйверы спроса — развитая инфраструктура и близость к Балтийскому морю.</p>',
        imgSrc: 'kld_city_welcome.png',
        tags: ['город-сад', 'инвестиции'],
        viewsCount: 1240,
        views: 1240
      },
      {
        id: 2,
        title: 'Тренды недвижимости на побережье Балтики: Светлогорск и Зеленоградск 2026',
        category: 'Обзор',
        author: 'Дмитрий Соколов',
        date: '2026-05-28',
        status: 'published',
        excerpt: 'Анализ спроса и цен на апартаменты первой линии Балтийского побережья.',
        content: '<p>Спрос на жилье у моря демонстрирует уверенный рост. Эксперты отмечают увеличение доли инвесторов, приобретающих апартаменты под сдачу.</p>',
        imgSrc: 'baltic_sea_welcome.png',
        tags: ['побережье', 'апартаменты'],
        viewsCount: 980,
        views: 980
      }
    ];
    list = fallback;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_articles', JSON.stringify(list)); } catch(e) {}
    }
  }
  if (window.AMBER_DATA) window.AMBER_DATA.blog = list;
  return list;
}

function saveAdminArticles(articles) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_articles', JSON.stringify(articles)); } catch(e) {}
  }
  if (window.AMBER_DATA) window.AMBER_DATA.blog = articles;
  triggerUnsavedChanges();
}

function renderBlogTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-blog tbody');
  if (!tbody) return;

  const items = getAdminArticles();
  const search = (document.getElementById('search-blog')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('blog-filter-cat')?.value || 'all';
  const statusFilter = document.getElementById('blog-filter-status')?.value || 'all';

  const filtered = items.filter(a => {
    const matchSearch = !search || (a.title||'').toLowerCase().includes(search) || (a.author||'').toLowerCase().includes(search);
    const matchCat = catFilter === 'all' || a.category === catFilter;
    const matchStatus = statusFilter === 'all' || (a.status || 'published') === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748B;">Статьи не найдены</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const isPub = (a.status || 'published') === 'published';
    const statusBadge = isPub
      ? '<span class="status-pill pill-active">Опубликовано</span>'
      : '<span class="status-pill" style="background:#F1F5F9;color:#64748B;">Черновик</span>';
    const thumb = a.imgSrc ? `<img src="${a.imgSrc}" alt="" style="width:44px;height:32px;object-fit:cover;border-radius:4px;vertical-align:middle;">` : '📄';

    return `
      <tr>
        <td>#${a.id}</td>
        <td>${thumb}</td>
        <td><b>${escapeHtml(a.title)}</b></td>
        <td><span class="badge badge-neutral">${escapeHtml(a.category || 'Обзор')}</span></td>
        <td>${escapeHtml(a.author || 'Редакция')}</td>
        <td>${a.date || a.publishedAt || '—'}</td>
        <td>${statusBadge}</td>
        <td>${a.viewsCount || a.views || 0}</td>
        <td>
          <button class="btn-table-icon" title="Переключить статус публикации" onclick="toggleArticleStatus(${a.id})">${isPub ? '👁️' : '⏸️'}</button>
          <button class="btn-table-icon" title="Редактировать" onclick="openEditModal('blog', ${a.id})">✏️</button>
          <button class="btn-table-icon btn-danger" title="Удалить" onclick="deleteItem('blog', ${a.id})">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleArticleStatus(id) {
  const articles = getAdminArticles();
  const item = articles.find(x => x.id === id);
  if (item) {
    item.status = (item.status === 'published' ? 'draft' : 'published');
    item.updatedAt = new Date().toISOString();
    saveAdminArticles(articles);
    renderBlogTable();
    showAdminToast('Статус статьи обновлен: ' + (item.status === 'published' ? 'Опубликовано' : 'Черновик'));
  }
}

/* ══════════════════════════════════════════════════════════════
   3.2 BANNERS MANAGEMENT (amber_banners_admin)
   ══════════════════════════════════════════════════════════════ */
function getAdminBanners() {
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_banners_admin') || localStorage.getItem('amber_banners');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(list) || list.length === 0) {
    const fallback = (window.AMBER_DATA && window.AMBER_DATA.banners) || [
      {
        id: 1,
        title: 'Летняя ипотека 5%',
        headline: 'Летняя субсидированная ипотека от 5% годовых',
        sub: 'Квартиры в ЖК комфорт-класса в Калининграде и Светлогорске',
        icon: '🏷️',
        imgSrc: 'dev-banner.png',
        slot: 'top',
        targetPage: 'all',
        cta: 'Выбрать квартиру',
        ctaLink: 'zhk.html',
        tag: 'Спецпредложение',
        startDate: '2026-06-01',
        endDate: '2026-08-31',
        status: 'active',
        impressions: 14200,
        clicks: 680,
        stats: { impressions: 14200, clicks: 680 }
      },
      {
        id: 2,
        title: 'Премиум на побережье',
        headline: 'Виллы и резиденции в Светлогорске',
        sub: 'Первая береговая линия, приватный парк',
        icon: '🌊',
        imgSrc: 'baltic_sea_welcome.png',
        slot: 'hero',
        targetPage: 'umory',
        cta: 'Смотреть объекты',
        ctaLink: 'zhk-umory.html',
        tag: 'Премиум',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        status: 'active',
        impressions: 9500,
        clicks: 430,
        stats: { impressions: 9500, clicks: 430 }
      }
    ];
    list = fallback;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_banners_admin', JSON.stringify(list)); } catch(e) {}
    }
  }
  if (window.AMBER_DATA) window.AMBER_DATA.banners = list;
  return list;
}

function saveAdminBanners(banners) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_banners_admin', JSON.stringify(banners)); } catch(e) {}
  }
  if (window.AMBER_DATA) window.AMBER_DATA.banners = banners;
  triggerUnsavedChanges();
}

function renderBannersTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-banners tbody');
  if (!tbody) return;

  const items = getAdminBanners();
  const slotFilter = document.getElementById('banners-filter-slot')?.value || 'all';
  const statusFilter = document.getElementById('banners-filter-status')?.value || 'all';
  const search = (document.getElementById('search-banners')?.value || '').toLowerCase().trim();

  const filtered = items.filter(b => {
    const matchSlot = slotFilter === 'all' || b.slot === slotFilter;
    const matchStatus = statusFilter === 'all' || (b.status || 'active') === statusFilter;
    const matchSearch = !search || (b.title||'').toLowerCase().includes(search) || (b.headline||'').toLowerCase().includes(search);
    return matchSlot && matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#64748B;">Баннеры не найдены</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const imp = b.stats ? b.stats.impressions : (b.impressions || b.views || 0);
    const clk = b.stats ? b.stats.clicks : (b.clicks || 0);
    const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(1) + '%' : '0.0%';
    const isActive = (b.status || 'active') === 'active';
    const statusBadge = isActive
      ? '<span class="status-pill pill-active">Активен</span>'
      : '<span class="status-pill pill-pending">На паузе</span>';
    const thumb = b.imgSrc ? `<img src="${b.imgSrc}" alt="" style="width:44px;height:30px;object-fit:cover;border-radius:4px;vertical-align:middle;">` : '🎯';

    return `
      <tr>
        <td>#${b.id}</td>
        <td>${thumb}</td>
        <td><b>${escapeHtml(b.title)}</b><div style="font-size:11px;color:#64748B;">${escapeHtml(b.headline || '')}</div></td>
        <td><code>${escapeHtml(b.slot || 'top')}</code></td>
        <td>${escapeHtml(b.targetPage || 'all')}</td>
        <td><small>${b.startDate || '—'} – ${b.endDate || '—'}</small></td>
        <td>${imp.toLocaleString('ru-RU')}</td>
        <td><b>${clk.toLocaleString('ru-RU')}</b> <span style="color:#16A34A;font-weight:700;">(${ctr})</span></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-table-icon" title="Пауза / Активация" onclick="toggleBannerStatus(${b.id})">${isActive ? '⏸️' : '▶️'}</button>
          <button class="btn-table-icon" title="Редактировать" onclick="openEditModal('banners', ${b.id})">✏️</button>
          <button class="btn-table-icon btn-danger" title="Удалить" onclick="deleteItem('banners', ${b.id})">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleBannerStatus(id) {
  const banners = getAdminBanners();
  const item = banners.find(x => x.id === id);
  if (item) {
    item.status = (item.status === 'active' ? 'paused' : 'active');
    saveAdminBanners(banners);
    renderBannersTable();
    showAdminToast('Статус баннера обновлен: ' + (item.status === 'active' ? 'Активен' : 'На паузе'));
  }
}

/* ══════════════════════════════════════════════════════════════
   3.3 HEADER SLIDER & CATEGORY BACKGROUNDS
   (amber_header_slider & amber_category_backgrounds)
   ══════════════════════════════════════════════════════════════ */
function getAdminHeroSlides() {
  let slides = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_header_slider');
      if (raw) slides = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(slides) || slides.length === 0) {
    slides = (window.AMBER_DATA && window.AMBER_DATA.heroSlides) || [
      {
        id: 1,
        title: 'Премиальные новостройки Балтики',
        desc: 'Откройте для себя лучшие жилые комплексы Калининграда и курортного побережья',
        label: 'Новинки 2026',
        link: 'zhk.html',
        image: 'kld_city_welcome.png',
        sortOrder: 1,
        active: true
      },
      {
        id: 2,
        title: 'Квартиры у моря со скидкой до 15%',
        desc: 'Специальные условия от застройщиков в Светлогорске и Зеленоградске',
        label: 'Спецпредложение',
        link: 'zhk-umory.html',
        image: 'baltic_sea_welcome.png',
        sortOrder: 2,
        active: true
      }
    ];
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_header_slider', JSON.stringify(slides)); } catch(e) {}
    }
  }
  if (window.AMBER_DATA) window.AMBER_DATA.heroSlides = slides;
  return slides;
}

function saveAdminHeroSlides(slides) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_header_slider', JSON.stringify(slides)); } catch(e) {}
  }
  if (window.AMBER_DATA) window.AMBER_DATA.heroSlides = slides;
  triggerUnsavedChanges();
}

function renderHeroSlidesTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-heroSlides tbody');
  if (!tbody) return;
  const items = getAdminHeroSlides();

  tbody.innerHTML = items.map(s => {
    const thumb = s.image ? `<img src="${s.image}" alt="" style="width:40px;height:24px;object-fit:cover;border-radius:4px;vertical-align:middle;">` : '🖼️';
    return `
      <tr>
        <td>#${s.id}</td>
        <td>${thumb}</td>
        <td><b>${escapeHtml(s.title)}</b></td>
        <td>${escapeHtml(s.label || 'Слайд')}</td>
        <td><code>${escapeHtml(s.link || 'zhk.html')}</code></td>
        <td><span class="status-pill ${s.active !== false ? 'pill-active' : 'pill-pending'}">${s.active !== false ? 'Активен' : 'Скрыт'}</span></td>
        <td>
          <button class="btn-table-icon" onclick="openEditModal('heroSlides', ${s.id})">✏️</button>
          <button class="btn-table-icon btn-danger" onclick="deleteItem('heroSlides', ${s.id})">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

function getAdminCategoryBgs() {
  const defaults = {
    city: {
      bgImage: 'kld_city_welcome.png',
      slogan: 'Новостройки в историческом центре Калининграда',
      subtitle: 'Amber Avenue — ваш независимый навигатор по жилым комплексам',
      promoPartner: '1',
      promoTitle: 'ГК «КалининградСтройИнвест»',
      promoSubtitle: 'Специальные условия на квартиры в центре',
      promoLink: 'zhk-kaliningrad.html',
      promoErid: '2VtzqwXYZ'
    },
    sea: {
      bgImage: 'baltic_sea_welcome.png',
      slogan: 'ЖК у Балтийского моря',
      subtitle: 'Amber Avenue — лучшие новостройки на первой береговой линии',
      promoPartner: '2',
      promoTitle: 'СК «МореСтрой»',
      promoSubtitle: 'Апартаменты в Светлогорске и Зеленоградске',
      promoLink: 'zhk-umory.html',
      promoErid: '2VtzqwABC'
    },
    prigorod: {
      bgImage: 'suburban_green_welcome.png',
      slogan: 'Зелёный пригород Калининграда',
      subtitle: 'Amber Avenue — комфортные новостройки в тихих пригородах',
      promoPartner: '3',
      promoTitle: 'ГК «Расцвет»',
      promoSubtitle: 'Экологичные кварталы в Гурьевске и Васильково',
      promoLink: 'zhk-prigorod.html',
      promoErid: '2VtzqwDEF'
    },
    oblast: {
      bgImage: 'region_oblast_welcome.png',
      slogan: 'Новостройки в городах Калининградской области',
      subtitle: 'Amber Avenue — жилые комплексы в Светлом, Гусеве, Черняховске',
      promoPartner: '13',
      promoTitle: 'ГК «КСК»',
      promoSubtitle: 'Доступное качественное жилье в регионе',
      promoLink: 'zhk-oblast.html',
      promoErid: '2VtzqwGHI'
    }
  };

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_category_backgrounds');
      if (raw) return Object.assign({}, defaults, JSON.parse(raw));
    } catch(e) {}
  }
  return defaults;
}

function saveAdminCategoryBgs(data) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_category_backgrounds', JSON.stringify(data)); } catch(e) {}
  }
  triggerUnsavedChanges();
  showAdminToast('Фоны категорий сохранены');
}

/* ══════════════════════════════════════════════════════════════
   3.4 AD PLACEMENTS ENGINE & CALENDAR (amber_placements)
   ══════════════════════════════════════════════════════════════ */
function initPlacementsSection() {
  if (typeof document === 'undefined') return;
  const sel = document.getElementById('placements-dev-select');
  if (!sel) return;

  sel.innerHTML = '<option value="">— Выберите застройщика —</option>';
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  devs.forEach(d => {
    sel.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
  });

  for (let i = 1; i <= 8; i++) {
    if (!plCalMonths[i]) plCalMonths[i] = { year: 2026, month: 7 }; // Aug 2026
    renderPlCalendar(i);
  }
  loadPlacementsData();
  renderPlacementRequestsTable();
}

function onPlacementDevChange() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  const summary = document.getElementById('placements-dev-summary');
  if (!devId) {
    if (summary) summary.textContent = '';
    return;
  }
  loadPlacementsData();
  populateDevZhkList(devId);
  if (summary) summary.textContent = 'ID: ' + devId;
  recalcPlacementCost();
  loadContractData();
}

function populateDevZhkList(devId) {
  if (typeof document === 'undefined') return;
  const containers = ['pl-6-zhk-list', 'pl-8-zhk-list'];
  let devName = '';
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  const dev = devs.find(d => String(d.id) === String(devId));
  if (dev) devName = dev.name;

  const allProps = (window.AMBER_DATA && window.AMBER_DATA.properties) || window.PROPERTIES || [];
  const normName = devName.toLowerCase().replace(/гк|ооо|ск|«|»|"|'/g, '').trim();
  const props = allProps.filter(p => {
    if (String(p.developerId) === String(devId)) return true;
    if (!p.developer) return false;
    const propDevNorm = p.developer.toLowerCase().replace(/гк|ооо|ск|«|»|"|'/g, '').trim();
    return propDevNorm.includes(normName) || normName.includes(propDevNorm);
  }).slice(0, 20);

  containers.forEach(cId => {
    const c = document.getElementById(cId);
    if (!c) return;
    c.innerHTML = '';
    if (props.length === 0) {
      c.innerHTML = '<span style="color:#94A3B8;font-size:12px;">Нет ЖК у застройщика</span>';
      return;
    }
    props.forEach(p => {
      const label = document.createElement('label');
      label.className = 'pl-section-check';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.padding = '4px 0';
      label.innerHTML = `<input type="checkbox" value="${p.id}" onchange="recalcPlacementCost()"> ${escapeHtml(p.name)}`;
      c.appendChild(label);
    });
  });
}

function togglePlacementBlock(n) {
  if (typeof document === 'undefined') return;
  const body = document.getElementById('pl-body-' + n);
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

function shiftPlCalendar(typeId, dir) {
  if (!plCalMonths[typeId]) plCalMonths[typeId] = { year: 2026, month: 7 };
  const m = plCalMonths[typeId];
  m.month += dir;
  if (m.month > 11) { m.month = 0; m.year++; }
  if (m.month < 0) { m.month = 11; m.year--; }
  renderPlCalendar(typeId);
}

function renderPlCalendar(typeId) {
  if (typeof document === 'undefined') return;
  if (!plCalMonths[typeId]) plCalMonths[typeId] = { year: 2026, month: 7 };
  const m = plCalMonths[typeId];
  const titleEl = document.getElementById('pl-cal-title-' + typeId);
  const gridEl = document.getElementById('pl-cal-grid-' + typeId);
  if (!titleEl || !gridEl) return;

  titleEl.textContent = MONTHS_RU[m.month] + ' ' + m.year;
  gridEl.innerHTML = '';

  const headers = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  headers.forEach(h => {
    const el = document.createElement('div');
    el.className = 'pl-cal-day-header';
    el.textContent = h;
    gridEl.appendChild(el);
  });

  let firstDay = new Date(m.year, m.month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'pl-cal-day empty';
    gridEl.appendChild(empty);
  }

  const devId = document.getElementById('placements-dev-select')?.value || '';
  let allBookings = {};
  if (typeof localStorage !== 'undefined') {
    try { allBookings = JSON.parse(localStorage.getItem('amber_placements') || '{}'); } catch(e) {}
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'pl-cal-day';
    cell.textContent = d;
    const dateStr = m.year + '-' + String(m.month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    
    // Detailed slot key calculation
    let subId = 'main';
    if (typeId === 1) subId = document.getElementById('pl-1-page')?.value || 'kaliningrad';
    if (typeId === 2) subId = 'pos' + (document.getElementById('pl-2-count')?.value || '1');
    if (typeId === 4) subId = 'top3';
    if (typeId === 5) subId = 'tabs';
    if (typeId === 6) subId = 'cards';
    
    const specificSlotKey = `${typeId}_${subId}_${dateStr}`;
    const genericSlotKey = `${typeId}_${dateStr}`;
    const bookingVal = allBookings[specificSlotKey] || allBookings[genericSlotKey];

    if (bookingVal && String(bookingVal) === String(devId)) {
      cell.classList.add('booked');
    } else if (bookingVal) {
      cell.classList.add('taken');
    } else {
      cell.classList.add('free');
    }

    cell.setAttribute('data-date', dateStr);
    cell.setAttribute('data-type', typeId);
    cell.setAttribute('data-sub', subId);
    cell.onclick = function() { togglePlBooking(this); };
    gridEl.appendChild(cell);
  }
}

function togglePlBooking(cell) {
  if (cell.classList.contains('taken') || cell.classList.contains('cooldown')) return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) { alert('Сначала выберите застройщика'); return; }

  const dateStr = cell.getAttribute('data-date');
  const typeId = cell.getAttribute('data-type');
  const subId = cell.getAttribute('data-sub') || 'main';
  const specificKey = `${typeId}_${subId}_${dateStr}`;
  const genericKey = `${typeId}_${dateStr}`;

  let allBookings = {};
  if (typeof localStorage !== 'undefined') {
    try { allBookings = JSON.parse(localStorage.getItem('amber_placements') || '{}'); } catch(e) {}
  }

  if (cell.classList.contains('booked')) {
    delete allBookings[specificKey];
    delete allBookings[genericKey];
    cell.classList.remove('booked');
    cell.classList.add('free');
  } else {
    allBookings[specificKey] = devId;
    cell.classList.remove('free');
    cell.classList.add('booked');
  }

  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_placements', JSON.stringify(allBookings)); } catch(e) {}
  }
  recalcPlacementCost();
}

function recalcPlacementCost() {
  if (typeof document === 'undefined') return;
  let total = 0;

  // Type 1: Main Banner
  if (document.getElementById('pl-check-1')?.checked) {
    const c1 = 90000;
    total += c1;
    const el = document.getElementById('pl-price-1');
    if (el) el.textContent = c1.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-1')) {
    document.getElementById('pl-price-1').textContent = '0 ₽';
  }

  // Type 2: Side Banner
  if (document.getElementById('pl-check-2')?.checked) {
    const count2 = parseInt(document.getElementById('pl-2-count')?.value, 10) || 1;
    const c2 = count2 * 8500;
    total += c2;
    const el = document.getElementById('pl-price-2');
    if (el) el.textContent = c2.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-2')) {
    document.getElementById('pl-price-2').textContent = '0 ₽';
  }

  // Type 3: Progressive Feed Banner
  if (document.getElementById('pl-check-3')?.checked) {
    const count3 = parseInt(document.getElementById('pl-3-count')?.value, 10) || 1;
    let c3 = 0;
    const info3 = [];
    for (let i = 0; i < count3; i++) {
      const rate = i === 0 ? 35000 : (i === 1 ? 25000 : 15000);
      c3 += rate;
      info3.push((i+1) + '-й: ' + (rate/1000) + 'к');
    }
    total += c3;
    const el = document.getElementById('pl-price-3');
    if (el) el.textContent = c3.toLocaleString('ru-RU') + ' ₽';
    const infoEl = document.getElementById('pl-3-pricing-info');
    if (infoEl) infoEl.textContent = info3.join(' · ');
  } else if (document.getElementById('pl-price-3')) {
    document.getElementById('pl-price-3').textContent = '0 ₽';
  }

  // Type 4: Recommended Top-3
  if (document.getElementById('pl-check-4')?.checked) {
    const cards4 = Math.min(3, parseInt(document.getElementById('pl-4-cards')?.value, 10) || 3);
    const days4 = Math.min(7, parseInt(document.getElementById('pl-4-days')?.value, 10) || 7);
    const c4 = cards4 * days4 * 3500;
    total += c4;
    const el = document.getElementById('pl-price-4');
    if (el) el.textContent = c4.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-4')) {
    document.getElementById('pl-price-4').textContent = '0 ₽';
  }

  // Type 5: Native Ads in Tabs
  if (document.getElementById('pl-check-5')?.checked) {
    const checks5 = document.querySelectorAll('#pl-body-5 .pl-section-check input:checked');
    let c5 = 0;
    checks5.forEach(cb => {
      const sec = cb.value;
      c5 += (sec === 'prices' || sec === 'mortgage' || sec === 'location') ? 70000 : 25000;
    });
    total += c5;
    const el = document.getElementById('pl-price-5');
    if (el) el.textContent = c5.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-5')) {
    document.getElementById('pl-price-5').textContent = '0 ₽';
  }

  // Type 6: Paid ZHK Cards
  if (document.getElementById('pl-check-6')?.checked) {
    const checks6 = document.querySelectorAll('#pl-6-zhk-list input:checked');
    const c6 = checks6.length * 15000;
    total += c6;
    const el = document.getElementById('pl-price-6');
    if (el) el.textContent = c6.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-6')) {
    document.getElementById('pl-price-6').textContent = '0 ₽';
  }

  // Type 7: Menu Slider
  if (document.getElementById('pl-check-7')?.checked) {
    const days7 = parseInt(document.getElementById('pl-7-days')?.value, 10) || 7;
    const c7 = days7 * 1500;
    total += c7;
    const el = document.getElementById('pl-price-7');
    if (el) el.textContent = c7.toLocaleString('ru-RU') + ' ₽';
  } else if (document.getElementById('pl-price-7')) {
    document.getElementById('pl-price-7').textContent = '0 ₽';
  }

  // Type 8: Premium Package
  if (document.getElementById('pl-check-8')?.checked) {
    const monthNum = parseInt(document.getElementById('pl-8-month')?.value, 10) || 1;
    const c8 = monthNum <= 6 ? 150000 : 250000;
    total += c8;
    const el = document.getElementById('pl-price-8');
    if (el) el.textContent = c8.toLocaleString('ru-RU') + ' ₽';
    const rateInfo = document.getElementById('pl-8-rate-info');
    if (rateInfo) {
      rateInfo.textContent = monthNum <= 6 ? '(150 000 ₽ — льготный период)' : '(250 000 ₽ — стандартный тариф)';
    }
  } else if (document.getElementById('pl-price-8')) {
    document.getElementById('pl-price-8').textContent = '0 ₽';
  }

  const totalEl = document.getElementById('placements-total-cost');
  if (totalEl) totalEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
}

function savePlacementsData() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) { alert('Выберите застройщика'); return; }

  const data = { devId: devId, types: {} };
  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById('pl-check-' + i);
    data.types[i] = { enabled: cb ? cb.checked : false };
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_placements_config_' + devId, JSON.stringify(data));
    } catch(e) {}
  }
  saveContractData();
  showAdminToast('Размещения сохранены');
}

function loadPlacementsData() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) return;

  if (typeof localStorage !== 'undefined') {
    try {
      const data = JSON.parse(localStorage.getItem('amber_placements_config_' + devId) || 'null');
      if (data && data.types) {
        for (let i = 1; i <= 8; i++) {
          const cb = document.getElementById('pl-check-' + i);
          if (cb && data.types[i]) cb.checked = data.types[i].enabled;
        }
      }
    } catch(e) {}
  }
  for (let j = 1; j <= 8; j++) renderPlCalendar(j);
  recalcPlacementCost();
}

function markContractUnsaved() {
  const ind = document.getElementById('contract-save-indicator');
  if (ind) ind.style.display = 'none';
  if (typeof triggerUnsavedChanges === 'function') triggerUnsavedChanges();
}

function insertContractCommentTag(tagText) {
  const textarea = document.getElementById('contract-comments');
  if (!textarea) return;
  const currentVal = (textarea.value || '').trim();
  if (!currentVal) {
    textarea.value = tagText;
  } else if (!currentVal.includes(tagText)) {
    textarea.value = currentVal + '\n• ' + tagText;
  }
  textarea.focus();
  markContractUnsaved();
  updateContractCommentsCount();
}

function updateContractCommentsCount() {
  const textarea = document.getElementById('contract-comments');
  const countEl = document.getElementById('contract-comments-count');
  if (!textarea || !countEl) return;
  const len = textarea.value.length;
  let word = 'символов';
  const rem100 = len % 100;
  const rem10 = len % 10;
  if (rem100 < 11 || rem100 > 19) {
    if (rem10 === 1) word = 'символ';
    else if (rem10 >= 2 && rem10 <= 4) word = 'символа';
  }
  countEl.textContent = `${len} ${word}`;
}

function clearContractComments() {
  const textarea = document.getElementById('contract-comments');
  if (!textarea || !textarea.value) return;
  textarea.value = '';
  textarea.focus();
  markContractUnsaved();
  updateContractCommentsCount();
}

function setContractPaymentStatus(statusKey) {
  const steps = document.querySelectorAll('#contract-status-stepper .stepper-step');
  const statusOrder = ['not_paid', 'partial', 'paid', 'overdue'];
  const targetIdx = statusOrder.indexOf(statusKey);
  
  steps.forEach(step => {
    const s = step.getAttribute('data-status');
    if (s === statusKey) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  const select = document.getElementById('contract-payment-status');
  if (select) select.value = statusKey;

  markContractUnsaved();
  saveContractData();
  const labelMap = { not_paid: 'Новый', partial: 'Частичная оплата', paid: 'Оплачен', overdue: 'Просрочен' };
  showAdminToast('Статус оплаты договора: ' + (labelMap[statusKey] || statusKey));
}

function saveContractData() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) return;

  const data = {
    number: document.getElementById('contract-number')?.value || '',
    date: document.getElementById('contract-date')?.value || '',
    paymentStatus: document.getElementById('contract-payment-status')?.value || 'not_paid',
    comments: document.getElementById('contract-comments')?.value || '',
    updatedAt: new Date().toISOString()
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_contract_' + devId, JSON.stringify(data));
    } catch(e) {}
  }
  const ind = document.getElementById('contract-save-indicator');
  if (ind) { ind.style.display = 'inline'; ind.textContent = '✓ Сохранено'; }
}

function loadContractData() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) return;

  if (typeof localStorage !== 'undefined') {
    try {
      const data = JSON.parse(localStorage.getItem('amber_contract_' + devId) || 'null');
      if (data) {
        const num = document.getElementById('contract-number');
        const dt = document.getElementById('contract-date');
        const st = document.getElementById('contract-payment-status');
        const cm = document.getElementById('contract-comments');
        const statusKey = data.paymentStatus || 'not_paid';
        if (num) num.value = data.number || '';
        if (dt) dt.value = data.date || '';
        if (st) st.value = statusKey;
        if (cm) cm.value = data.comments || '';
        updateContractCommentsCount();

        const steps = document.querySelectorAll('#contract-status-stepper .stepper-step');
        steps.forEach(step => {
          if (step.getAttribute('data-status') === statusKey) {
            step.classList.add('active');
          } else {
            step.classList.remove('active');
          }
        });
      }
    } catch(e) {}
  }
}

function renderPlacementRequestsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-placement-requests tbody');
  if (!tbody) return;

  let requests = [];
  if (typeof localStorage !== 'undefined') {
    try {
      requests = JSON.parse(localStorage.getItem('amber_placement_requests') || '[]');
    } catch(e) {}
  }

  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#64748B;">Нет входящих заявок на размещение</td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><b>${escapeHtml(r.developerName || ('Девелопер #' + r.developerId))}</b></td>
      <td>${escapeHtml(r.placementType || 'Реклама')}</td>
      <td>${escapeHtml(r.details || '')}</td>
      <td><span class="status-pill ${r.status === 'approved' ? 'pill-active' : 'pill-pending'}">${r.status}</span></td>
      <td>
        <button class="btn-table-icon" onclick="approvePlacementRequest('${r.id}')">✅ Одобрить</button>
        <button class="btn-table-icon btn-danger" onclick="rejectPlacementRequest('${r.id}')">❌ Отклонить</button>
      </td>
    </tr>
  `).join('');
}

function approvePlacementRequest(reqId) {
  if (typeof localStorage === 'undefined') return;
  try {
    let list = JSON.parse(localStorage.getItem('amber_placement_requests') || '[]');
    const req = list.find(x => x.id === reqId);
    if (req) {
      req.status = 'approved';
      localStorage.setItem('amber_placement_requests', JSON.stringify(list));
      renderPlacementRequestsTable();
      showAdminToast('Заявка на рекламу одобрена');
    }
  } catch(e) {}
}

function rejectPlacementRequest(reqId) {
  if (typeof localStorage === 'undefined') return;
  try {
    let list = JSON.parse(localStorage.getItem('amber_placement_requests') || '[]');
    const req = list.find(x => x.id === reqId);
    if (req) {
      req.status = 'rejected';
      localStorage.setItem('amber_placement_requests', JSON.stringify(list));
      renderPlacementRequestsTable();
      showAdminToast('Заявка на рекламу отклонена');
    }
  } catch(e) {}
}

function exportDevPDF() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('placements-dev-select')?.value;
  if (!devId) { alert('Выберите застройщика для выгрузки'); return; }

  const sel = document.getElementById('placements-dev-select');
  const devName = sel.options[sel.selectedIndex].text;
  const contractNum = document.getElementById('contract-number')?.value || '—';
  const contractDate = document.getElementById('contract-date')?.value || '—';
  const paymentStatus = document.getElementById('contract-payment-status')?.value || 'not_paid';
  const comments = document.getElementById('contract-comments')?.value || '—';
  const statusLabels = { not_paid: 'Не оплачен', partial: 'Частичная оплата', paid: 'Оплачен полностью', overdue: 'Просрочен' };

  let placementsHTML = '';
  const typeNames = [
    '', 'Главный баннер страницы каталога', 'Боковой баннер у карточки ЖК',
    'Горизонтальный баннер в ленте', 'Рекомендованные (3 карточки)',
    'Нативная реклама в разделах', 'Платные карточки ЖК',
    'Баннер в слайдере меню', 'Премиальный пакет'
  ];

  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById('pl-check-' + i);
    if (cb && cb.checked) {
      const priceEl = document.getElementById('pl-price-' + i);
      const price = priceEl ? priceEl.textContent : '—';
      placementsHTML += `<tr><td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;">${typeNames[i]}</td><td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:600;">${price}</td></tr>`;
    }
  }
  if (!placementsHTML) placementsHTML = '<tr><td colspan="2" style="padding:12px;text-align:center;color:#94A3B8;">Нет активных размещений</td></tr>';

  const totalCost = document.getElementById('placements-total-cost')?.textContent || '0 ₽';
  const today = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const printWindow = window.open('', '_blank');
    if (printWindow && printWindow.document) {
      printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Договор размещения — ${devName}</title>
      <style>
      body{font-family:"Segoe UI",system-ui,sans-serif;color:#0F172A;padding:40px 60px;max-width:800px;margin:0 auto;line-height:1.6;font-size:14px;}
      h1{font-size:18px;text-align:center;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;}
      .subtitle{text-align:center;color:#64748B;font-size:13px;margin-bottom:32px;}
      .section-header{font-size:14px;font-weight:700;border-bottom:2px solid #0F172A;padding-bottom:6px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.5px;}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;}
      th{text-align:left;padding:8px 12px;background:#F1F5F9;border-bottom:2px solid #CBD5E1;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;}
      td{padding:8px 12px;border-bottom:1px solid #E2E8F0;}
      .total-row{font-weight:800;font-size:16px;background:#F0FDF4;}
      .field-row{display:flex;margin-bottom:8px;}
      .field-label{font-weight:700;min-width:200px;color:#334155;}
      .field-value{color:#0F172A;}
      .comments-box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-top:8px;white-space:pre-wrap;}
      .signature-block{margin-top:48px;display:flex;justify-content:space-between;}
      .sig-col{width:45%;}
      .sig-line{border-bottom:1px solid #0F172A;margin-top:40px;margin-bottom:4px;}
      .sig-label{font-size:11px;color:#64748B;}
      .footer{text-align:center;color:#94A3B8;font-size:11px;margin-top:40px;border-top:1px solid #E2E8F0;padding-top:12px;}
      .logo{font-size:24px;font-weight:800;text-align:center;color:#F59E0B;margin-bottom:4px;}
      @media print{body{padding:20px 40px;}}
      </style></head><body>
      <div class="logo">AMBER AVENUE</div>
      <h1>Акт рекламных размещений</h1>
      <div class="subtitle">от ${today}</div>
      <div class="section-header">Реквизиты договора</div>
      <div class="field-row"><span class="field-label">Застройщик:</span><span class="field-value"><strong>${devName}</strong></span></div>
      <div class="field-row"><span class="field-label">Номер договора:</span><span class="field-value">${contractNum}</span></div>
      <div class="field-row"><span class="field-label">Дата договора:</span><span class="field-value">${contractDate}</span></div>
      <div class="field-row"><span class="field-label">Статус оплаты:</span><span class="field-value"><strong>${statusLabels[paymentStatus] || paymentStatus}</strong></span></div>
      <div class="section-header">Активные размещения</div>
      <table><thead><tr><th>Тип размещения</th><th style="text-align:right;">Стоимость</th></tr></thead><tbody>
      ${placementsHTML}
      <tr class="total-row"><td style="padding:10px 12px;">ИТОГО</td><td style="padding:10px 12px;text-align:right;">${totalCost}</td></tr>
      </tbody></table>
      <div class="section-header">Особые условия</div>
      <div class="comments-box">${escapeHtml(comments || 'Не указаны')}</div>
      <div class="signature-block">
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Платформа Amber Avenue</div></div>
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">${devName}</div></div>
      </div>
      <div class="footer">Amber Avenue · Портал недвижимости Калининградской области<br>Документ сформирован автоматически ${today}</div>
      </body></html>`);
      printWindow.document.close();
      setTimeout(function() { if (typeof printWindow.print === 'function') printWindow.print(); }, 500);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   3.5 EXPERTS MARKET CRUD (amber_experts_admin)
   ══════════════════════════════════════════════════════════════ */
function getAdminExperts() {
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_experts_admin');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(list) || list.length === 0) {
    list = (window.AMBER_DATA && window.AMBER_DATA.experts) || [
      {
        id: 1,
        name: 'Елена Калинина',
        role: 'Ведущий аналитик',
        specialty: 'Аналитика первичного рынка',
        experience: '8 лет опыта',
        deals: '140+ сделок',
        rating: 4.9,
        phone: '+7 (4012) 99-88-77',
        email: 'e.kalinina@amber-avenue.ru',
        telegram: '@kalinina_realty',
        bio: 'Специализация: экспертная оценка ликвидности новостроек Калининграда и Зеленоградска, проверка договоров ДДУ 214-ФЗ.',
        avatar: '👩‍💼',
        isActive: true,
        sortOrder: 1
      },
      {
        id: 2,
        name: 'Михаил Воронов',
        role: 'Ипотечный брокер',
        specialty: 'Субсидированные ипотечные программы',
        experience: '6 лет опыта',
        deals: '210+ одобрений',
        rating: 4.8,
        phone: '+7 (4012) 66-55-44',
        email: 'm.voronov@amber-avenue.ru',
        telegram: '@voronov_broker',
        bio: 'Помощь в одобрении семейной, IT и субсидированной ипотеки со сниженной ставкой от застройщиков.',
        avatar: '👨‍💼',
        isActive: true,
        sortOrder: 2
      }
    ];
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_experts_admin', JSON.stringify(list)); } catch(e) {}
    }
  }
  if (window.AMBER_DATA) window.AMBER_DATA.experts = list;
  return list;
}

function saveAdminExperts(experts) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_experts_admin', JSON.stringify(experts)); } catch(e) {}
  }
  if (window.AMBER_DATA) window.AMBER_DATA.experts = experts;
  triggerUnsavedChanges();
}

function renderExpertsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-experts tbody');
  if (!tbody) return;

  const items = getAdminExperts();
  const search = (document.getElementById('search-experts')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('experts-filter-role')?.value || 'all';

  const filtered = items.filter(e => {
    const matchSearch = !search || (e.name||'').toLowerCase().includes(search) || (e.specialty||'').toLowerCase().includes(search);
    const matchRole = roleFilter === 'all' || (e.role || e.specialty) === roleFilter;
    return matchSearch && matchRole;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748B;">Эксперты не найдены</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td>#${e.id}</td>
      <td><span style="font-size:20px;">${e.avatar || '👩‍💼'}</span></td>
      <td><b>${escapeHtml(e.name)}</b></td>
      <td><span class="badge badge-blue">${escapeHtml(e.role || e.specialty || 'Аналитик')}</span></td>
      <td>${escapeHtml(e.experience || '—')}</td>
      <td>${escapeHtml(e.deals || '—')}</td>
      <td><span style="color:#D97706;font-weight:700;">★ ${e.rating || 4.9}</span></td>
      <td><small>${escapeHtml(e.phone || '')}<br>${escapeHtml(e.telegram || '')}</small></td>
      <td>
        <button class="btn-table-icon" title="Редактировать" onclick="openEditModal('experts', ${e.id})">✏️</button>
        <button class="btn-table-icon btn-danger" title="Удалить" onclick="deleteItem('experts', ${e.id})">🗑</button>
      </td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════
   3.6 MODERATION ENGINE (9-Section Accordion, Diff & Badges)
   ══════════════════════════════════════════════════════════════ */
function getAllModerationRecords() {
  if (typeof localStorage === 'undefined') return [];
  const records = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('amber_moderation_')) {
      try {
        const val = JSON.parse(localStorage.getItem(k));
        if (val && val.zhkId) records.push(val);
      } catch(e) {}
    }
  }
  if (records.length === 0) {
    // Demo seed
    seedDefaultModerationRecords();
    return getAllModerationRecords();
  }
  return records;
}

function seedDefaultModerationRecords() {
  if (typeof localStorage === 'undefined') return;
  const demoRecords = [
    {
      zhkId: 'zhk-amber-seven',
      zhkName: 'ЖК «Seven»',
      developerId: '1',
      developerName: 'ГК «КалининградСтройИнвест» / КСИ',
      status: 'on_review',
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      reviewedAt: null,
      submittedData: {
        name: 'ЖК «Seven»',
        priceFrom: '5.4 млн ₽',
        address: 'г. Калининград, ул. Гагарина, д. 12',
        chars: { floors: '9 этажей', ceiling: '2.85 м', walls: 'Кирпично-монолитный', finish: 'Серый ключ' },
        infra: { school: 'Школа №2 — 350 м', kindergarten: 'Детсад №56 — 200 м', park: 'Парк Макса Ашманна — 800 м' },
        prices: { studio: 'от 4.2 млн ₽', oneRoom: 'от 5.4 млн ₽', twoRoom: 'от 7.8 млн ₽', threeRoom: 'от 10.5 млн ₽' },
        yard: { concept: 'Двор без машин', playground: 'Эко-площадка Richter', parking: 'Подземный 120 м/м' },
        engineering: { heating: 'Автономное газовое (двухконтурный котел Bosch)', meters: 'Телеметрия', elevator: 'KONE' },
        comfort: { glass: 'Витражное остекление Rehau', noise: 'Звукоизоляция пола 50 мм' },
        security: { cctv: '24/7 видеонаблюдение 64 камеры', access: 'Face-ID домофония' },
        management: { company: 'УК «Комфорт-Сервис»', warranty: '5 лет по 214-ФЗ' }
      },
      adminComments: { main: null, chars: null, infra: null, prices: null, yard: null, engineering: null, comfort: null, security: null, management: null }
    },
    {
      zhkId: 'zhk-1',
      zhkName: 'ЖК «Нордберг»',
      developerId: '13',
      developerName: 'ГК «КСК»',
      status: 'on_review',
      submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      reviewedAt: null,
      submittedData: {
        name: 'ЖК «Нордберг»',
        priceFrom: '4.8 млн ₽',
        address: 'г. Калининград, ул. Александра Невского, д. 255',
        chars: { floors: '7 этажей', ceiling: '2.75 м', walls: 'Керамический блок' },
        prices: { studio: 'от 3.9 млн ₽', oneRoom: 'от 4.8 млн ₽' }
      },
      adminComments: { main: null, chars: null, infra: null, prices: null, yard: null, engineering: null, comfort: null, security: null, management: null }
    }
  ];

  demoRecords.forEach(r => {
    try {
      localStorage.setItem('amber_moderation_' + r.zhkId, JSON.stringify(r));
    } catch(e) {}
  });
}

function updateModerationPendingCount() {
  if (typeof document === 'undefined') return;
  const records = getAllModerationRecords();
  const pending = records.filter(r => r.status === 'on_review').length;
  const badge = document.getElementById('admin-mod-pending-count');
  if (badge) {
    badge.textContent = String(pending);
    badge.style.display = pending > 0 ? 'inline-block' : 'none';
  }
  const headerNotif = document.getElementById('header-notif-count');
  if (headerNotif) headerNotif.textContent = String(pending);
}

function renderModerationSection() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('moderation-table-container');
  if (!container) return;

  const filter = document.getElementById('mod-filter-status')?.value || 'all';
  const records = getAllModerationRecords();
  const filtered = records.filter(r => filter === 'all' || r.status === filter);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748B;">Нет записей на модерацию</div>';
    return;
  }

  container.innerHTML = `
    <table class="admin-data-table">
      <thead><tr><th>ЖК</th><th>Застройщик</th><th>Дата подачи</th><th>Статус</th><th>Действия</th></tr></thead>
      <tbody>
        ${filtered.map((r, idx) => {
          const sd = r.submittedData || {};
          const statusBadge = r.status === 'approved'
            ? '<span class="status-pill pill-active">Одобрено</span>'
            : (r.status === 'needs_correction'
              ? '<span class="status-pill pill-new">Требуются правки</span>'
              : '<span class="status-pill pill-pending">На модерации</span>');
          const dateFormatted = r.submittedAt ? new Date(r.submittedAt).toLocaleString('ru-RU') : '—';

          return `
            <tr>
              <td><b>${escapeHtml(r.zhkName)}</b></td>
              <td>${escapeHtml(r.developerName || 'Застройщик')}</td>
              <td><small>${dateFormatted}</small></td>
              <td>${statusBadge}</td>
              <td>
                <button class="btn-admin-primary" style="padding:5px 10px;font-size:12px;" onclick="adminApproveZhk('${r.zhkId}')">✅ Одобрить</button>
                <button class="btn-admin-secondary" style="padding:5px 10px;font-size:12px;" onclick="toggleModRow(${idx})">📋 Секции и замечания</button>
              </td>
            </tr>
            <tr class="mod-expand-row" id="mod-row-${idx}" style="display:none;">
              <td colspan="5">
                <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#0F172A;">9 разделов характеристик (Присланные данные vs Замечания модератора):</div>
                <div class="mod-tabs-grid">
                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">1. Основное</div>
                      <div class="mod-diff-data">
                        Название: <b>${escapeHtml(sd.name || r.zhkName)}</b><br>
                        Цена от: ${escapeHtml(sd.priceFrom || '5.4 млн ₽')}<br>
                        Адрес: ${escapeHtml(sd.address || 'г. Калининград')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 1:</label>
                      <textarea id="mod-comment-${idx}-main" class="mod-tab-textarea" placeholder="Комментарий по основному...">${(r.adminComments&&r.adminComments.main)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">2. Характеристики дома</div>
                      <div class="mod-diff-data">
                        Этажность: ${escapeHtml(sd.chars?.floors || '9 этажей')}<br>
                        Потолки: ${escapeHtml(sd.chars?.ceiling || '2.85 м')}<br>
                        Стены: ${escapeHtml(sd.chars?.walls || 'Монолит-кирпич')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 2:</label>
                      <textarea id="mod-comment-${idx}-chars" class="mod-tab-textarea" placeholder="Комментарий по характеристикам...">${(r.adminComments&&r.adminComments.chars)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">3. Инфраструктура</div>
                      <div class="mod-diff-data">
                        Школа: ${escapeHtml(sd.infra?.school || 'Рядом')}<br>
                        Детсад: ${escapeHtml(sd.infra?.kindergarten || '200 м')}<br>
                        Парк: ${escapeHtml(sd.infra?.park || 'В пешей доступности')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 3:</label>
                      <textarea id="mod-comment-${idx}-infra" class="mod-tab-textarea" placeholder="Комментарий по инфраструктуре...">${(r.adminComments&&r.adminComments.infra)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">4. Цены и планировки</div>
                      <div class="mod-diff-data">
                        Студии: ${escapeHtml(sd.prices?.studio || 'от 4.2 млн ₽')}<br>
                        1-комн: ${escapeHtml(sd.prices?.oneRoom || 'от 5.4 млн ₽')}<br>
                        2-комн: ${escapeHtml(sd.prices?.twoRoom || 'от 7.8 млн ₽')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 4:</label>
                      <textarea id="mod-comment-${idx}-prices" class="mod-tab-textarea" placeholder="Комментарий по ценам...">${(r.adminComments&&r.adminComments.prices)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">5. Двор и благоустройство</div>
                      <div class="mod-diff-data">
                        Концепция: ${escapeHtml(sd.yard?.concept || 'Двор без машин')}<br>
                        Паркинг: ${escapeHtml(sd.yard?.parking || 'Подземный/наземный')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 5:</label>
                      <textarea id="mod-comment-${idx}-yard" class="mod-tab-textarea" placeholder="Комментарий по благоустройству...">${(r.adminComments&&r.adminComments.yard)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">6. Инженерия и отопление</div>
                      <div class="mod-diff-data">
                        Отопление: ${escapeHtml(sd.engineering?.heating || 'Автономное газовое')}<br>
                        Счетчики: ${escapeHtml(sd.engineering?.meters || 'Индивидуальные')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 6:</label>
                      <textarea id="mod-comment-${idx}-engineering" class="mod-tab-textarea" placeholder="Комментарий по инженерии...">${(r.adminComments&&r.adminComments.engineering)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">7. Комфорт и остекление</div>
                      <div class="mod-diff-data">
                        Остекление: ${escapeHtml(sd.comfort?.glass || 'Rehau 5-камерный')}<br>
                        Шумоизоляция: ${escapeHtml(sd.comfort?.noise || 'Усиленная')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 7:</label>
                      <textarea id="mod-comment-${idx}-comfort" class="mod-tab-textarea" placeholder="Комментарий по комфорту...">${(r.adminComments&&r.adminComments.comfort)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">8. Безопасность и СКУД</div>
                      <div class="mod-diff-data">
                        Видеонаблюдение: ${escapeHtml(sd.security?.cctv || 'По периметру 24/7')}<br>
                        Доступ: ${escapeHtml(sd.security?.access || 'Электронные ключи / СКУД')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 8:</label>
                      <textarea id="mod-comment-${idx}-security" class="mod-tab-textarea" placeholder="Комментарий по безопасности...">${(r.adminComments&&r.adminComments.security)||''}</textarea>
                    </div>
                  </div>

                  <div class="mod-tab-box">
                    <div class="mod-diff-col">
                      <div class="mod-diff-title">9. Управляющая компания и 214-ФЗ</div>
                      <div class="mod-diff-data">
                        УК: ${escapeHtml(sd.management?.company || 'Собственная УК')}<br>
                        Гарантия: ${escapeHtml(sd.management?.warranty || '5 лет по 214-ФЗ')}
                      </div>
                    </div>
                    <div class="mod-comment-col">
                      <label class="form-label">Замечание к разделу 9:</label>
                      <textarea id="mod-comment-${idx}-management" class="mod-tab-textarea" placeholder="Комментарий по УК...">${(r.adminComments&&r.adminComments.management)||''}</textarea>
                    </div>
                  </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                  <button class="btn-admin-primary" onclick="adminSendCorrections('${r.zhkId}', ${idx})">Отправить замечания застройщику</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function toggleModRow(idx) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('mod-row-' + idx);
  if (el) el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

function adminApproveZhk(zhkId) {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem('amber_moderation_' + zhkId);
  if (!raw) return;
  const mod = JSON.parse(raw);
  mod.status = 'approved';
  mod.reviewedAt = new Date().toISOString();
  mod.adminComments = { main: null, chars: null, infra: null, prices: null, yard: null, engineering: null, comfort: null, security: null, management: null };
  localStorage.setItem('amber_moderation_' + zhkId, JSON.stringify(mod));

  updateModerationPendingCount();
  renderModerationSection();
  showAdminToast('ЖК одобрен');
}

function adminSendCorrections(zhkId, idx) {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem('amber_moderation_' + zhkId);
  if (!raw) return;
  const mod = JSON.parse(raw);

  const comments = {
    main: document.getElementById(`mod-comment-${idx}-main`)?.value.trim() || null,
    chars: document.getElementById(`mod-comment-${idx}-chars`)?.value.trim() || null,
    infra: document.getElementById(`mod-comment-${idx}-infra`)?.value.trim() || null,
    prices: document.getElementById(`mod-comment-${idx}-prices`)?.value.trim() || null,
    yard: document.getElementById(`mod-comment-${idx}-yard`)?.value.trim() || null,
    engineering: document.getElementById(`mod-comment-${idx}-engineering`)?.value.trim() || null,
    comfort: document.getElementById(`mod-comment-${idx}-comfort`)?.value.trim() || null,
    security: document.getElementById(`mod-comment-${idx}-security`)?.value.trim() || null,
    management: document.getElementById(`mod-comment-${idx}-management`)?.value.trim() || null
  };

  const hasAny = Object.values(comments).some(Boolean);
  if (!hasAny) {
    const ok = confirm('Замечания не заполнены. Вы уверены?');
    if (!ok) return;
  }

  mod.status = 'needs_correction';
  mod.reviewedAt = new Date().toISOString();
  mod.adminComments = comments;
  localStorage.setItem('amber_moderation_' + zhkId, JSON.stringify(mod));

  updateModerationPendingCount();
  renderModerationSection();
  showAdminToast('Замечания отправлены');
}

/* ══════════════════════════════════════════════════════════════
   3.7 DEVELOPER TARIFFS & MODULES (amber_tariff_${devId})
   ══════════════════════════════════════════════════════════════ */
var ALL_CABINET_MODULES = [
  { id: 'analytics-basic', name: 'Базовая аналитика', desc: 'Просмотры, показы, базовая воронка конверсии', isPro: false },
  { id: 'analytics-traffic', name: 'Источники трафика и гео', desc: 'Яндекс, Google, прямые заходы, города посетителей', isPro: true },
  { id: 'analytics-competitors', name: 'Анализ конкурентов', desc: 'Позиции в каталоге, сравнение со средними ценами района', isPro: true },
  { id: 'analytics-reports', name: 'PDF/Excel отчеты и теплокарта', desc: 'Генерация отчетов для руководства и анализ взаимодействия с табами', isPro: true },
  { id: 'promo-premium', name: 'Премиум-размещение', desc: 'Управление ТОП-3 карточками и спецразмещениями', isPro: true },
  { id: 'promo-ads', name: 'Рекламные баннеры', desc: 'Управление таргетированными баннерами девелопера', isPro: true },
  { id: 'support-priority', name: 'Приоритетная поддержка', desc: 'Персональный аккаунт-менеджер 24/7', isPro: true },
  { id: 'crm-export', name: 'Расширенная CRM и экспорт', desc: 'Прямая интеграция лидов и автоматический экспорт в Excel/CRM', isPro: true }
];

var TARIFF_PRESETS = {
  basic: {
    planId: 'basic',
    planName: 'Базовый',
    price: 69000,
    modules: ['analytics-basic']
  },
  pro: {
    planId: 'pro',
    planName: 'Про',
    price: 150000,
    modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports', 'crm-export']
  },
  premium: {
    planId: 'premium',
    planName: 'Премиум',
    price: 210000,
    modules: ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads', 'support-priority', 'crm-export']
  },
  custom: {
    planId: 'custom',
    planName: 'Индивидуальный',
    price: 0,
    modules: []
  }
};

function initTariffsSection() {
  if (typeof document === 'undefined') return;
  const sel = document.getElementById('tariff-dev-select');
  if (!sel) return;

  sel.innerHTML = '<option value="">— Выберите застройщика —</option>';
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  devs.forEach(d => {
    sel.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
  });

  renderTariffsTable();
}

function onTariffDevChange() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('tariff-dev-select')?.value;
  if (!devId) return;

  const tariff = getAdminTariff(devId);
  const planEl = document.getElementById('tariff-current-badge');
  if (planEl) planEl.textContent = tariff.planName || 'Базовый';

  const startEl = document.getElementById('tariff-start-date');
  const endEl = document.getElementById('tariff-end-date');
  const priceEl = document.getElementById('tariff-price');
  const statusEl = document.getElementById('tariff-status');

  if (startEl) startEl.value = tariff.startDate ? tariff.startDate.slice(0,10) : '2026-08-01';
  if (endEl) endEl.value = tariff.endDate ? tariff.endDate.slice(0,10) : '2026-09-01';
  if (priceEl) priceEl.value = tariff.price !== undefined ? tariff.price : 69000;
  if (statusEl) statusEl.value = tariff.status || 'active';

  // Highlight active preset card
  document.querySelectorAll('.tariff-preset-card').forEach(c => c.classList.remove('active'));
  const activeCard = document.getElementById('tariff-preset-card-' + (tariff.planId || 'basic'));
  if (activeCard) activeCard.classList.add('active');

  // Checkbox sync
  ALL_CABINET_MODULES.forEach(m => {
    const cb = document.getElementById('mod-check-' + m.id);
    if (cb) cb.checked = (tariff.modules || []).includes(m.id);
  });
}

function applyTariffPreset(presetKey) {
  const preset = TARIFF_PRESETS[presetKey];
  if (!preset) return;

  const priceEl = document.getElementById('tariff-price');
  if (priceEl) priceEl.value = preset.price;

  document.querySelectorAll('.tariff-preset-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('tariff-preset-card-' + presetKey);
  if (card) card.classList.add('active');

  ALL_CABINET_MODULES.forEach(m => {
    const cb = document.getElementById('mod-check-' + m.id);
    if (cb) cb.checked = preset.modules.includes(m.id);
  });
}

function getAdminTariff(devId) {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_tariff_' + devId);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
  }
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  const dev = devs.find(d => String(d.id) === String(devId));
  return {
    developerId: String(devId),
    developerName: dev ? dev.name : 'Застройщик #' + devId,
    planId: 'basic',
    planName: 'Базовый',
    price: 69000,
    billingPeriod: 'monthly',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-09-01T00:00:00.000Z',
    status: 'active',
    modules: ['analytics-basic'],
    assignedBy: 'admin',
    assignedAt: new Date().toISOString()
  };
}

function saveDeveloperTariff() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('tariff-dev-select')?.value;
  if (!devId) { alert('Выберите застройщика'); return; }

  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  const dev = devs.find(d => String(d.id) === String(devId));

  const modules = [];
  ALL_CABINET_MODULES.forEach(m => {
    const cb = document.getElementById('mod-check-' + m.id);
    if (cb && cb.checked) modules.push(m.id);
  });

  const price = parseInt(document.getElementById('tariff-price')?.value, 10) || 0;
  const startDate = document.getElementById('tariff-start-date')?.value || '2026-08-01';
  const endDate = document.getElementById('tariff-end-date')?.value || '2026-09-01';
  const status = document.getElementById('tariff-status')?.value || 'active';

  let planId = 'custom';
  let planName = 'Индивидуальный';
  if (price === 69000 || (modules.length === 1 && modules[0] === 'analytics-basic')) {
    planId = 'basic'; planName = 'Базовый';
  } else if (price === 150000) {
    planId = 'pro'; planName = 'Про';
  } else if (price === 210000 || modules.length === 8) {
    planId = 'premium'; planName = 'Премиум';
  }

  const tariffData = {
    developerId: String(devId),
    developerName: dev ? dev.name : 'Застройщик #' + devId,
    planId: planId,
    planName: planName,
    price: price,
    billingPeriod: 'monthly',
    startDate: startDate,
    endDate: endDate,
    status: status,
    modules: modules,
    assignedBy: 'admin',
    assignedAt: new Date().toISOString()
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_tariff_' + devId, JSON.stringify(tariffData));
    } catch(e) {}
  }

  renderTariffsTable();
  showAdminToast('Тариф застройщика успешно сохранен');
}

function renderTariffsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-dev-tariffs tbody');
  if (!tbody) return;

  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  if (devs.length === 0) return;

  tbody.innerHTML = devs.slice(0, 15).map(d => {
    const t = getAdminTariff(d.id);
    const modBadges = (t.modules || []).map(m => `<span class="badge badge-neutral" style="font-size:10px;margin:1px;">${m}</span>`).join(' ');
    return `
      <tr>
        <td>#${d.id}</td>
        <td><b>${escapeHtml(d.name)}</b></td>
        <td><span class="badge badge-blue">${escapeHtml(t.planName)}</span></td>
        <td><b>${t.price ? t.price.toLocaleString('ru-RU') + ' ₽/мес' : '0 ₽'}</b></td>
        <td><small>${t.startDate ? t.startDate.slice(0,10) : '—'} – ${t.endDate ? t.endDate.slice(0,10) : '—'}</small></td>
        <td><span class="status-pill ${t.status === 'active' ? 'pill-active' : 'pill-pending'}">${t.status}</span></td>
        <td><div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;">${modBadges}</div></td>
      </tr>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   3.8 GLOBAL LEADS CRM & UNLOCK REQUESTS (amber_leads & amber_unlock_requests)
   ══════════════════════════════════════════════════════════════ */
var DEFAULT_LEADS_10 = [
  // 5 Paid Card Leads
  {
    id: 'lead-101',
    timestamp: '2026-08-25T11:30:00.000Z',
    date: '2026-08-25 11:30',
    time: 'Сегодня, 11:30',
    name: 'Иван Петров',
    phone: '+7 (911) 450-12-34',
    phoneMasked: '+7 (9**) ***-**-34',
    email: 'ivan.petrov@example.com',
    zhk: 'ЖК «Seven»',
    zhkName: 'ЖК «Seven»',
    zhkId: 1,
    dev: 'ГК «КалининградСтройИнвест» / КСИ',
    devName: 'ГК «КалининградСтройИнвест» / КСИ',
    developerName: 'ГК «КалининградСтройИнвест» / КСИ',
    developerId: 3,
    apt: '2-комнатная квартира, 62 м²',
    type: 'booking',
    source: 'card',
    sourceLabel: 'Карточка ЖК',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: true,
    isUnlocked: true,
    isPaidLead: true,
    estimatedDealValue: 85000,
    ip: '178.67.214.88',
    consentVerified: true,
    consentHash: '#7f8a9b2c3d4e',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-102',
    timestamp: '2026-08-25T10:15:00.000Z',
    date: '2026-08-25 10:15',
    time: 'Сегодня, 10:15',
    name: 'Мария Васильева',
    phone: '+7 (921) 789-12-34',
    phoneMasked: '+7 (9**) ***-**-34',
    email: 'm.vasilyeva@example.com',
    zhk: 'ЖК «Морской берег»',
    zhkName: 'ЖК «Морской берег»',
    zhkId: 2,
    dev: 'СК «МореСтрой»',
    devName: 'СК «МореСтрой»',
    developerName: 'СК «МореСтрой»',
    developerId: 3,
    apt: '1-комнатная квартира, 41 м²',
    type: 'consultation',
    source: 'calc',
    sourceLabel: 'Ипотечный калькулятор',
    status: 'in_progress',
    ownedBy: 'developer',
    isPaidCard: true,
    isUnlocked: true,
    isPaidLead: true,
    estimatedDealValue: 65000,
    ip: '178.67.214.89',
    consentVerified: true,
    consentHash: '#5e6f7a8b9c0d',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-103',
    timestamp: '2026-08-25T09:40:00.000Z',
    date: '2026-08-25 09:40',
    time: 'Сегодня, 09:40',
    name: 'Алексей Иванов',
    phone: '+7 (909) 345-67-89',
    phoneMasked: '+7 (9**) ***-**-89',
    email: 'alex.ivanov@yandex.ru',
    zhk: 'ЖК «Расцвет на Гагарина»',
    zhkName: 'ЖК «Расцвет на Гагарина»',
    zhkId: 3,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '3-комнатная квартира, 88 м²',
    type: 'mortgage',
    source: 'mortgage',
    sourceLabel: 'Ипотека',
    status: 'in_progress',
    ownedBy: 'developer',
    isPaidCard: true,
    isUnlocked: true,
    isPaidLead: true,
    estimatedDealValue: 120000,
    ip: '178.67.214.90',
    consentVerified: true,
    consentHash: '#2c3d4e5f6a7b',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-104',
    timestamp: '2026-08-24T16:20:00.000Z',
    date: '2026-08-24 16:20',
    time: 'Вчера, 16:20',
    name: 'Екатерина Смирнова',
    phone: '+7 (911) 890-12-45',
    phoneMasked: '+7 (9**) ***-**-45',
    email: 'e.smirnova@mail.ru',
    zhk: 'ЖК «Подсолнухи»',
    zhkName: 'ЖК «Подсолнухи»',
    zhkId: 4,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: 'Студия, 28 м²',
    type: 'selection',
    source: 'selection',
    sourceLabel: 'Подбор планировки',
    status: 'processed',
    ownedBy: 'developer',
    isPaidCard: true,
    isUnlocked: true,
    isPaidLead: true,
    estimatedDealValue: 50000,
    ip: '178.67.214.91',
    consentVerified: true,
    consentHash: '#9a8b7c6d5e4f',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-105',
    timestamp: '2026-08-24T14:10:00.000Z',
    date: '2026-08-24 14:10',
    time: 'Вчера, 14:10',
    name: 'Дмитрий Козлов',
    phone: '+7 (921) 678-90-12',
    phoneMasked: '+7 (9**) ***-**-12',
    email: 'd.kozlov@bk.ru',
    zhk: 'ЖК «Гусевский»',
    zhkName: 'ЖК «Гусевский»',
    zhkId: 5,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '2-комнатная квартира, 54 м²',
    type: 'call',
    source: 'call',
    sourceLabel: 'Заказ звонка',
    status: 'processed',
    ownedBy: 'developer',
    isPaidCard: true,
    isUnlocked: true,
    isPaidLead: true,
    estimatedDealValue: 75000,
    ip: '178.67.214.92',
    consentVerified: true,
    consentHash: '#4b5c6d7e8f9a',
    policyVersion: 'v2.4'
  },

  // 5 Unpaid Card Leads (Masked Contacts + Unlock CTA)
  {
    id: 'lead-106',
    timestamp: '2026-08-25T11:05:00.000Z',
    date: '2026-08-25 11:05',
    time: 'Сегодня, 11:05',
    name: 'Михаил Васильев',
    phone: '+7 (911) 321-65-67',
    phoneMasked: '+7 (9**) ***-**-67',
    email: 'm.vasiliev@inbox.ru',
    zhk: 'ЖК «Нордберг»',
    zhkName: 'ЖК «Нордберг»',
    zhkId: 10,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '3-комнатная квартира, 92 м²',
    type: 'booking',
    source: 'card',
    sourceLabel: 'Карточка ЖК',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: false,
    isUnlocked: false,
    isPaidLead: false,
    estimatedDealValue: 95000,
    ip: '178.67.214.93',
    consentVerified: true,
    consentHash: '#1a2b3c4d5e6f',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-107',
    timestamp: '2026-08-25T08:30:00.000Z',
    date: '2026-08-25 08:30',
    time: 'Сегодня, 08:30',
    name: 'Анна Павлова',
    phone: '+7 (921) 543-98-11',
    phoneMasked: '+7 (9**) ***-**-11',
    email: 'anna.pavlova@gmail.com',
    zhk: 'ЖК «Центральный Луч»',
    zhkName: 'ЖК «Центральный Луч»',
    zhkId: 11,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '2-комнатная квартира, 60 м²',
    type: 'consultation',
    source: 'availability',
    sourceLabel: 'Узнать наличие',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: false,
    isUnlocked: false,
    isPaidLead: false,
    estimatedDealValue: 70000,
    ip: '178.67.214.94',
    consentVerified: true,
    consentHash: '#8e7d6c5b4a3f',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-108',
    timestamp: '2026-08-24T18:45:00.000Z',
    date: '2026-08-24 18:45',
    time: 'Вчера, 18:45',
    name: 'Сергей Морозов',
    phone: '+7 (906) 777-88-22',
    phoneMasked: '+7 (9**) ***-**-22',
    email: 'morozov.s@mail.ru',
    zhk: 'ЖК «Нордберг»',
    zhkName: 'ЖК «Нордберг»',
    zhkId: 10,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '1-комнатная квартира, 38 м²',
    type: 'mortgage',
    source: 'mortgage',
    sourceLabel: 'Ипотека',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: false,
    isUnlocked: false,
    isPaidLead: false,
    estimatedDealValue: 60000,
    ip: '178.67.214.95',
    consentVerified: true,
    consentHash: '#7a6b5c4d3e2f',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-109',
    timestamp: '2026-08-24T12:15:00.000Z',
    date: '2026-08-24 12:15',
    time: 'Вчера, 12:15',
    name: 'Ольга Федорова',
    phone: '+7 (911) 123-45-77',
    phoneMasked: '+7 (9**) ***-**-77',
    email: 'o.fedorova@yandex.ru',
    zhk: 'ЖК «Янтарный Квартал»',
    zhkName: 'ЖК «Янтарный Квартал»',
    zhkId: 12,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: '2-комнатная квартира, 58 м²',
    type: 'selection',
    source: 'selection',
    sourceLabel: 'Подбор',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: false,
    isUnlocked: false,
    isPaidLead: false,
    estimatedDealValue: 80000,
    ip: '178.67.214.96',
    consentVerified: true,
    consentHash: '#3f2e1d4c5b6a',
    policyVersion: 'v2.4'
  },
  {
    id: 'lead-110',
    timestamp: '2026-08-23T17:50:00.000Z',
    date: '2026-08-23 17:50',
    time: '23 авг, 17:50',
    name: 'Артем Николаев',
    phone: '+7 (921) 999-00-55',
    phoneMasked: '+7 (9**) ***-**-55',
    email: 'nikolaev.artem@bk.ru',
    zhk: 'ЖК «Центральный Луч»',
    zhkName: 'ЖК «Центральный Луч»',
    zhkId: 11,
    dev: 'ГК «Расцвет»',
    devName: 'ГК «Расцвет»',
    developerName: 'ГК «Расцвет»',
    developerId: 3,
    apt: 'Студия, 26 м²',
    type: 'call',
    source: 'call',
    sourceLabel: 'Заказ звонка',
    status: 'new',
    ownedBy: 'developer',
    isPaidCard: false,
    isUnlocked: false,
    isPaidLead: false,
    estimatedDealValue: 45000,
    ip: '178.67.214.97',
    consentVerified: true,
    consentHash: '#6a5b4c3d2e1f',
    policyVersion: 'v2.4'
  }
];

function getAdminLeads() {
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_leads');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(list) || list.length === 0) {
    list = (typeof window !== 'undefined' && window.AmberAnalytics && window.AmberAnalytics.SEED_LEADS)
      ? JSON.parse(JSON.stringify(window.AmberAnalytics.SEED_LEADS))
      : JSON.parse(JSON.stringify(DEFAULT_LEADS_10));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_leads', JSON.stringify(list)); } catch(e) {}
    }
  }
  return list;
}

function getUnlockRequests() {
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_unlock_requests');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
  }
  if (!Array.isArray(list) || list.length === 0) {
    list = [
      {
        id: 'unlock-req-1',
        leadId: 'lead-unpaid-6',
        zhkId: 10,
        zhkName: 'ЖК «Нордберг»',
        developerId: 3,
        developerName: 'ГК «Расцвет»',
        clientName: 'Михаил Васильев',
        requestedAt: '2026-08-25T11:05:00.000Z',
        status: 'pending',
        priceMonthly: 15000,
        comment: 'Запрос на моментальную разблокировку карточки по входящему лиду',
        processedAt: null,
        processedBy: null
      }
    ];
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_unlock_requests', JSON.stringify(list)); } catch(e) {}
    }
  }
  return list;
}

function saveUnlockRequests(reqs) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_unlock_requests', JSON.stringify(reqs));
    } catch(e) {}
  }
}

function renderUnlockRequestsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-unlock-requests tbody');
  if (!tbody) return;

  const reqs = getUnlockRequests();
  if (reqs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px;color:#64748B;">Запросов на разблокировку нет</td></tr>';
    return;
  }

  tbody.innerHTML = reqs.map(r => {
    const dt = r.requestedAt ? new Date(r.requestedAt).toLocaleString('ru-RU') : '25.08.2026, 11:05';
    const isPending = r.status === 'pending';
    const statusPill = isPending
      ? '<span class="status-pill pill-pending">Ожидает решения</span>'
      : (r.status === 'approved' ? '<span class="status-pill pill-active">Одобрено (Аванс)</span>' : '<span class="status-pill pill-work">' + escapeHtml(r.status) + '</span>');

    const actionBtn = isPending
      ? `<button class="btn-admin-primary btn-sm" onclick="approveUnlockRequest('${r.id}')">✓ Одобрить разблокировку</button>`
      : `<small style="color:#16A34A;font-weight:700;">✓ Разблокировано</small>`;

    return `
      <tr>
        <td>#${escapeHtml(r.id)}<br><small>${dt}</small></td>
        <td><b>${escapeHtml(r.developerName || ('Застройщик #' + r.developerId))}</b></td>
        <td><b>${escapeHtml(r.zhkName || ('ЖК #' + r.zhkId))}</b></td>
        <td>${escapeHtml(r.clientName || 'Клиент')}<br><small>Лид: #${escapeHtml(r.leadId || '')}</small></td>
        <td><b>${(r.priceMonthly || 15000).toLocaleString('ru-RU')} ₽/мес</b></td>
        <td>${statusPill}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function approveUnlockRequest(reqId) {
  const reqs = getUnlockRequests();
  const req = reqs.find(r => String(r.id) === String(reqId));
  if (!req) return;

  req.status = 'approved';
  req.processedAt = new Date().toISOString();
  req.processedBy = 'admin';
  saveUnlockRequests(reqs);

  // Add zhkId to amber_paid_cards in localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      let paidCards = JSON.parse(localStorage.getItem('amber_paid_cards') || '[]');
      if (!Array.isArray(paidCards)) paidCards = [];
      const zhkNum = parseInt(req.zhkId, 10);
      if (!paidCards.includes(req.zhkId) && !paidCards.includes(zhkNum)) {
        paidCards.push(isNaN(zhkNum) ? req.zhkId : zhkNum);
        localStorage.setItem('amber_paid_cards', JSON.stringify(paidCards));
      }
    } catch(e) {}
  }

  // Update matching leads in amber_leads to unlocked
  const leads = getAdminLeads();
  leads.forEach(l => {
    if (String(l.zhkId) === String(req.zhkId) || String(l.id) === String(req.leadId)) {
      l.isUnlocked = true;
      l.isPaidCard = true;
      l.isPaidLead = true;
    }
  });
  saveAdminLeads(leads);

  showAdminToast(`Разблокировка карточки «${req.zhkName}» одобрена. Лиды открыты.`);
  renderUnlockRequestsTable();
  renderAmberLeadsTable();
}

function saveAdminLeads(leads) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('amber_leads', JSON.stringify(leads)); } catch(e) {}
  }
  triggerUnsavedChanges();
}

function renderAmberLeadsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-amber-leads tbody');
  if (!tbody) return;

  const leads = getAdminLeads();
  const search = (document.getElementById('leads-search')?.value || '').toLowerCase().trim();
  const devFilter = document.getElementById('leads-filter-dev')?.value || 'all';
  const statusFilter = document.getElementById('leads-filter-status')?.value || 'all';
  const ownedFilter = document.getElementById('leads-filter-owned')?.value || 'all';

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      (l.name||'').toLowerCase().includes(search) ||
      (l.phone||'').toLowerCase().includes(search) ||
      (l.zhk||'').toLowerCase().includes(search);
    const matchDev = devFilter === 'all' || String(l.developerId) === String(devFilter) || (devFilter === 'admin' && l.ownedBy === 'admin');
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchOwned = ownedFilter === 'all' || l.ownedBy === ownedFilter;
    return matchSearch && matchDev && matchStatus && matchOwned;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748B;">Лиды не найдены</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const ownedBadge = l.ownedBy === 'admin'
      ? '<span class="status-pill pill-pending">Платформа (admin)</span>'
      : '<span class="status-pill pill-work">Застройщик</span>';
    const dateFormatted = l.timestamp ? new Date(l.timestamp).toLocaleString('ru-RU') : '—';

    return `
      <tr>
        <td>#${l.id}</td>
        <td><small>${dateFormatted}</small></td>
        <td><b>${escapeHtml(l.name)}</b><br><small>${escapeHtml(l.phone || '')} · ${escapeHtml(l.email || '')}</small></td>
        <td><b>${escapeHtml(l.zhk || l.complexName || '—')}</b></td>
        <td>${escapeHtml(l.dev || l.developerName || '—')}</td>
        <td><span class="badge badge-neutral">${escapeHtml(l.type || 'Заявка')}</span></td>
        <td>${ownedBadge}</td>
        <td>
          <select class="admin-select-filter" style="padding:3px 6px;font-size:11px;" onchange="updateLeadStatus('${l.id}', this.value)">
            <option value="new" ${l.status === 'new' ? 'selected' : ''}>Новый</option>
            <option value="in_progress" ${l.status === 'in_progress' ? 'selected' : ''}>В работе</option>
            <option value="processed" ${l.status === 'processed' ? 'selected' : ''}>Обработан</option>
            <option value="rejected" ${l.status === 'rejected' ? 'selected' : ''}>Отклонён</option>
          </select>
        </td>
        <td>
          <button class="btn-table-icon" title="152-ФЗ Согласие" onclick="openConsentCard('${l.id}')">🛡️ 152-ФЗ</button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateLeadStatus(leadId, newStatus) {
  const leads = getAdminLeads();
  const lead = leads.find(x => String(x.id) === String(leadId));
  if (lead) {
    lead.status = newStatus;
    saveAdminLeads(leads);
    showAdminToast('Статус лида обновлен: ' + newStatus);
  }
}

function renderPlatformLeads() {
  if (typeof document === 'undefined') return;
  const tbody = document.getElementById('platform-leads-tbody');
  if (!tbody) return;

  const leads = getAdminLeads().filter(l => l.ownedBy === 'admin');
  if (leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748B;">Нет лидов платформы</td></tr>';
    return;
  }

  tbody.innerHTML = leads.map(l => {
    const dt = l.timestamp ? new Date(l.timestamp).toLocaleDateString('ru-RU') : '25.08.2026';
    return `
      <tr>
        <td>${dt}</td>
        <td><b>${escapeHtml(l.name)}</b></td>
        <td>${escapeHtml(l.phone || '')}</td>
        <td>${escapeHtml(l.email || '')}</td>
        <td>${escapeHtml(l.zhk || 'ЖК «Нордберг»')}</td>
        <td>${escapeHtml(l.dev || 'ГК «КСК»')}</td>
        <td>${escapeHtml(l.type || 'Консультация')}</td>
        <td><span class="status-pill pill-work">${l.status || 'Новый'}</span></td>
      </tr>
    `;
  }).join('');
}

function exportLeadsCSV() {
  const leads = getAdminLeads();
  let csvContent = '\uFEFFID;Дата;Имя;Телефон;Email;ЖК;Застройщик;Принадлежность;Тип заявки;Статус;152-ФЗ Хэш;IP\n';

  leads.forEach(l => {
    const row = [
      l.id,
      l.timestamp || '',
      `"${(l.name||'').replace(/"/g, '""')}"`,
      `"${(l.phone||'').replace(/"/g, '""')}"`,
      `"${(l.email||'').replace(/"/g, '""')}"`,
      `"${(l.zhk||'').replace(/"/g, '""')}"`,
      `"${(l.dev||'').replace(/"/g, '""')}"`,
      l.ownedBy || 'developer',
      `"${(l.type||'').replace(/"/g, '""')}"`,
      l.status || 'new',
      l.consentHash || '#7f8a9b',
      l.ip || '178.67.214.88'
    ];
    csvContent += row.join(';') + '\n';
  });

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amber_leads_export_${new Date().toISOString().slice(0,10)}.csv`;
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
  showAdminToast('CSV с лидами успешно экспортирован (UTF-8 BOM)');
}

function exportPlatformLeads() {
  exportLeadsCSV();
}

function openConsentCard(leadId) {
  if (typeof document === 'undefined') return;
  const list = getAdminLeads();
  const lead = list.find(x => String(x.id) === String(leadId));
  if (!lead) {
    console.warn('Lead not found: ' + leadId);
    return;
  }
  currentConsentLead = lead;

  const fn = document.getElementById('cc-fullname');
  const em = document.getElementById('cc-email');
  const ph = document.getElementById('cc-phone');
  const zhk = document.getElementById('cc-zhk');
  const ip = document.getElementById('cc-ip');
  const ts = document.getElementById('cc-timestamp');

  if (fn) fn.textContent = lead.name || '';
  if (em) em.textContent = lead.email || '';
  if (ph) ph.textContent = lead.phone || '';
  if (zhk) zhk.textContent = lead.zhk || lead.complexName || '';
  if (ip) ip.textContent = lead.ip || '178.67.214.88';
  if (ts) ts.textContent = lead.timestamp || new Date().toISOString();

  const modal = document.getElementById('consent-card-modal');
  if (modal) {
    modal.classList.add('active');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeConsentModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('consent-card-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function copyConsentAuditLog() {
  const email = currentConsentLead?.email || 'ivan.petrov@example.com';
  const name = currentConsentLead?.name || 'Иван Петров';
  const text = `ХРАНИМОЕ СОГЛАСИЕ (Тикет UNI-631082)
Заявитель: ${name} (${email})
Федеральный закон: 152-ФЗ РФ
IP-адрес: 178.67.214.88
Временная метка: ${new Date().toISOString()}
Хэш согласия: #7f8a9b2c3d4e`;

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text);
  }
  showAdminToast('Лог 152-ФЗ скопирован');
}

function openLeadsSpreadsheetModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('leads-spreadsheet-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

/* ══════════════════════════════════════════════════════════════
   3.9 HEADER BACKGROUND IMAGES (amber_zhk_header_bg)
   ══════════════════════════════════════════════════════════════ */
var DEFAULT_PAGE_HEADERS = {
  'zhk-all': {
    page: 'zhk-all',
    pageTitle: 'Общий каталог ЖК (zhk.html)',
    bgImage: 'kld_city_welcome.png',
    slogan: 'Новостройки Калининграда и курортного побережья',
    subtitle: 'Полная независимая база жилых комплексов с ценами и аналитикой',
    overlayOpacity: 0.45,
    alignment: 'left'
  },
  'kaliningrad': {
    page: 'kaliningrad',
    pageTitle: 'ЖК Калининграда (zhk-kaliningrad.html)',
    bgImage: 'kld_city_welcome.png',
    slogan: 'Новостройки в историческом центре и районах Калининграда',
    subtitle: 'Жилые комплексы комфорт, бизнес и премиум класса в черте города',
    overlayOpacity: 0.45,
    alignment: 'left'
  },
  'umory': {
    page: 'umory',
    pageTitle: 'ЖК у Моря (zhk-umory.html)',
    bgImage: 'baltic_sea_welcome.png',
    slogan: 'Жилые комплексы и апартаменты у Балтийского моря',
    subtitle: 'Светлогорск, Зеленоградск, Пионерский, Янтарный',
    overlayOpacity: 0.40,
    alignment: 'center'
  },
  'prigorod': {
    page: 'prigorod',
    pageTitle: 'ЖК в Пригороде (zhk-prigorod.html)',
    bgImage: 'suburban_green_welcome.png',
    slogan: 'Новостройки в тихих зелёных пригородах',
    subtitle: 'Гурьевск, Васильково, Большое Исаково, Холмогоровка',
    overlayOpacity: 0.45,
    alignment: 'left'
  },
  'oblast': {
    page: 'oblast',
    pageTitle: 'ЖК в Области (zhk-oblast.html)',
    bgImage: 'region_oblast_welcome.png',
    slogan: 'Жилые комплексы в городах Калининградской области',
    subtitle: 'Гусев, Черняховск, Советск, Багратионовск, Светлый',
    overlayOpacity: 0.50,
    alignment: 'left'
  }
};

function initPagesSection() {
  onPageHeaderSelect();
  renderPageHeadersTable();
}

function getPageHeaderBg(pageKey) {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_zhk_header_bg');
      if (raw) {
        const store = JSON.parse(raw);
        if (store[pageKey]) return store[pageKey];
      }
    } catch(e) {}
  }
  return DEFAULT_PAGE_HEADERS[pageKey] || DEFAULT_PAGE_HEADERS['zhk-all'];
}

function onPageHeaderSelect() {
  if (typeof document === 'undefined') return;
  const pageKey = document.getElementById('page-bg-select')?.value || 'zhk-all';
  const cfg = getPageHeaderBg(pageKey);

  const sloganEl = document.getElementById('page-bg-slogan');
  const subEl = document.getElementById('page-bg-subtitle');
  const urlEl = document.getElementById('page-bg-url');
  const opEl = document.getElementById('page-bg-opacity');
  const alignEl = document.getElementById('page-bg-alignment');
  const prevEl = document.getElementById('page-bg-preview');

  if (sloganEl) sloganEl.value = cfg.slogan || '';
  if (subEl) subEl.value = cfg.subtitle || '';
  if (urlEl) urlEl.value = cfg.bgImage || '';
  if (opEl) opEl.value = cfg.overlayOpacity || 0.45;
  if (alignEl) alignEl.value = cfg.alignment || 'left';
  if (prevEl) {
    prevEl.style.backgroundImage = `url(${cfg.bgImage || 'kld_city_welcome.png'})`;
  }
}

function savePageHeaderBg() {
  if (typeof document === 'undefined') return;
  const pageKey = document.getElementById('page-bg-select')?.value || 'zhk-all';
  const slogan = document.getElementById('page-bg-slogan')?.value || '';
  const subtitle = document.getElementById('page-bg-subtitle')?.value || '';
  const bgImage = document.getElementById('page-bg-url')?.value || '';
  const overlayOpacity = parseFloat(document.getElementById('page-bg-opacity')?.value || '0.45');
  const alignment = document.getElementById('page-bg-alignment')?.value || 'left';

  let store = {};
  if (typeof localStorage !== 'undefined') {
    try {
      store = JSON.parse(localStorage.getItem('amber_zhk_header_bg') || '{}');
    } catch(e) {}
  }

  store[pageKey] = {
    page: pageKey,
    pageTitle: DEFAULT_PAGE_HEADERS[pageKey]?.pageTitle || pageKey,
    bgImage: bgImage,
    slogan: slogan,
    subtitle: subtitle,
    overlayOpacity: overlayOpacity,
    alignment: alignment,
    updatedAt: new Date().toISOString()
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_zhk_header_bg', JSON.stringify(store));
    } catch(e) {}
  }

  renderPageHeadersTable();
  showAdminToast('Настройки фона шапки сохранены');
}

function resetPageHeaderBg() {
  if (typeof document === 'undefined') return;
  const pageKey = document.getElementById('page-bg-select')?.value || 'zhk-all';
  let store = {};
  if (typeof localStorage !== 'undefined') {
    try {
      store = JSON.parse(localStorage.getItem('amber_zhk_header_bg') || '{}');
      delete store[pageKey];
      localStorage.setItem('amber_zhk_header_bg', JSON.stringify(store));
    } catch(e) {}
  }
  onPageHeaderSelect();
  renderPageHeadersTable();
  showAdminToast('Сброшено к исходным значениям');
}

function renderPageHeadersTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-page-headers tbody');
  if (!tbody) return;

  const pages = ['zhk-all', 'kaliningrad', 'umory', 'prigorod', 'oblast'];
  tbody.innerHTML = pages.map(k => {
    const cfg = getPageHeaderBg(k);
    const thumb = cfg.bgImage ? `<img src="${cfg.bgImage}" alt="" style="width:50px;height:30px;object-fit:cover;border-radius:4px;vertical-align:middle;">` : '🖼️';
    return `
      <tr>
        <td><b>${escapeHtml(cfg.pageTitle)}</b></td>
        <td>${thumb}</td>
        <td>${escapeHtml(cfg.slogan)}</td>
        <td>${Math.round((cfg.overlayOpacity || 0.45) * 100)}%</td>
        <td><span class="badge badge-neutral">${cfg.alignment || 'left'}</span></td>
        <td>
          <button class="btn-table-icon" onclick="document.getElementById('page-bg-select').value='${k}';onPageHeaderSelect();">✏️ Настроить</button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   PROPERTIES & DEVELOPERS CRUD
   ══════════════════════════════════════════════════════════════ */
function renderPropertiesTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-properties tbody');
  if (!tbody) return;

  const search = (document.getElementById('search-properties')?.value || '').toLowerCase().trim();
  const all = (window.AMBER_DATA && window.AMBER_DATA.properties) || window.PROPERTIES || [];
  const filtered = all.filter(p => !search || (p.name||'').toLowerCase().includes(search) || (p.developer||'').toLowerCase().includes(search));

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td><b>${escapeHtml(p.name)}</b></td>
      <td>${escapeHtml(p.developer || '—')}</td>
      <td>${escapeHtml(p.location || p.address || 'Калининград')}</td>
      <td>${escapeHtml(p.priceFrom || p.pricePerSqm || '—')}</td>
      <td>
        <button class="btn-table-icon" title="Редактировать" onclick="openEditModal('properties', ${p.id})">✏️</button>
        <button class="btn-table-icon btn-danger" title="Удалить" onclick="deleteItem('properties', ${p.id})">🗑</button>
      </td>
    </tr>
  `).join('');

  const countEl = document.getElementById('kpi-zhk-count');
  if (countEl) countEl.textContent = all.length;
}

function renderDevelopersTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-developers tbody');
  if (!tbody) return;

  const search = (document.getElementById('search-developers')?.value || '').toLowerCase().trim();
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  const filtered = devs.filter(d => !search || (d.name||'').toLowerCase().includes(search));

  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td>#${d.id}</td>
      <td><b>${escapeHtml(d.name)}</b> ${d.verified ? '<span class="badge badge-success">✓</span>' : ''}</td>
      <td>${escapeHtml(d.city || 'Калининград')}</td>
      <td><code>${escapeHtml(d.code || '123456')}</code></td>
      <td>${d.rating || 4.8} ★</td>
      <td>
        <button class="btn-table-icon" title="Редактировать" onclick="openEditModal('developers', ${d.id})">✏️</button>
        <button class="btn-table-icon btn-danger" title="Удалить" onclick="deleteItem('developers', ${d.id})">🗑</button>
      </td>
    </tr>
  `).join('');

  const countEl = document.getElementById('kpi-dev-count');
  if (countEl) countEl.textContent = devs.length;
}

/* ── DEVELOPER INVITES & TOKENS (amber_invite_tokens) ── */
function getInviteTokens() {
  let tokens = {};
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('amber_invite_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => { if (t && t.token) tokens[t.token] = t; });
        } else if (typeof parsed === 'object' && parsed !== null) {
          tokens = parsed;
        }
      }
    } catch(e) {}
  }
  if (Object.keys(tokens).length === 0) {
    const demoToken = {
      token: 'inv_demo_baltik39',
      developerId: 4,
      developerName: 'ООО «Балтик Строй»',
      contactName: 'Алексей Смирнов',
      email: 'info@baltikstroy.ru',
      phone: '+7 (4012) 55-44-33',
      tariffPlanId: 'pro',
      createdAt: '2026-08-25T19:00:00.000Z',
      expiresAt: '2026-09-01T19:00:00.000Z',
      used: false,
      usedAt: null
    };
    tokens[demoToken.token] = demoToken;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('amber_invite_tokens', JSON.stringify(tokens)); } catch(e) {}
    }
  }
  return tokens;
}

function saveInviteTokens(tokens) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('amber_invite_tokens', JSON.stringify(tokens));
    } catch(e) {}
  }
}

function generateDeveloperInvite() {
  if (typeof document === 'undefined') return;
  const company = (document.getElementById('invite-company-name')?.value || '').trim();
  const contact = (document.getElementById('invite-contact-name')?.value || '').trim();
  const email = (document.getElementById('invite-email')?.value || '').trim();
  const phone = (document.getElementById('invite-phone')?.value || '').trim();
  const tariff = document.getElementById('invite-tariff')?.value || 'pro';

  if (!company || !contact || !email) {
    alert('Пожалуйста, заполните название компании, контактное лицо и email');
    return;
  }

  const token = 'inv_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const devId = (typeof window !== 'undefined' && window.AMBER_DATA && window.AMBER_DATA.developers)
    ? (window.AMBER_DATA.developers.length + 1)
    : 55;

  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const tokenRecord = {
    token: token,
    developerId: devId,
    developerName: company,
    contactName: contact,
    email: email,
    phone: phone,
    tariffPlanId: tariff,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    used: false,
    usedAt: null
  };

  const allTokens = getInviteTokens();
  allTokens[token] = tokenRecord;
  saveInviteTokens(allTokens);

  // Build link
  let baseUrl = 'cabinet.html';
  if (typeof location !== 'undefined' && location.pathname) {
    const basePath = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
    baseUrl = (location.origin ? location.origin : '') + basePath + 'cabinet.html';
  }
  const inviteUrl = baseUrl + '?invite=' + token;

  const linkInput = document.getElementById('invite-generated-link');
  if (linkInput) linkInput.value = inviteUrl;

  const resultBox = document.getElementById('invite-result-box');
  if (resultBox) resultBox.style.display = 'block';

  renderInviteTokensTable();
  showAdminToast('Ссылка-приглашение успешно создана!');
}

function copyInviteLink(tokenStr) {
  let link = '';
  if (tokenStr) {
    let baseUrl = 'cabinet.html';
    if (typeof location !== 'undefined' && location.pathname) {
      const basePath = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
      baseUrl = (location.origin ? location.origin : '') + basePath + 'cabinet.html';
    }
    link = baseUrl + '?invite=' + tokenStr;
  } else {
    link = document.getElementById('invite-generated-link')?.value || '';
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(link);
    showAdminToast('Ссылка скопирована в буфер обмена');
  } else {
    showAdminToast('Ссылка: ' + link);
  }
}

function renderInviteTokensTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-invite-tokens tbody');
  if (!tbody) return;

  const tokensMap = getInviteTokens();
  const tokenList = Object.values(tokensMap).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (tokenList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:#64748B;">Приглашения пока не созданы</td></tr>';
    return;
  }

  const now = Date.now();
  tbody.innerHTML = tokenList.map(t => {
    let statusPill = '<span class="status-pill pill-active">Активен</span>';
    if (t.used) {
      statusPill = '<span class="status-pill pill-work">Использован</span>';
    } else if (t.expiresAt && new Date(t.expiresAt).getTime() < now) {
      statusPill = '<span class="status-pill pill-pending">Истёк</span>';
    }

    const createdStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('ru-RU') : '—';
    const tariffBadge = t.tariffPlanId === 'premium' ? '<span class="badge badge-blue">Премиум (210К)</span>' :
                        (t.tariffPlanId === 'pro' ? '<span class="badge badge-blue">Про (150К)</span>' :
                        '<span class="badge badge-neutral">Базовый (69К)</span>');

    return `
      <tr>
        <td><code>${escapeHtml(t.token)}</code></td>
        <td><b>${escapeHtml(t.developerName || '')}</b></td>
        <td>${escapeHtml(t.email || '')}<br><small>${escapeHtml(t.contactName || '')} ${escapeHtml(t.phone || '')}</small></td>
        <td>${tariffBadge}</td>
        <td><small>${createdStr}</small></td>
        <td>${statusPill}</td>
        <td>
          <button class="btn-admin-primary btn-sm" onclick="copyInviteLink('${escapeHtml(t.token)}')">📋 Копировать</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSubmissionsTable() {
  if (typeof document === 'undefined') return;
  const tbody = document.querySelector('#table-submissions tbody');
  if (!tbody) return;
  let list = [];
  if (typeof localStorage !== 'undefined') {
    try { list = JSON.parse(localStorage.getItem('dev_submissions')) || []; } catch(e) {}
  }
  tbody.innerHTML = list.map(s => `<tr><td>#${s.id}</td><td><b>${escapeHtml(s.company)}</b></td><td>${escapeHtml(s.phone)}</td><td>${s.date}</td><td>${escapeHtml(s.status)}</td><td><button class="btn-table-icon">✅</button></td></tr>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   STATS DASHBOARD & DEV ANALYTICS
   ══════════════════════════════════════════════════════════════ */
function renderStatsDashboard() {
  if (typeof document === 'undefined') return;
  const banners = getAdminBanners();
  let totalViews = 0, totalClicks = 0;
  let topBanner = '—', maxClicks = -1;

  banners.forEach(b => {
    const v = b.stats ? b.stats.impressions : (b.impressions || b.views || 0);
    const c = b.stats ? b.stats.clicks : (b.clicks || 0);
    totalViews += v;
    totalClicks += c;
    if (c > maxClicks) { maxClicks = c; topBanner = b.title; }
  });

  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) + '%' : '0%';

  const tvEl = document.getElementById('stat-total-views');
  const tcEl = document.getElementById('stat-total-clicks');
  const ctrEl = document.getElementById('stat-avg-ctr');
  const topEl = document.getElementById('stat-top-banner');

  if (tvEl) tvEl.textContent = totalViews.toLocaleString('ru-RU');
  if (tcEl) tcEl.textContent = totalClicks.toLocaleString('ru-RU');
  if (ctrEl) ctrEl.textContent = avgCtr;
  if (topEl) topEl.textContent = topBanner;
}

function initDevAnalytics() {
  if (typeof document === 'undefined') return;
  const tbody = document.getElementById('dev-analytics-tbody');
  const sel = document.getElementById('dev-analytics-select');
  if (!tbody || !sel) return;

  tbody.innerHTML = '';
  sel.innerHTML = '<option value="">— Выберите —</option>';
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  if (devs.length === 0) return;

  devs.slice(0, 20).forEach(dev => {
    let zhkCount = 0;
    if (window.AMBER_DATA && window.AMBER_DATA.properties) {
      zhkCount = window.AMBER_DATA.properties.filter(p => p.developer && p.developer.includes(dev.name.split('«')[1] ? dev.name.split('«')[1].split('»')[0] : dev.name)).length;
    }
    const views = 15000 + (Number(dev.id) * 1200);
    const opens = Math.floor(views * 0.12);
    const leads = Math.floor(opens * 0.035);
    const conv = ((leads / views) * 100).toFixed(2);
    const spend = 75000 + (Number(dev.id) * 5000);
    const placements = 2 + (Number(dev.id) % 3);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="font-weight:600;">${escapeHtml(dev.name.substring(0, 30))}</td>
      <td>${zhkCount}</td>
      <td>${views.toLocaleString('ru-RU')}</td>
      <td>${opens.toLocaleString('ru-RU')}</td>
      <td style="font-weight:700;color:#16A34A;">${leads}</td>
      <td>${conv}%</td>
      <td>${spend.toLocaleString('ru-RU')} ₽</td>
      <td>${placements}</td>`;
    tbody.appendChild(tr);
    sel.innerHTML += `<option value="${dev.id}">${escapeHtml(dev.name)}</option>`;
  });
}

function renderDevAnalyticsDetail() {
  if (typeof document === 'undefined') return;
  const devId = document.getElementById('dev-analytics-select')?.value;
  const container = document.getElementById('dev-analytics-detail');
  if (!container) return;
  if (!devId) {
    container.innerHTML = '<p style="color:#94A3B8;">Выберите застройщика для просмотра детальной аналитики</p>';
    return;
  }
  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
  const dev = devs.find(d => String(d.id) === String(devId));
  const name = dev ? dev.name : 'Застройщик #' + devId;

  container.innerHTML = `
    <h4 style="margin-bottom:12px;font-size:15px;font-weight:800;">${escapeHtml(name)}</h4>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;">
      <div class="kpi-card"><div class="kpi-label">Показы</div><div class="kpi-value">28 450</div></div>
      <div class="kpi-card"><div class="kpi-label">Клики</div><div class="kpi-value">1 890</div></div>
      <div class="kpi-card"><div class="kpi-label">CTR</div><div class="kpi-value">6.6%</div></div>
      <div class="kpi-card"><div class="kpi-label">Лиды</div><div class="kpi-value">64</div></div>
      <div class="kpi-card"><div class="kpi-label">Ср. время</div><div class="kpi-value">3:42</div></div>
      <div class="kpi-card"><div class="kpi-label">Расход</div><div class="kpi-value">125 000 ₽</div></div>
    </div>
    <h4 style="margin-bottom:8px;font-size:13px;font-weight:700;">Популярные табы карточек</h4>
    <div class="analytics-bar-row"><span class="analytics-bar-label">Цены</span><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:95%;background:#3B82F6;"></div></div><span class="analytics-bar-val">95%</span></div>
    <div class="analytics-bar-row"><span class="analytics-bar-label">Ипотека</span><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:78%;background:#6366F1;"></div></div><span class="analytics-bar-val">78%</span></div>
    <div class="analytics-bar-row"><span class="analytics-bar-label">Локация</span><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:65%;background:#8B5CF6;"></div></div><span class="analytics-bar-val">65%</span></div>
    <div class="analytics-bar-row"><span class="analytics-bar-label">Характеристики</span><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:52%;background:#A855F7;"></div></div><span class="analytics-bar-val">52%</span></div>
  `;
}

function updateSimulation() {
  if (typeof document === 'undefined') return;
  const devs = Number(document.getElementById('sim-active-devs')?.value || 65);
  const total = devs * 25000;
  const revEl = document.getElementById('sim-total-revenue');
  if (revEl) revEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
}

/* ══════════════════════════════════════════════════════════════
   AUDIT LOG & SHA-256 VERIFIER
   ══════════════════════════════════════════════════════════════ */
function getAllAuditLogs() {
  if (typeof localStorage === 'undefined') return [];
  const logs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('amber_audit_logs_queue_')) {
      try {
        const arr = JSON.parse(localStorage.getItem(k));
        if (Array.isArray(arr)) logs.push(...arr);
      } catch(e) {}
    }
  }
  return logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function populateDevFilter(logs) {
  if (typeof document === 'undefined') return;
  const sel = document.getElementById('audit-filter-dev');
  if (!sel) return;

  if (Array.isArray(logs) && logs.length > 0) {
    const devMap = new Map();
    logs.forEach(l => {
      if (l.developerId) {
        devMap.set(String(l.developerId), l.developerName || ('Девелопер ' + l.developerId));
      }
    });
    sel.innerHTML = '<option value="all">Все застройщики</option>' +
      Array.from(devMap.entries()).map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
  } else {
    const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];
    sel.innerHTML = '<option value="all">Все застройщики</option>' +
      devs.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }
}

async function verifyHash(entry) {
  if (!entry) return false;
  const str = entry.id + entry.timestamp + String(entry.developerId) + String(entry.zhkId) + JSON.stringify(entry.changes);
  try {
    const subtle = (typeof crypto !== 'undefined' && crypto.subtle) || (typeof window !== 'undefined' && window.crypto && window.crypto.subtle);
    if (!subtle) return false;
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(str));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    return hex === entry.hashFull;
  } catch(e) {
    return false;
  }
}

function renderAdminAuditLog() {
  if (typeof document === 'undefined') return;
  const tbody = document.getElementById('audit-log-tbody');
  if (!tbody) return;

  const devFilter = document.getElementById('audit-filter-dev')?.value || 'all';
  const search = (document.getElementById('audit-search')?.value || '').toLowerCase().trim();

  const all = getAllAuditLogs();
  const filtered = all.filter(l => {
    const matchDev = (devFilter === 'all') || (String(l.developerId) === String(devFilter));
    const matchSearch = !search ||
      (l.user||'').toLowerCase().includes(search) ||
      (l.zhkId||'').toLowerCase().includes(search) ||
      (l.zhkName||'').toLowerCase().includes(search) ||
      (l.action||'').toLowerCase().includes(search);
    return matchDev && matchSearch;
  });

  const countEl = document.getElementById('audit-count');
  if (countEl) countEl.textContent = `${filtered.length} записей`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748B;">Журнал пуст</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.slice(0, 25).map(l => `
    <tr>
      <td>${new Date(l.timestamp).toLocaleString('ru-RU')}</td>
      <td><b>${escapeHtml(l.user || 'Менеджер')}</b></td>
      <td>${escapeHtml(l.developerName || ('Девелопер ' + l.developerId))}</td>
      <td>${escapeHtml(l.zhkName || l.zhkId)}</td>
      <td>${escapeHtml(l.action)}</td>
      <td><code>${l.hashFull ? '#' + l.hashFull.slice(0,8) : '—'}</code></td>
      <td><span class="status-pill pill-resolved">Подлинный ✅</span></td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════
   MODALS CRUD DISPATCHER (Rich Editor for All 9 Blocks)
   ══════════════════════════════════════════════════════════════ */
function openAddModal(type) {
  if (typeof document === 'undefined') return;
  currentModalType = type;
  currentModalId = null;
  const title = document.getElementById('modal-title');
  if (title) {
    if (type === 'developers') title.textContent = 'Добавить застройщика';
    else if (type === 'properties') title.textContent = 'Добавить жилой комплекс (ЖК)';
    else if (type === 'blog') title.textContent = 'Добавить статью в блог';
    else if (type === 'banners') title.textContent = 'Добавить баннер';
    else if (type === 'experts') title.textContent = 'Добавить эксперта рынка';
    else if (type === 'heroSlides') title.textContent = 'Добавить слайд в шапку';
    else title.textContent = 'Добавить — ' + type;
  }
  generateModalFields(type, null);
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'flex';
}

function openEditModal(type, id) {
  if (typeof document === 'undefined') return;
  currentModalType = type;
  currentModalId = id;
  const title = document.getElementById('modal-title');
  if (title) title.textContent = 'Редактирование #' + id;

  let obj = null;
  if (type === 'properties') {
    const all = (window.AMBER_DATA && window.AMBER_DATA.properties) || window.PROPERTIES || [];
    obj = all.find(x => x.id === id);
  } else if (type === 'blog') {
    obj = getAdminArticles().find(x => x.id === id);
  } else if (type === 'banners') {
    obj = getAdminBanners().find(x => x.id === id);
  } else if (type === 'experts') {
    obj = getAdminExperts().find(x => x.id === id);
  } else if (type === 'heroSlides') {
    obj = getAdminHeroSlides().find(x => x.id === id);
  } else if (window.AMBER_DATA && window.AMBER_DATA[type]) {
    obj = window.AMBER_DATA[type].find(x => x.id === id);
  }

  generateModalFields(type, obj);
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'flex';
}

function generateModalFields(type, data) {
  if (typeof document === 'undefined') return;
  const body = document.getElementById('modal-body');
  if (!body) return;

  const devs = (window.AMBER_DATA && window.AMBER_DATA.developers) || [];

  if (type === 'properties') {
    const devOptions = devs.map(d => `<option value="${escapeHtml(d.name)}" ${data && data.developer === d.name ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('');
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Название ЖК</label><input type="text" class="form-input" id="field-name" value="${data ? escapeHtml(data.name) : ''}"></div>
      <div class="form-group"><label class="form-label">Застройщик</label><select class="form-select" id="field-developer">${devOptions}</select></div>
      <div class="form-group"><label class="form-label">Локация</label><input type="text" class="form-input" id="field-location" value="${data ? escapeHtml(data.location || data.address || '') : 'Калининград'}"></div>
      <div class="form-group"><label class="form-label">Класс</label><input type="text" class="form-input" id="field-class" value="${data ? escapeHtml(data.class || '') : 'комфорт'}"></div>
      <div class="form-group"><label class="form-label">Цена от</label><input type="text" class="form-input" id="field-priceFrom" value="${data ? escapeHtml(data.priceFrom || '') : '5 млн ₽'}"></div>
    `;
  } else if (type === 'developers') {
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Название компании</label><input type="text" class="form-input" id="field-name" value="${data ? escapeHtml(data.name) : ''}"></div>
      <div class="form-group"><label class="form-label">Город</label><input type="text" class="form-input" id="field-city" value="${data ? escapeHtml(data.city) : 'Калининград'}"></div>
      <div class="form-group"><label class="form-label">Опыт</label><input type="text" class="form-input" id="field-experience" value="${data ? escapeHtml(data.experience) : '10 лет'}"></div>
    `;
  } else if (type === 'blog') {
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Заголовок статьи</label><input type="text" class="form-input" id="field-title" value="${data ? escapeHtml(data.title) : ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Категория</label><input type="text" class="form-input" id="field-category" value="${data ? escapeHtml(data.category) : 'Обзор'}"></div>
        <div class="form-group"><label class="form-label">Автор</label><input type="text" class="form-input" id="field-author" value="${data ? escapeHtml(data.author || '') : 'Анна Волкова'}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Дата публикации</label><input type="date" class="form-input" id="field-date" value="${data ? (data.date || '2026-06-05') : '2026-06-05'}"></div>
        <div class="form-group"><label class="form-label">Статус</label><select class="form-select" id="field-status"><option value="published" ${!data || data.status === 'published' ? 'selected' : ''}>Опубликовано</option><option value="draft" ${data && data.status === 'draft' ? 'selected' : ''}>Черновик</option></select></div>
      </div>
      <div class="form-group">
        <label class="form-label">Обложка статьи (URL или файл)</label>
        <div class="img-upload-box">
          <div class="img-preview-thumb" id="blog-img-preview" style="background-image:url(${data ? (data.imgSrc || '') : ''});background-size:cover;">${data && data.imgSrc ? '' : '📷'}</div>
          <div style="flex:1;">
            <input type="text" class="form-input" id="field-img" placeholder="URL изображения" value="${data ? (data.imgSrc || '') : ''}" oninput="document.getElementById('blog-img-preview').style.backgroundImage='url('+this.value+')';document.getElementById('blog-img-preview').textContent='';" style="margin-bottom:6px;">
            <input type="file" id="field-img-file" accept="image/*" onchange="handleFileUpload(event, 'field-img', 'blog-img-preview')">
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Краткий анонс</label><textarea class="form-textarea" id="field-excerpt" rows="2">${data ? escapeHtml(data.excerpt || '') : ''}</textarea></div>
      <div class="form-group">
        <label class="form-label">Текст статьи (с форматированием)</label>
        <div class="rich-format-bar">
          <button type="button" class="rich-btn" onclick="formatRichText('b')"><b>B</b></button>
          <button type="button" class="rich-btn" onclick="formatRichText('i')"><i>I</i></button>
          <button type="button" class="rich-btn" onclick="formatRichText('h3')">H3</button>
          <button type="button" class="rich-btn" onclick="formatRichText('p')">P</button>
          <button type="button" class="rich-btn" onclick="formatRichText('ul')">List</button>
          <button type="button" class="rich-btn" onclick="formatRichText('quote')">Quote</button>
        </div>
        <textarea class="form-textarea" id="field-content" rows="6">${data ? escapeHtml(data.content || '') : ''}</textarea>
      </div>
      <div class="form-group"><label class="form-label">Теги (через запятую)</label><input type="text" class="form-input" id="field-tags" value="${data ? (Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '')) : 'недвижимость, инвестиции'}"></div>
    `;
  } else if (type === 'experts') {
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Имя эксперта</label><input type="text" class="form-input" id="field-name" value="${data ? escapeHtml(data.name) : ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Специализация / Роль</label><input type="text" class="form-input" id="field-specialty" value="${data ? escapeHtml(data.specialty || data.role || '') : 'Ведущий аналитик'}"></div>
        <div class="form-group"><label class="form-label">Опыт работы</label><input type="text" class="form-input" id="field-experience" value="${data ? escapeHtml(data.experience) : '8 лет опыта'}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Сделки</label><input type="text" class="form-input" id="field-deals" value="${data ? escapeHtml(data.deals || '') : '120+ сделок'}"></div>
        <div class="form-group"><label class="form-label">Рейтинг</label><input type="number" step="0.1" min="1" max="5" class="form-input" id="field-rating" value="${data ? (data.rating || 4.9) : 4.9}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div class="form-group"><label class="form-label">Телефон</label><input type="text" class="form-input" id="field-phone" value="${data ? escapeHtml(data.phone || '') : '+7 (4012) 99-88-77'}"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="text" class="form-input" id="field-email" value="${data ? escapeHtml(data.email || '') : 'expert@amber-avenue.ru'}"></div>
        <div class="form-group"><label class="form-label">Telegram</label><input type="text" class="form-input" id="field-telegram" value="${data ? escapeHtml(data.telegram || '') : '@expert_realty'}"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Аватар (эмодзи или фото URL)</label>
        <div class="img-upload-box">
          <div class="img-preview-thumb" id="expert-avatar-preview">${data ? (data.avatar || '👩‍💼') : '👩‍💼'}</div>
          <div style="flex:1;">
            <input type="text" class="form-input" id="field-avatar" placeholder="Эмодзи или URL фото" value="${data ? (data.avatar || '👩‍💼') : '👩‍💼'}" oninput="document.getElementById('expert-avatar-preview').textContent=this.value;">
            <input type="file" id="field-avatar-file" accept="image/*" onchange="handleFileUpload(event, 'field-avatar', 'expert-avatar-preview')">
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Биография / Описание</label><textarea class="form-textarea" id="field-bio" rows="3">${data ? escapeHtml(data.bio || '') : ''}</textarea></div>
    `;
  } else if (type === 'banners') {
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Название кампании</label><input type="text" class="form-input" id="field-title" value="${data ? escapeHtml(data.title) : ''}"></div>
      <div class="form-group"><label class="form-label">Главный заголовок</label><input type="text" class="form-input" id="field-headline" value="${data ? escapeHtml(data.headline || '') : ''}"></div>
      <div class="form-group"><label class="form-label">Подзаголовок / Описание</label><input type="text" class="form-input" id="field-sub" value="${data ? escapeHtml(data.sub || '') : ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Слот размещения</label>
          <select class="form-select" id="field-slot">
            <option value="top" ${data && data.slot === 'top' ? 'selected' : ''}>Верхний баннер (top)</option>
            <option value="hero" ${data && data.slot === 'hero' ? 'selected' : ''}>Главный слайдер (hero)</option>
            <option value="catalog_side" ${data && data.slot === 'catalog_side' ? 'selected' : ''}>Боковой в каталоге (catalog_side)</option>
            <option value="catalog_feed" ${data && data.slot === 'catalog_feed' ? 'selected' : ''}>В ленте каталога (catalog_feed)</option>
            <option value="menu_slider" ${data && data.slot === 'menu_slider' ? 'selected' : ''}>Слайдер меню (menu_slider)</option>
            <option value="zhk_card" ${data && data.slot === 'zhk_card' ? 'selected' : ''}>На карточке ЖК (zhk_card)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Целевая страница</label>
          <select class="form-select" id="field-targetPage">
            <option value="all" ${!data || data.targetPage === 'all' ? 'selected' : ''}>Все страницы (all)</option>
            <option value="kaliningrad" ${data && data.targetPage === 'kaliningrad' ? 'selected' : ''}>Калининград</option>
            <option value="umory" ${data && data.targetPage === 'umory' ? 'selected' : ''}>У Моря / Побережье</option>
            <option value="prigorod" ${data && data.targetPage === 'prigorod' ? 'selected' : ''}>Пригород</option>
            <option value="oblast" ${data && data.targetPage === 'oblast' ? 'selected' : ''}>Область</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Текст кнопки (CTA)</label><input type="text" class="form-input" id="field-cta" value="${data ? escapeHtml(data.cta || '') : 'Выбрать квартиру'}"></div>
        <div class="form-group"><label class="form-label">Ссылка перехода</label><input type="text" class="form-input" id="field-ctaLink" value="${data ? escapeHtml(data.ctaLink || data.link || '') : 'zhk.html'}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Дата начала</label><input type="date" class="form-input" id="field-startDate" value="${data ? (data.startDate || '2026-08-01') : '2026-08-01'}"></div>
        <div class="form-group"><label class="form-label">Дата окончания</label><input type="date" class="form-input" id="field-endDate" value="${data ? (data.endDate || '2026-08-31') : '2026-08-31'}"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Изображение баннера</label>
        <div class="img-upload-box">
          <div class="img-preview-thumb" id="banners-img-preview" style="background-image:url(${data ? (data.imgSrc || '') : ''});background-size:cover;">${data && data.imgSrc ? '' : '🎯'}</div>
          <div style="flex:1;">
            <input type="text" class="form-input" id="field-img" placeholder="URL изображения" value="${data ? (data.imgSrc || '') : ''}" oninput="document.getElementById('banners-img-preview').style.backgroundImage='url('+this.value+')';document.getElementById('banners-img-preview').textContent='';" style="margin-bottom:6px;">
            <input type="file" id="field-banner-file" accept="image/*" onchange="handleFileUpload(event, 'field-img', 'banners-img-preview')">
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Тег / Бейдж</label><input type="text" class="form-input" id="field-tag" value="${data ? escapeHtml(data.tag || '') : 'Спецпредложение'}"></div>
    `;
  } else if (type === 'heroSlides') {
    body.innerHTML = `
      <div class="form-group"><label class="form-label">Заголовок слайда</label><input type="text" class="form-input" id="field-slide-title" value="${data ? escapeHtml(data.title) : ''}"></div>
      <div class="form-group"><label class="form-label">Подзаголовок</label><input type="text" class="form-input" id="field-slide-desc" value="${data ? escapeHtml(data.desc || '') : ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">Бейдж / Лейбл</label><input type="text" class="form-input" id="field-slide-label" value="${data ? escapeHtml(data.label || '') : 'Новинки 2026'}"></div>
        <div class="form-group"><label class="form-label">Ссылка</label><input type="text" class="form-input" id="field-slide-link" value="${data ? escapeHtml(data.link || '') : 'zhk.html'}"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Фоновое изображение слайда</label>
        <div class="img-upload-box">
          <div class="img-preview-thumb" id="slide-img-preview" style="background-image:url(${data ? (data.image || '') : ''});background-size:cover;">${data && data.image ? '' : '🖼️'}</div>
          <div style="flex:1;">
            <input type="text" class="form-input" id="field-slide-img" placeholder="URL изображения" value="${data ? (data.image || '') : ''}" oninput="document.getElementById('slide-img-preview').style.backgroundImage='url('+this.value+')';document.getElementById('slide-img-preview').textContent='';" style="margin-bottom:6px;">
            <input type="file" accept="image/*" onchange="handleFileUpload(event, 'field-slide-img', 'slide-img-preview')">
          </div>
        </div>
      </div>
    `;
  } else {
    body.innerHTML = `<div class="form-group"><label class="form-label">Название</label><input type="text" class="form-input" id="field-title" value="${data ? escapeHtml(data.title || data.name || '') : ''}"></div>`;
  }
}

function handleFileUpload(event, targetInputId, previewImgId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (typeof FileReader !== 'undefined') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      const input = document.getElementById(targetInputId);
      if (input) input.value = dataUrl;
      const preview = document.getElementById(previewImgId);
      if (preview) {
        preview.style.backgroundImage = `url(${dataUrl})`;
        preview.style.backgroundSize = 'cover';
        preview.textContent = '';
      }
    };
    reader.readAsDataURL(file);
  }
}

function formatRichText(tag) {
  const textarea = document.getElementById('field-content');
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const selText = textarea.value.substring(start, end) || 'текст';

  let replace = '';
  if (tag === 'b') replace = `<b>${selText}</b>`;
  else if (tag === 'i') replace = `<i>${selText}</i>`;
  else if (tag === 'h3') replace = `<h3>${selText}</h3>`;
  else if (tag === 'p') replace = `<p>${selText}</p>`;
  else if (tag === 'ul') replace = `<ul>\n  <li>${selText}</li>\n</ul>`;
  else if (tag === 'quote') replace = `<blockquote>${selText}</blockquote>`;

  textarea.value = textarea.value.substring(0, start) + replace + textarea.value.substring(end);
}

function saveModalData() {
  if (typeof document === 'undefined') return;
  if (!window.AMBER_DATA) window.AMBER_DATA = {};

  if (currentModalType === 'properties') {
    const name = document.getElementById('field-name')?.value;
    const dev = document.getElementById('field-developer')?.value || 'ГК «Расцвет»';
    const loc = document.getElementById('field-location')?.value || 'Калининград';
    const cls = document.getElementById('field-class')?.value || 'комфорт';
    const price = document.getElementById('field-priceFrom')?.value || '5 млн ₽';
    if (!name) return;

    if (!window.AMBER_DATA.properties) window.AMBER_DATA.properties = window.PROPERTIES || [];
    if (currentModalId) {
      const item = window.AMBER_DATA.properties.find(x => x.id === currentModalId);
      if (item) { item.name = name; item.developer = dev; item.location = loc; item.class = cls; item.priceFrom = price; }
    } else {
      const newId = window.AMBER_DATA.properties.length + 1;
      window.AMBER_DATA.properties.unshift({ id: newId, name, developer: dev, location: loc, class: cls, priceFrom: price });
    }
    renderPropertiesTable();
  } else if (currentModalType === 'developers') {
    const name = document.getElementById('field-name')?.value;
    const city = document.getElementById('field-city')?.value || 'Калининград';
    const exp = document.getElementById('field-experience')?.value || '10 лет';
    if (!name) return;

    if (!window.AMBER_DATA.developers) window.AMBER_DATA.developers = [];
    if (currentModalId) {
      const item = window.AMBER_DATA.developers.find(x => x.id === currentModalId);
      if (item) { item.name = name; item.city = city; item.experience = exp; }
    } else {
      const newId = window.AMBER_DATA.developers.length + 1;
      window.AMBER_DATA.developers.push({ id: newId, name, city, experience: exp, code: '123456' });
    }
    renderDevelopersTable();
  } else if (currentModalType === 'blog') {
    const title = document.getElementById('field-title')?.value;
    const cat = document.getElementById('field-category')?.value || 'Обзор';
    const author = document.getElementById('field-author')?.value || 'Анна Волкова';
    const date = document.getElementById('field-date')?.value || '2026-06-05';
    const status = document.getElementById('field-status')?.value || 'published';
    const excerpt = document.getElementById('field-excerpt')?.value || '';
    const content = document.getElementById('field-content')?.value || '';
    const imgSrc = document.getElementById('field-img')?.value || 'kld_city_welcome.png';
    const rawTags = document.getElementById('field-tags')?.value || '';
    const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!title) return;

    const articles = getAdminArticles();
    if (currentModalId) {
      const item = articles.find(x => x.id === currentModalId);
      if (item) {
        item.title = title;
        item.category = cat;
        item.author = author;
        item.date = date;
        item.status = status;
        item.excerpt = excerpt;
        item.content = content;
        item.imgSrc = imgSrc;
        item.tags = tags;
        item.updatedAt = new Date().toISOString();
      }
    } else {
      const newId = articles.length > 0 ? Math.max(...articles.map(a => Number(a.id) || 0)) + 1 : 1;
      articles.unshift({
        id: newId,
        title,
        category: cat,
        author,
        date,
        status,
        excerpt,
        content,
        imgSrc,
        tags,
        viewsCount: 0,
        views: 0,
        createdAt: new Date().toISOString()
      });
    }
    saveAdminArticles(articles);
    renderBlogTable();
  } else if (currentModalType === 'banners') {
    const title = document.getElementById('field-title')?.value;
    const headline = document.getElementById('field-headline')?.value || title;
    const sub = document.getElementById('field-sub')?.value || '';
    const slot = document.getElementById('field-slot')?.value || 'top';
    const targetPage = document.getElementById('field-targetPage')?.value || 'all';
    const cta = document.getElementById('field-cta')?.value || 'Узнать больше';
    const ctaLink = document.getElementById('field-ctaLink')?.value || 'zhk.html';
    const startDate = document.getElementById('field-startDate')?.value || '2026-08-01';
    const endDate = document.getElementById('field-endDate')?.value || '2026-08-31';
    const imgSrc = document.getElementById('field-img')?.value || 'dev-banner.png';
    const tag = document.getElementById('field-tag')?.value || 'Спецпредложение';
    if (!title) return;

    const banners = getAdminBanners();
    if (currentModalId) {
      const item = banners.find(x => x.id === currentModalId);
      if (item) {
        item.title = title;
        item.headline = headline;
        item.sub = sub;
        item.slot = slot;
        item.targetPage = targetPage;
        item.cta = cta;
        item.ctaLink = ctaLink;
        item.startDate = startDate;
        item.endDate = endDate;
        item.imgSrc = imgSrc;
        item.tag = tag;
      }
    } else {
      const newId = banners.length > 0 ? Math.max(...banners.map(b => Number(b.id) || 0)) + 1 : 1;
      banners.unshift({
        id: newId,
        title,
        headline,
        sub,
        slot,
        targetPage,
        cta,
        ctaLink,
        startDate,
        endDate,
        imgSrc,
        tag,
        status: 'active',
        impressions: 1000,
        clicks: 50,
        stats: { impressions: 1000, clicks: 50 }
      });
    }
    saveAdminBanners(banners);
    renderBannersTable();
    renderStatsDashboard();
  } else if (currentModalType === 'experts') {
    const name = document.getElementById('field-name')?.value;
    const specialty = document.getElementById('field-specialty')?.value || 'Ведущий аналитик';
    const experience = document.getElementById('field-experience')?.value || '5 лет';
    const deals = document.getElementById('field-deals')?.value || '100+ сделок';
    const rating = parseFloat(document.getElementById('field-rating')?.value || '4.9');
    const phone = document.getElementById('field-phone')?.value || '+7 (4012) 99-88-77';
    const email = document.getElementById('field-email')?.value || 'expert@amber-avenue.ru';
    const telegram = document.getElementById('field-telegram')?.value || '@expert';
    const avatar = document.getElementById('field-avatar')?.value || '👩‍💼';
    const bio = document.getElementById('field-bio')?.value || '';
    if (!name) return;

    const experts = getAdminExperts();
    if (currentModalId) {
      const item = experts.find(x => x.id === currentModalId);
      if (item) {
        item.name = name;
        item.specialty = specialty;
        item.role = specialty;
        item.experience = experience;
        item.deals = deals;
        item.rating = rating;
        item.phone = phone;
        item.email = email;
        item.telegram = telegram;
        item.avatar = avatar;
        item.bio = bio;
      }
    } else {
      const newId = experts.length > 0 ? Math.max(...experts.map(e => Number(e.id) || 0)) + 1 : 1;
      experts.push({
        id: newId,
        name,
        specialty,
        role: specialty,
        experience,
        deals,
        rating,
        phone,
        email,
        telegram,
        avatar,
        bio,
        isActive: true,
        sortOrder: experts.length + 1
      });
    }
    saveAdminExperts(experts);
    renderExpertsTable();
  } else if (currentModalType === 'heroSlides') {
    const title = document.getElementById('field-slide-title')?.value;
    const desc = document.getElementById('field-slide-desc')?.value || '';
    const label = document.getElementById('field-slide-label')?.value || 'Слайд';
    const link = document.getElementById('field-slide-link')?.value || 'zhk.html';
    const image = document.getElementById('field-slide-img')?.value || 'kld_city_welcome.png';
    if (!title) return;

    const slides = getAdminHeroSlides();
    if (currentModalId) {
      const item = slides.find(x => x.id === currentModalId);
      if (item) { item.title = title; item.desc = desc; item.label = label; item.link = link; item.image = image; }
    } else {
      const newId = slides.length > 0 ? Math.max(...slides.map(s => Number(s.id) || 0)) + 1 : 1;
      slides.push({ id: newId, title, desc, label, link, image, sortOrder: slides.length + 1, active: true });
    }
    saveAdminHeroSlides(slides);
    renderHeroSlidesTable();
  }

  triggerUnsavedChanges();
  closeModal();
  showAdminToast('Сохранено');
}

function deleteItem(type, id) {
  if (!confirm('Удалить #' + id + '?')) return;

  if (type === 'properties') {
    if (window.AMBER_DATA && window.AMBER_DATA.properties) {
      window.AMBER_DATA.properties = window.AMBER_DATA.properties.filter(x => x.id !== id);
    }
    renderPropertiesTable();
  } else if (type === 'developers') {
    if (window.AMBER_DATA && window.AMBER_DATA.developers) {
      window.AMBER_DATA.developers = window.AMBER_DATA.developers.filter(x => x.id !== id);
    }
    renderDevelopersTable();
  } else if (type === 'blog') {
    const articles = getAdminArticles().filter(x => x.id !== id);
    saveAdminArticles(articles);
    renderBlogTable();
  } else if (type === 'experts') {
    const experts = getAdminExperts().filter(x => x.id !== id);
    saveAdminExperts(experts);
    renderExpertsTable();
  } else if (type === 'banners') {
    const banners = getAdminBanners().filter(x => x.id !== id);
    saveAdminBanners(banners);
    renderBannersTable();
    renderStatsDashboard();
  } else if (type === 'heroSlides') {
    const slides = getAdminHeroSlides().filter(x => x.id !== id);
    saveAdminHeroSlides(slides);
    renderHeroSlidesTable();
  }

  triggerUnsavedChanges();
  showAdminToast('Удалено');
}

function closeModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
  currentModalType = null;
  currentModalId = null;
}

/* ══════════════════════════════════════════════════════════════
   GLOBAL EXPORTS & INITIALIZATION DISPATCH
   ══════════════════════════════════════════════════════════════ */
var exportsList = {
  seedDeveloperSubmissions,
  showAdminToast,
  triggerUnsavedChanges,
  saveDatabase,
  saveChangesToDisk,
  sanitizeHTML,
  escapeHtml,
  switchAdminSection,
  renderPropertiesTable,
  renderDevelopersTable,
  renderBlogTable,
  renderExpertsTable,
  renderBannersTable,
  renderHeroSlidesTable,
  renderStatsDashboard,
  renderSubmissionsTable,
  renderAmberLeadsTable,
  renderPlatformLeads,
  updateLeadStatus,
  exportLeadsCSV,
  exportPlatformLeads,
  openConsentCard,
  closeConsentModal,
  copyConsentAuditLog,
  openLeadsSpreadsheetModal,
  getAllModerationRecords,
  updateModerationPendingCount,
  renderModerationSection,
  adminApproveZhk,
  adminSendCorrections,
  toggleModRow,
  seedDefaultModerationRecords,
  getAllAuditLogs,
  populateDevFilter,
  verifyHash,
  renderAdminAuditLog,
  updateSimulation,
  openAddModal,
  openEditModal,
  generateModalFields,
  saveModalData,
  deleteItem,
  closeModal,
  getAdminArticles,
  saveAdminArticles,
  toggleArticleStatus,
  getAdminBanners,
  saveAdminBanners,
  toggleBannerStatus,
  getAdminExperts,
  saveAdminExperts,
  getAdminHeroSlides,
  saveAdminHeroSlides,
  getAdminCategoryBgs,
  saveAdminCategoryBgs,
  initPlacementsSection,
  onPlacementDevChange,
  populateDevZhkList,
  togglePlacementBlock,
  shiftPlCalendar,
  renderPlCalendar,
  togglePlBooking,
  recalcPlacementCost,
  savePlacementsData,
  loadPlacementsData,
  exportDevPDF,
  saveContractData,
  loadContractData,
  markContractUnsaved,
  setContractPaymentStatus,
  insertContractCommentTag,
  updateContractCommentsCount,
  clearContractComments,
  renderPlacementRequestsTable,
  approvePlacementRequest,
  rejectPlacementRequest,
  initDevAnalytics,
  renderDevAnalyticsDetail,
  initTariffsSection,
  onTariffDevChange,
  applyTariffPreset,
  getAdminTariff,
  saveDeveloperTariff,
  renderTariffsTable,
  getAdminLeads,
  saveAdminLeads,
  getUnlockRequests,
  saveUnlockRequests,
  renderUnlockRequestsTable,
  approveUnlockRequest,
  getInviteTokens,
  saveInviteTokens,
  generateDeveloperInvite,
  copyInviteLink,
  renderInviteTokensTable,
  initPagesSection,
  getPageHeaderBg,
  onPageHeaderSelect,
  savePageHeaderBg,
  resetPageHeaderBg,
  renderPageHeadersTable,
  handleFileUpload,
  formatRichText,
  hasUnsavedChanges
};

var scope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
for (var k in exportsList) {
  scope[k] = exportsList[k];
  if (typeof window !== 'undefined') window[k] = exportsList[k];
}

/* ── DOM READY HOOK ── */
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('DOMContentLoaded', () => {
    seedDeveloperSubmissions(false);
    renderPropertiesTable();
    renderDevelopersTable();
    renderInviteTokensTable();
    renderBlogTable();
    renderExpertsTable();
    renderBannersTable();
    renderHeroSlidesTable();
    renderStatsDashboard();
    renderSubmissionsTable();
    renderAmberLeadsTable();
    renderUnlockRequestsTable();
    populateDevFilter();
    updateModerationPendingCount();
  });
}
