'use strict';

const crypto = require('node:crypto');

/**
 * Generates an authentic SHA-256 hash matching the admin.html / cabinet.html audit log algorithm:
 * str = entry.id + entry.timestamp + String(entry.developerId) + String(entry.zhkId) + JSON.stringify(entry.changes)
 * hashFull = SHA-256 hex string
 * hashShort = first 8 chars of hashFull
 */
function createAuditLogEntry({
  id = 'audit-' + Math.random().toString(36).substring(2, 9),
  timestamp = new Date().toISOString(),
  developerId = 1,
  developerName = 'ГК «Калининградский строительный концерн»',
  zhkId = 'zhk-1',
  zhkName = 'ЖК «Нордберг»',
  action = 'edit',
  employeeId = 'emp-42',
  employeeName = 'Алексей Смирнов',
  changes = { 'Цены': { old: 'от 4 млн ₽', new: 'от 4.2 млн ₽' } }
} = {}) {
  const str = id + timestamp + String(developerId) + String(zhkId) + JSON.stringify(changes);
  const hashFull = crypto.createHash('sha256').update(Buffer.from(str, 'utf8')).digest('hex');
  const hashShort = hashFull.substring(0, 8);

  return {
    id,
    timestamp,
    developerId,
    developerName,
    zhkId,
    zhkName,
    action,
    employeeId,
    employeeName,
    changes,
    hashFull,
    hashShort
  };
}

/**
 * Creates a tampered audit log entry where hashFull or changes do not match.
 */
function createCorruptedAuditLogEntry(options = {}) {
  const entry = createAuditLogEntry(options);
  // Corrupt the changes after hash computation
  entry.changes = { ...entry.changes, 'status': { old: 'draft', new: 'tampered' } };
  return entry;
}

/**
 * Creates a mock developer placement configuration record
 */
function createMockPlacementRecord(developerId = 1, developerName = 'ГК «Калининградский строительный концерн»', overrides = {}) {
  return {
    developerId,
    developerName,
    updatedAt: new Date().toISOString(),
    type1_main_banner: {
      active: true,
      pages: ['kaliningrad'],
      bookedMonths: ['2026-09'],
      monthlyPrice: 90000,
      totalCost: 90000
    },
    type2_side_banner: {
      active: true,
      selectedZhkIds: [1],
      feedPositions: [2, 4],
      bookedMonths: ['2026-09'],
      monthlyPrice: 8500,
      totalCost: 17000
    },
    type3_horizontal_feed: {
      active: true,
      slots: [5, 10],
      bookedMonths: ['2026-09'],
      totalCost: 60000
    },
    type4_recommended: {
      active: true,
      selectedZhkIds: [1, 2],
      bookedDays: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'],
      dailyPrice: 3500,
      totalCost: 49000
    },
    type5_native_ads: {
      active: true,
      tier1Tabs: ['prices', 'location'],
      tier2Tabs: ['infra'],
      bookedMonths: ['2026-09'],
      totalCost: 165000
    },
    type6_paid_cards: {
      active: true,
      selectedZhkIds: [1, 2, 3, 4, 5],
      bookedMonths: ['2026-09'],
      cardPrice: 15000,
      totalCost: 75000
    },
    type7_menu_slider: {
      active: false,
      bookedDays: [],
      dailyPrice: 1500,
      totalCost: 0
    },
    type8_premium: {
      active: false,
      monthsCount: 0,
      selectedZhkIds: [],
      mainBannerPage: null,
      totalCost: 0
    },
    summary: {
      totalMonthly: 456000,
      totalSpend: 456000,
      activePlacementsCount: 6
    },
    ...overrides
  };
}

/**
 * Creates a mock lead for amber_leads
 */
function createMockLead({
  id = 'L-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  date = new Date().toLocaleString('ru-RU'),
  timestamp = new Date().toISOString(),
  time = 'Сегодня, 11:30',
  source = 'Карточка ЖК: ЖК «Нордберг»',
  name = 'Иван Петров',
  phone = '+7 (911) 450-12-34',
  phoneMasked = '+7 (9**) ***-**-34',
  email = 'ivan.petrov@example.com',
  city = 'Калининград',
  details = 'Узнать наличие квартир в ЖК «Нордберг»',
  zhkId = 1,
  zhk = 'ЖК «Нордберг»',
  zhkName = 'ЖК «Нордберг»',
  dev = 'ГК «Калининградский строительный концерн»',
  developerId = 1,
  developerName = 'ГК «Калининградский строительный концерн»',
  apt = '2-комнатная квартира, 56 м²',
  type = 'booking',
  ownedBy = 'developer', // 'developer' | 'admin'
  isPaidCard = true,
  isUnlocked = true,
  isPaidLead = true,
  estimatedDealValue = 75000,
  status = 'new'
} = {}) {
  return {
    id,
    date,
    timestamp,
    time,
    source,
    name,
    phone,
    phoneMasked,
    email,
    city,
    details,
    zhkId,
    zhk: zhk || zhkName,
    zhkName: zhkName || zhk,
    dev: dev || developerName,
    developerId: ownedBy === 'developer' ? developerId : null,
    developerName: ownedBy === 'developer' ? (developerName || dev) : '',
    apt,
    type,
    ownedBy,
    isPaidCard,
    isUnlocked,
    isPaidLead,
    estimatedDealValue,
    status
  };
}

/**
 * Creates a mock analytics event
 */
function createMockAnalyticsEvent({
  id = 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  event = 'tab_open', // 'view' | 'tab_open' | 'cta_click' | 'dwell' | 'lead_submit' | 'banner_click'
  entityType = 'property', // 'property' | 'developer' | 'banner' | 'page'
  entityId = 1,
  developerId = 1,
  tabKey = 'location',
  ctaType = 'availability',
  dwellSeconds = 35,
  geoCity = 'Калининград',
  device = 'desktop',
  hour = 14,
  trafficSource = 'direct',
  timestamp = Date.now(),
  date = new Date().toISOString().slice(0, 10)
} = {}) {
  return {
    id,
    event,
    entityType,
    entityId,
    developerId,
    tabKey,
    ctaType,
    dwellSeconds,
    geoCity,
    device,
    hour,
    trafficSource,
    timestamp,
    date
  };
}

// 54 Developers list for complete data fidelity
const DEVELOPERS_54 = Array.from({ length: 54 }, (_, i) => {
  const id = i + 1;
  const names = [
    'ГК «Калининградский строительный концерн»',
    'Amber Development Group',
    'ГК «Расцвет»',
    'ООО «Балтик Инвест»',
    'ГК «Модуль-Стройград»',
    'СК «МПК» МПК-Инвест',
    'ГК «Мегаполис»',
    'ООО «КПД-Калининград»',
    'ГК «Холмрок»',
    'ГК «Русская Европа»',
    'ООО «Спецстрой»',
    'ГК «АвангардИнвестПроект»',
    'ООО «Балтийская строительная компания»',
    'ООО «Запад-Строй»',
    'ООО «Калининграднефтестрой»'
  ];
  const name = i < names.length ? names[i] : `Застройщик №${id} («Девелопмент-${id}»)`;
  return {
    id,
    name,
    fullName: `ООО «${name}»`,
    letter: name.charAt(0).toUpperCase(),
    verified: id % 3 !== 0,
    rating: Number((4.0 + (id % 10) * 0.1).toFixed(2)),
    reviews: 10 + id * 3,
    experience: `${5 + (id % 20)} лет`,
    completed: 2 + (id % 15),
    active: 1 + (id % 5),
    city: id % 4 === 0 ? 'г. Светлогорск' : (id % 5 === 0 ? 'г. Зеленоградск' : 'г. Калининград'),
    phone: `+7 (4012) ${100 + id}-${200 + id}`,
    email: `dev${id}@amberavenue.ru`,
    website: `https://dev${id}.amberavenue.ru`,
    projects: [`ЖК «Проект ${id}-A»`, `ЖК «Проект ${id}-B»`]
  };
});

/**
 * Standard test fixtures for residential complexes, developers, blog articles, leads, and moderation.
 */
const FIXTURES = {
  properties: [
    {
      id: 1,
      name: 'ЖК «Нордберг»',
      partner: false,
      recommended: true,
      developer: 'ГК «Калининградский строительный концерн»',
      developerId: 1,
      location: 'Центр',
      distance: '🚗 15–20 мин · 🚌 15–20 мин',
      address: 'г. Калининград, ул. Александра Невского, д. 255',
      rating: 4.33,
      reviews: 10,
      priceFrom: '4 млн ₽',
      pricePerSqm: '110–154 тыс. ₽/м²',
      priceRange: 'от 4 до 10 млн ₽',
      delivery: 'Полностью введен в эксплуатацию (2019–2020)',
      deliveryShort: 'сдан (2016–2020)',
      class: 'комфорт-класс',
      tags: ['комфорт-класс', 'семейная ипотека', 'автономное отопление'],
      description: 'Современный жилой комплекс в локации City.',
      photos: 5,
      imgSrc: 'AA/13. СК «МПК»  МПК-Инвест/ЖК «Нордберг»/ЖК «Нордберг» - Amber Avenue - 1.jpg',
      thumbs: ['AA/13. СК «МПК»  МПК-Инвест/ЖК «Нордберг»/ЖК «Нордберг» - Amber Avenue - 1.jpg'],
      prices: [
        { type: '1-комнатные', from: 'от 4 млн ₽', area: '34–45 м²' },
        { type: '2-комнатные', from: 'от 6 млн ₽', area: '52–68 м²' }
      ],
      chars: { class: 'комфорт', type: 'Монолит', floors: '5–6 этажей', corpus: '1-4', apartments: '170' }
    },
    {
      id: 2,
      name: 'ЖК «Рыбная Деревня»',
      partner: true,
      recommended: true,
      developer: 'Amber Development Group',
      developerId: 2,
      location: 'Остров Октябрьский',
      distance: '🚗 5 мин · 🚌 10 мин',
      address: 'г. Калининград, ул. Октябрьская, 12',
      rating: 4.9,
      reviews: 42,
      priceFrom: '8.5 млн ₽',
      pricePerSqm: '190–260 тыс. ₽/м²',
      priceRange: 'от 8.5 до 25 млн ₽',
      delivery: 'Сдан в 2024',
      deliveryShort: 'сдан (2024)',
      class: 'премиум-класс',
      tags: ['премиум-класс', 'видовые квартиры', 'паркинг'],
      description: 'Элитный жилой комплекс на берегу реки Преголя.',
      photos: 8,
      imgSrc: 'AA/Amber/fish-village.jpg',
      thumbs: ['AA/Amber/fish-village.jpg'],
      prices: [
        { type: '2-комнатные', from: 'от 8.5 млн ₽', area: '65–85 м²' },
        { type: '3-комнатные', from: 'от 14 млн ₽', area: '95–130 м²' }
      ],
      chars: { class: 'премиум', type: 'Монолит-кирпич', floors: '8 этажей', corpus: '2', apartments: '84' }
    },
    {
      id: 3,
      name: 'ЖК «Расцвет на Набережной»',
      partner: true,
      recommended: false,
      developer: 'ГК «Расцвет»',
      developerId: 3,
      location: 'Центр',
      distance: '🚗 10 мин · 🚌 15 мин',
      address: 'г. Калининград, наб. Маршала Баграмяна, 14',
      rating: 4.8,
      reviews: 29,
      priceFrom: '7.2 млн ₽',
      pricePerSqm: '170–210 тыс. ₽/м²',
      priceRange: 'от 7.2 до 18 млн ₽',
      delivery: 'Сдача в 4 кв. 2026',
      deliveryShort: 'строится (2026)',
      class: 'бизнес-класс',
      tags: ['бизнес-класс', 'подземный паркинг', 'видовые квартиры'],
      description: 'Современный комплекс бизнес-класса на берегу реки.',
      photos: 6,
      imgSrc: 'AA/rascvet/naberezhnaya.jpg',
      thumbs: ['AA/rascvet/naberezhnaya.jpg'],
      prices: [
        { type: '1-комнатные', from: 'от 7.2 млн ₽', area: '44–55 м²' },
        { type: '2-комнатные', from: 'от 11.5 млн ₽', area: '68–88 м²' }
      ],
      chars: { class: 'бизнес', type: 'Монолит', floors: '10–12 этажей', corpus: '3', apartments: '190' }
    },
    {
      id: 4,
      name: 'ЖК «Балтийская Панорама»',
      partner: false,
      recommended: false,
      developer: 'ГК «Калининградский строительный концерн»',
      developerId: 1,
      location: 'Светлогорск',
      distance: '🚗 30 мин · 🚌 40 мин',
      address: 'г. Светлогорск, ул. Ленина, 5',
      rating: 4.7,
      reviews: 18,
      priceFrom: '6.8 млн ₽',
      pricePerSqm: '160–200 тыс. ₽/м²',
      priceRange: 'от 6.8 до 16 млн ₽',
      delivery: 'Сдан в 2025',
      deliveryShort: 'сдан (2025)',
      class: 'комфорт-класс',
      tags: ['у моря', 'курортная недвижимость'],
      description: 'Жилой комплекс у Балтийского побережья.',
      photos: 4,
      imgSrc: 'AA/ksk/panorama.jpg',
      thumbs: ['AA/ksk/panorama.jpg'],
      prices: [
        { type: '1-комнатные', from: 'от 6.8 млн ₽', area: '38–48 м²' }
      ],
      chars: { class: 'комфорт', type: 'Кирпич', floors: '6 этажей', corpus: '2', apartments: '90' }
    },
    {
      id: 5,
      name: 'ЖК «Зеленоградский Парк»',
      partner: true,
      recommended: true,
      developer: 'ГК «Калининградский строительный концерн»',
      developerId: 1,
      location: 'Зеленоградск',
      distance: '🚗 25 мин · 🚌 35 мин',
      address: 'г. Зеленоградск, ул. Тургенева, 18',
      rating: 4.85,
      reviews: 31,
      priceFrom: '7.9 млн ₽',
      pricePerSqm: '180–230 тыс. ₽/м²',
      priceRange: 'от 7.9 до 20 млн ₽',
      delivery: 'Сдан в 2025',
      deliveryShort: 'сдан (2025)',
      class: 'комфорт-класс',
      tags: ['у моря', 'парк рядом', 'автономное отопление'],
      description: 'Жилой комплекс в 5 минутах от променада Зеленоградска.',
      photos: 7,
      imgSrc: 'AA/ksk/zelenogradsk.jpg',
      thumbs: ['AA/ksk/zelenogradsk.jpg'],
      prices: [
        { type: '1-комнатные', from: 'от 7.9 млн ₽', area: '42–50 м²' },
        { type: '2-комнатные', from: 'от 12.0 млн ₽', area: '65–80 м²' }
      ],
      chars: { class: 'комфорт', type: 'Монолит', floors: '7 этажей', corpus: '3', apartments: '120' }
    }
  ],

  developers: DEVELOPERS_54,

  blog: [
    {
      id: 1,
      title: 'Тренды недвижимости Калининграда 2026',
      tag: 'Аналитика',
      tagBg: '#EFF6FF',
      tagColor: '#1E40AF',
      excerpt: 'Обзор динамики цен на первичном рынке Калининградской области...',
      imgSrc: 'blog/trends-2026.jpg',
      date: '15.08.2026',
      viewsCount: '1 420',
      author: 'Елена Калинина'
    }
  ],

  experts: [
    {
      id: 1,
      name: 'Елена Калинина',
      role: 'Ведущий аналитик рынка недвижимости',
      rating: 4.9,
      reviews: 35,
      avatar: 'experts/elena.jpg'
    }
  ],

  banners: [
    {
      id: 1,
      title: 'Летняя ипотека 5% от Amber Avenue',
      tag: 'Акция',
      link: 'https://amberavenue.ru/promo',
      imgSrc: 'banners/summer-promo.jpg',
      active: true,
      stats: { impressions: 14200, clicks: 840, ctr: '5.9%' }
    }
  ],

  heroSlides: [
    {
      id: 0,
      title: 'Премиальные новостройки Балтики',
      subtitle: 'Подбор квартир от проверенных девелоперов',
      tag: 'Топ-проекты',
      btnText: 'Смотреть каталог',
      btnLink: '#properties',
      bgImg: 'hero/baltic-hero.jpg',
      views: 35400,
      clicks: 2890
    }
  ],

  competitorBenchmarks: {
    districts: [
      { id: 'leningradsky', name: 'Ленинградский район', totalObjects: 64, avgPriceSqm: 135000, avgCtr: 3.4, totalImpressions: 148000 },
      { id: 'centralny', name: 'Центральный район', totalObjects: 52, avgPriceSqm: 168000, avgCtr: 4.1, totalImpressions: 122000 },
      { id: 'moskovsky', name: 'Московский район', totalObjects: 58, avgPriceSqm: 112000, avgCtr: 2.9, totalImpressions: 98000 },
      { id: 'umory', name: 'Побережье (Светлогорск / Зеленоградск)', totalObjects: 45, avgPriceSqm: 215000, avgCtr: 5.2, totalImpressions: 184000 },
      { id: 'prigorod', name: 'Пригород и Гурьевск', totalObjects: 40, avgPriceSqm: 98000, avgCtr: 3.1, totalImpressions: 76000 }
    ],
    competitorCompanies: [
      { id: 'dev-1', name: 'ГК «КалининградСтройИнвест» (КСИ)', activeZhks: 10, totalViews: 42300, avgCtr: 4.6, paidSharePercent: 28, adTools: ['Главный баннер', 'ТОП-3 карточки'] },
      { id: 'dev-3', name: 'ГК «Расцвет» (Ваша компания)', activeZhks: 9, totalViews: 38900, avgCtr: 4.2, paidSharePercent: 22, adTools: ['Баннеры в ленте', 'Платные карточки'] },
      { id: 'dev-2', name: 'СК «МореСтрой»', activeZhks: 5, totalViews: 21400, avgCtr: 3.8, paidSharePercent: 15, adTools: ['Боковой баннер'] },
      { id: 'dev-4', name: 'ГК «КСК»', activeZhks: 7, totalViews: 28600, avgCtr: 3.5, paidSharePercent: 18, adTools: ['Нативная реклама'] },
      { id: 'dev-5', name: 'ООО «Балтик Строй»', activeZhks: 4, totalViews: 14200, avgCtr: 2.8, paidSharePercent: 8, adTools: ['Базовое размещение'] }
    ],
    catalogPositions: [
      { zhkName: 'ЖК «Расцвет на Гагарина»', district: 'Ленинградский район', rank: 2, totalInDistrict: 14, impressions: 16400, clicks: 754, ctr: 4.6, topCompetitor: 'ЖК «Невский» (КСИ)' },
      { zhkName: 'ЖК «Подсолнухи»', district: 'Ленинградский район', rank: 4, totalInDistrict: 14, impressions: 11200, clicks: 436, ctr: 3.9, topCompetitor: 'ЖК «История» (КСИ)' },
      { zhkName: 'ЖК «Морской берег»', district: 'Побережье', rank: 3, totalInDistrict: 12, impressions: 19800, clicks: 1089, ctr: 5.5, topCompetitor: 'ЖК «Karlshof»' },
      { zhkName: 'ЖК «Гусевский»', district: 'Пригород и Гурьевск', rank: 1, totalInDistrict: 8, impressions: 8900, clicks: 373, ctr: 4.2, topCompetitor: 'ЖК «Новый Восток»' }
    ]
  },

  tariffs: {
    basic: { planId: 'basic', planName: 'Базовый', price: 69000, modules: ['analytics-basic'] },
    pro: { planId: 'pro', planName: 'Про', price: 150000, modules: ['analytics-basic', 'analytics-traffic', 'analytics-reports', 'crm-export'] },
    premium: { planId: 'premium', planName: 'Премиум', price: 210000, modules: ['analytics-basic', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads', 'support-priority', 'crm-export'] }
  },

  unlockRequests: [
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
      comment: 'Запрос на моментальную разблокировку карточки по входящему лиду'
    }
  ],

  inviteTokens: {
    'inv_test_token_1': {
      token: 'inv_test_token_1',
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
    }
  },

  amberLeads: [
    // 5 Paid Card Leads (Full Contacts)
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
    }
  ],

  seedLeads: [
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
  ],

  moderationQueue: [
    {
      zhkId: 'zhk-1',
      zhkName: 'ЖК «Нордберг»',
      developerId: 1,
      developerName: 'ГК «Калининградский строительный концерн»',
      status: 'on_review',
      submittedAt: '2026-08-19T09:00:00.000Z',
      reviewedAt: null,
      adminComments: {
        main: null,
        chars: null,
        infra: null,
        prices: null,
        yard: null,
        engineering: null,
        comfort: null,
        security: null,
        management: null
      }
    },
    {
      zhkId: 'zhk-2',
      zhkName: 'ЖК «Рыбная Деревня»',
      developerId: 2,
      developerName: 'Amber Development Group',
      status: 'needs_correction',
      submittedAt: '2026-08-18T14:30:00.000Z',
      reviewedAt: '2026-08-18T16:00:00.000Z',
      adminComments: {
        main: 'Уточните этажность 2 корпуса',
        chars: null,
        infra: null,
        prices: 'Проверьте цену 3-комнатных',
        yard: null,
        engineering: null,
        comfort: null,
        security: null,
        management: null
      }
    }
  ]
};

module.exports = {
  createAuditLogEntry,
  createCorruptedAuditLogEntry,
  createMockPlacementRecord,
  createMockLead,
  createMockAnalyticsEvent,
  FIXTURES
};
