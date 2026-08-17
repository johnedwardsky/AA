/* ============================================================
   AMBER AVENUE — High-Performance Instant Interactive Regional Map
   Zero-latency Leaflet + CartoDB/OpenStreetMap High-Definition Engine
   Differentiated Placemarks (Gold Star Partners vs Navy Basic ЖК),
   Tooltips, Modals, Dynamic Filters, and Deep Linking.
   ============================================================ */

(function(window, document) {
  'use strict';

  let leafletMapInstance = null;
  let leafletMarkersGroup = null;
  let currentView = 'list'; // 'list' | 'map'
  let currentProperties = [];
  let isInitializing = false;

  // Pre-load Leaflet assets dynamically if not already in document
  function ensureLeafletAssets(callback) {
    if (window.L && typeof window.L.map === 'function') {
      if (callback) callback();
      return;
    }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[src*="leaflet"]')) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.crossOrigin = '';
      s.onload = () => {
        if (callback) callback();
      };
      document.head.appendChild(s);
    } else {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.L && typeof window.L.map === 'function') {
          clearInterval(poll);
          if (callback) callback();
        } else if (attempts > 30) {
          clearInterval(poll);
          if (callback) callback();
        }
      }, 50);
    }
  }

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
        // 1. Expand infrastructure tab
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
    const p = props.find(item => item.id === zhkId) || { id: zhkId, name: 'Жилой комплекс' };

    injectBasicModalHTML();
    const modal = document.getElementById('zhk-basic-modal');
    if (!modal) return;

    document.getElementById('zhk-basic-modal-title').textContent = p.name || 'Жилой комплекс';
    document.getElementById('zhk-basic-modal-dev').textContent = p.developer || 'Уточняется';
    document.getElementById('zhk-basic-modal-address').textContent = p.address || p.location || 'Калининградская обл.';
    document.getElementById('zhk-basic-modal-price').textContent = p.priceRange || p.priceFrom || 'По запросу';
    document.getElementById('zhk-basic-modal-delivery').textContent = p.delivery || p.deliveryShort || 'Уточняется';
    document.getElementById('zhk-basic-modal-class').textContent = p.class || 'Комфорт-класс';

    const reqBtn = document.getElementById('zhk-basic-modal-cta');
    if (reqBtn) {
      reqBtn.onclick = () => {
        closeBasicZhkModal();
        requestZhkConsultation(p);
      };
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeBasicZhkModal() {
    const modal = document.getElementById('zhk-basic-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function requestZhkConsultation(prop) {
    if (typeof showLeadModal === 'function') {
      showLeadModal(`Консультация по объекту «${prop.name}»`);
    } else if (typeof showToast === 'function') {
      showToast(`Заявка на консультацию по «${prop.name}» отправлена эксперту Amber Avenue!`);
    } else {
      alert(`Спасибо! Эксперт Amber Avenue свяжется с вами по объекту «${prop.name}».`);
    }
  }

  // Inject Basic Modal HTML once
  function injectBasicModalHTML() {
    if (document.getElementById('zhk-basic-modal')) return;

    const modalHtml = `
      <div class="zhk-basic-modal-overlay" id="zhk-basic-modal" onclick="if(event.target===this)window.closeBasicZhkModal()">
        <div class="zhk-basic-modal-card">
          <button class="zhk-basic-modal-close" onclick="window.closeBasicZhkModal()" aria-label="Закрыть">✕</button>
          <div class="zhk-basic-modal-header">
            <span class="zhk-basic-badge">Базовый объект каталога</span>
            <h3 class="zhk-basic-modal-title" id="zhk-basic-modal-title">Жилой комплекс</h3>
          </div>
          <div class="zhk-basic-modal-body">
            <div class="zhk-basic-info-row">
              <span class="info-label">🏗 Застройщик:</span>
              <span class="info-value" id="zhk-basic-modal-dev">Уточняется</span>
            </div>
            <div class="zhk-basic-info-row">
              <span class="info-label">📍 Адрес:</span>
              <span class="info-value" id="zhk-basic-modal-address">Калининградская обл.</span>
            </div>
            <div class="zhk-basic-info-row">
              <span class="info-label">💰 Цены:</span>
              <span class="info-value" id="zhk-basic-modal-price">По запросу</span>
            </div>
            <div class="zhk-basic-info-row">
              <span class="info-label">📅 Срок сдачи:</span>
              <span class="info-value" id="zhk-basic-modal-delivery">Уточняется</span>
            </div>
            <div class="zhk-basic-info-row">
              <span class="info-label">💎 Класс жилья:</span>
              <span class="info-value" id="zhk-basic-modal-class">Комфорт-класс</span>
            </div>
            <div class="zhk-basic-note">
              📌 Детальная карточка и аналитика индекса Amber для данного объекта формируются аналитическим отделом. Вы можете запросить актуальные планировки и цены напрямую у независимого эксперта.
            </div>
          </div>
          <div class="zhk-basic-modal-footer">
            <button class="btn btn-primary" id="zhk-basic-modal-cta" style="width:100%; justify-content:center; padding:12px 18px; font-weight:700;">
              Запросить актуальные планировки и цены →
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Initialize High-Performance Map
  function initZhkMap(containerId = 'zhk-interactive-map') {
    const container = document.getElementById(containerId);
    if (!container) return null;

    injectBasicModalHTML();

    if (leafletMapInstance) {
      setTimeout(() => {
        try { leafletMapInstance.invalidateSize(); } catch (e) {}
      }, 50);
      return leafletMapInstance;
    }

    if (isInitializing) return null;
    isInitializing = true;

    ensureLeafletAssets(() => {
      try {
        if (!window.L || typeof window.L.map !== 'function') {
          console.error('Leaflet is not available.');
          isInitializing = false;
          return;
        }

        // Clean container and reset if previously initialized
        if (container._leaflet_id) {
          container._leaflet_id = null;
        }
        container.innerHTML = '';

        // Default regional center: Kaliningrad region
        leafletMapInstance = window.L.map(containerId, {
          center: [54.7104, 20.4522],
          zoom: 10,
          zoomControl: true,
          scrollWheelZoom: true
        });

        // Crisp High-Definition CartoDB Voyager Map with Russian Labels
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '© OpenStreetMap, © CARTO, Amber Avenue'
        }).addTo(leafletMapInstance);

        leafletMarkersGroup = window.L.layerGroup().addTo(leafletMapInstance);
        window.leafletMapInstance = leafletMapInstance;
        isInitializing = false;

        // Populate markers
        const props = (currentProperties && currentProperties.length > 0) ? currentProperties :
                      ((typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) || (window.PROPERTIES || []));
        updateMapMarkers(props);

        // Force viewport update
        setTimeout(() => {
          try { leafletMapInstance.invalidateSize(); } catch (e) {}
        }, 50);
        setTimeout(() => {
          try { leafletMapInstance.invalidateSize(); } catch (e) {}
        }, 200);

      } catch (err) {
        console.error('Map init error:', err);
        isInitializing = false;
      }
    });

    return leafletMapInstance;
  }

  // Update Placemarks on the Map
  function updateMapMarkers(props) {
    currentProperties = props || [];

    // Update statistics toolbar
    const countEl = document.getElementById('zhk-map-count');
    const partnerCountEl = document.getElementById('zhk-map-partner-count');
    const partners = currentProperties.filter(p => !!p.partner);
    if (countEl) countEl.textContent = currentProperties.length;
    if (partnerCountEl) partnerCountEl.textContent = partners.length;

    if (!leafletMapInstance || !leafletMarkersGroup || !window.L) return;

    leafletMarkersGroup.clearLayers();
    const bounds = [];

    currentProperties.forEach(p => {
      if (!p.coords || !Array.isArray(p.coords) || p.coords.length !== 2) return;
      const [lat, lng] = p.coords;
      bounds.push([lat, lng]);

      const isPartner = !!p.partner;
      const iconHtml = isPartner ? `
        <div style="background:linear-gradient(135deg, #F5A623 0%, #D97706 100%);color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(245,166,35,0.65);border:2px solid #FFFFFF;font-size:15px;cursor:pointer;transition:transform 0.2s;" title="${p.name}">
          ★
        </div>
      ` : `
        <div style="background:linear-gradient(135deg, #15305B 0%, #0E1F3D 100%);color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(21,48,91,0.45);border:2px solid #FFFFFF;font-size:11px;cursor:pointer;transition:transform 0.2s;" title="${p.name}">
          🏢
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-zhk-pin',
        iconSize: isPartner ? [32, 32] : [24, 24],
        iconAnchor: isPartner ? [16, 16] : [12, 12]
      });

      const marker = window.L.marker([lat, lng], { icon: customIcon });

      if (isPartner) {
        const popupHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:6px;width:240px;color:#1A1A2E;">
            <img src="${p.imgSrc}" alt="${p.name}" style="width:100%;height:115px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.src='baltic_banner.jpg'" />
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;color:#D97706;font-weight:800;background:#FEF3C7;padding:2px 6px;border-radius:4px;text-transform:uppercase;">★ Партнёр</span>
              <span style="font-size:11px;font-weight:800;color:#F5A623;">★ ${p.rating || '4.8'}</span>
            </div>
            <div style="font-size:15px;font-weight:800;color:#15305B;margin:2px 0 4px;line-height:1.2;">${p.name}</div>
            <div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:6px;">${p.priceRange || p.priceFrom || 'По запросу'}</div>
            <div style="font-size:11px;color:#64748B;line-height:1.45;margin-bottom:10px;">
              <div>🏗 <strong>Застройщик:</strong> ${p.developer || 'Уточняется'}</div>
              <div>📍 <strong>Локация:</strong> ${p.location || 'Калининград'}</div>
              <div>📅 <strong>Срок сдачи:</strong> ${p.deliveryShort || p.delivery || 'Сдан'}</div>
              <div>💎 <strong>Класс:</strong> ${p.class || 'Комфорт-класс'}</div>
            </div>
            <button onclick="window.navigateToZhkCard(${p.id})" style="width:100%;background:#15305B;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;transition:background 0.2s;">
              Посмотреть карточку объекта →
            </button>
          </div>
        `;
        marker.bindPopup(popupHtml, { maxWidth: 280 });
      } else {
        marker.on('click', () => openBasicZhkModal(p.id));
        marker.bindTooltip(`<strong>${p.name}</strong><br><span style="color:#64748B;font-size:11px;">${p.location || ''}</span>`, { direction: 'top' });
      }

      leafletMarkersGroup.addLayer(marker);
    });

    if (bounds.length > 0) {
      try {
        if (bounds.length === 1) {
          leafletMapInstance.setView(bounds[0], 14);
        } else {
          leafletMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (e) {}
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
      if (mapWrapper) {
        mapWrapper.style.display = 'block';
        mapWrapper.classList.add('active');
      }

      if (mapBtn) {
        mapBtn.classList.add('active');
        mapBtn.setAttribute('aria-pressed', 'true');
      }
      if (listBtn) {
        listBtn.classList.remove('active');
        listBtn.setAttribute('aria-pressed', 'false');
      }

      // Initialize or resize map
      if (!leafletMapInstance) {
        initZhkMap();
      } else {
        setTimeout(() => {
          try { leafletMapInstance.invalidateSize(); } catch (e) {}
          const currentProps = (currentProperties && currentProperties.length > 0) ? currentProperties :
                               ((typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) || (window.PROPERTIES || []));
          updateMapMarkers(currentProps);
        }, 50);
        setTimeout(() => {
          try { leafletMapInstance.invalidateSize(); } catch (e) {}
        }, 200);
      }

    } else {
      if (feedEl) feedEl.style.display = 'flex';
      if (loadMoreBtn) loadMoreBtn.style.display = '';
      if (mapWrapper) {
        mapWrapper.style.display = 'none';
        mapWrapper.classList.remove('active');
      }

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

  // Export functions globally immediately
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

  // Auto-init bindings on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initViewToggle();
      injectBasicModalHTML();
      ensureLeafletAssets();
    });
  } else {
    initViewToggle();
    injectBasicModalHTML();
    ensureLeafletAssets();
  }

})(window, document);
