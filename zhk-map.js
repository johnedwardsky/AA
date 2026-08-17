/* ============================================================
   AMBER AVENUE — Official Yandex Maps Interactive Regional Engine
   Differentiated display (Paid Partners vs Basic Objects),
   Clustering, Tooltips, Custom Balloons, Modals, and Deep Linking.
   ============================================================ */

(function(window, document) {
  'use strict';

  let ymapInstance = null;
  let ymapClusterer = null;
  let placemarksMap = {};
  let currentView = 'list'; // 'list' | 'map'
  let currentProperties = [];
  let isInitializing = false;

  // Get Direction URL by property object or ID
  function getZhkDirectionUrl(itemOrId) {
    const props = (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                  (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || [];
    let prop = null;
    if (itemOrId && typeof itemOrId === 'object') {
      prop = itemOrId.id ? props.find(p => p.id === itemOrId.id) || itemOrId : itemOrId;
    } else if (itemOrId) {
      const numId = parseInt(itemOrId, 10);
      prop = props.find(p => p.id === numId || (p.name && p.name.toLowerCase() === String(itemOrId).toLowerCase()));
    }

    if (prop) {
      const dir = prop.direction;
      if (dir === 'sea') return 'zhk-umory.html';
      if (dir === 'prigorod' || dir === 'suburb') return 'zhk-prigorod.html';
      if (dir === 'oblast') return 'zhk-oblast.html';
      if (dir === 'city') return 'zhk-kaliningrad.html';

      const loc = (prop.location || '').toLowerCase();
      const addr = (prop.address || '').toLowerCase();
      const fullText = loc + ' ' + addr;

      if (/зеленоградск|светлогорск|пионерск|янтарн|балтийск|море|побереж/i.test(fullText)) {
        return 'zhk-umory.html';
      }
      if (/гурьевск|васильково|исаково|холмогоровк|орловк|луговое|ласкино/i.test(fullText)) {
        return 'zhk-prigorod.html';
      }
      if (/(?:^|\s|г\.)(советск|черняховск|гвардейск|багратионовск|неман|полесск|гусев)\b/i.test(fullText) && !/советский\s+просп/i.test(fullText)) {
        return 'zhk-oblast.html';
      }
      return 'zhk-kaliningrad.html';
    }
    return 'zhk-kaliningrad.html';
  }

  // Deep Link navigation to target card
  function navigateToZhkCard(zhkId) {
    const props = (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                  (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || [];
    const prop = props.find(p => p.id === zhkId) || { id: zhkId };
    const targetUrl = getZhkDirectionUrl(prop);
    const currentPage = window.location.pathname.split('/').pop() || 'zhk.html';

    // If currently in SPA bundle mode
    if (typeof navigateToPage === 'function') {
      window.targetZhkId = zhkId;
      const targetPageName = targetUrl.replace('.html', '').replace('zhk-', '');
      location.hash = '#' + targetPageName;
      switchCatalogView('list');
      setTimeout(() => expandAndScrollToCard(zhkId), 200);
      return;
    }

    // Check if we are on the target direction page or zhk.html
    const isSamePage = currentPage === targetUrl ||
                       (currentPage === 'zhk.html' && document.querySelector(`.property-card-wrapper[data-card-id="${zhkId}"]`));

    if (isSamePage) {
      switchCatalogView('list');
      window.targetZhkId = zhkId;
      expandAndScrollToCard(zhkId);
    } else {
      // Navigate to direction page with URL param
      window.location.href = `${targetUrl}?id=${zhkId}`;
    }
  }

  // Auto-expand card and scroll with top banner visibility
  function expandAndScrollToCard(zhkId) {
    const feed = document.querySelector('.listing-feed') || document.getElementById('listing-feed');
    if (!feed) return;

    let cardWrapper = feed.querySelector(`.property-card-wrapper[data-card-id="${zhkId}"]`);
    if (!cardWrapper) {
      if (typeof renderFeed === 'function') {
        window.targetZhkId = zhkId;
        renderFeed();
        cardWrapper = feed.querySelector(`.property-card-wrapper[data-card-id="${zhkId}"]`);
      }
    }

    if (cardWrapper) {
      setTimeout(() => {
        // 1. Expand infrastructure / characteristics tab
        const infraNavItem = cardWrapper.querySelector('.card-nav-item[data-key="infra"]') ||
                              cardWrapper.querySelector('.card-nav-item[data-key="chars"]');
        const panel = cardWrapper.querySelector('.card-inline-panel');
        const nav = cardWrapper.querySelector('.card-nav');

        if (infraNavItem && panel) {
          if (nav) {
            nav.querySelectorAll('.card-nav-item').forEach(n => n.classList.remove('active'));
            infraNavItem.classList.add('active');
            try {
              infraNavItem.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            } catch (e) {}
          }
          panel.querySelectorAll('.inline-section').forEach(s => s.classList.remove('active'));
          const infraSection = panel.querySelector('[data-section="infra"]') ||
                               panel.querySelector('[data-section="chars"]');
          if (infraSection) {
            infraSection.classList.add('active');
            panel.classList.add('open');
          }
        }

        // 2. Add accent highlight
        cardWrapper.classList.add('target-card-highlight');

        // 3. Scroll keeping top banner visible above card
        requestAnimationFrame(() => {
          const headerWrapper = document.querySelector('.site-header-wrapper') || document.querySelector('.site-header');
          const headerH = headerWrapper ? headerWrapper.offsetHeight : 60;
          const viewportH = window.innerHeight;
          const cardRect = cardWrapper.getBoundingClientRect();
          const cardAbsoluteTop = window.pageYOffset + cardRect.top;

          const offsetFromTop = Math.max(headerH + 80, Math.floor(viewportH * 0.42));
          const targetScrollY = Math.max(0, cardAbsoluteTop - offsetFromTop);

          window.scrollTo({
            top: targetScrollY,
            behavior: 'smooth'
          });
        });
      }, 100);
    }
  }

  // Open Basic ЖК Modal
  function openBasicZhkModal(zhkId) {
    const props = (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                  (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || [];
    const p = props.find(item => item.id === zhkId);
    if (!p) return;

    let overlay = document.getElementById('zhk-basic-modal-overlay');
    if (!overlay) {
      injectBasicModalHTML();
      overlay = document.getElementById('zhk-basic-modal-overlay');
    }

    const titleEl = document.getElementById('zhk-basic-modal-title');
    const subEl = document.getElementById('zhk-basic-modal-subtitle');
    const bodyEl = document.getElementById('zhk-basic-modal-body');
    const consultBtn = document.getElementById('zhk-basic-consult-btn');

    if (titleEl) titleEl.textContent = p.name;
    if (subEl) subEl.textContent = `${p.location || 'Калининград'}${p.district ? ' · ' + p.district + ' район' : ''}`;

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="zhk-basic-details-grid">
          <div class="zhk-basic-detail-item">
            <span class="zhk-basic-detail-label">Застройщик</span>
            <span class="zhk-basic-detail-val">${p.developer || 'Уточняется'}</span>
          </div>
          <div class="zhk-basic-detail-item">
            <span class="zhk-basic-detail-label">Срок сдачи</span>
            <span class="zhk-basic-detail-val">${p.deliveryShort || p.delivery || 'Уточняется'}</span>
          </div>
          <div class="zhk-basic-detail-item">
            <span class="zhk-basic-detail-label">Класс жилья</span>
            <span class="zhk-basic-detail-val">${p.class || 'Комфорт-класс'}</span>
          </div>
          <div class="zhk-basic-detail-item">
            <span class="zhk-basic-detail-label">Отопление</span>
            <span class="zhk-basic-detail-val">${p.chars && p.chars.heating ? p.chars.heating : 'Автономное газовое'}</span>
          </div>
        </div>
        <div class="zhk-basic-detail-item" style="margin-bottom: 12px;">
          <span class="zhk-basic-detail-label">Адрес объекта</span>
          <span class="zhk-basic-detail-val">${p.address || 'Калининградская область'}</span>
        </div>
        <div class="zhk-basic-notice">
          ℹ️ Данный объект находится в базовом каталоге региона. Для получения актуальных планировок, расчёта ипотеки и проверки документов застройщика отправьте бесплатный запрос нашим экспертам.
        </div>
      `;
    }

    if (consultBtn) {
      consultBtn.onclick = function() {
        closeBasicZhkModal(true);
        requestZhkConsultation(p.id);
      };
    }

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }

  function closeBasicZhkModal(keepBodyLock = false) {
    const overlay = document.getElementById('zhk-basic-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(() => { overlay.style.display = 'none'; }, 200);
    }
    if (!keepBodyLock) {
      const consultModal = document.getElementById('cm-overlay');
      if (!consultModal || !consultModal.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }
  }

  function requestZhkConsultation(zhkId) {
    const props = (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                  (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || [];
    const p = props.find(item => item.id === zhkId);
    const zhkName = p ? p.name : 'ЖК';
    if (typeof window.openConsultModal === 'function') {
      window.openConsultModal(`Запрос информации по ${zhkName}`);
    } else if (typeof showToast === 'function') {
      showToast(`Запрос отправлен по объекту ${zhkName}`);
    }
  }

  function injectBasicModalHTML() {
    if (document.getElementById('zhk-basic-modal-overlay')) return;
    const html = `
      <div class="zhk-basic-modal-overlay" id="zhk-basic-modal-overlay" style="display: none;">
        <div class="zhk-basic-modal-container" onclick="event.stopPropagation()">
          <button class="zhk-basic-modal-close" id="zhk-basic-modal-close" aria-label="Закрыть">✕</button>
          <div class="zhk-basic-modal-header">
            <span class="zhk-basic-badge">Базовый каталог</span>
            <h3 class="zhk-basic-modal-title" id="zhk-basic-modal-title">Название ЖК</h3>
            <p class="zhk-basic-modal-subtitle" id="zhk-basic-modal-subtitle">Локация</p>
          </div>
          <div class="zhk-basic-modal-body" id="zhk-basic-modal-body"></div>
          <div class="zhk-basic-modal-footer">
            <button class="btn btn-accent zhk-basic-consult-btn" id="zhk-basic-consult-btn">Запросить информацию по ЖК</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const overlay = document.getElementById('zhk-basic-modal-overlay');
    const closeBtn = document.getElementById('zhk-basic-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeBasicZhkModal());
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeBasicZhkModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
        closeBasicZhkModal();
      }
    });
  }

  // Initialize Yandex Map
  function initZhkMap(containerId = 'zhk-interactive-map') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    injectBasicModalHTML();

    if (ymapInstance) {
      try {
        ymapInstance.container.fitToViewport();
      } catch (e) {}
      return ymapInstance;
    }

    if (isInitializing) return null;

    function doInit() {
      // Check if ymaps is loaded and has ready function
      if (typeof window.ymaps === 'undefined' || typeof window.ymaps.ready !== 'function') {
        setTimeout(doInit, 100);
        return;
      }

      window.ymaps.ready(() => {
        if (ymapInstance) {
          try { ymapInstance.container.fitToViewport(); } catch(e) {}
          return;
        }

        try {
          ymapInstance = new window.ymaps.Map(containerId, {
            center: [54.7104, 20.4522],
            zoom: 10,
            controls: ['zoomControl', 'fullscreenControl', 'typeSelector', 'geolocationControl']
          }, {
            searchControlProvider: 'yandex#search',
            suppressMapOpenBlock: true
          });

          // Initialize Yandex Clusterer
          ymapClusterer = new window.ymaps.Clusterer({
            preset: 'islands#nightClusterIcons',
            groupByCoordinates: false,
            clusterDisableClickZoom: false,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false,
            maxZoom: 15,
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            clusterBalloonPagerType: 'marker'
          });

          ymapInstance.geoObjects.add(ymapClusterer);
          window.ymapInstance = ymapInstance;
          window.ymapClusterer = ymapClusterer;
          isInitializing = false;

          // Populate markers immediately
          const props = (currentProperties && currentProperties.length > 0) ? currentProperties :
                        ((typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                         (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || []);
          updateMapMarkers(props);
        } catch (err) {
          console.warn('Yandex Maps initialization error:', err);
          isInitializing = false;
        }
      });
    }

    isInitializing = true;
    doInit();
    return ymapInstance;
  }

  // Update Placemarks on the Map
  function updateMapMarkers(props) {
    currentProperties = props || [];

    // Update stats bar
    const countEl = document.getElementById('zhk-map-count');
    const partnerCountEl = document.getElementById('zhk-map-partner-count');
    const partners = currentProperties.filter(p => !!p.partner);
    if (countEl) countEl.textContent = currentProperties.length;
    if (partnerCountEl) partnerCountEl.textContent = partners.length;

    if (!ymapClusterer || !ymapInstance || typeof window.ymaps === 'undefined') {
      return;
    }

    ymapClusterer.removeAll();
    placemarksMap = {};

    const geoObjects = [];
    const validCoordsList = [];

    currentProperties.forEach(p => {
      if (!p.coords || !Array.isArray(p.coords) || p.coords.length !== 2) return;
      const [lat, lng] = p.coords;
      validCoordsList.push([lat, lng]);

      const isPartner = !!p.partner;
      let placemark;

      if (isPartner) {
        // Paid Partner Placemark (Gold / Star accent)
        const priceText = p.priceFrom ? p.priceFrom.replace('от ', '').replace(' млн ₽', 'M ₽') : 'ЖК';
        const partnerBalloonHtml = `
          <div class="zhk-ymap-balloon">
            <div class="zhk-balloon-hero">
              <img src="${p.imgSrc}" alt="${p.name}" class="zhk-balloon-img" onerror="this.src='baltic_banner.jpg'" />
              <span class="zhk-balloon-partner-badge">Партнёр</span>
              <span class="zhk-balloon-rating">★ ${p.rating || '4.8'}</span>
            </div>
            <div class="zhk-balloon-body">
              <h4 class="zhk-balloon-title">${p.name}</h4>
              <div class="zhk-balloon-price">${p.priceRange || p.priceFrom || 'Цена по запросу'}</div>
              <div class="zhk-balloon-meta">
                <div>🏗 <strong>Застройщик:</strong> ${p.developer || 'Уточняется'}</div>
                <div>📍 <strong>Локация:</strong> ${p.location || 'Калининград'}${p.district ? ' (' + p.district + ')' : ''}</div>
                <div>📅 <strong>Срок сдачи:</strong> ${p.deliveryShort || p.delivery || 'Уточняется'}</div>
                <div>💎 <strong>Класс:</strong> ${p.class || 'Комфорт-класс'}</div>
              </div>
              <button class="btn btn-primary zhk-balloon-action-btn" onclick="window.navigateToZhkCard(${p.id})">
                Посмотреть карточку объекта →
              </button>
            </div>
          </div>
        `;

        const partnerHintHtml = `
          <div class="zhk-ymap-hint">
            <strong>⭐ ${p.name}</strong><br>
            <span style="color:#F5A623;font-weight:700;">${p.priceFrom || ''}</span> · ${p.location || ''}
          </div>
        `;

        placemark = new window.ymaps.Placemark([lat, lng], {
          id: p.id,
          name: p.name,
          priceText: priceText,
          balloonContentHeader: '',
          balloonContentBody: partnerBalloonHtml,
          hintContent: partnerHintHtml,
          clusterCaption: `⭐ ${p.name} (${p.priceFrom || ''})`
        }, {
          preset: 'islands#yellowStarIcon',
          iconColor: '#F5A623',
          hideIconOnBalloonOpen: false,
          balloonMaxWidth: 300,
          balloonMaxHeight: 450,
          balloonPanelMaxMapArea: 0,
          openBalloonOnClick: true
        });

      } else {
        // Basic Placemark (Navy blue)
        const basicHintHtml = `
          <div class="zhk-ymap-hint-basic">
            <strong>${p.name}</strong><br>
            <span style="color:#94A3B8;font-size:11px;">${p.location || 'Калининград'}${p.district ? ' · ' + p.district : ''}</span>
          </div>
        `;

        placemark = new window.ymaps.Placemark([lat, lng], {
          id: p.id,
          name: p.name,
          hintContent: basicHintHtml,
          clusterCaption: `${p.name}`
        }, {
          preset: 'islands#darkBlueHomeIcon',
          iconColor: '#15305B',
          hideIconOnBalloonOpen: false,
          openBalloonOnClick: false
        });

        // Click on basic placemark opens modal with "Запросить информацию"
        placemark.events.add('click', (e) => {
          e.preventDefault();
          openBasicZhkModal(p.id);
        });
      }

      placemarksMap[p.id] = placemark;
      geoObjects.push(placemark);
    });

    ymapClusterer.add(geoObjects);

    // Auto-fit bounds if we have coordinates
    if (validCoordsList.length > 0) {
      setTimeout(() => {
        try {
          const bounds = ymapClusterer.getBounds();
          if (bounds) {
            ymapInstance.setBounds(bounds, {
              checkZoomRange: true,
              zoomMargin: 35,
              duration: 300
            });
          }
        } catch (e) {}
      }, 100);
    }
  }

  // Switch Catalog View («Список» ↔ «На карте»)
  function switchCatalogView(targetView) {
    const listBtn = document.getElementById('view-toggle-list');
    const mapBtn = document.getElementById('view-toggle-map');
    const feedEl = document.querySelector('.listing-feed') || document.getElementById('listing-feed');
    const mapWrapper = document.getElementById('zhk-map-container-wrapper');
    const loadMoreBtn = document.querySelector('.load-more-wrapper');

    currentView = targetView;
    window.currentCatalogView = currentView;

    if (targetView === 'map') {
      if (feedEl) feedEl.style.display = 'none';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      if (mapWrapper) mapWrapper.style.display = 'block';

      if (mapBtn) {
        mapBtn.classList.add('active');
        mapBtn.setAttribute('aria-pressed', 'true');
      }
      if (listBtn) {
        listBtn.classList.remove('active');
        listBtn.setAttribute('aria-pressed', 'false');
      }

      // Initialize map or resize
      if (!ymapInstance) {
        initZhkMap();
      } else {
        setTimeout(() => {
          try {
            ymapInstance.container.fitToViewport();
          } catch (e) {}
          const currentProps = (typeof getFilteredProperties === 'function' ? getFilteredProperties() : null) ||
                               (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) ||
                               (window.PROPERTIES || []);
          updateMapMarkers(currentProps);
        }, 50);
      }

    } else {
      if (feedEl) feedEl.style.display = 'flex';
      if (loadMoreBtn) loadMoreBtn.style.display = '';
      if (mapWrapper) mapWrapper.style.display = 'none';

      if (listBtn) {
        listBtn.classList.add('active');
        listBtn.setAttribute('aria-pressed', 'true');
      }
      if (mapBtn) {
        mapBtn.classList.remove('active');
        mapBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  // Bind view toggle button listeners
  function initViewToggle() {
    const listBtn = document.getElementById('view-toggle-list');
    const mapBtn = document.getElementById('view-toggle-map');

    if (listBtn && !listBtn.dataset.bound) {
      listBtn.dataset.bound = 'true';
      listBtn.addEventListener('click', () => switchCatalogView('list'));
    }
    if (mapBtn && !mapBtn.dataset.bound) {
      mapBtn.dataset.bound = 'true';
      mapBtn.addEventListener('click', () => switchCatalogView('map'));
    }
  }

  // Export to window
  window.initZhkMap = initZhkMap;
  window.updateMapMarkers = updateMapMarkers;
  window.switchCatalogView = switchCatalogView;
  window.openBasicZhkModal = openBasicZhkModal;
  window.closeBasicZhkModal = closeBasicZhkModal;
  window.requestZhkConsultation = requestZhkConsultation;
  window.navigateToZhkCard = navigateToZhkCard;
  window.expandAndScrollToCard = expandAndScrollToCard;
  window.getZhkDirectionUrl = getZhkDirectionUrl;
  window.currentCatalogView = currentView;

  // Auto init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initViewToggle();
      injectBasicModalHTML();
    });
  } else {
    initViewToggle();
    injectBasicModalHTML();
  }

})(window, document);
