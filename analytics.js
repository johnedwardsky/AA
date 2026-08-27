/**
 * Amber Avenue — Analytics Tracking & Seed Data Engine
 * Tracks impressions, clicks, and user interactions with pre-aggregations
 * Supplies realistic CRM seed data and competitor benchmarks for Kaliningrad region
 */
'use strict';

const ANALYTICS_KEY = 'amber_analytics';

/**
 * Utility helper to mask phone number format: +7 (9**) ***-**-67
 */
function maskPhoneNumber(phone) {
  if (!phone) return '+7 (9**) ***-**-67';
  const clean = String(phone).replace(/[^\d+]/g, '');
  // If ends with 2 digits, preserve last 2 digits
  const lastTwo = clean.slice(-2);
  return `+7 (9**) ***-**-${lastTwo || '67'}`;
}

/**
 * Initial Realistic Seed Leads for Iteration 2 (5 Paid + 5 Unpaid Masked)
 */
const SEED_LEADS = [
  // 5 Paid Card Leads (Full details visible to developer)
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

/**
 * Competitor Benchmarks Dataset across Kaliningrad Districts & Rival Developers
 */
const COMPETITOR_BENCHMARKS = {
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
};

function getSeedLeads() {
  return JSON.parse(JSON.stringify(SEED_LEADS));
}

function getCompetitorBenchmarks() {
  return JSON.parse(JSON.stringify(COMPETITOR_BENCHMARKS));
}

function seedAnalyticsDemoData(force = false) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existingLeads = localStorage.getItem('amber_leads');
    if (!existingLeads || force) {
      localStorage.setItem('amber_leads', JSON.stringify(SEED_LEADS));
    }
  } catch(e) {}
}

function getAnalytics() {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]'); }
  catch { return []; }
}

function getDeveloperAnalytics(devId) {
  if (!devId) return [];
  try { return JSON.parse(localStorage.getItem('amber_analytics_developer_' + devId) || '[]'); }
  catch { return []; }
}

function getPropertyAnalytics(zhkId) {
  if (!zhkId) return [];
  try { return JSON.parse(localStorage.getItem('amber_analytics_property_' + zhkId) || '[]'); }
  catch { return []; }
}

function clearAnalytics() {
  try {
    localStorage.removeItem(ANALYTICS_KEY);
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('amber_analytics_developer_') || k.startsWith('amber_analytics_property_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

function findDeveloperForProperty(propId) {
  try {
    const props = (typeof window !== 'undefined' && (window.PROPERTIES || (window.AMBER_DATA && window.AMBER_DATA.properties))) || [];
    const p = props.find(x => String(x.id) === String(propId) || x.name === propId);
    if (p) return p.developerId || p.developer_id || null;
  } catch {}
  return null;
}

function trackEvent(event, targetId, targetType, extraData = {}) {
  let eventRecord = {};

  if (typeof event === 'object' && event !== null) {
    eventRecord = Object.assign({
      timestamp: Date.now(),
      page: typeof location !== 'undefined' ? (location.pathname.split('/').pop() || 'index.html') : 'index.html',
      date: new Date().toISOString().slice(0, 10)
    }, event);
  } else {
    eventRecord = Object.assign({
      event: event,
      target_id: targetId || null,
      target_type: targetType || null,
      entityType: targetType || null,
      entityId: targetId || null,
      timestamp: Date.now(),
      page: typeof location !== 'undefined' ? (location.pathname.split('/').pop() || 'index.html') : 'index.html',
      date: new Date().toISOString().slice(0, 10)
    }, typeof extraData === 'object' && extraData !== null ? extraData : {});
  }

  // 1. Stream to global amber_analytics
  const globalData = getAnalytics();
  globalData.push(eventRecord);
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(globalData)); } catch {}

  // 2. Resolve propertyId and developerId
  let propId = eventRecord.propertyId || eventRecord.zhkId || null;
  if (!propId && (eventRecord.entityType === 'property' || eventRecord.target_type === 'property' || eventRecord.target_type === 'card')) {
    propId = eventRecord.entityId || eventRecord.target_id;
  }

  let devId = eventRecord.developerId || eventRecord.devId || null;
  if (!devId && propId) {
    devId = findDeveloperForProperty(propId);
  }

  // 3. Pre-aggregate into amber_analytics_property_${propId}
  if (propId && typeof localStorage !== 'undefined') {
    try {
      const propKey = 'amber_analytics_property_' + propId;
      const propList = JSON.parse(localStorage.getItem(propKey) || '[]');
      propList.push(eventRecord);
      localStorage.setItem(propKey, JSON.stringify(propList));
    } catch {}
  }

  // 4. Pre-aggregate into amber_analytics_developer_${devId}
  if (devId && typeof localStorage !== 'undefined') {
    try {
      const devKey = 'amber_analytics_developer_' + devId;
      const devList = JSON.parse(localStorage.getItem(devKey) || '[]');
      devList.push(eventRecord);
      localStorage.setItem(devKey, JSON.stringify(devList));
    } catch {}
  }

  return eventRecord;
}

function initAnalytics() {
  // Auto-seed leads if empty
  seedAnalyticsDemoData(false);

  // Page view
  if (typeof document !== 'undefined') {
    trackEvent('page_view', document.title, 'page');
  }

  // Impression tracking via IntersectionObserver
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window && typeof document !== 'undefined') {
    const impObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const trackType = el.dataset.track;
          const trackId = el.dataset.trackId;
          const devId = el.dataset.developerId || null;
          if (trackType && trackId) {
            trackEvent(trackType, trackId, el.classList.contains('ad-banner') ? 'banner' : 'card', { developerId: devId });
          }
          impObs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('[data-track]').forEach(el => impObs.observe(el));
  }

  if (typeof document === 'undefined') return;

  // Click tracking: banners
  document.querySelectorAll('.ad-banner, .banner-card, .banner-ad').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('banner_click', el.dataset.trackId || el.dataset.bannerId || 'unknown', 'banner');
    });
  });

  // Click tracking: cards
  document.querySelectorAll('.property-card, .developer-card, .expert-card, .bento-card').forEach(el => {
    el.addEventListener('click', () => {
      const cardId = el.dataset.trackId || el.dataset.id || el.querySelector('h2,h3')?.textContent || 'unknown';
      const devId = el.dataset.developerId || null;
      trackEvent('card_click', cardId, 'card', { developerId: devId });
    });
  });

  // Click tracking: phone & website links
  document.querySelectorAll('[data-action="phone"], a[href^="tel:"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('phone_click', el.dataset.trackId || el.textContent.trim(), 'contact');
    });
  });

  document.querySelectorAll('[data-action="website"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('website_click', el.dataset.trackId || el.href, 'contact');
    });
  });

  // Click tracking: CTA buttons
  document.querySelectorAll('.btn-primary, .btn-secondary, .bento-cta, .btn-order-call, .btn-ask-question, .bn-cta-btn').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('cta_click', el.textContent.trim().slice(0,50), 'button');
    });
  });

  // Click tracking: filter chips
  document.querySelectorAll('.filter-chip, .mag-chip').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('filter_use', el.textContent.trim(), 'filter');
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
}

// Export for window & Node.js
if (typeof window !== 'undefined') {
  window.AmberAnalytics = {
    trackEvent,
    getAnalytics,
    getDeveloperAnalytics,
    getPropertyAnalytics,
    clearAnalytics,
    initAnalytics,
    maskPhoneNumber,
    SEED_LEADS,
    COMPETITOR_BENCHMARKS,
    getSeedLeads,
    getCompetitorBenchmarks,
    seedAnalyticsDemoData
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    trackEvent,
    getAnalytics,
    getDeveloperAnalytics,
    getPropertyAnalytics,
    clearAnalytics,
    initAnalytics,
    maskPhoneNumber,
    SEED_LEADS,
    COMPETITOR_BENCHMARKS,
    getSeedLeads,
    getCompetitorBenchmarks,
    seedAnalyticsDemoData
  };
}
