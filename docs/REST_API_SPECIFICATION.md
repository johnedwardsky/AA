# Спецификация REST API (OpenAPI 3.1): Платформа Amber Avenue

**Проект:** Amber Avenue — Агрегатор новостроек Калининграда и курортного побережья Балтики  
**Версия спецификации:** 2.0.0 (Production API Blueprint)  
**Базовый URL:** `https://api.amberavenue.ru/api/v1`  
**Формат данных:** `application/json` (кодировка UTF-8)  
**Аутентификация:** Dual-Token JWT (Access Token в заголовке `Authorization: Bearer <token>`, Refresh Token в HttpOnly Cookie)

---

## 1. Архитектурные стандарты и форматы ответов

### 1.1 Стандартный конверт успешного ответа (Standard JSON Envelope)
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    serverTimestamp?: string;
  };
}
```

### 1.2 Стандартный конверт ошибки (Standard Error Envelope)
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Машиночитаемый код (например, "UNAUTHORIZED", "VALIDATION_FAILED")
    message: string;        // Человекочитаемое описание на русском языке
    details?: Record<string, string[]>; // Ошибки валидации по полям формы
    traceId?: string;       // Уникальный ID запроса для трассировки логов (UUID)
  };
}
```

### 1.3 HTTP статус-коды
- `200 OK`: Успешное выполнение GET/PUT/PATCH запроса.
- `201 Created`: Успешное создание ресурса через POST.
- `204 No Content`: Успешное удаление ресурса через DELETE.
- `400 Bad Request`: Некорректный синтаксис запроса / неверные параметры.
- `401 Unauthorized`: Отсутствует или истек Access Token.
- `403 Forbidden`: Недостаточно прав для выполнения действия (RBAC отказ).
- `404 Not Found`: Запрашиваемый ресурс не найден.
- `422 Unprocessable Entity`: Ошибки валидации бизнес-логики или схемы данных.
- `429 Too Many Requests`: Превышен лимит запросов (Rate Limiting).
- `500 Internal Server Error`: Внутренняя ошибка сервера.

---

## 2. Сводный реестр эндпоинтов (38 эндпоинтов)

| Группа | Метод | URL | Назначение | RBAC Доступ |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Авторизация пользователя (пароль / код доступа) | Public |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Ротация токенов (Access / Refresh) | Public (Cookie) |
| **Auth** | `POST` | `/api/v1/auth/logout` | Завершение сессии и отзыв токена | Authenticated |
| **Auth** | `GET` | `/api/v1/auth/me` | Данные текущего авторизованного пользователя | Authenticated |
| **Auth** | `POST` | `/api/v1/auth/register-developer` | Подача заявки девелопера на подключение к платформе | Public |
| **Auth** | `POST` | `/api/v1/auth/change-access-code` | Смена 6-значного кода быстрого доступа | `superadmin`, `developer_admin` |
| **Developers** | `GET` | `/api/v1/developers` | Список девелоперов с пагинацией и фильтрами | Public |
| **Developers** | `GET` | `/api/v1/developers/{id}` | Детальная карточка девелопера | Public |
| **Developers** | `PUT` | `/api/v1/developers/{id}` | Обновление основных параметров девелопера | `superadmin`, `developer_admin` |
| **Company Info** | `GET` | `/api/v1/developers/{id}/company-info` | Полные реквизиты, 214-ФЗ лицензии и география | `superadmin`, `developer_admin` |
| **Company Info** | `PUT` | `/api/v1/developers/{id}/company-info` | Редактирование реквизитов и документов компании | `superadmin`, `developer_admin` |
| **Employees** | `GET` | `/api/v1/developers/{devId}/employees` | Список сотрудников компании-застройщика | `superadmin`, `developer_admin` |
| **Employees** | `POST` | `/api/v1/developers/{devId}/employees` | Добавление нового сотрудника с назначением роли | `superadmin`, `developer_admin` |
| **Employees** | `PUT` | `/api/v1/developers/{devId}/employees/{empId}` | Редактирование профиля/роли сотрудника | `superadmin`, `developer_admin` |
| **Employees** | `DELETE`| `/api/v1/developers/{devId}/employees/{empId}` | Блокировка/удаление сотрудника | `superadmin`, `developer_admin` |
| **Properties** | `GET` | `/api/v1/properties` | Каталог ЖК с фильтрацией (город, море, класс, цена) | Public |
| **Properties** | `GET` | `/api/v1/properties/{id}` | Полные данные карточки ЖК (все 9 разделов) | Public |
| **Properties** | `POST` | `/api/v1/properties` | Создание новой карточки ЖК (черновик) | `developer_admin`, `developer_manager` |
| **Properties** | `PUT` | `/api/v1/properties/{id}` | Редактирование характеристик, цен и описания ЖК | `developer_admin`, `developer_manager` |
| **Properties** | `DELETE`| `/api/v1/properties/{id}` | Архивация карточки жилого комплекса | `superadmin`, `developer_admin` |
| **Properties** | `POST` | `/api/v1/properties/{id}/photos` | Загрузка и сортировка фотографий ЖК | `developer_admin`, `developer_manager` |
| **Moderation** | `GET` | `/api/v1/moderation/queue` | Очередь заявок на проверку ЖК | `superadmin` |
| **Moderation** | `GET` | `/api/v1/moderation/{propertyId}` | Детальный статус проверки и комментарии по 9 табам | `superadmin`, `developer_*` |
| **Moderation** | `POST` | `/api/v1/moderation/{propertyId}/submit` | Отправка карточки ЖК на модерацию | `developer_admin`, `developer_manager` |
| **Moderation** | `POST` | `/api/v1/moderation/{propertyId}/approve` | Утверждение модератором публикации объекта | `superadmin` |
| **Moderation** | `POST` | `/api/v1/moderation/{propertyId}/request-changes` | Возврат на доработку с замечаниями по секциям | `superadmin` |
| **Leads CRM** | `GET` | `/api/v1/leads` | Реестр лидов с ролевым разделением (Dev vs Admin) | `superadmin`, `developer_*` |
| **Leads CRM** | `POST` | `/api/v1/leads` | Создание лида из интерактивных виджетов сайта | Public |
| **Leads CRM** | `PATCH`| `/api/v1/leads/{id}/status` | Смена статуса обработки лида | `superadmin`, `developer_*` |
| **Leads CRM** | `GET` | `/api/v1/leads/export/csv` | Выгрузка реестра лидов в формате CSV/Excel | `superadmin`, `developer_admin` |
| **Tariffs** | `GET` | `/api/v1/tariffs/catalog` | Каталог доступных тарифных планов платформы | Public |
| **Tariffs** | `GET` | `/api/v1/tariffs/developer/{devId}` | Текущий активный тариф и модули застройщика | `superadmin`, `developer_*` |
| **Tariffs** | `PUT` | `/api/v1/tariffs/developer/{devId}` | Назначение/продление тарифа и модулей застройщику | `superadmin` |
| **Placements** | `GET` | `/api/v1/placements/calendar` | Сетка занятости 8 типов рекламных слотов | `superadmin`, `developer_*` |
| **Placements** | `POST` | `/api/v1/placements/book` | Бронирование рекламного размещения | `superadmin` |
| **Audit** | `GET` | `/api/v1/audit/logs` | Запрос журнала аудита с SHA-256 верификацией | `superadmin`, `developer_admin` |
| **Analytics** | `POST` | `/api/v1/analytics/track` | Ингейст потока событий активности пользователей | Public |
| **Analytics** | `GET` | `/api/v1/analytics/developer/{devId}/dashboard` | Сводная панель аналитики застройщика (Воронка, Трафик) | `superadmin`, `developer_*` |

---

## 3. Детальная спецификация эндпоинтов

### 3.1 Домен: Аутентификация и пользователи

#### `POST /api/v1/auth/login`
- **Описание:** Аутентификация по Email/паролю либо по коду быстрого доступа застройщика (6 цифр).
- **Права доступа:** Public.
- **Request Body:**
```json
{
  "email": "admin@rascvet39.ru",
  "password": "SecurePassword2026!",
  "accessCode": "849201"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": "018e4f1a-bc23-74d1-9f12-000000000001",
      "email": "admin@rascvet39.ru",
      "firstName": "Алексей",
      "lastName": "Воронов",
      "role": "developer_admin",
      "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
      "developerName": "ГК «Расцвет»"
    }
  }
}
```
- **Set-Cookie Header:** `__Host-refresh_token=rt_9a8f...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000`
- **Ошибки:** `400 Bad Request` (неверные поля), `401 Unauthorized` (неверный пароль/код), `429 Too Many Requests` (превышен лимит 5 попыток/мин).

---

#### `POST /api/v1/auth/refresh`
- **Описание:** Выпуск новой пары Access (15 мин) и Refresh (30 дней) токенов с немедленной ротацией.
- **Права доступа:** Public (требуется валидный cookie `__Host-refresh_token`).
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```
- **Ошибки:** `401 Unauthorized` (токен отозван или устарел — перенаправление на страницу входа).

---

#### `POST /api/v1/auth/register-developer`
- **Описание:** Регистрация нового застройщика на портале Amber Avenue с верификацией по ИНН.
- **Права доступа:** Public.
- **Request Body:**
```json
{
  "brandName": "Балтийский Дом Девелопмент",
  "legalName": "ООО «СЗ БАЛТИЙСКИЙ ДОМ»",
  "inn": "3906389201",
  "ogrn": "1203900014520",
  "contactPerson": "Иванов Сергей Викторович",
  "phone": "+7 (4012) 99-88-77",
  "email": "info@baltdom39.ru",
  "password": "StrongPassword2026!"
}
```
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "developerId": "018e4f1a-bc23-74d1-9f12-000000000055",
    "status": "pending_verification",
    "message": "Заявка принята. Менеджер Amber Avenue свяжется с вами для активации кабинета."
  }
}
```

---

### 3.2 Домен: Застройщики и реквизиты компании (214-ФЗ)

#### `GET /api/v1/developers/{id}/company-info`
- **Описание:** Получение полных юридических реквизитов, информации о 214-ФЗ, банковских счетах и географии застройки.
- **Права доступа:** `superadmin`, `developer_admin` (только своей компании).
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
    "brandName": "ГК «Расцвет»",
    "legalName": "ООО «Специализированный Застройщик РАСЦВЕТ-СТРОЙ»",
    "inn": "3906341290",
    "ogrn": "1183926012345",
    "kpp": "390601001",
    "legalAddress": "236022, г. Калининград, ул. Театральная, д. 30, офис 401",
    "actualAddress": "236022, г. Калининград, ул. Театральная, д. 30, офис 401",
    "bankRequisites": {
      "settlementAccount": "40702810900000012345",
      "correspondentAccount": "30101810200000000601",
      "bik": "042748601",
      "bankName": "Калининградское отделение №8626 ПАО Сбербанк"
    },
    "contacts": {
      "phone": "+7 (4012) 77-88-99",
      "email": "sales@rascvet39.ru",
      "websiteUrl": "https://rascvet39.ru",
      "logoUrl": "https://cdn.amberavenue.ru/media/devs/logo-rascvet.png"
    },
    "geography": [
      { "region": "city", "district": "Ленинградский район", "isPrimary": true },
      { "region": "sea", "district": "г. Светлогорск", "isPrimary": false }
    ],
    "licensing214Fz": {
      "hasEscrowAccreditation": true,
      "authorizedBanks": ["ПАО Сбербанк", "Банк ВТБ (ПАО)", "АО «Банк ДОМ.РФ»"],
      "eiszRegistrationNumber": "ЕИСЖС-39-00452",
      "complianceCertDate": "2024-02-15"
    }
  }
}
```

---

#### `PUT /api/v1/developers/{id}/company-info`
- **Описание:** Сохранение обновленных юридических данных и реквизитов компании.
- **Права доступа:** `superadmin`, `developer_admin`.
- **Request Body:** Схема соответствует структуре ответа выше.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "updatedAt": "2026-08-25T18:40:00.000Z",
    "message": "Реквизиты компании успешно сохранены"
  }
}
```

---

### 3.3 Домен: Управление сотрудниками

#### `GET /api/v1/developers/{devId}/employees`
- **Описание:** Получение списка сотрудников девелопера с их ролями в кабинете.
- **Права доступа:** `superadmin`, `developer_admin`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "018e4f1a-bc23-74d1-9f12-000000000101",
      "fullName": "Смирнова Елена Сергеевна",
      "jobTitle": "Руководитель отдела продаж",
      "phone": "+7 (911) 450-11-22",
      "email": "e.smirnova@rascvet39.ru",
      "cabinetRole": "admin",
      "status": "active",
      "dealsCount": 42
    },
    {
      "id": "018e4f1a-bc23-74d1-9f12-000000000102",
      "fullName": "Ковалев Денис Андреевич",
      "jobTitle": "Ведущий менеджер по работе с клиентами",
      "phone": "+7 (921) 710-33-44",
      "email": "d.kovalev@rascvet39.ru",
      "cabinetRole": "manager",
      "status": "active",
      "dealsCount": 18
    }
  ]
}
```

#### `POST /api/v1/developers/{devId}/employees`
- **Описание:** Создание нового сотрудника и отправка приглашения на email.
- **Request Body:**
```json
{
  "fullName": "Петров Михаил Игоревич",
  "jobTitle": "Менеджер по ипотечному кредитованию",
  "phone": "+7 (909) 777-55-66",
  "email": "m.petrov@rascvet39.ru",
  "cabinetRole": "employee"
}
```
- **Response 201 Created:** Возвращает созданный объект сотрудника с присвоенным `id`.

---

### 3.4 Домен: Каталог недвижимости (Properties)

#### `GET /api/v1/properties`
- **Описание:** Публичный каталог жилых комплексов с гибкой фильтрацией и пагинацией.
- **Query Parameters:**
  - `region`: `city` | `sea` | `prigorod` | `oblast`
  - `propertyClass`: `econom` | `comfort` | `business` | `premium` | `elite`
  - `priceMax`: число (максимальная цена)
  - `developerId`: UUID девелопера
  - `isCompleted`: boolean
  - `page`: integer (default 1)
  - `limit`: integer (default 12)
- **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "018e4f1a-bc23-74d1-9f12-000000000010",
      "name": "ЖК «Балтийская Ривьера»",
      "slug": "zhk-baltiyskaya-rivera",
      "developerName": "ГК «Расцвет»",
      "region": "sea",
      "district": "г. Светлогорск",
      "address": "г. Светлогорск, ул. Ленина, д. 18",
      "propertyClass": "business",
      "deliveryYear": 2026,
      "deliveryQuarter": 4,
      "priceFrom": 7850000,
      "pricePerSqmMin": 185000,
      "rating": 4.92,
      "coverImageUrl": "https://cdn.amberavenue.ru/properties/riviera-hero.webp",
      "tags": ["Бизнес-класс", "У моря", "Автономное отопление", "Подземный паркинг"],
      "prices": [
        { "roomType": "1k", "roomLabel": "1-комнатные", "priceFrom": 7850000, "areaMin": 42.5 },
        { "roomType": "2k", "roomLabel": "2-комнатные", "priceFrom": 12400000, "areaMin": 68.0 }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 369, "totalPages": 31 }
}
```

---

#### `GET /api/v1/properties/{id}`
- **Описание:** Полная карточка жилого комплекса (включает все 9 разделов: характеристики, цены, галерею, инфраструктуру, юридический рейтинг, документы).
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "018e4f1a-bc23-74d1-9f12-000000000010",
    "name": "ЖК «Балтийская Ривьера»",
    "slug": "zhk-baltiyskaya-rivera",
    "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
    "developerName": "ГК «Расцвет»",
    "chars": {
      "propertyClass": "business",
      "floorsMin": 5,
      "floorsMax": 7,
      "buildingsCount": 3,
      "totalApartments": 180,
      "ceilingHeight": 3.0,
      "finishType": "white_box",
      "wallMaterial": "Монолит-кирпич",
      "heatingType": "Автономное газовое",
      "parking": "Подземный на 150 м/м + гостевой"
    },
    "prices": [
      { "roomType": "studio", "roomLabel": "Студии", "priceFrom": 5200000, "areaMin": 28.5, "availableUnits": 12 },
      { "roomType": "1k", "roomLabel": "1-комнатные", "priceFrom": 7850000, "areaMin": 42.5, "availableUnits": 24 },
      { "roomType": "2k", "roomLabel": "2-комнатные", "priceFrom": 12400000, "areaMin": 68.0, "availableUnits": 15 },
      { "roomType": "3k", "roomLabel": "3-комнатные", "priceFrom": 17900000, "areaMin": 94.0, "availableUnits": 6 }
    ],
    "photos": [
      { "url": "https://cdn.amberavenue.ru/photos/riviera-1.webp", "category": "render", "isCover": true },
      { "url": "https://cdn.amberavenue.ru/photos/riviera-yard.webp", "category": "yard", "isCover": false }
    ],
    "ratingBreakdown": {
      "overall": 4.92,
      "financialStability": 5.0,
      "escrowSafety": 5.0,
      "arbitrationRisk": 4.8
    },
    "moderationStatus": "approved"
  }
}
```

---

### 3.5 Домен: Модерация жилых комплексов

#### `POST /api/v1/moderation/{propertyId}/submit`
- **Описание:** Отправка застройщиком карточки ЖК на проверку модератором Amber Avenue.
- **Права доступа:** `developer_admin`, `developer_manager`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "moderationRequestId": "018e4f1a-bc23-74d1-9f12-000000000201",
    "status": "on_review",
    "submittedAt": "2026-08-25T18:42:00.000Z",
    "message": "Объект успешно отправлен на модерацию. Срок проверки — до 24 часов."
  }
}
```

---

#### `POST /api/v1/moderation/{propertyId}/request-changes`
- **Описание:** Возврат карточки на доработку с комментариями модератора по 9 функциональным секциям.
- **Права доступа:** `superadmin`.
- **Request Body:**
```json
{
  "overallComment": "Просьба скорректировать цены на 2К квартиры и приложить актуальное разрешение на строительство.",
  "sectionComments": {
    "main": "Корректно",
    "chars": "Уточните высоту потолков для 7-го этажа",
    "infra": "Корректно",
    "prices": "Минимальная цена за 2К квартиру занижена относительно официального прайса",
    "yard": "Корректно",
    "engineering": "Корректно",
    "comfort": "Корректно",
    "security": "Корректно",
    "management": "Корректно"
  }
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "status": "needs_correction",
    "reviewedAt": "2026-08-25T18:45:00.000Z",
    "message": "Замечания отправлены застройщику"
  }
}
```

---

#### `POST /api/v1/moderation/{propertyId}/approve`
- **Описание:** Утверждение модератором карточки ЖК. Карточка переходит в статус `approved` / `published`.
- **Права доступа:** `superadmin`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "publishedAt": "2026-08-25T18:46:00.000Z",
    "message": "Жилой комплекс утвержден и опубликован в каталоге"
  }
}
```

---

### 3.6 Домен: Лиды и CRM-система

#### `GET /api/v1/leads`
- **Описание:** Получение реестра лидов. Для `superadmin` — все лиды платформы. Для девелоперов — строго лиды со скоупом `ownedBy: 'developer'` и `developerId == currentAuthDevId`.
- **Query Parameters:** `status`, `developerId` (только для админа), `dateFrom`, `dateTo`, `page`, `limit`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "018e4f1a-bc23-74d1-9f12-000000000301",
      "legacyCode": "L-1724610000-842",
      "clientName": "Дмитрий Ковалев",
      "clientPhone": "+7 (911) 450-99-88",
      "clientEmail": "d.kovalev@example.com",
      "propertyId": "018e4f1a-bc23-74d1-9f12-000000000010",
      "propertyName": "ЖК «Балтийская Ривьера»",
      "sourceType": "card_cta",
      "sourceTitle": "Карточка ЖК: Узнать наличие",
      "details": "Интересует 2К квартира, этаж от 4-го, вид на парк",
      "status": "new",
      "ownedBy": "developer",
      "createdAt": "2026-08-25T18:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 142 }
}
```

---

#### `POST /api/v1/leads`
- **Описание:** Ингейст входящего лида с публичных страниц портала (виджеты подбора, модальные окна, заказ звонка).
- **Права доступа:** Public.
- **Request Body:**
```json
{
  "clientName": "Ольга Николаева",
  "clientPhone": "+7 (921) 600-11-22",
  "clientEmail": "olga.nik@example.com",
  "propertyId": "018e4f1a-bc23-74d1-9f12-000000000010",
  "sourceType": "availability_modal",
  "details": "Запрос планировок 1-комнатных квартир",
  "consentPersonalData": true
}
```
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "leadId": "018e4f1a-bc23-74d1-9f12-000000000302",
    "status": "new",
    "message": "Заявка успешно отправлена застройщику"
  }
}
```

---

#### `PATCH /api/v1/leads/{id}/status`
- **Описание:** Смена статуса обработки лида менеджером застройщика или админом.
- **Request Body:**
```json
{
  "status": "in_progress",
  "comment": "Клиенту отправлена подборка планировок в WhatsApp, назначен созвон на завтра"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "leadId": "018e4f1a-bc23-74d1-9f12-000000000301",
    "status": "in_progress",
    "updatedAt": "2026-08-25T18:48:00.000Z"
  }
}
```

---

#### `GET /api/v1/leads/export/csv`
- **Описание:** Экспорт реестра лидов в формате CSV (с кодировкой UTF-8 BOM для корректного открытия в Excel).
- **Response 200 OK:** `Content-Type: text/csv; charset=utf-8`, бинарный поток CSV-файла.

---

### 3.7 Домен: Тарифные планы и модули

#### `GET /api/v1/tariffs/developer/{devId}`
- **Описание:** Получение активного тарифного плана застройщика и списка разблокированных модулей.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
    "planId": "pro",
    "planName": "Девелопер PRO",
    "priceRub": 9900,
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "status": "active",
    "enabledModules": [
      "analytics-stats",
      "analytics-traffic",
      "analytics-competitors",
      "analytics-reports",
      "promo-premium",
      "promo-ads",
      "leads-crm-pro"
    ]
  }
}
```

---

#### `PUT /api/v1/tariffs/developer/{devId}`
- **Описание:** Назначение или модификация тарифа и модулей застройщику администратором Amber Avenue.
- **Права доступа:** `superadmin`.
- **Request Body:**
```json
{
  "tariffCode": "pro",
  "startDate": "2026-09-01",
  "endDate": "2026-09-30",
  "enabledModules": [
    "analytics-stats",
    "analytics-traffic",
    "analytics-competitors",
    "analytics-reports",
    "promo-premium",
    "promo-ads"
  ],
  "autoRenew": true
}
```
- **Response 200 OK:** Возвращает обновленный объект `developer_tariffs`.

---

### 3.8 Домен: Рекламные размещения (Placements)

#### `GET /api/v1/placements/calendar`
- **Описание:** Получение интерактивной сетки занятости рекламных слотов по 8 типам рекламных продуктов.
- **Query Parameters:** `month` (e.g. `2026-08`), `placementTypeId` (1..8).
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "month": "2026-08",
    "slots": {
      "type1_main_banner_slot1": {
        "2026-08-25": { "status": "occupied", "developerId": "018e4f1a-bc23-74d1-9f12-000000000003", "developerName": "ГК «Расцвет»" },
        "2026-08-26": { "status": "occupied", "developerId": "018e4f1a-bc23-74d1-9f12-000000000003", "developerName": "ГК «Расцвет»" },
        "2026-08-27": { "status": "free" }
      }
    }
  }
}
```

---

#### `POST /api/v1/placements/book`
- **Описание:** Бронирование рекламного размещения застройщиком/администратором.
- **Request Body:**
```json
{
  "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
  "propertyId": "018e4f1a-bc23-74d1-9f12-000000000010",
  "placementTypeId": 1,
  "slotIdentifier": "main_hero_slot_1",
  "startDate": "2026-09-01",
  "endDate": "2026-09-15",
  "bannerImageUrl": "https://cdn.amberavenue.ru/banners/banner-sept.webp",
  "targetUrl": "https://amberavenue.ru/zhk.html?id=10"
}
```
- **Response 201 Created:** Возвращает объект созданного размещения со статусом `active`.

---

### 3.9 Домен: Криптографический аудит (SHA-256)

#### `GET /api/v1/audit/logs`
- **Описание:** Запрос записей журнала аудита с проверкой криптографической целостности хэш-цепочки SHA-256.
- **Query Parameters:** `developerId`, `entityType`, `dateFrom`, `page`, `limit`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "018e4f1a-bc23-74d1-9f12-000000000401",
      "action": "property.update_prices",
      "entityType": "property",
      "entityId": "018e4f1a-bc23-74d1-9f12-000000000010",
      "changes": {
        "priceFrom": { "old": 7500000, "new": 7850000 }
      },
      "prevHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "hashFull": "8f3b5e43a912de0713b194d80a1c62f279d4b00511874b3d7c3857e4e1a0b129",
      "hashShort": "8f3b5e43",
      "isVerified": true,
      "createdAt": "2026-08-25T17:30:00.000Z"
    }
  ]
}
```

---

### 3.10 Домен: Аналитика и события

#### `POST /api/v1/analytics/track`
- **Описание:** Высоконагруженный эндпоинт пакетной передачи событий пользовательского взаимодействия (клики, показы, удержание).
- **Права доступа:** Public.
- **Request Body:**
```json
{
  "sessionId": "sess_89a7fbc2014e",
  "events": [
    {
      "eventType": "card_impression",
      "targetType": "property",
      "targetId": "018e4f1a-bc23-74d1-9f12-000000000010",
      "developerId": "018e4f1a-bc23-74d1-9f12-000000000003",
      "pageUrl": "/zhk-sea.html",
      "deviceType": "mobile",
      "dwellSeconds": 4
    }
  ]
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": { "processedEvents": 1 }
}
```

---

#### `GET /api/v1/analytics/developer/{devId}/dashboard`
- **Описание:** Получение предагрегированных аналитических показателей для личного кабинета застройщика.
- **Query Parameters:** `period` (`7d`, `30d`, `90d`, `custom`), `propertyId`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalImpressions": 48200,
      "totalCardClicks": 3410,
      "totalLayoutViews": 1820,
      "totalLeads": 42,
      "conversionOverall": 1.23
    },
    "funnel": [
      { "stage": "Показы в каталоге", "count": 48200, "dropoff": 0 },
      { "stage": "Переходы в карточку", "count": 3410, "dropoff": 92.9 },
      { "stage": "Просмотры планировок", "count": 1820, "dropoff": 46.6 },
      { "stage": "Отправка заявки (Лид)", "count": 42, "dropoff": 97.7 }
    ],
    "deviceSplit": {
      "mobile": 68.5,
      "desktop": 27.2,
      "tablet": 4.3
    },
    "demandByRoom": {
      "studio": 22.0,
      "1k": 44.5,
      "2k": 26.0,
      "3k_plus": 7.5
    },
    "trafficSources": {
      "isGated": false,
      "data": { "yandex": 52.0, "direct": 24.0, "social": 14.0, "other": 10.0 }
    }
  }
}
```
