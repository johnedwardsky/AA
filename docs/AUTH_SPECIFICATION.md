# Спецификация системы аутентификации и авторизации (JWT / RBAC / Argon2id)

**Проект:** Amber Avenue — Агрегатор новостроек Калининграда и курортного побережья Балтики  
**Версия спецификации:** 2.0.0 (Enterprise Security Architecture)  
**Протокол:** OAuth 2.0 / OpenID Connect compliant Dual-Token JWT  
**Криптография:** Argon2id (пароли), RS256 / EdDSA (токены), SHA-256 (токены сессий)

---

## 1. Архитектура Dual-Token JWT

Система аутентификации Amber Avenue построена на архитектуре короткоживущих маркеров доступа (**Access Token**) и долгоживущих маркеров обновления (**Refresh Token**) с принудительной ротацией при каждом запросе.

```
       ┌────────────────┐                  ┌────────────────┐                  ┌────────────────┐
       │  Client (SPA)  │                  │  Auth Service  │                  │  Redis Store   │
       └───────┬────────┘                  └───────┬────────┘                  └───────┬────────┘
               │                                   │                                   │
               │ 1. POST /api/v1/auth/login        │                                   │
               ├──────────────────────────────────►│                                   │
               │    { email, password }            │ 2. Проверка Argon2id хэша         │
               │                                   │ 3. Генерация Access JWT (15 мин)  │
               │                                   │ 4. Генерация Refresh Token (30 дн)│
               │                                   │ 5. Сохранение Refresh ID в Redis  │
               │                                   ├──────────────────────────────────►│
               │ 6. 200 OK                         │                                   │
               │    Body: { accessToken }          │                                   │
               │    Cookie: __Host-refresh_token   │                                   │
               │◄──────────────────────────────────┤                                   │
               │                                   │                                   │
               │ 7. Запрос с Bearer AccessToken    │                                   │
               ├──────────────────────────────────►│ (Локальная проверка подписи)      │
               │ 8. 200 OK (Данные)                │                                   │
               │◄──────────────────────────────────┤                                   │
               │                                   │                                   │
               │ [Через 15 минут: AccessToken истек]                                   │
               │ 9. POST /api/v1/auth/refresh      │                                   │
               ├──────────────────────────────────►│ 10. Проверка Refresh Token        │
               │    Cookie: __Host-refresh_token   ├──────────────────────────────────►│
               │                                   │ 11. Удаление старого Refresh ID   │
               │                                   │ 12. Выпуск нового Refresh ID      │
               │                                   ├──────────────────────────────────►│
               │ 13. 200 OK (Новая пара токенов)   │                                   │
               │◄──────────────────────────────────┤                                   │
```

### 1.1 Спецификация Access Token
- **Тип:** JSON Web Token (RFC 7519).
- **Алгоритм подписи:** `RS256` (RSA Signature with SHA-256, 2048-bit key) или `EdDSA` (Ed25519).
- **Время жизни (TTL):** 15 минут (900 секунд).
- **Передача:** Заголовок `Authorization: Bearer <accessToken>`.
- **Верификация:** Stateless (микросервисы валидируют токен локально с помощью публичного ключа `public.pem` без обращения к БД).

#### Структура Payload Access токена:
```json
{
  "iss": "https://api.amberavenue.ru",
  "sub": "018e4f1a-bc23-74d1-9f12-000000000001",
  "aud": "amberavenue-spa",
  "iat": 1724610000,
  "exp": 1724610900,
  "jti": "8f3b5e43-a912-4e07-b194-d80a1c62f279",
  "role": "developer_admin",
  "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
  "developerName": "ГК «Расцвет»",
  "email": "admin@rascvet39.ru",
  "name": "Алексей Воронов",
  "permissions": [
    "properties:read",
    "properties:write",
    "moderation:submit",
    "leads:read",
    "leads:write",
    "leads:export",
    "employees:manage",
    "tariffs:read"
  ]
}
```

---

### 1.2 Спецификация Refresh Token и Cookie Security
- **Тип:** Криптографически стойкая случайная последовательность (256 бит энтропии), кодированная в Base64URL.
- **Время жизни (TTL):** 30 дней (2 592 000 секунд).
- **Хранение на клиенте:** Защищенная Cookie `__Host-refresh_token`:
  ```http
  Set-Cookie: __Host-refresh_token=rt_9a8f4c2e1b7d5a0f...; Path=/api/v1/auth; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict
  ```
  - `__Host-` префикс: гарантирует передачу только по HTTPS и запрещает перезапись поддоменами.
  - `HttpOnly`: предотвращает кражу токена через XSS-атаки.
  - `SameSite=Strict`: полностью блокирует CSRF-атаки при межсайтовых запросах.
  - `Secure`: передача исключительно по зашифрованному TLS-каналу.

### 1.3 Алгоритм ротации Refresh токенов и защита от кражи (Family Token Revocation)
1. При каждом обращении к `/api/v1/auth/refresh` старый Refresh Token немедленно инвалидируется в Redis.
2. Клиенту выпускается **новый** Refresh Token с обновленным TTL.
3. Если сервер получает запрос с Refresh токеном, который уже был использован ранее (признак перехвата и попытки повторного использования злоумышленником):
   - Система детектирует факт компрометации.
   - **Немедленно отзываются ВСЕ сессии пользователя** на всех устройствах (удаление семейства токенов `family_id` в Redis).
   - В журнал аудита отправляется критическое предупреждение `SECURITY_BREACH_SUSPECTED`.

---

## 2. Хэширование паролей: Спецификация Argon2id

Для защиты учетных записей от атак по подбору по словарю, брутфорсу на GPU/ASIC используется алгоритм **Argon2id** (победитель Password Hashing Competition, RFC 9106).

### 2.1 Параметры функции формирования ключа (KDF):
- **Алгоритм:** Argon2id (гибрид Argon2d и Argon2i, защищенный от атак по сторонним каналам и Time-Memory Tradeoff).
- **Memory Cost ($m$):** 65 536 КБ (64 МБ RAM на один расчет хэша).
- **Time Cost ($t$):** 3 итерации.
- **Parallelism ($p$):** 4 вычислительных потока.
- **Длина соли ($salt$):** 16 байт (генерируется через `crypto.randomBytes(16)`).
- **Длина выходного хэша:** 32 байта.

### 2.2 Пример хэша в формате PHC:
```
$argon2id$v=19$m=65536,t=3,p=4$q8J0Xw1y4K7zNp2R8vL0Mw$zVn7jR9KxP3wQ2sY5tU8mB1aC6dE4fG7hI0jK3lM6nO
```

---

## 3. Переходный мост миграции с 6-значных кодов доступа

В настоящее время застройщики используют 6-значный пин-код быстрого доступа (`auth_developer_code`). Серверный бэкэнд реализует двухэтапную бесшовную миграцию:

1. **Фаза 1 (Поддержка быстрого входа):**
   - Пин-код застройщика хэшируется с солью с использованием Argon2id и сохраняется в `developer_settings.access_code_hash`.
   - В эндпоинте `POST /api/v1/auth/login` поддерживается авторизация по комбинации `developerId` + `accessCode`.
2. **Фаза 2 (Принудительная привязка корпоративного Email и пароля):**
   - При первом входе по 6-значному коду система переводит застройщика в режим `pending_credentials_setup`.
   - Пользователю предлагается задать рабочий Email администратора и надежный пароль (длина $\ge 10$ символов, буквы верхнего/нижнего регистра, цифры и спецсимволы).
   - После подтверждения Email через одноразовую ссылку 6-значный код становится вторичным фактором либо полностью отключается.

---

## 4. Ролевая модель доступа (RBAC) и матрица разрешений

В платформе Amber Avenue определены **4 роли пользователей застройщиков и платформы**:
1. `superadmin` — Главный системный администратор и модератор Amber Avenue.
2. `developer_admin` — Руководитель компании-застройщика / директор по маркетингу.
3. `developer_manager` — Старший менеджер отдела продаж застройщика.
4. `developer_employee` — Рядовой менеджер / агент.

Дополнительная роль: `portal_user` (покупатель новостроек, оставляющий заявки).

### 4.1 Детальная матрица разрешений (RBAC Permission Matrix)

| Гранулярный скоуп (Permission Scope) | `superadmin` | `developer_admin` | `developer_manager` | `developer_employee` |
|---|:---:|:---:|:---:|:---:|
| `portal:settings:manage` |  | — | — | — |
| `portal:banners:manage` |  | — | — | — |
| `portal:articles:manage` |  | — | — | — |
| `portal:experts:manage` |  | — | — | — |
| `tariffs:assign` |  | — | — | — |
| `moderation:approve_reject` |  | — | — | — |
| `company:profile:read` |  (Все) |  (Своя) |  (Своя) |  (Своя) |
| `company:profile:edit` |  |  | — | — |
| `company:requisites:edit_214fz`|  |  | — | — |
| `employees:list` |  (Все) |  (Свои) |  (Свои) | — |
| `employees:create_edit_delete` |  |  | — | — |
| `documents:read` |  (Все) |  (Свои) |  (Свои) |  (Свои) |
| `documents:upload_delete` |  |  |  | — |
| `properties:list` |  (Все) |  (Свои) |  (Свои) |  (Свои) |
| `properties:create` |  |  |  | — |
| `properties:edit` |  (Все) |  (Свои) |  (Свои) | — |
| `properties:archive` |  |  | — | — |
| `properties:photos:manage` |  |  |  | — |
| `moderation:submit` | — |  |  | — |
| `leads:view_all_global` |  | — | — | — |
| `leads:view_own_developer` |  |  |  |  (Назнач.) |
| `leads:status_change` |  |  |  |  |
| `leads:export_csv` |  |  |  | — |
| `placements:calendar:view` |  |  |  |  |
| `placements:book` |  |  | — | — |
| `analytics:basic:view` |  (Все) |  (Свои) |  (Свои) |  (Свои) |
| `analytics:traffic:view` (PRO) |  |  (При тарифе) |  (При тарифе) | — |
| `analytics:competitors:view` (PRO) |  |  (При тарифе) |  (При тарифе) | — |
| `analytics:reports:export` (PRO)|  |  (При тарифе) |  (При тарифе) | — |
| `audit_logs:view` |  (Глобальный) |  (Свой) | — | — |

---

## 5. Управление сессиями и отзыв токенов в Redis

### 5.1 Структура ключей в Redis

```redis
# 1. Хранение активной сессии (TTL 30 дней)
SET session:user:<userId>:<sessionId> "{\"device\":\"macOS Chrome\",\"ip\":\"178.23.44.12\",\"familyId\":\"fam_1289\"}" EX 2592000

# 2. Маппинг Refresh Token Hash -> Session ID
SET refresh_hash:<sha256(refreshToken)> "<sessionId>" EX 2592000

# 3. Черный список отозванных Access токенов (JTI Blacklist, TTL = остаток жизни токена, макс 15 мин)
SET blacklist:jti:<jti> "revoked_by_logout" EX 900
```

### 5.2 Процесс завершения сессии (Logout Flow)
1. Клиент вызывает `POST /api/v1/auth/logout`.
2. Сервер извлекает `jti` из заголовка `Authorization: Bearer <token>` и записывает его в Redis Blacklist с TTL 900 сек.
3. Сервер извлекает хэш Refresh токена из cookie и удаляет сессию из Redis.
4. Сервер возвращает заголовок очистки cookie:
   ```http
   Set-Cookie: __Host-refresh_token=; Path=/api/v1/auth; Max-Age=0; Secure; HttpOnly; SameSite=Strict
   ```
