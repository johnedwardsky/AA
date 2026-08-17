/* ============================================================
   AMBER AVENUE — App Logic
   Property Listing Feed with Expandable Panels
   ============================================================ */

'use strict';
// ── Sample Data (Loaded from window.AMBER_DATA) ─────────────────────────────
const PROPERTIES = window.AMBER_DATA ? window.AMBER_DATA.properties : [];
const BANNERS = window.AMBER_DATA ? window.AMBER_DATA.banners : [];

// Banners config
const BANNER_EVERY = 5; // Insert banner after every N cards

const TAG_CLASS = {
  'семейная ипотека':   'tag-family',
  'балтийская ипотека': 'tag-mortgage',
  'сельская ипотека':   'tag-mortgage',
  'IT-ипотека':         'tag-it',
  'военная ипотека':    'tag-author',
  'авторская отделка':  'tag-author',
  'автономное отопление': 'tag-autonomous',
  'бизнес-класс':       'tag-comfort',
  'комфорт-класс':      'tag-comfort',
  'стандарт-класс':     'tag-comfort',
  'премиум':            'tag-author',
};

// ── Nav Items Config ─────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'prices',   label: 'Цены',        icon: '₽',  panel: 'left' },
  { key: 'mortgage', label: 'Ипотека',      icon: '🏦', panel: 'right' },
  { key: 'index',    label: 'Индекс',       icon: '★',  panel: null },
  { key: 'location', label: 'Локация',      icon: '📍', panel: 'bottom' },
  { key: 'infra',    label: 'Инфраструктура', icon: '🏪', panel: 'bottom' },
  { key: 'chars',    label: 'Характеристики', icon: '📋', panel: 'bottom' },
  { key: 'docs',     label: 'Документы',    icon: '📄', panel: 'bottom' },
  { key: 'dev',      label: 'Застройщик',   icon: '🏗',  panel: null },
  { key: 'reviews',  label: 'Отзывы',       icon: '💬', panel: null },
  { key: 'compare',  label: 'Кому подходит', icon: '👥', panel: null },
];

// ── Render Helpers ───────────────────────────────────────────
function formatDistance(str) {
  if (!str) return '';
  const carSVG = `<svg class="loc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 3px; color: var(--color-text-secondary);"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
  const busSVG = `<svg class="loc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 3px; color: var(--color-text-secondary);"><path d="M19 17h2c.6 0 1-.4 1-1V9c0-2-1.5-3-3.5-3H4C2.3 6 1 7.3 1 9v7c0 .6.4 1 1 1h2"/><line x1="1" y1="12" x2="22" y2="12"/><line x1="6" y1="6" x2="6" y2="12"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="17" y1="6" x2="17" y2="12"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
  const walkSVG = `<svg class="loc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 3px; color: var(--color-text-secondary);"><path d="M18 5a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM14 9l-4 3 1.5 5.5M10.5 12h-2L6 17"/></svg>`;
  const trainSVG = `<svg class="loc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 3px; color: var(--color-text-secondary);"><path d="M4 11h16L18 5H6zM4 11v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M9 19h6"/></svg>`;
  return str.replace(/🚗/g, carSVG).replace(/🚌/g, busSVG).replace(/🚶/g, walkSVG).replace(/🚄/g, trainSVG);
}

function tagHTML(tags) {
  return tags.map(t => `<span class="tag ${TAG_CLASS[t] || 'tag-comfort'}">${t}</span>`).join('');
}

function priceTableHTML(prices) {
  return prices.map(p => `
    <tr>
      <td>${p.type}</td>
      <td>${p.from}</td>
      <td>${p.area}</td>
    </tr>
  `).join('');
}

function thumbsHTML(thumbs) {
  return thumbs.map((src, i) => `
    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}">
      <img src="${src}" alt="Фото ${i+1}" loading="lazy">
    </div>
  `).join('');
}

function navItemsHTML() {
  return NAV_ITEMS.map(n => `
    <div class="card-nav-item" data-key="${n.key}" title="${n.label}">
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label">${n.label}</span>
    </div>
  `).join('');
}

// ── NAV CONFIG (updated) ─────────────────────────────────────
const INLINE_NAV = [
  { key: 'prices',   label: 'Цены',           icon: '₽'  },
  { key: 'mortgage', label: 'Ипотека',         icon: '🏦' },
  { key: 'location', label: 'Локация',         icon: '📍' },
  { key: 'infra',    label: 'Инфраструктура',  icon: '🏪' },
  { key: 'chars',    label: 'Характеристики',  icon: '📋' },
  { key: 'docs',     label: 'Документы',       icon: '📄' },
  { key: 'dev',      label: 'Застройщик',      icon: '🏗'  },
  { key: 'pros',     label: 'Плюсы/минусы',    icon: '⚖'  },
  { key: 'whom',     label: 'Кому подходит',   icon: '👥' },
];

function inlineNavHTML() {
  return INLINE_NAV.map(n =>
    `<div class="card-nav-item" data-key="${n.key}" title="${n.label}">
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label">${n.label}</span>
    </div>`
  ).join('');
}

// ── Content Generators ───────────────────────────────────────
function mortgageContentHTML() {
  return `<div>
    <div class="mortgage-bank-label">Банки-партнёры</div>
    <div class="bank-logos">
      <span class="bank-logo sber">Сбер</span>
      <span class="bank-logo vtb">ВТБ</span>
      <span class="bank-logo domrf">Дом.РФ</span>
      <span class="bank-logo rshb">РСХБ</span>
      <span class="bank-logo more">+12</span>
    </div>
    <div class="mortgage-stat"><span class="label">Семейная</span><span class="value">от 5.6%</span></div>
    <div class="mortgage-stat"><span class="label">IT-ипотека</span><span class="value">от 4.7%</span></div>
    <div class="mortgage-stat"><span class="label">Военная</span><span class="value">от 6.75%</span></div>
    <div class="mortgage-stat"><span class="label">Сельская</span><span class="value">от 3%</span></div>
    <div class="mortgage-stat"><span class="label">Первоначальный взнос</span><span class="value">от 10%</span></div>
    <p class="mortgage-note">Ставки актуальны на май 2024. Одобрение за 1 день.</p>
  </div>`;
}

function locationContentHTML(p) {
  const addr = encodeURIComponent(p.address);
  return `<div class="map-services-panel">
    <div class="map-services-list">
      <a class="map-service-link" href="https://yandex.ru/maps/?text=${addr}" target="_blank" rel="noopener">
        <div class="map-service-icon" style="background:#FFF3DC">📍</div>
        <span>Яндекс Карты</span>
      </a>
      <a class="map-service-link" href="https://maps.google.com/?q=${addr}" target="_blank" rel="noopener">
        <div class="map-service-icon" style="background:#E8F5E9">🌍</div>
        <span>Google Maps</span>
      </a>
      <a class="map-service-link" href="https://2gis.ru/search/${addr}" target="_blank" rel="noopener">
        <div class="map-service-icon" style="background:#E3F2FD">📡</div>
        <span>2ГИС</span>
      </a>
    </div>
  </div>`;
}

function infraContentHTML(p) {
  const d = p.infraDetails || {
    center: `${p.direction === 'sea' ? 'Побережье' : 'Центр города'} · 10–15 мин`,
    shops: "SPAR, Пятёрочка · в шаговой доступности",
    schools: "Городская школа · 400 м (в пешей доступности)",
    kindergartens: "Детский сад · 300 м",
    clinics: "Поликлиника · в районе",
    sport: "Спортзал, фитнес · в районе",
    parks: "Городской парк · в районе",
    restaurants: "Кафе, рестораны · в районе"
  };
  const busDesc = p.transportText ? p.transportText.split(/[,;]/)[0].trim() : 'Автобус · в~200 м';

  return `<div class="infra-grid">
    <div class="infra-item"><div class="infra-icon" style="background:#E0F7FA">${p.direction === 'sea' ? '🏖' : '🏙'}</div><div><div class="infra-name">${p.direction === 'sea' ? 'Море' : 'Центр'}</div><div class="infra-desc">${formatDistance(p.distance)}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#FFF3DC">🏪</div><div><div class="infra-name">Магазины</div><div class="infra-desc">${d.shops}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#E8F5E9">🏫</div><div><div class="infra-name">Школы</div><div class="infra-desc">${d.schools}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#E3F2FD">👶</div><div><div class="infra-name">Детские сады</div><div class="infra-desc">${d.kindergartens}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#FCE4EC">🏥</div><div><div class="infra-name">Поликлиника</div><div class="infra-desc">${d.clinics}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#FFF8E1">🚌</div><div><div class="infra-name">Остановка</div><div class="infra-desc">${busDesc}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#F3E8FF">💪</div><div><div class="infra-name">Спорт</div><div class="infra-desc">${d.sport}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#E0F2F1">🌳</div><div><div class="infra-name">Парк</div><div class="infra-desc">${d.parks}</div></div></div>
    <div class="infra-item"><div class="infra-icon" style="background:#FBE9E7">🍽</div><div><div class="infra-name">Рестораны</div><div class="infra-desc">${d.restaurants}</div></div></div>
  </div>`;
}

function charsContentHTML(chars) {
  const items = [
    ['Класс', chars.class], ['Тип дома', chars.type], ['Этажность', chars.floors],
    ['Корпуса', chars.corpus], ['Квартир', chars.apartments], ['Потолки', chars.ceiling],
    ['Площади', chars.apArea], ['Кухня', chars.kitArea], ['Отделка', chars.finishing],
    ['Тип отделки', chars.finishType], ['Стены', chars.walls], ['Отопление', chars.heating],
    ['Срок эксплуатации', chars.lifespan || '50 лет'],
  ];
  return `<div class="chars-grid">${items.map(([l,v]) =>
    `<div class="char-item"><div class="char-label">${l}</div><div class="char-value">${v}</div></div>`
  ).join('')}</div>`;
}

function docsContentHTML(p) {
  return `<div class="doc-list">
    <div class="doc-item doc-present"><span class="doc-status-badge status-present" style="color:#10B981;background:#E6F4EA;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">✓</span><div><div class="doc-name">Проектная декларация</div><div class="doc-meta">PDF · 2.4 МБ</div></div></div>
    <div class="doc-item doc-present"><span class="doc-status-badge status-present" style="color:#10B981;background:#E6F4EA;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">✓</span><div><div class="doc-name">Разрешение на строительство</div><div class="doc-meta">PDF · 1.1 МБ</div></div></div>
    <div class="doc-item doc-present"><span class="doc-status-badge status-present" style="color:#10B981;background:#E6F4EA;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">✓</span><div><div class="doc-name">Заключение экспертизы</div><div class="doc-meta">PDF · 3.8 МБ</div></div></div>
    <div class="doc-item doc-present"><span class="doc-status-badge status-present" style="color:#10B981;background:#E6F4EA;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">✓</span><div><div class="doc-name">Выписка ЕГРН</div><div class="doc-meta">PDF · 0.5 МБ</div></div></div>
  </div>`;
}

// ── Warranty ─────────────────────────────────────────────────
function warrantyContentHTML(p) {
  const w = (p && p.warranty) ? p.warranty : {};
  function warRow(icon, label, value, fallback) {
    const val = value || fallback || 'По закону № 214-ФЗ';
    const isMissing = !value;
    return `<div class="doc-item ${isMissing ? '' : 'doc-present'}" style="${isMissing ? 'opacity:0.6' : ''}">
      <span style="color:${isMissing ? '#9CA3AF' : '#10B981'};background:${isMissing ? '#F3F4F6' : '#E6F4EA'};border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:${isMissing ? '11px' : '10px'};font-weight:bold;margin-right:8px;flex-shrink:0;">${isMissing ? '—' : '✓'}</span>
      <div>
        <div class="doc-name">${icon} ${label}</div>
        <div class="doc-meta">${val}</div>
      </div>
    </div>`;
  }
  return `<div class="doc-list">
    ${warRow('🏗️', 'Гарантия на конструктив',           w.structural,   '5 лет с момента передачи')}
    ${warRow('⚙️', 'Гарантия на инженерное оборудование', w.engineering,  '3 года с момента передачи')}
    ${warRow('🖌️', 'Гарантия на отделку',                w.finishing,    'Уточняется у застройщика')}
    ${warRow('📅', 'Начало исчисления',                  w.startDate,    'С момента подписания акта приёма-передачи')}
    ${warRow('📞', 'Контакт по гарантии',                w.contact,      'Уточняется у застройщика')}
    ${warRow('📑', 'Документ / памятка',                 w.docLink,      'Уточняется у застройщика')}
  </div>`;
}

// ── Native Contextual Ad Units ──────────────────────────────
var CONTEXT_ADS = {
  prices: {
    id: 'ad_escrow_sber',
    badge: 'Банк-партнёр',
    badgeColor: '#10B981',
    icon: '💳',
    partnerName: 'ПАО «Банк Дом.РФ»',
    partnerInn: '7707083893',
    erid: '2VtzqxSberEscrowKLD',
    title: 'Ипотечные программы от 6%',
    text: 'Рассчитайте ежемесячный платёж и получите персональные условия в аккредитованных банках (Сбер, ВТБ, Дом.РФ).',
    btnText: 'Рассчитать платёж',
    cta: 'Рассчитать платёж',
    ctaUrl: 'https://www.sberbank.ru/ru/person/credits/home?erid=2VtzqxSberEscrowKLD',
    legal: 'Реклама. ПАО «Банк Дом.РФ». Ген. лиц. ЦБ РФ № 2312',
    action: "showAvailability('Ипотека и цены')"
  },
  mortgage: {
    id: 'ad_mortgage_domclick',
    badge: 'Ипотечный брокер',
    badgeColor: '#2563EB',
    icon: '🏦',
    partnerName: 'Ипотечный центр Amber',
    partnerInn: '7736249247',
    erid: '2VtzqxDomclickKLD',
    title: 'Одобрение ипотеки за 2 мин',
    text: 'Семейная, IT и субсидированная ипотека от застройщика. Подача одной заявки во все банки региона.',
    btnText: 'Подать заявку',
    cta: 'Подать заявку',
    ctaUrl: 'https://domclick.ru/ipoteka?erid=2VtzqxDomclickKLD',
    legal: 'Реклама. ООО «Амбер Ипотека Сервис», ОГРН 1233900001234',
    action: "showAvailability('Заявка на ипотеку')"
  },
  location: {
    id: 'ad_transfer_baltic',
    badge: 'Трансфер & Такси',
    badgeColor: '#F59E0B',
    icon: '🚕',
    partnerName: 'Сервис «Балтик Драйв»',
    partnerInn: '3906112233',
    erid: '2VtzqxBalticTransfer',
    title: 'Трансфер на просмотр ЖК',
    text: 'Комфортная поездка на объект / трансфер из аэропорта Храброво для покупателей новостроек.',
    btnText: 'Заказать трансфер',
    cta: 'Заказать трансфер',
    ctaUrl: 'partners-promo.html?ref=transfer',
    legal: 'Реклама. ООО «Балтик Авто Трансфер», ОГРН 1223900005678',
    action: "showAvailability('Трансфер на просмотр')"
  },
  warranty: {
    id: 'ad_insurance_vsk',
    badge: 'Страхование',
    badgeColor: '#8B5CF6',
    icon: '🛡️',
    partnerName: 'САО «ВСК»',
    partnerInn: '7710030411',
    erid: '2VtzqxVskProperty',
    title: 'Защита сделки и конструктива',
    text: 'Комплексное страхование титула, ремонта и отделки со скидкой до 20% от аккредитованных страховых.',
    btnText: 'Оформить полис',
    cta: 'Оформить полис',
    ctaUrl: 'https://sogaz.ru/property?erid=2VtzqxSogazProperty',
    legal: 'Реклама. САО «ВСК». Лицензии ЦБ РФ СИ № 0621, СЛ № 0621',
    action: "showAvailability('Страхование')"
  },
  docs: {
    id: 'ad_legal_audit_ddu',
    badge: 'Юридический аудит',
    badgeColor: '#EC4899',
    icon: '⚖️',
    partnerName: 'ЮК «Право Недвижимости»',
    partnerInn: '3906334455',
    erid: '2VtzqxPravo39Audit',
    title: 'Проверка ДДУ и рисков',
    text: 'Независимая юридическая проверка договора долевого участия, чистоты эскроу и истории застройщика.',
    btnText: 'Проверить ДДУ',
    cta: 'Проверить ДДУ',
    ctaUrl: 'partners-promo.html?ref=legal_audit',
    legal: 'Реклама. ООО «Право Недвижимости Эксперт», ОГРН 1213900008910',
    action: "showAvailability('Юридическая проверка')"
  }
};

// ── Wrap inline panels with ad banners ───────────────────────
function wrapWithBannerHTML(contentHtml, sectionKey, p) {
  var ad = null;
  if (typeof SmartAdEngine !== 'undefined' && SmartAdEngine.resolveAd) {
    try {
      ad = SmartAdEngine.resolveAd(sectionKey, p);
    } catch(e) {
      ad = null;
    }
  }

  if (!ad) {
    ad = CONTEXT_ADS[sectionKey];
  }

  if (!ad) return contentHtml;

  var complexName = (p && p.name) ? String(p.name).replace(/'/g, "\'") : 'ЖК';
  var customAction = ad.action
    ? ad.action.replace("')", ` — ${complexName}')`)
    : `showAvailability('${ad.title} — ${complexName}')`;

  var btnText = ad.btnText || ad.cta || 'Подробнее';
  var legalText = ad.legal || `Реклама · ${ad.partnerName || 'Партнёр'} · ИНН: ${ad.partnerInn || '3900000000'} · erid: ${ad.erid || '2Vtzqx'}`;

  return `
    <div class="inline-section-layout">
      <div class="inline-main-content">
        ${contentHtml}
      </div>
      <aside class="inline-side-banner" data-ad-id="${ad.id || ''}" data-section="${sectionKey}" data-erid="${ad.erid || ''}">
        <div class="banner-info">
          <h4 class="banner-title">${ad.title}</h4>
          <p class="banner-text">${ad.text}</p>
        </div>
        <div class="banner-actions" style="margin-top:auto;">
          <button class="banner-btn" onclick="${customAction}">${btnText}</button>
          <div class="banner-legal-disclosure" style="margin-top:6px;font-size:8.5px;color:var(--color-muted);line-height:1.25;text-align:center;" title="${ad.partnerName || ''} · ИНН: ${ad.partnerInn || ''} · erid: ${ad.erid || ''}">
            ${legalText}
          </div>
        </div>
      </aside>
    </div>
  `;
}

// ── Build All Inline Sections ────────────────────────────────
function buildAllInlineSections(p) {
  const pricesContent = `
    <div class="price-panel">
      <div class="price-range">${p.priceRange}</div>
      <div class="price-sqm">${p.pricePerSqm}</div>
            <table class="price-table">${priceTableHTML(p.prices)}</table>
      <div class="lead-magnet-card">
        <div class="lead-magnet-text">
          <div class="lead-magnet-title">📥 Скачать закрытую шахматку квартир</div>
          <div class="lead-magnet-desc">Актуальные планировки, скидки до 5% и расчет ипотеки в PDF</div>
        </div>
        <button class="lead-magnet-btn" onclick="openLeadMagnet(${p.id})">Скачать PDF</button>
      </div>
    </div>
  `;

  return `
    <div class="inline-section" data-section="prices">
      ${wrapWithBannerHTML(pricesContent, 'prices', p)}
    </div>
    <div class="inline-section" data-section="mortgage">
      ${wrapWithBannerHTML(mortgageContentHTML(), 'mortgage', p)}
    </div>
    <div class="inline-section" data-section="location">
      ${wrapWithBannerHTML(locationContentHTML(p), 'location', p)}
    </div>
    <div class="inline-section" data-section="infra">${infraContentHTML(p)}</div>
    <div class="inline-section" data-section="chars">${charsContentHTML(p.chars)}</div>
    <div class="inline-section" data-section="warranty">
      ${wrapWithBannerHTML(warrantyContentHTML(p), 'warranty', p)}
    </div>
    <div class="inline-section" data-section="docs">
      ${wrapWithBannerHTML(docsContentHTML(p), 'docs', p)}
    </div>
    <div class="inline-section" data-section="dev">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Застройщик</div>
      <div class="dev-info-static-block" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--color-bg);border-radius:8px;transition:all 0.2s;">
        <div style="width:40px;height:40px;background:var(--color-primary);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px">${(p.developer || 'З')[0]}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--color-primary);display:flex;align-items:center;justify-content:space-between;gap:4px;">
            <span>${p.developer || 'Застройщик'}</span>
          </div>
          <div style="font-size:10px;color:var(--color-text-secondary);margin-top:2px;">${p.devDescription || 'Зарекомендовавший себя застройщик на рынке недвижимости Калининградской области.'}</div>
          <div style="font-size:9px;color:var(--color-muted);margin-top:4px;">Юридическая информация: ${p.innOgrn || 'Уточняется в ЕИСЖС'}</div>
        </div>
      </div>
    </div>
    <div class="inline-section" data-section="pros">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><div style="font-size:12px;font-weight:600;color:#10B981;margin-bottom:6px">✓ Плюсы</div>
          <ul style="font-size:11px;color:var(--color-text-secondary);line-height:1.7;list-style:disc;padding-left:16px"><li>Близость к морю</li><li>Развитая инфраструктура</li><li>Качественная отделка</li></ul></div>
        <div><div style="font-size:12px;font-weight:600;color:#EF4444;margin-bottom:6px">✗ Минусы</div>
          <ul style="font-size:11px;color:var(--color-text-secondary);line-height:1.7;list-style:disc;padding-left:16px"><li>Сезонная нагрузка</li><li>Транспорт ограничен</li></ul></div>
      </div>
    </div>
    <div class="inline-section" data-section="whom">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Кому подходит</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        <span class="tag tag-family" style="padding:6px 12px;font-size:11px">👨‍👩‍👧 Семьи с детьми</span>
        <span class="tag tag-mortgage" style="padding:6px 12px;font-size:11px">💼 Инвесторы</span>
        <span class="tag tag-comfort" style="padding:6px 12px;font-size:11px">🏖 Для отдыха</span>
        <span class="tag tag-author" style="padding:6px 12px;font-size:11px">👴 Пенсионеры</span>
      </div>
    </div>`;
}

// ── Promo Card ───────────────────────────────────────────────
function buildPromoCard(p, cardIndex) {
  if (cardIndex === 1) {
    return `<div class="card-promo" style="background: linear-gradient(135deg, #15305B 0%, #1e4682 100%);">
      <div class="promo-badge" style="background: rgba(245, 166, 35, 0.2); border-color: rgba(245, 166, 35, 0.4); color: var(--color-accent);">★ Индекс Amber</div>
      <div class="promo-discount" style="color: var(--color-accent); font-size: 24px; font-weight: 900; margin: 4px 0 8px 0;">Индекс ${p.rating}</div>
      <div class="promo-title" style="font-size: 14px; margin-bottom: 6px;">Независимая оценка ЖК</div>
      <div class="promo-text" style="font-size: 11px; opacity: 0.85; margin-bottom: 12px;">Индекс рассчитывается автоматически на основе 10 параметров: от документов до качества материалов.</div>
      <a class="promo-btn" href="methodology.html" style="text-align: center; text-decoration: none; display: block; width: 100%; box-sizing: border-box;">Методология →</a>
    </div>`;
  }
  if (cardIndex === 3) {
    return `<div class="card-promo" style="background: linear-gradient(135deg, #15305B 0%, #1e4682 100%);">
      <div class="promo-badge" style="background: rgba(245, 166, 35, 0.2); border-color: rgba(245, 166, 35, 0.4); color: var(--color-accent);">★ Свободный слот</div>
      <div class="promo-discount" style="color: var(--color-accent); font-size: 24px; font-weight: 900; margin: 4px 0 8px 0;">8 500 ₽ / мес</div>
      <div class="promo-title" style="font-size: 14px; margin-bottom: 6px;">Промо-баннер ЖК</div>
      <div class="promo-text" style="font-size: 11px; opacity: 0.85; margin-bottom: 12px;">Разместите спецпредложение вашего проекта. Цена до запуска — 8 500 руб/мес с сохранением цены на 3 месяца.</div>
      <a class="promo-btn" href="partners-promo.html" style="text-align: center; text-decoration: none; display: block; width: 100%; box-sizing: border-box;">Подробнее →</a>
    </div>`;
  }
  const discount = (p.specialOffer && p.specialOffer.discount) || '−15%';
  const text = (p.specialOffer && p.specialOffer.text) || 'Действует до конца месяца при бронировании через Amber Avenue. Ограниченное количество.';
  return `<div class="card-promo">
    <div class="promo-badge">★ Спецпредложение</div>
    <div class="promo-discount">${discount}</div>
    <div class="promo-title">Скидка на квартиры в ${p.name}</div>
    <div class="promo-text">${text}</div>
    <button class="promo-btn" onclick="showAvailability('${p.name.replace(/'/g,"\'")}')">Подробнее →</button>
  </div>`;
}

// ── Build Property Card (NO satellite panels) ────────────────
function buildPropertyCard(p, cardIndex) {
  const id = `card-${p.id}`;
  const classTag = `<span class="tag tag-class">${p.class}</span>`;
  const otherTags = p.tags
    .filter(t => t !== p.class)
    .map(t => `<span class="tag ${TAG_CLASS[t] || 'tag-comfort'}">${t}</span>`)
    .join('');

  return `
  <div class="property-card-wrapper" data-card-id="${p.id}">
    <div class="card-row">
      <div class="property-card" id="${id}-center">
        <div class="card-main">
          <!-- Square Image -->
          <!-- Square Image / Mobile Swipe Slider -->
          <div class="card-image-col" data-card-id="${id}">
            <div class="card-photo-slider" onscroll="handleCardPhotoScroll(this)">
              ${((p.thumbs && p.thumbs.length > 0) ? p.thumbs : [p.imgSrc]).map((src, idx) => `
                <div class="card-photo-slide" onclick="handleCardSlideClick(event, '${id}')">
                  <img src="${src}" alt="${p.name} - фото ${idx + 1}" loading="${cardIndex < 2 && idx === 0 ? 'eager' : 'lazy'}">
                </div>
              `).join('')}
            </div>
            ${p.partner ? `<div class="card-badge-partner">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0L6.12 3.38H9.51L6.88 5.47L7.94 8.82L5 6.64L2.06 8.82L3.12 5.47L0.49 3.38H3.88L5 0Z"/></svg>
              Официальный партнёр
            </div>` : ''}
            ${((p.thumbs && p.thumbs.length > 1) ? `
              <div class="card-photo-dots">
                ${p.thumbs.map((_, idx) => `<span class="photo-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
              </div>
            ` : '')}
            <div class="card-photo-count" onclick="event.stopPropagation();openGallery('${id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span class="photo-count-text">+${p.photos || (p.thumbs ? p.thumbs.length : 1)} фото</span>
            </div>
          </div>

          <!-- Content -->
          <div class="card-content-col">
            <div class="card-top-row">
              <div class="card-title-group">
                <h2 class="card-title">${p.name}</h2>
                <button class="card-save" onclick="toggleSave(this)" aria-label="Сохранить">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
              <div class="card-rating">
                <div class="amber-index-label">Индекс Amber <i title="Рейтинг">ⓘ</i></div>
                <div class="rating-score"><span class="rating-star">★</span><span class="rating-num">${p.rating}</span><span class="rating-max">/ 5</span></div>
                <div class="rating-reviews">на основе отзывов<br>и проверки Amber</div>
              </div>
            </div>
            <div class="card-location">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${p.location}</span><span class="loc-dot">·</span><span>${formatDistance(p.distance)}</span>
            </div>
            <a class="card-map-link" href="#">Смотреть на карте</a>
            <div class="card-meta-row">
              <div class="card-price-block"><span class="price-secondary">${p.pricePerSqm}</span><span class="price-main">от ${p.priceFrom}</span></div>
              <div class="card-delivery-block"><span class="card-delivery-label">сдача</span><span class="card-delivery-value">${p.delivery}</span></div>
              <div class="card-meta-tags">${classTag}${otherTags}</div>
            </div>
            <p class="card-description">${p.description}</p>
          </div>
        </div>

        <!-- Nav Icons -->
        <nav class="card-nav" aria-label="Разделы ЖК">${inlineNavHTML()}</nav>

        <!-- Inline Expandable Panel -->
        <div class="card-inline-panel" id="${id}-inline">
          <div class="card-inline-panel-content">${buildAllInlineSections(p)}</div>
        </div>

        <!-- CTA Buttons -->
        <div class="card-actions">
          <button class="btn btn-primary" onclick="showAvailability('${p.name.replace(/'/g,"\\'")}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Узнать наличие
          </button>
          <button class="btn btn-outline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 11.37a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Позвонить</button>
          <button class="btn btn-outline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Сайт ↗</button>
          <button class="btn btn-outline btn-expert"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Задать вопрос эксперту</button>
        </div>
      </div>
      ${p.partner ? buildPromoCard(p, cardIndex) : ''}
    </div>
  </div>`;
}

// ── Build Banner ─────────────────────────────────────────────
function buildBanner(b) {
  return `<div class="property-card-wrapper">
    <div class="banner-card">
      <div class="banner-icon">${b.icon}</div>
      <div class="banner-body">
        <div class="banner-headline">${b.headline}</div>
        <p class="banner-sub">${b.sub}</p>
        <button class="banner-cta" onclick="${b.ctaLink ? `window.location='${b.ctaLink}'` : `showToast('Заявка отправлена! Свяжемся за 5 минут.')`}">${b.cta}</button>
      </div>
      <div class="banner-stats">
        ${b.stats.map(s => `<div class="banner-stat"><span class="num">${s.num}</span><span class="label">${s.label}</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── Gallery Popup ────────────────────────────────────────────
let galleryState = { open: false, cardId: null, index: 0, images: [], name: '' };

function openGallery(cardId) {
  const p = PROPERTIES.find(x => 'card-' + x.id === cardId);
  if (!p) return;
  galleryState = { open: true, cardId, index: 0, images: [p.imgSrc, ...p.thumbs.slice(1)], name: p.name };
  renderGalleryPopup();
}

function closeGallery() {
  galleryState.open = false;
  const ov = document.getElementById('gallery-popup-overlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
}

function galleryNav(dir) {
  const gs = galleryState;
  gs.index = (gs.index + dir + gs.images.length) % gs.images.length;
  renderGalleryPopup();
}

function galleryGoTo(idx) {
  galleryState.index = idx;
  renderGalleryPopup();
}

function renderGalleryPopup() {
  let ov = document.getElementById('gallery-popup-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'gallery-popup-overlay';
    ov.className = 'gallery-popup-overlay';
    ov.onclick = function(e) { if (e.target === ov) closeGallery(); };
    document.body.appendChild(ov);
  }
  const gs = galleryState;
  ov.innerHTML = `
    <div class="gallery-popup">
      <button class="gallery-popup-close" onclick="closeGallery()">✕</button>
      <div class="gallery-popup-title">${gs.name}</div>
      <div class="gallery-popup-main"><img src="${gs.images[gs.index]}" alt="Фото"></div>
      <button class="gallery-popup-arrow prev" onclick="galleryNav(-1)">‹</button>
      <button class="gallery-popup-arrow next" onclick="galleryNav(1)">›</button>
      <div class="gallery-popup-counter">${gs.index + 1} / ${gs.images.length}</div>
      <div class="gallery-popup-thumbs">
        ${gs.images.map((img, i) =>
          `<div class="gallery-popup-thumb${i === gs.index ? ' active' : ''}" onclick="galleryGoTo(${i})"><img src="${img}" alt=""></div>`
        ).join('')}
      </div>
    </div>`;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', function(e) {
  if (!galleryState.open) return;
  if (e.key === 'Escape') closeGallery();
  if (e.key === 'ArrowRight') galleryNav(1);
  if (e.key === 'ArrowLeft') galleryNav(-1);
});



// ── Nav Click → Inline Panel Toggle ──────────────────────────
function bindNavItems() {
  document.querySelectorAll('.card-nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const key = this.dataset.key;
      const card = this.closest('.property-card');
      const panel = card.querySelector('.card-inline-panel');
      const nav = card.querySelector('.card-nav');
      const wasActive = this.classList.contains('active');

      // Deactivate all
      nav.querySelectorAll('.card-nav-item').forEach(n => n.classList.remove('active'));
      panel.querySelectorAll('.inline-section').forEach(s => s.classList.remove('active'));

      if (wasActive) {
        panel.classList.remove('open');
      } else {
        this.classList.add('active');
        const section = panel.querySelector('[data-section="' + key + '"]');
        if (section) {
          section.classList.add('active');
          panel.classList.add('open');
        }
      }
    });
  });
}

// ── State & Filtering ──────────────────────────────────────────
let currentFilter = 'all';
let currentDeveloper = '';

function renderFeed() {
  const feed = document.getElementById('listing-feed');
  if (!feed) return;

  // Dynamically update regional elements if page is page-zhk
  if (typeof updateWelcomeSection === 'function') {
    updateWelcomeSection(currentFilter);
  }

  // Filter properties
  let filtered = PROPERTIES.filter(p => {
    // Developer filter
    if (currentDeveloper && p.developer !== currentDeveloper) return false;

    // Chip filter
    if (currentFilter === 'all') return true;
    if (currentFilter === 'partner') return p.partner;
    if (currentFilter === 'budget') return parseFloat(p.priceFrom.replace(/[^\d.]/g, '')) <= 5.0;
    if (currentFilter === 'sea') return p.direction === 'sea';
    if (currentFilter === 'city') return p.direction === 'city';
    if (currentFilter === 'prigorod') return p.direction === 'prigorod';
    if (currentFilter === 'oblast') return p.direction === 'oblast';
    if (currentFilter === '2025') return p.delivery.includes('2025');

    // District filters
    if (currentFilter === 'district-len') return p.district === 'Ленинградский';
    if (currentFilter === 'district-cen') return p.district === 'Центральный';
    if (currentFilter === 'district-mos') return p.district === 'Московский';

    // Tags & Class match
    if (currentFilter === 'comfort') return p.class === 'комфорт-класс';
    if (currentFilter === 'business') return p.class === 'бизнес-класс';
    if (currentFilter === 'premium') return p.class === 'премиум';
    if (currentFilter === 'family') return p.tags.includes('семейная ипотека');
    if (currentFilter === 'it') return p.tags.includes('IT-ипотека');

    return true;
  });

  let html = '';
  if (filtered.length === 0) {
    html = `<div style="padding: 40px; text-align: center; color: var(--color-muted); font-size: 14px; width: 100%;">
      Нет объектов, соответствующих выбранным фильтрами.
    </div>`;
  } else {
    filtered.forEach((p, i) => {
      if (i > 0 && i % BANNER_EVERY === 0) {
        html += buildBanner(BANNERS[Math.floor((i / BANNER_EVERY - 1) % BANNERS.length)]);
      }
      html += buildPropertyCard(p, i);
    });
  }

  feed.innerHTML = html;

  const countEl = document.querySelector('.feed-count');
  if (countEl) countEl.textContent = filtered.length + ' объектов';

  // Update total count on "All" chip
  const allCount = document.querySelector('.filter-chip[data-filter="all"] .chip-count');
  if (allCount) allCount.textContent = PROPERTIES.length;

  bindNavItems();
}

// ── Helpers ──────────────────────────────────────────────────
function toggleSave(btn) {
  btn.classList.toggle('saved');
  showToast(btn.classList.contains('saved') ? 'Добавлено в избранное' : 'Удалено из избранного');
}

function showAvailability(name) {
  // Remove existing modal if any
  let existing = document.getElementById('availability-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'availability-modal';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-header-text">
          <h3 class="modal-title">Узнать наличие квартир</h3>
          <p class="modal-subtitle">${name} — оставьте заявку, и мы свяжемся с вами</p>
        </div>
        <button class="modal-close" onclick="closeModal()" aria-label="Закрыть">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label" for="modal-name">Ваше имя</label>
          <input class="modal-input" type="text" id="modal-name" placeholder="Александр" autocomplete="given-name">
        </div>
        <div class="modal-row">
          <div class="modal-field">
            <label class="modal-label" for="modal-phone">Телефон</label>
            <input class="modal-input" type="tel" id="modal-phone" placeholder="+7 (___) ___-__-__" autocomplete="tel">
          </div>
          <div class="modal-field">
            <label class="modal-label" for="modal-email">Email</label>
            <input class="modal-input" type="email" id="modal-email" placeholder="mail@example.com" autocomplete="email">
          </div>
        </div>
        <div class="modal-field">
          <label class="modal-label" for="modal-city">Откуда вы?</label>
          <select class="modal-select" id="modal-city">
            <option value="" disabled selected>Выберите город или регион</option>
            <optgroup label="Калининградская область">
              <option>Калининград</option>
              <option>Зеленоградск</option>
              <option>Светлогорск</option>
              <option>Балтийск</option>
              <option>Гурьевск</option>
              <option>Черняховск</option>
            </optgroup>
            <optgroup label="Города-миллионники">
              <option>Москва</option>
              <option>Санкт-Петербург</option>
              <option>Новосибирск</option>
              <option>Екатеринбург</option>
              <option>Казань</option>
              <option>Нижний Новгород</option>
              <option>Челябинск</option>
              <option>Самара</option>
              <option>Омск</option>
              <option>Ростов-на-Дону</option>
              <option>Уфа</option>
              <option>Красноярск</option>
              <option>Воронеж</option>
              <option>Пермь</option>
              <option>Волгоград</option>
              <option>Краснодар</option>
            </optgroup>
            <optgroup label="Крупные города России">
              <option>Тюмень</option>
              <option>Саратов</option>
              <option>Тольятти</option>
              <option>Ижевск</option>
              <option>Барнаул</option>
              <option>Иркутск</option>
              <option>Хабаровск</option>
              <option>Ярославль</option>
              <option>Владивосток</option>
              <option>Махачкала</option>
              <option>Томск</option>
              <option>Оренбург</option>
              <option>Кемерово</option>
              <option>Новокузнецк</option>
              <option>Рязань</option>
              <option>Астрахань</option>
              <option>Набережные Челны</option>
              <option>Пенза</option>
              <option>Липецк</option>
              <option>Киров</option>
              <option>Тула</option>
              <option>Чебоксары</option>
              <option>Калуга</option>
              <option>Курск</option>
              <option>Ставрополь</option>
              <option>Сочи</option>
              <option>Белгород</option>
              <option>Брянск</option>
              <option>Иваново</option>
              <option>Владимир</option>
              <option>Архангельск</option>
              <option>Симферополь</option>
              <option>Мурманск</option>
              <option>Смоленск</option>
              <option>Тверь</option>
              <option>Псков</option>
              <option>Великий Новгород</option>
              <option>Вологда</option>
              <option>Петрозаводск</option>
              <option>Сыктывкар</option>
            </optgroup>
            <optgroup label="За рубежом">
              <option>Европа</option>
              <option>Страны СНГ</option>
              <option>Азия</option>
              <option>Африка</option>
            </optgroup>
          </select>
        </div>
        <button class="modal-submit" onclick="submitAvailability('${name.replace(/'/g, "\\'")}')">Отправить заявку</button>
        <p class="modal-consent">Нажимая кнопку, вы соглашаетесь с <a href="#">политикой конфиденциальности</a> и <a href="#">условиями обработки данных</a></p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('open'));

  // Close on overlay click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  const escHandler = function(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // Focus first field
  setTimeout(() => {
    const nameInput = document.getElementById('modal-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

function closeModal() {
  const overlay = document.getElementById('availability-modal');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => overlay.remove(), 200);
}

function submitAvailability(name) {
  const nameVal = document.getElementById('modal-name').value.trim();
  const phone = document.getElementById('modal-phone').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const city = document.getElementById('modal-city') ? document.getElementById('modal-city').value : '';

  if (!nameVal) { document.getElementById('modal-name').focus(); return; }
  if (!phone) { document.getElementById('modal-phone').focus(); return; }

  const leadData = {
    source: 'Карточка ЖК: ' + (name || 'Запрос на сайте'),
    name: nameVal,
    phone: phone,
    email: email || '',
    details: 'Узнать наличие квартир в ' + (name || 'ЖК') + (city ? ' (Город клиента: ' + city + ')' : '')
  };

  if (typeof window.saveAmberLead === 'function') {
    window.saveAmberLead(leadData);
  } else if (typeof window.submitLeadToGoogleSheets === 'function') {
    window.submitLeadToGoogleSheets(leadData);
  }

  closeModal();
  showToast('Заявка на «' + name + '» отправлена! Свяжемся с вами в ближайшее время.');
}
function showToast(msg) {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

const REGIONAL_CUSTOMIZATIONS = {
  'city': {
    bgImage: 'kld_city_welcome.png',
    slogan: 'Новостройки в историческом центре Калининграда',
    subtitle: 'Amber Avenue — ваш независимый навигатор по жилым комплексам в Ленинградском, Центральном и Московском районах',
    heroHTML: `
      <div class="banner-image-side">
        <img src="kld_city_banner.png" alt="ЖК «Рыбная деревня»" class="banner-img-full">
      </div>
      <div class="banner-text-side">
        <div class="bn-label">Премиальный партнёр</div>
        <h2 class="bn-title-large">ЖК «Рыбная деревня»</h2>
        <p class="bn-tagline">Калининград · Премиальный квартал у реки Преголя</p>
        <ul class="bn-features">
          <li>Видовые квартиры на набережную реки Преголя</li>
          <li>Собственный променад и благоустроенная территория</li>
          <li>Автономное отопление, сдача — IV кв. 2025 г.</li>
        </ul>
        <a href="developers.html" class="bn-cta-btn">Подробнее</a>
      </div>
      <div class="bn-marketing-label">Реклама. ООО «СЗ „Рыбная Деревня“», ИНН 3906987654, erid: 2VtzqxKldCity</div>
    `
  },
  'sea': {
    bgImage: 'baltic_sea_welcome.png',
    slogan: 'ЖК у Балтийского моря',
    subtitle: 'Amber Avenue — лучшие новостройки на первой линии и в шаговой доступности от побережья Балтики',
    heroHTML: `
      <div class="banner-image-side">
        <img src="baltic_sea_banner.png" alt="Резиденция Royal Shore" class="banner-img-full">
      </div>
      <div class="banner-text-side">
        <div class="bn-label">Премиальный партнёр</div>
        <h2 class="bn-title-large">Резиденция Royal Shore</h2>
        <p class="bn-tagline">Светлогорск · Элитные резиденции на первой линии</p>
        <ul class="bn-features">
          <li>Панорамные террасы с видом на море</li>
          <li>Собственный спуск к пляжу</li>
          <li>Сдача объекта — 2026 г.</li>
        </ul>
        <a href="developers.html" class="bn-cta-btn">Подробнее</a>
      </div>
      <div class="bn-marketing-label">Реклама. ООО «СЗ „Королевский Берег“», ИНН 3906123456, erid: 2Vtzqx4XyZa</div>
    `
  },
  'prigorod': {
    bgImage: 'suburban_green_welcome.png',
    slogan: 'Зелёный пригород Калининграда',
    subtitle: 'Amber Avenue — новостройки в тихих пригородах с природой, экологией и современной инфраструктурой',
    heroHTML: `
      <div class="banner-image-side">
        <img src="suburban_green_banner.png" alt="Квартал «Ласкино Парк»" class="banner-img-full">
      </div>
      <div class="banner-text-side">
        <div class="bn-label">Премиальный партнёр</div>
        <h2 class="bn-title-large">Квартал «Ласкино Парк»</h2>
        <p class="bn-tagline">Пригород · Современный малоэтажный квартал в зеленой зоне</p>
        <ul class="bn-features">
          <li>Собственный парк, теннисные корты и бассейн</li>
          <li>Таунхаусы и малоэтажные дома с автономным отоплением</li>
          <li>Готовая семейная инфраструктура, сдача — 2025-2026 гг.</li>
        </ul>
        <a href="developers.html" class="bn-cta-btn">Подробнее</a>
      </div>
      <div class="bn-marketing-label">Реклама. ООО «СЗ „Ласкино Парк“», ИНН 3915012345, erid: 2VtzqxSuburban</div>
    `
  },
  'oblast': {
    bgImage: 'region_oblast_welcome.png',
    slogan: 'Новостройки в городах Калининградской области',
    subtitle: 'Amber Avenue — жилые комплексы в Светлогорске, Зеленоградске, Балтийске, Гурьевске и других городах Янтарного края',
    heroHTML: `
      <div class="banner-image-side">
        <img src="region_oblast_banner.png" alt="ЖК «Балтийская гавань»" class="banner-img-full">
      </div>
      <div class="banner-text-side">
        <div class="bn-label">Премиальный партнёр</div>
        <h2 class="bn-title-large">ЖК «Балтийская гавань»</h2>
        <p class="bn-tagline">Балтийск · Квартиры с видом на судоходный канал и гавань</p>
        <ul class="bn-features">
          <li>Уникальное расположение на берегу залива</li>
          <li>Видовые террасы, яхтенный причал в пешей доступности</li>
          <li>Автономное отопление, рассрочка от застройщика, сдача — 2026 г.</li>
        </ul>
        <a href="developers.html" class="bn-cta-btn">Подробнее</a>
      </div>
      <div class="bn-marketing-label">Реклама. ООО «СЗ „Балтийская Гавань“», ИНН 3901012345, erid: 2VtzqxOblast</div>
    `
  }
};

let defaultWelcomeState = null;
let defaultHeroHTML = null;

function updateWelcomeSection(filter) {
  // If we are not on the main zhk page (e.g. static sub-pages zhk-umory.html),
  // they are statically configured, so we shouldn't dynamically overwrite their specific layout.
  if (document.body && document.body.id && document.body.id !== 'page-zhk') {
    return;
  }

  const welcomeSection = document.querySelector('#page-zhk .welcome-section') || document.querySelector('.welcome-section');
  const sloganEl = document.querySelector('#page-zhk .welcome-slogan') || document.querySelector('.welcome-slogan');
  const subtitleEl = document.querySelector('#page-zhk .welcome-subtitle') || document.querySelector('.welcome-subtitle');
  const heroBanner = document.querySelector('#page-zhk .hero-banner') || document.querySelector('.hero-banner');

  if (!welcomeSection) return;

  // Capture default states on first run
  if (!defaultWelcomeState) {
    let bg = welcomeSection.style.backgroundImage || window.getComputedStyle(welcomeSection).backgroundImage;
    defaultWelcomeState = {
      bg: bg,
      slogan: sloganEl ? sloganEl.textContent : '',
      subtitle: subtitleEl ? subtitleEl.textContent : ''
    };
  }
  if (!defaultHeroHTML && heroBanner) {
    defaultHeroHTML = heroBanner.innerHTML;
  }

  const cust = REGIONAL_CUSTOMIZATIONS[filter];
  if (cust) {
    welcomeSection.style.backgroundImage = `url("${cust.bgImage}")`;
    if (sloganEl) sloganEl.textContent = cust.slogan;
    if (subtitleEl) subtitleEl.textContent = cust.subtitle;
    if (heroBanner) heroBanner.innerHTML = cust.heroHTML;
  } else {
    // Restore defaults
    if (defaultWelcomeState) {
      welcomeSection.style.backgroundImage = defaultWelcomeState.bg;
      if (sloganEl) sloganEl.textContent = defaultWelcomeState.slogan;
      if (subtitleEl) subtitleEl.textContent = defaultWelcomeState.subtitle;
    }
    if (heroBanner && defaultHeroHTML) {
      heroBanner.innerHTML = defaultHeroHTML;
    }
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  renderFeed();

  // Filter Chips — real filtering
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter || 'all';
      renderFeed();
    });
  });

  // Developer Dropdown
  const devSelect = document.getElementById('filter-developer');
  if (devSelect) {
    devSelect.addEventListener('change', function() {
      currentDeveloper = this.value;
      renderFeed();
    });
  }

  // Burger / Drawer toggle
  const burger = document.getElementById('burger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const drawerClose = document.getElementById('drawer-close');

  function toggleDrawer() {
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
    burger.classList.toggle('open');
    burger.setAttribute('aria-expanded', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  }

  if (burger) burger.addEventListener('click', toggleDrawer);
  if (drawerClose) drawerClose.addEventListener('click', toggleDrawer);
  if (overlay) overlay.addEventListener('click', toggleDrawer);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
      toggleDrawer();
    }
  });
});
