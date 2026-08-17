/* ============================================================
   AMBER AVENUE — Yandex Maps Interactive Regional Map Modal
   API Key: a2dacfa0-5027-4d77-8085-92e462c8017a
   Full-screen adaptive overlay modal that floats on top of all windows
   ============================================================ */

(function(window, document) {
  'use strict';

  var yandexMap = null;
  var yandexClusterer = null;
  var currentView = 'list';
  var currentProperties = [];
  var mapReady = false;

  // ── Switch Catalog View (list / map modal) ────────────────
  function switchCatalogView(targetView) {
    var listBtn = document.getElementById('view-toggle-list');
    var mapBtn = document.getElementById('view-toggle-map');
    var mapWrapper = document.getElementById('zhk-map-container-wrapper');

    currentView = targetView;
    window.currentCatalogView = currentView;

    if (targetView === 'map') {
      if (mapWrapper) {
        mapWrapper.style.display = 'flex';
        // Trigger animation
        requestAnimationFrame(function() {
          mapWrapper.classList.add('active');
        });
      }
      document.body.style.overflow = 'hidden';

      if (mapBtn) { mapBtn.classList.add('active'); mapBtn.setAttribute('aria-pressed', 'true'); }
      if (listBtn) { listBtn.classList.remove('active'); listBtn.setAttribute('aria-pressed', 'false'); }

      if (!yandexMap) {
        setTimeout(function() { initYandexMap(); }, 80);
      } else {
        setTimeout(function() {
          yandexMap.container.fitToViewport();
          updateMapMarkers(getProperties());
        }, 80);
      }

    } else {
      if (mapWrapper) {
        mapWrapper.classList.remove('active');
        setTimeout(function() {
          if (currentView === 'list') {
            mapWrapper.style.display = 'none';
          }
        }, 250);
      }
      document.body.style.overflow = '';

      if (listBtn) { listBtn.classList.add('active'); listBtn.setAttribute('aria-pressed', 'true'); }
      if (mapBtn) { mapBtn.classList.remove('active'); mapBtn.setAttribute('aria-pressed', 'false'); }
    }
  }

  function getProperties() {
    if (currentProperties && currentProperties.length > 0) return currentProperties;
    if (typeof PROPERTIES !== 'undefined' && PROPERTIES) return PROPERTIES;
    if (window.PROPERTIES) return window.PROPERTIES;
    if (window.AMBER_DATA && window.AMBER_DATA.properties) return window.AMBER_DATA.properties;
    return [];
  }

  // ── Initialize Yandex Map ────────────────────────────────
  function initYandexMap(containerId) {
    containerId = containerId || 'zhk-interactive-map';
    var container = document.getElementById(containerId);
    if (!container) return;
    if (yandexMap) { yandexMap.container.fitToViewport(); return yandexMap; }

    if (typeof ymaps === 'undefined') {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:14px;text-align:center;padding:40px;">Загрузка Яндекс Карт... Проверьте подключение к интернету.</div>';
      return null;
    }

    ymaps.ready(function() {
      try {
        yandexMap = new ymaps.Map(containerId, {
          center: [54.7104, 20.4522],
          zoom: 10,
          controls: ['zoomControl', 'geolocationControl', 'fullscreenControl', 'typeSelector']
        }, {
          searchControlProvider: 'yandex#search',
          suppressMapOpenBlock: true
        });

        yandexClusterer = new ymaps.Clusterer({
          preset: 'islands#invertedDarkBlueClusterIcons',
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false
        });

        yandexMap.geoObjects.add(yandexClusterer);
        mapReady = true;

        updateMapMarkers(getProperties());

        // Ensure canvas adapts to viewport dimensions
        setTimeout(function() { if (yandexMap) yandexMap.container.fitToViewport(); }, 100);
        setTimeout(function() { if (yandexMap) yandexMap.container.fitToViewport(); }, 400);

      } catch (err) {
        console.error('Yandex Map init error:', err);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#EF4444;font-size:14px;text-align:center;padding:40px;">Ошибка инициализации карты: ' + err.message + '</div>';
      }
    });

    return null;
  }

  // ── Update Markers ───────────────────────────────────────
  function updateMapMarkers(props) {
    currentProperties = props || [];

    var countEl = document.getElementById('zhk-map-count');
    var partnerCountEl = document.getElementById('zhk-map-partner-count');
    var partners = currentProperties.filter(function(p) { return !!p.partner; });
    if (countEl) countEl.textContent = currentProperties.length;
    if (partnerCountEl) partnerCountEl.textContent = partners.length;

    if (!yandexMap || !yandexClusterer || !mapReady) return;

    yandexClusterer.removeAll();
    var placemarks = [];

    currentProperties.forEach(function(p) {
      if (!p.coords || !Array.isArray(p.coords) || p.coords.length !== 2) return;

      var isPartner = !!p.partner;
      var balloonBody;

      if (isPartner) {
        balloonBody = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:6px;width:240px;color:#1A1A2E;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
            '<span style="font-size:10px;color:#D97706;font-weight:800;background:#FEF3C7;padding:2px 6px;border-radius:4px;text-transform:uppercase;">★ Партнёр</span>' +
            '<span style="font-size:11px;font-weight:800;color:#F5A623;">★ ' + (p.rating || '4.8') + '</span>' +
          '</div>' +
          '<div style="font-size:15px;font-weight:800;color:#15305B;margin:2px 0 6px;">' + (p.name || 'ЖК') + '</div>' +
          '<div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:6px;">' + (p.priceRange || p.priceFrom || 'По запросу') + '</div>' +
          '<div style="font-size:11px;color:#64748B;line-height:1.5;margin-bottom:10px;">' +
            '🏗 <b>Застройщик:</b> ' + (p.developer || 'Уточняется') + '<br>' +
            '📍 <b>Локация:</b> ' + (p.location || 'Калининград') + '<br>' +
            '📅 <b>Срок сдачи:</b> ' + (p.deliveryShort || p.delivery || 'Сдан') + '<br>' +
            '💎 <b>Класс:</b> ' + (p.class || 'Комфорт') +
          '</div>' +
          '<div style="text-align:center;"><a href="#" onclick="window.navigateToZhkCard(' + p.id + ');return false;" style="display:inline-block;width:100%;background:#15305B;color:#fff;padding:9px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;">Посмотреть в каталоге →</a></div>' +
        '</div>';
      } else {
        balloonBody = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:6px;width:220px;">' +
          '<div style="font-size:14px;font-weight:700;color:#15305B;margin-bottom:6px;">' + (p.name || 'ЖК') + '</div>' +
          '<div style="font-size:11px;color:#64748B;line-height:1.5;margin-bottom:10px;">' +
            '🏗 ' + (p.developer || 'Уточняется') + '<br>' +
            '📍 ' + (p.location || p.address || 'Калининградская обл.') + '<br>' +
            '💰 ' + (p.priceRange || p.priceFrom || 'По запросу') +
          '</div>' +
          '<div style="text-align:center;"><a href="#" onclick="window.openBasicZhkModal(' + p.id + ');return false;" style="display:inline-block;width:100%;background:linear-gradient(135deg,#F5A623,#E0911A);color:#15305B;padding:9px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;">Запросить консультацию →</a></div>' +
        '</div>';
      }

      var pm = new ymaps.Placemark(p.coords, {
        hintContent: p.name || 'ЖК',
        balloonContentBody: balloonBody
      }, {
        preset: isPartner ? 'islands#yellowStarIcon' : 'islands#darkBlueCircleDotIcon'
      });

      placemarks.push(pm);
    });

    yandexClusterer.add(placemarks);

    if (placemarks.length > 0) {
      try {
        if (placemarks.length === 1) {
          yandexMap.setCenter(currentProperties[0].coords, 14);
        } else {
          var bounds = yandexClusterer.getBounds();
          if (bounds) {
            yandexMap.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 });
          }
        }
      } catch (e) {
        console.warn('Map setBounds error:', e);
      }
    }
  }

  // ── Navigate to Card ─────────────────────────────────────
  function navigateToZhkCard(zhkId) {
    var props = getProperties();
    var prop = null;
    for (var i = 0; i < props.length; i++) { if (props[i].id === zhkId) { prop = props[i]; break; } }
    if (!prop) prop = { id: zhkId };

    switchCatalogView('list');
    window.targetZhkId = zhkId;

    var card = document.querySelector('.property-card-wrapper[data-card-id="' + zhkId + '"]');
    if (card) {
      card.classList.add('target-card-highlight');
      var hdr = document.querySelector('.site-header-wrapper') || document.querySelector('.site-header');
      var hh = hdr ? hdr.offsetHeight + 20 : 80;
      var ct = window.pageYOffset + card.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(0, ct - hh - 40), behavior: 'smooth' });
    }
  }

  // ── Basic ZHK Modal ──────────────────────────────────────
  function injectBasicModalHTML() {
    if (document.getElementById('zhk-basic-modal')) return;
    var html = '<div class="zhk-basic-modal-overlay" id="zhk-basic-modal" onclick="if(event.target===this)window.closeBasicZhkModal()">' +
      '<div class="zhk-basic-modal-container">' +
        '<button class="zhk-basic-modal-close" onclick="window.closeBasicZhkModal()" aria-label="Закрыть">✕</button>' +
        '<span class="zhk-basic-badge">Базовый объект каталога</span>' +
        '<h3 class="zhk-basic-modal-title" id="zhk-basic-modal-title">Жилой комплекс</h3>' +
        '<p class="zhk-basic-modal-subtitle" id="zhk-basic-modal-subtitle"></p>' +
        '<div class="zhk-basic-details-grid" id="zhk-basic-modal-grid"></div>' +
        '<div class="zhk-basic-notice">📌 Детальная карточка и аналитика индекса Amber для данного объекта формируются аналитическим отделом. Вы можете запросить актуальные планировки и цены напрямую у независимого эксперта.</div>' +
        '<button class="zhk-basic-consult-btn" id="zhk-basic-modal-cta">Запросить актуальные планировки и цены →</button>' +
      '</div>' +
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function openBasicZhkModal(zhkId) {
    var props = getProperties();
    var p = null;
    for (var i = 0; i < props.length; i++) { if (props[i].id === zhkId) { p = props[i]; break; } }
    if (!p) p = { id: zhkId, name: 'Жилой комплекс' };

    injectBasicModalHTML();
    var modal = document.getElementById('zhk-basic-modal');
    if (!modal) return;

    document.getElementById('zhk-basic-modal-title').textContent = p.name || 'Жилой комплекс';
    var sub = document.getElementById('zhk-basic-modal-subtitle');
    if (sub) sub.textContent = (p.developer || 'Уточняется') + ' · ' + (p.location || 'Калининградская обл.');

    var grid = document.getElementById('zhk-basic-modal-grid');
    if (grid) {
      grid.innerHTML =
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Застройщик</span><span class="zhk-basic-detail-val">' + (p.developer || 'Уточняется') + '</span></div>' +
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Адрес</span><span class="zhk-basic-detail-val">' + (p.address || p.location || 'Калининградская обл.') + '</span></div>' +
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Цены</span><span class="zhk-basic-detail-val">' + (p.priceRange || p.priceFrom || 'По запросу') + '</span></div>' +
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Срок сдачи</span><span class="zhk-basic-detail-val">' + (p.deliveryShort || p.delivery || 'Уточняется') + '</span></div>' +
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Класс жилья</span><span class="zhk-basic-detail-val">' + (p.class || 'Комфорт-класс') + '</span></div>' +
        '<div class="zhk-basic-detail-item"><span class="zhk-basic-detail-label">Рейтинг</span><span class="zhk-basic-detail-val">★ ' + (p.rating || '—') + '</span></div>';
    }

    var cta = document.getElementById('zhk-basic-modal-cta');
    if (cta) {
      cta.onclick = function() {
        closeBasicZhkModal();
        if (typeof showLeadModal === 'function') { showLeadModal('Консультация по «' + p.name + '»'); }
        else { alert('Спасибо! Эксперт Amber Avenue свяжется с вами по объекту «' + p.name + '».'); }
      };
    }

    modal.classList.add('open');
  }

  function closeBasicZhkModal() {
    var modal = document.getElementById('zhk-basic-modal');
    if (modal) { modal.classList.remove('open'); }
  }

  // ── Init & Event Listeners ───────────────────────────────
  function initViewToggle() {
    var listBtn = document.getElementById('view-toggle-list');
    var mapBtn = document.getElementById('view-toggle-map');
    var mapWrapper = document.getElementById('zhk-map-container-wrapper');
    var closeBtn = document.getElementById('zhk-map-close-btn');

    if (listBtn && !listBtn.dataset.bound) {
      listBtn.dataset.bound = 'true';
      listBtn.addEventListener('click', function() { switchCatalogView('list'); });
    }
    if (mapBtn && !mapBtn.dataset.bound) {
      mapBtn.dataset.bound = 'true';
      mapBtn.addEventListener('click', function() { switchCatalogView('map'); });
    }
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = 'true';
      closeBtn.addEventListener('click', function() { switchCatalogView('list'); });
    }
    if (mapWrapper && !mapWrapper.dataset.bound) {
      mapWrapper.dataset.bound = 'true';
      mapWrapper.addEventListener('click', function(e) {
        if (e.target === mapWrapper) {
          switchCatalogView('list');
        }
      });
    }

    // ESC key closes map modal
    if (!window._mapEscListenerBound) {
      window._mapEscListenerBound = true;
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (document.getElementById('zhk-basic-modal') && document.getElementById('zhk-basic-modal').classList.contains('open')) {
            closeBasicZhkModal();
          } else if (currentView === 'map') {
            switchCatalogView('list');
          }
        }
      });

      // Automatically fit map to viewport on screen / window resize
      window.addEventListener('resize', function() {
        if (yandexMap && currentView === 'map') {
          yandexMap.container.fitToViewport();
        }
      });
    }
  }

  window.initZhkMap = initYandexMap;
  window.updateMapMarkers = updateMapMarkers;
  window.switchCatalogView = switchCatalogView;
  window.openBasicZhkModal = openBasicZhkModal;
  window.closeBasicZhkModal = closeBasicZhkModal;
  window.navigateToZhkCard = navigateToZhkCard;
  window.expandAndScrollToCard = navigateToZhkCard;
  window.currentCatalogView = currentView;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initViewToggle(); });
  } else {
    initViewToggle();
  }

})(window, document);
