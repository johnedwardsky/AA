# Спецификация информационной безопасности и серверной инфраструктуры

**Проект:** Amber Avenue — Агрегатор новостроек Калининграда и курортного побережья Балтики  
**Версия спецификации:** 2.0.0 (Enterprise Security & Infrastructure Blueprint)  
**Регуляторные требования:** Федеральный закон № 152-ФЗ «О персональных данных», № 214-ФЗ, № 347-ФЗ (маркировка рекламы)  
**Инфраструктура:** High-Availability Cluster (Nginx + Node.js + PostgreSQL 16 + Redis 7 + S3)

---

## 1. Архитектура безопасности веб-приложения (Application Security)

### 1.1 Защита от межсайтового скриптинга (XSS Mitigation)
1. **Санитизация входящего HTML-контента:** Весь форматированный текст (статьи блога, описания ЖК, комментарии модераторов) очищается на сервере с помощью библиотеки `DOMPurify` с белым списком безопасных тегов (`<p>`, `<b>`, `<i>`, `<ul>`, `<ol>`, `<li>`, `<h3>`, `<h4>`, `<a>`, `<img>`):
   ```typescript
   import createDOMPurify from 'dompurify';
   import { JSDOM } from 'jsdom';

   const window = new JSDOM('').window;
   const DOMPurify = createDOMPurify(window);

   export function sanitizeHtmlContent(dirtyHtml: string): string {
     return DOMPurify.sanitize(dirtyHtml, {
       ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'img'],
       ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
       ALLOW_DATA_ATTR: false
     });
   }
   ```
2. **Контекстное экранирование:** SPA-шаблоны используют автоматическое экранирование текста, исключающее выполнение inline-скриптов.

---

### 1.2 Политика безопасности контента (Content Security Policy Level 3)

Nginx и сервер приложений отдают строгие заголовки CSP:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{RANDOM_NONCE}' https://api-maps.yandex.ru https://mc.yandex.ru; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://cdn.amberavenue.ru https://*.storage.yandexcloud.net https://mc.yandex.ru; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.amberavenue.ru https://api-maps.yandex.ru https://mc.yandex.ru https://*.storage.yandexcloud.net; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; block-all-mixed-content; upgrade-insecure-requests;
```

#### Дополнительные защитные заголовки:
- `X-Content-Type-Options: nosniff` (блокировка MIME-sniffing).
- `X-Frame-Options: SAMEORIGIN` (защита от Clickjacking).
- `X-XSS-Protection: 1; mode=block`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS).

---

### 1.3 Защита от межсайтовой подделки запросов (CSRF Mitigation)
- **SameSite=Strict Cookies:** Refresh токены хранятся исключительно в cookies с атрибутом `SameSite=Strict`, что предотвращает отправку куки сторонними сайтами.
- **Custom Request Header Verification:** Все мутирующие API-запросы (POST/PUT/PATCH/DELETE) требуют наличия заголовка `X-Requested-With: XMLHttpRequest` или `X-Amber-Client: SPA-v2`, которые невозможно отправить через обычные HTML-формы злоумышленника.

---

### 1.4 Защита от подбора паролей и DoS-атак (Rate Limiting)

На базе **Redis Token Bucket** реализованы раздельные лимиты частоты запросов:

| Группа маршрутов | Лимит | Окно времени | Действие при превышении |
|---|---|---|---|
| **Авторизация (`/auth/login`)** | 5 запросов | 1 минута | Блокировка IP на 15 минут + HTTP 429 |
| **Ингейст лидов (`/leads`)** | 10 запросов | 1 час на IP | Включение невидимой ReCaptcha v3 / SmartCaptcha |
| **Смена пароля / 2FA** | 3 запроса | 10 минут | Блокировка попыток + уведомление на email |
| **Публичные запросы каталога** | 120 запросов | 1 минута | HTTP 429 Too Many Requests |
| **Аналитика (`/analytics/track`)** | 300 событий | 1 минута | Мягкое отбрасывание спам-событий |

---

### 1.5 Соответствие Федеральному закону № 152-ФЗ «О персональных данных»

1. **Локализация баз данных:** Все серверы баз данных (PostgreSQL, Redis) и файловые хранилища физически размещены в дата-центрах на территории Российской Федерации (г. Москва, г. Санкт-Петербург).
2. **Криптографическая фиксация согласий:** При отправке заявки сохраняется неизменяемый слепок согласия: IP-адрес, точное время, версия политики конфиденциальности (`policyVersion: "2026.1"`) и хэш текста согласия.
3. **Право на забвение:** Реализован эндпоинт деперсонализации и удаления персональных данных клиента по запросу субъекта ПДн с сохранением анонимизированной статистики сделок.

---

## 2. Архитектура инфраструктуры высокой доступности (High Availability Topology)

```
                              [ ВХОДЯЩИЙ ТРАФИК ]
                                       │
                                       ▼
                       [ Qrator / Cloudflare WAF ]
                  (Защита от L3/L4/L7 DDoS и ботнетов)
                                       │
                                       ▼
                       [ Nginx Edge Reverse Proxy ]
               (TLS 1.3 Termination, HTTP/2, Brotli, CSP)
                                       │
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
          [ Static Frontend CDN ]             [ Node.js API Cluster ]
          (Yandex Cloud CDN Edge)             (Fastify/NestJS 3 Replicas)
                                                         │
                     ┌───────────────────┬───────────────┴───────────────┐
                     ▼                   ▼                               ▼
          [ PostgreSQL 16 Clust ] [ Redis 7 Cluster ]          [ S3 Object Store ]
          (Primary + Sync Repl)   (Sentinel HA + Cache)        (Public / Private)
```

### 2.1 Конфигурация Nginx (Edge Ingress)

```nginx
# /etc/nginx/conf.d/amberavenue.conf

upstream node_api_backend {
    least_conn;
    server 127.0.0.1:4001 max_fails=3 fail_timeout=10s;
    server 127.0.0.1:4002 max_fails=3 fail_timeout=10s;
    server 127.0.0.1:4003 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    server_name amberavenue.ru api.amberavenue.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name amberavenue.ru api.amberavenue.ru;

    # SSL Параметры (Mozilla Modern Configuration)
    ssl_certificate /etc/letsencrypt/live/amberavenue.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amberavenue.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Сжатие Brotli & Gzip
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml+rss image/svg+xml;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss image/svg+xml;

    # API Proxying
    location /api/ {
        proxy_pass http://node_api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Static Assets & SPA Fallback
    location / {
        root /var/www/amberavenue;
        index index.html;
        try_files $uri $uri/ /index.html;
        expires 1h;
    }
}
```

---

## 3. Автоматизированный CI/CD пайплайн (GitHub Actions)

```yaml
# .github/workflows/deploy-production.yml
name: Amber Avenue Production CI/CD

on:
  push:
    branches: [main]

jobs:
  lint-and-test:
    name: Code Quality & Automated Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Static Analysis & ESLint
        run: npm run lint

      - name: Run E2E & Unit Test Suites (Tier 1-4)
        run: npm run test:all

  build-and-security-scan:
    name: Docker Build & Vulnerability Scan
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Build Docker API Image
        run: |
          docker build -t amberavenue-api:${{ github.sha }} -f Dockerfile .

      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'amberavenue-api:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

  deploy-production:
    name: Zero-Downtime Rolling Deployment
    needs: build-and-security-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production Cluster via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/amberavenue
            docker pull registry.amberavenue.ru/api:${{ github.sha }}
            docker exec api_app_1 npx prisma migrate deploy
            docker service update --image registry.amberavenue.ru/api:${{ github.sha }} --update-parallelism 1 --update-delay 10s amber_api_stack
```

---

## 4. Стратегия резервного копирования и Disaster Recovery (DRP)

### 4.1 Непрерывная репликация и архивация (WAL-G Continuous Archiving)
1. **Write-Ahead Logging (WAL):** PostgreSQL непрерывно передает WAL-сегменты через утилиту `wal-g` в изолированный холодный S3-бакет `amber-backups-cold`.
2. **Point-In-Time Recovery (PITR):** Возможность восстановления состояния базы данных на любую секунду за последние 30 дней.

### 4.2 Ежесуточные полные снимки (Full Backups)
- **Расписание:** Каждую ночь в 03:00 UTC.
- **Шифрование:** Симметричное шифрование архива алгоритмом `AES-256-GCM` до отправки в удаленный дата-центр.
- **Срок хранения:** 30 ежедневных дампов, 12 ежемесячных архивов.

### 4.3 Целевые показатели непрерывности бизнеса
- **RPO (Recovery Point Objective):** $\le 5$ минут (максимально допустимая потеря данных при глобальной аварии дата-центра).
- **RTO (Recovery Time Objective):** $\le 30$ минут (максимальное время полного восстановления работоспособности сервиса).
