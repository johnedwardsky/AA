/**
 * Amber Avenue — Analytics Tracking
 * Tracks impressions, clicks, and user interactions
 */
'use strict';

const ANALYTICS_KEY = 'amber_analytics';

function getAnalytics() {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]'); }
  catch { return []; }
}

function clearAnalytics() {
  localStorage.removeItem(ANALYTICS_KEY);
}

function trackEvent(event, targetId, targetType) {
  const data = getAnalytics();
  data.push({
    event,
    target_id: targetId || null,
    target_type: targetType || null,
    timestamp: Date.now(),
    page: location.pathname.split('/').pop() || 'index.html',
    date: new Date().toISOString().slice(0,10)
  });
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data)); } catch {}
}

function initAnalytics() {
  // Page view
  trackEvent('page_view', document.title, 'page');

  // Impression tracking via IntersectionObserver
  if ('IntersectionObserver' in window) {
    const impObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const trackType = el.dataset.track;
          const trackId = el.dataset.trackId;
          if (trackType && trackId) {
            trackEvent(trackType, trackId, el.classList.contains('ad-banner') ? 'banner' : 'card');
          }
          impObs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('[data-track]').forEach(el => impObs.observe(el));
  }

  // Click tracking: banners
  document.querySelectorAll('.ad-banner').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('banner_click', el.dataset.trackId || 'unknown', 'banner');
    });
  });

  // Click tracking: cards
  document.querySelectorAll('.property-card, .developer-card, .expert-card, .bento-card').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('card_click', el.dataset.trackId || el.querySelector('h2,h3')?.textContent || 'unknown', 'card');
    });
  });

  // Click tracking: phone & website links
  document.querySelectorAll('[data-action="phone"]').forEach(el => {
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
  document.querySelectorAll('.btn-primary, .btn-secondary, .bento-cta').forEach(el => {
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

document.addEventListener('DOMContentLoaded', initAnalytics);

// Export for admin
window.AmberAnalytics = { trackEvent, getAnalytics, clearAnalytics };
