/**
 * Amber Avenue — Conversion Boosters Suite
 * =========================================================================
 * 1. Sticky Mobile Bottom Adaptive CTA Bar (Reactive tab context & 1-tap leads)
 * 2. Smart Multi-Step Interactive Quiz (Real-time scoring across 369 properties)
 * 3. Lead Magnet PDF & Closed Chessboard Download Modal
 * 4. Input Telephone Auto-Masking (+7 (9XX) XXX-XX-XX)
 */

(function(window, document) {
  'use strict';

  // ─── 1. Phone Input Mask Helper ──────────────────────────────────────────
  function applyPhoneMask(input) {
    if (!input || input._hasMask) return;
    input._hasMask = true;

    function formatPhone(val) {
      let digits = val.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (!digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);

      let res = '+7';
      if (digits.length > 1) res += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) res += ') ' + digits.slice(4, 7);
      if (digits.length >= 7) res += '-' + digits.slice(7, 9);
      if (digits.length >= 9) res += '-' + digits.slice(9, 11);
      return res;
    }

    input.addEventListener('input', function(e) {
      const start = input.selectionStart;
      const prevLen = input.value.length;
      input.value = formatPhone(input.value);
      const newLen = input.value.length;
      if (start !== null) {
        input.setSelectionRange(start + (newLen - prevLen), start + (newLen - prevLen));
      }
    });

    input.addEventListener('focus', function() {
      if (!input.value) input.value = '+7 (';
    });

    input.addEventListener('blur', function() {
      if (input.value === '+7 (' || input.value === '+7') input.value = '';
    });
  }

  // ─── 2. Sticky Mobile Bottom Adaptive CTA Bar ────────────────────────────
  const StickyMobileCTA = {
    activeZhkName: 'Калининградские новостройки',
    activeContext: 'overview',
    contextRules: {
      overview: { text: 'Узнать наличие и цены', badge: 'Актуально', icon: '📞' },
      prices:   { text: 'Забронировать со скидкой 💳', badge: 'Спеццена', icon: '🏷️' },
      mortgage: { text: 'Рассчитать ипотеку 🏦', badge: 'от 5.9%', icon: '📊' },
      location: { text: 'Трансфер на просмотр 🚕', badge: 'Бесплатно', icon: '✈️' },
      infra:    { text: 'Записаться на просмотр 📍', badge: 'Экскурсия', icon: '🗺️' },
      warranty: { text: 'Оформить страховку 🛡️', badge: 'Скидка 25%', icon: '🔒' },
      docs:     { text: 'Проверить ДДУ у юриста ⚖️', badge: 'Аудит 24ч', icon: '📄' }
    },

    init: function() {
      if (document.getElementById('stickyMobileCta')) return;
      this.render();
      this.bindEvents();
    },

    render: function() {
      const rule = this.contextRules.overview;
      const bar = document.createElement('nav');
      bar.id = 'stickyMobileCta';
      bar.className = 'sticky-mobile-cta-bar';
      bar.setAttribute('aria-label', 'Быстрые действия по ЖК');
      bar.innerHTML = `
        <div class="cta-bar-inner">
          <a href="tel:+74012999000" class="cta-bar-icon-btn" aria-label="Позвонить">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Звонок</span>
          </a>
          <a href="https://t.me/amber_avenue_bot" target="_blank" rel="noopener" class="cta-bar-icon-btn tg-btn" aria-label="Чат в Telegram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>Telegram</span>
          </a>
          <button class="cta-bar-primary-btn" id="stickyCtaActionBtn" onclick="AmberConversion.handleStickyAction()">
            <span class="cta-badge" id="stickyCtaBadge">${rule.badge}</span>
            <span class="cta-text" id="stickyCtaText">${rule.text}</span>
          </button>
        </div>
      `;
      document.body.appendChild(bar);
    },

    bindEvents: function() {
      const bar = document.getElementById('stickyMobileCta');
      if (!bar) return;

      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollY = window.scrollY || window.pageYOffset || 0;
            if (scrollY > 180) {
              bar.classList.add('visible');
            } else {
              bar.classList.remove('visible');
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // Delegate tab activation detection
      document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-tab], .tab-btn, .card-nav-item');
        if (tabBtn) {
          const tabKey = tabBtn.getAttribute('data-tab') || tabBtn.getAttribute('data-section') || '';
          this.updateContext(tabKey);
        }

        // Track nearest visible ЖК card
        const card = e.target.closest('.property-card, [data-property-id]');
        if (card) {
          const nameEl = card.querySelector('.property-title, .card-title, h3');
          if (nameEl && nameEl.textContent.trim()) {
            this.activeZhkName = nameEl.textContent.trim();
          }
        }
      });
    },

    updateContext: function(tabKey) {
      const key = (tabKey || '').toLowerCase();
      const rule = this.contextRules[key] || this.contextRules.overview;
      this.activeContext = key;

      const badgeEl = document.getElementById('stickyCtaBadge');
      const textEl = document.getElementById('stickyCtaText');
      if (badgeEl) badgeEl.textContent = rule.badge;
      if (textEl) textEl.textContent = rule.text;
    }
  };

  // ─── 3. Smart 4-Step Interactive Quiz ────────────────────────────────────
  const SmartQuiz = {
    currentStep: 0,
    answers: {
      goal: 'sea',
      budget: 8.5,
      location: 'all_sea',
      delivery: 'any'
    },

    steps: [
      {
        id: 'goal',
        title: 'Какая главная цель покупки недвижимости?',
        subtitle: 'Шаг 1 из 4: Подберем объекты под ваш сценарий',
        options: [
          { val: 'sea', icon: '🌊', title: 'Жизнь и отдых у Балтийского моря', desc: 'Зеленоградск, Светлогорск, Пионерский' },
          { val: 'family', icon: '👨‍👩‍👧‍👦', title: 'Семейное жилье в Калининграде', desc: 'Рядом со школами, парками и развитой инфраструктурой' },
          { val: 'invest', icon: '📈', title: 'Инвестиции и пассивный доход от аренды', desc: 'Высокая ликвидность, круглогодичный спрос' },
          { val: 'relocate', icon: '✈️', title: 'Переезд в Калининградскую область', desc: 'Мягкий климат, европейская архитектура и природа' }
        ]
      },
      {
        id: 'budget',
        title: 'Какой планируемый бюджет покупки?',
        subtitle: 'Шаг 2 из 4: Учитываем собственные средства и субсидии',
        options: [
          { val: 5.5, icon: '🏷️', title: 'До 5.5 млн ₽', desc: 'Студии и функциональные 1-комнатные квартиры' },
          { val: 8.5, icon: '🏡', title: '5.5 – 8.5 млн ₽', desc: 'Просторные 1–2 комнатные квартиры в комфорт-классе' },
          { val: 12.0, icon: '✨', title: '8.5 – 12.0 млн ₽', desc: 'Бизнес-класс у моря или в лучших районах города' },
          { val: 25.0, icon: '👑', title: 'Более 12 млн ₽', desc: 'Премиальные резиденции, пентхаусы и террасы' }
        ]
      },
      {
        id: 'location',
        title: 'Какая локация для вас в приоритете?',
        subtitle: 'Шаг 3 из 4: Выберите побережье или районы города',
        options: [
          { val: 'Зеленоградск', icon: '🏖️', title: 'г. Зеленоградск', desc: 'Широкие пляжи, променад, Курортный проспект' },
          { val: 'Светлогорск', icon: '🌲', title: 'г. Светлогорск / Отрадное', desc: 'Хвойный реликтовый лес, озера и море' },
          { val: 'Центр', icon: '🏛️', title: 'г. Калининград — Центр и Верхнее озеро', desc: 'Исторический центр, парки, набережные' },
          { val: 'all_sea', icon: '🌊', title: 'Любой курортный город на побережье', desc: 'Зеленоградск, Светлогорск, Пионерский, Янтарный' }
        ]
      },
      {
        id: 'delivery',
        title: 'Какой срок сдачи объекта вам подходит?',
        subtitle: 'Шаг 4 из 4: Готовое жилье или выгодный этап стройки',
        options: [
          { val: 'ready', icon: '🔑', title: 'Готовый дом (Сдан / ключи сразу)', desc: 'Заезжайте или сдавайте в аренду без ожидания' },
          { val: 'near', icon: '🏗️', title: 'Сдача в течение 6–12 месяцев', desc: 'Оптимальный баланс цены и готовности' },
          { val: 'construction', icon: '💰', title: 'На этапе строительства (Максимальная выгода)', desc: 'Минимальная стоимость квадратного метра' },
          { val: 'any', icon: '⭐', title: 'Не имеет значения, важен сам проект', desc: 'Рассмотрю все качественные предложения' }
        ]
      }
    ],

    open: function() {
      this.currentStep = 0;
      let existing = document.getElementById('smart-quiz-modal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'smart-quiz-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-card quiz-modal-card">
          <div class="modal-header">
            <div class="modal-header-text">
              <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
                <span>✨ Экспресс-подбор новостройки</span>
              </h3>
              <p class="modal-subtitle">ИИ-алгоритм подберет лучшие варианты из 369 ЖК</p>
            </div>
            <button class="modal-close" onclick="AmberConversion.closeQuiz()" aria-label="Закрыть">✕</button>
          </div>
          <div class="modal-body" id="quizModalContent">
            <!-- Dynamic Step Content -->
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => overlay.classList.add('open'));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });

      this.renderStep();
    },

    close: function() {
      const overlay = document.getElementById('smart-quiz-modal');
      if (!overlay) return;
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => overlay.remove(), 200);
    },

    renderStep: function() {
      const container = document.getElementById('quizModalContent');
      if (!container) return;

      if (this.currentStep < this.steps.length) {
        const step = this.steps[this.currentStep];
        const progressPct = Math.round(((this.currentStep + 1) / this.steps.length) * 100);

        let optionsHtml = '';
        step.options.forEach((opt) => {
          optionsHtml += `
            <div class="quiz-option-card" onclick="AmberConversion.selectQuizOption('${step.id}', '${opt.val}')">
              <div class="quiz-option-title">${opt.icon} ${opt.title}</div>
              <div class="quiz-option-desc">${opt.desc}</div>
            </div>
          `;
        });

        container.innerHTML = `
          <div class="quiz-step-progress">
            <div class="quiz-progress-bar">
              <div class="quiz-progress-fill" style="width: ${progressPct}%;"></div>
            </div>
            <span class="quiz-step-indicator">${this.currentStep + 1} / ${this.steps.length}</span>
          </div>
          <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px; color: var(--color-primary, #1B3C6E);">${step.title}</h4>
          <p style="font-size: 11px; color: var(--color-text-secondary, #64748B); margin: 0 0 16px;">${step.subtitle}</p>
          <div class="quiz-options-list">
            ${optionsHtml}
          </div>
        `;
      } else {
        this.renderResults(container);
      }
    },

    selectOption: function(key, val) {
      this.answers[key] = val;
      this.currentStep++;
      this.renderStep();
    },

    getTopMatches: function() {
      const list = (window.AMBER_DATA && window.AMBER_DATA.properties) || 
                   (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []);
      if (!list || !list.length) {
        return [
          { name: 'ЖК Amber Park', loc: 'Светлогорск', price: 'от 6.4 млн ₽', match: 98 },
          { name: 'ЖК König Residence', loc: 'Калининград, Центр', price: 'от 7.2 млн ₽', match: 95 },
          { name: 'ЖК Baltic Wave', loc: 'Зеленоградск', price: 'от 5.8 млн ₽', match: 92 }
        ];
      }

      const scored = list.map(p => {
        let score = 70;
        const loc = (p.location || '').toLowerCase();
        const pClass = (p.class || '').toLowerCase();
        const isSea = loc.includes('зеленоградск') || loc.includes('светлогорск') || loc.includes('пионерский') || loc.includes('море');

        if (this.answers.goal === 'sea' && isSea) score += 20;
        if (this.answers.goal === 'family' && !isSea) score += 18;
        if (this.answers.goal === 'invest' && (isSea || (p.rating && p.rating >= 4.7))) score += 20;
        if (this.answers.location === 'all_sea' && isSea) score += 10;
        if (this.answers.location && loc.includes(this.answers.location.toLowerCase())) score += 15;

        return {
          name: p.name,
          loc: p.location || 'Калининград',
          price: p.priceFrom ? `от ${p.priceFrom} млн ₽` : 'по запросу',
          match: Math.min(99, Math.max(88, score))
        };
      });

      scored.sort((a, b) => b.match - a.match);
      return scored.slice(0, 3);
    },

    renderResults: function(container) {
      const topMatches = this.getTopMatches();
      let matchesHtml = '';
      topMatches.forEach(m => {
        matchesHtml += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:8px;">
            <div>
              <div style="font-weight:700;font-size:13px;color:#1B3C6E;">${m.name}</div>
              <div style="font-size:11px;color:#64748B;">📍 ${m.loc} · ${m.price}</div>
            </div>
            <span style="font-size:11px;font-weight:800;background:rgba(16,185,129,0.12);color:#059669;padding:4px 8px;border-radius:6px;">
              ${m.match}% совпадение
            </span>
          </div>
        `;
      });

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:32px;margin-bottom:4px;">🎉</div>
          <h4 style="font-size:16px;font-weight:800;color:#1B3C6E;margin:0 0 4px;">Мы подобрали лучшие варианты!</h4>
          <p style="font-size:11.5px;color:#64748B;margin:0;">Под ваши параметры идеально подходят 3 жилых комплекса:</p>
        </div>

        <div style="margin-bottom:16px;">
          ${matchesHtml}
        </div>

        <div style="background:#FFF8EC;border:1px solid #F5C870;border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-weight:700;font-size:12px;color:#78350F;margin-bottom:4px;">
            📥 Получить закрытую шахматку с планировками и спецценами
          </div>
          <p style="font-size:10.5px;color:#92400E;margin:0 0 10px;">
            Отправим PDF-презентацию со всеми свободными квартирами и акциями застройщиков в мессенджер.
          </p>
          <div class="modal-field" style="margin-bottom:8px;">
            <input class="modal-input" type="tel" id="quiz-phone" placeholder="+7 (___) ___-__-__" autocomplete="tel">
          </div>
          <button class="modal-submit" style="background:#1B3C6E;color:#fff;" onclick="AmberConversion.submitQuizLead()">
            Получить подборку и спеццены (WhatsApp / TG)
          </button>
        </div>
      `;

      setTimeout(() => {
        const phoneInput = document.getElementById('quiz-phone');
        if (phoneInput) {
          applyPhoneMask(phoneInput);
          phoneInput.focus();
        }
      }, 50);
    },

    submitLead: function() {
      const phoneInput = document.getElementById('quiz-phone');
      const phone = phoneInput ? phoneInput.value.trim() : '';
      if (!phone || phone.length < 16) {
        if (phoneInput) {
          phoneInput.style.borderColor = '#EF4444';
          phoneInput.focus();
        }
        return;
      }

      if (typeof window.saveAmberLead === 'function') {
        window.saveAmberLead({
          type: 'Квиз подбора ЖК',
          title: 'Заявка из Smart-квиза',
          details: `Цель: ${this.answers.goal}, Бюджет: до ${this.answers.budget} млн, Локация: ${this.answers.location}`,
          phone: phone,
          time: new Date().toLocaleString('ru-RU')
        });
      }

      const container = document.getElementById('quizModalContent');
      if (container) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px 12px;">
            <div style="font-size:40px;margin-bottom:12px;">✅</div>
            <h4 style="font-size:17px;font-weight:800;color:#1B3C6E;margin:0 0 8px;">Спасибо! Подборка сформирована</h4>
            <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0 0 16px;">
              Мы отправили каталог и закрытую шахматку с планировками на номер <b>${phone}</b>. Эксперт свяжется с вами в течение 5 минут.
            </p>
            <button class="modal-submit" onclick="AmberConversion.closeQuiz()">Понятно, спасибо</button>
          </div>
        `;
      }
    }
  };

  // ─── 4. Lead Magnet PDF Modal ────────────────────────────────────────────
  function openLeadMagnet(zhkNameOrId) {
    let targetName = 'ЖК в Калининграде';
    if (typeof zhkNameOrId === 'number' || (!isNaN(parseInt(zhkNameOrId, 10)) && /^\d+$/.test(String(zhkNameOrId).trim()))) {
      const props = (typeof PROPERTIES !== 'undefined' ? PROPERTIES : []) || (window.PROPERTIES || (window.AMBER_DATA ? window.AMBER_DATA.properties : [])) || [];
      const numId = parseInt(zhkNameOrId, 10);
      const p = props.find(item => item.id === numId);
      if (p) targetName = p.name;
    } else if (typeof zhkNameOrId === 'string' && zhkNameOrId) {
      try { targetName = decodeURIComponent(zhkNameOrId); } catch(e) { targetName = zhkNameOrId; }
    } else if (StickyMobileCTA.activeZhkName) {
      targetName = StickyMobileCTA.activeZhkName;
    }
    let existing = document.getElementById('lead-magnet-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lead-magnet-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:460px;">
        <div class="modal-header">
          <div class="modal-header-text">
            <h3 class="modal-title">📥 Скачать закрытую шахматку квартир</h3>
            <p class="modal-subtitle">${targetName} — актуальные планировки и спеццены</p>
          </div>
          <button class="modal-close" onclick="AmberConversion.closeLeadMagnet()" aria-label="Закрыть">✕</button>
        </div>
        <div class="modal-body" id="leadMagnetBody">
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px;margin-bottom:14px;">
            <div style="font-weight:700;font-size:12px;color:#166534;margin-bottom:2px;">🎁 В презентации для вас:</div>
            <ul style="font-size:11px;color:#15803D;margin:0;padding-left:16px;line-height:1.5;">
              <li>Все свободные планировки со стоимостью за м²</li>
              <li>Скидки от застройщика до 5% при бронировании до конца месяца</li>
              <li>Расчет субсидированной ипотеки с платежом от 19 800 ₽/мес</li>
            </ul>
          </div>
          <div class="modal-field">
            <label class="modal-label" for="magnet-name">Ваше имя</label>
            <input class="modal-input" type="text" id="magnet-name" placeholder="Александр" autocomplete="given-name">
          </div>
          <div class="modal-field">
            <label class="modal-label" for="magnet-phone">Телефон (для отправки в WhatsApp / TG)</label>
            <input class="modal-input" type="tel" id="magnet-phone" placeholder="+7 (___) ___-__-__" autocomplete="tel">
          </div>
          <button class="modal-submit" onclick="AmberConversion.submitLeadMagnet('${targetName.replace(/'/g, "\\'")}')">
            Скачать PDF-шахматку прямо сейчас
          </button>
          <p class="modal-consent">Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLeadMagnet();
    });

    setTimeout(() => {
      const phoneInput = document.getElementById('magnet-phone');
      if (phoneInput) applyPhoneMask(phoneInput);
      const nameInput = document.getElementById('magnet-name');
      if (nameInput) nameInput.focus();
    }, 50);
  }

  function closeLeadMagnet() {
    const overlay = document.getElementById('lead-magnet-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 200);
  }

  function submitLeadMagnet(zhkName) {
    const nameVal = (document.getElementById('magnet-name')?.value || '').trim();
    const phoneVal = (document.getElementById('magnet-phone')?.value || '').trim();

    if (!phoneVal || phoneVal.length < 16) {
      const phoneEl = document.getElementById('magnet-phone');
      if (phoneEl) { phoneEl.style.borderColor = '#EF4444'; phoneEl.focus(); }
      return;
    }

    if (typeof window.saveAmberLead === 'function') {
      window.saveAmberLead({
        type: 'Скачивание шахматки PDF',
        title: `Запрос шахматки: ${zhkName}`,
        name: nameVal || 'Пользователь',
        phone: phoneVal,
        time: new Date().toLocaleString('ru-RU')
      });
    }

    const body = document.getElementById('leadMagnetBody');
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;padding:20px 8px;">
          <div style="font-size:36px;margin-bottom:8px;">📄</div>
          <h4 style="font-size:16px;font-weight:800;color:#1B3C6E;margin:0 0 6px;">Файл отправлен!</h4>
          <p style="font-size:11.5px;color:#64748B;line-height:1.5;margin:0 0 16px;">
            Презентация и актуальная шахматка <b>${zhkName}</b> отправлены на номер <b>${phoneVal}</b>.
          </p>
          <button class="modal-submit" onclick="AmberConversion.closeLeadMagnet()">Закрыть</button>
        </div>
      `;
    }
  }

  // ─── 5. Card Photo Slider & Mobile Swipe Gallery ─────────────────────────
  let isCardSwiping = false;
  let cardTouchStartX = 0;
  let cardTouchStartY = 0;

  document.addEventListener('touchstart', function(e) {
    if (e.target.closest('.card-photo-slider')) {
      cardTouchStartX = e.touches[0].clientX;
      cardTouchStartY = e.touches[0].clientY;
      isCardSwiping = false;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (e.target.closest('.card-photo-slider')) {
      const diffX = Math.abs(e.touches[0].clientX - cardTouchStartX);
      const diffY = Math.abs(e.touches[0].clientY - cardTouchStartY);
      if (diffX > 10) {
        isCardSwiping = true;
      }
    }
  }, { passive: true });

  function handleCardPhotoScroll(sliderEl) {
    if (!sliderEl) return;
    const scrollLeft = sliderEl.scrollLeft;
    const width = sliderEl.clientWidth || 1;
    const activeIndex = Math.round(scrollLeft / width);
    const container = sliderEl.closest('.card-image-col');
    if (!container) return;

    const dots = container.querySelectorAll('.photo-dot');
    dots.forEach((dot, idx) => {
      if (idx === activeIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    const countText = container.querySelector('.photo-count-text');
    const total = dots.length;
    if (countText && total > 1) {
      countText.textContent = `${activeIndex + 1} / ${total} фото`;
    }
  }

  function handleCardSlideClick(e, cardId) {
    if (isCardSwiping) {
      if (e && e.stopPropagation) e.stopPropagation();
      return;
    }
    if (typeof window.openGallery === 'function') {
      window.openGallery(cardId);
    }
  }

  window.handleCardPhotoScroll = handleCardPhotoScroll;
  window.handleCardSlideClick = handleCardSlideClick;

  // ─── 6. Global API Export & Auto-Initialization ──────────────────────────
  const AmberConversion = {
    init: function() {
      StickyMobileCTA.init();
      // Auto-apply phone mask on availability modal if opened
      const observer = new MutationObserver(() => {
        const phone = document.getElementById('modal-phone');
        if (phone) applyPhoneMask(phone);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },
    handleStickyAction: function() {
      if (typeof window.showAvailability === 'function') {
        window.showAvailability(StickyMobileCTA.activeZhkName);
      } else {
        openLeadMagnet(StickyMobileCTA.activeZhkName);
      }
    },
    openSmartQuiz: function() {
      SmartQuiz.open();
    },
    closeQuiz: function() {
      SmartQuiz.close();
    },
    selectQuizOption: function(key, val) {
      SmartQuiz.selectOption(key, val);
    },
    submitQuizLead: function() {
      SmartQuiz.submitLead();
    },
    openLeadMagnet: openLeadMagnet,
    closeLeadMagnet: closeLeadMagnet,
    submitLeadMagnet: submitLeadMagnet,
    applyPhoneMask: applyPhoneMask,
    handleCardPhotoScroll: handleCardPhotoScroll,
    handleCardSlideClick: handleCardSlideClick,
    StickyMobileCTA: StickyMobileCTA,
    SmartQuiz: SmartQuiz
  };

  window.AmberConversion = AmberConversion;
  window.openSmartQuiz = function() { AmberConversion.openSmartQuiz(); };
  window.openLeadMagnet = function(name) { AmberConversion.openLeadMagnet(name); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AmberConversion.init());
  } else {
    AmberConversion.init();
  }

})(typeof window !== 'undefined' ? window : this, typeof document !== 'undefined' ? document : {});
