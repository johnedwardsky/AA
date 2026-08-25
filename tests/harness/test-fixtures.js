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
  source = 'Карточка ЖК: ЖК «Нордберг»',
  name = 'Иван Петров',
  phone = '+7 (911) 450-12-34',
  email = 'ivan.petrov@example.com',
  city = 'Калининград',
  details = 'Узнать наличие квартир в ЖК «Нордберг»',
  zhkId = 1,
  zhkName = 'ЖК «Нордберг»',
  developerId = 1,
  developerName = 'ГК «Калининградский строительный концерн»',
  ownedBy = 'developer', // 'developer' | 'admin'
  isPaidLead = true,
  status = 'new'
} = {}) {
  return {
    id,
    date,
    source,
    name,
    phone,
    email,
    city,
    details,
    zhkId,
    zhkName,
    developerId: ownedBy === 'developer' ? developerId : null,
    developerName: ownedBy === 'developer' ? developerName : '',
    ownedBy,
    isPaidLead,
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

  amberLeads: [
    {
      id: 'lead-101',
      date: '2026-08-19 11:30',
      name: 'Иван Петров',
      phone: '+7 (911) 450-12-34',
      email: 'ivan.petrov@example.com',
      source: 'sub',
      sourceLabel: 'Email подписка',
      devName: 'ГК «Калининградский строительный концерн»',
      developerId: 1,
      ownedBy: 'developer',
      isPaidLead: true,
      status: 'Новый'
    },
    {
      id: 'lead-102',
      date: '2026-08-19 10:15',
      name: 'Мария Васильева',
      phone: '+7 (906) 211-98-76',
      email: 'm.vasilyeva@example.com',
      source: 'availability',
      sourceLabel: 'Узнать наличие',
      devName: 'Amber Development Group',
      developerId: 2,
      ownedBy: 'developer',
      isPaidLead: true,
      status: 'В работе'
    },
    {
      id: 'lead-103',
      date: '2026-08-19 09:45',
      name: 'Сергей Николаев',
      phone: '+7 (921) 333-44-55',
      email: 'sergey.nikolaev@example.com',
      source: 'card',
      sourceLabel: 'Карточка ЖК',
      devName: '',
      developerId: null,
      ownedBy: 'admin',
      isPaidLead: false,
      status: 'Новый'
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
