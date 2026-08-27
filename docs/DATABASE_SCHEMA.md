# Спецификация схемы базы данных PostgreSQL: Платформа Amber Avenue

**Проект:** Amber Avenue — Агрегатор новостроек Калининграда и Балтийского побережья  
**Версия спецификации:** 2.0.0 (Production Enterprise Blueprint)  
**СУБД:** PostgreSQL 16+  
**Нормализация:** 3NF (Third Normal Form)  
**Стратегия первичных ключей:** UUIDv7 (временнó-сортируемые идентификаторы)  
**Кодировка:** `UTF8` (LC_COLLATE = 'ru_RU.UTF-8', LC_CTYPE = 'ru_RU.UTF-8')

---

## 1. Архитектурный обзор и ER-диаграмма

База данных Amber Avenue спроектирована по принципам третьей нормальной формы (3NF) и разделена на 8 логических доменов, объединяющих **24 таблицы**:
1. **Идентификация и доступ:** `users`, `user_sessions`
2. **Организации и сотрудники:** `developers`, `developer_branches_geo`, `employees`
3. **Каталог недвижимости и медиа:** `properties`, `property_prices`, `property_photos`, `property_documents`
4. **Модерация и контроль качества:** `moderation_requests`, `moderation_section_comments`
5. **CRM, лидогенерация и события:** `leads`, `lead_timeline_events`
6. **Тарифы и монетизация:** `tariffs`, `tariff_modules`, `developer_tariffs`, `ad_placement_types`, `ad_placements`
7. **Контент и маркетинг:** `articles`, `banners`, `experts`
8. **Безопасность, аудит и аналитика:** `developer_settings`, `audit_logs`, `analytics_events` (партиционированная гипертаблица)

### 1.1 Диаграмма сущностей и связей (Entity-Relationship Diagram)

```
                                 ┌────────────────────────┐
                                 │         users          │
                                 └───────────┬────────────┘
                                             │ 1:N
                           ┌─────────────────┼─────────────────┐
                           │ 1:1             │ 1:N             │ 1:N
                           ▼                 ▼                 ▼
                ┌────────────────────┐ ┌───────────┐ ┌────────────────────┐
                │     developers     │ │ employees │ │     audit_logs     │
                └──────────┬─────────┘ └───────────┘ └────────────────────┘
                           │
       ┌───────────┬───────┴───────────┬──────────────┬──────────────┐
       │ 1:N       │ 1:N               │ 1:N          │ 1:N          │ 1:1
       ▼           ▼                   ▼              ▼              ▼
┌────────────┐┌───────────┐     ┌──────────────┐┌─────────────┐┌─────────────┐
│ properties ││   leads   │     │ad_placements ││  documents  ││dev_settings │
└─────┬──────┘└─────┬─────┘     └──────────────┘└─────────────┘└─────────────┘
      │             │
      ├─────────────┼──────────────────────────────┐
      │ 1:N         │ 1:N                          │ 1:N
      ▼             ▼                              ▼
┌────────────┐┌───────────┐                  ┌─────────────┐
│prop_prices ││lead_events│                  │ moderation_ │
└────────────┘└───────────┘                  │  requests   │
      │ 1:N                                  └──────┬──────┘
      ▼                                             │ 1:N
┌────────────┐                                      ▼
│prop_photos │                               ┌─────────────┐
└────────────┘                               │ moderation_ │
                                             │  comments   │
                                             └─────────────┘
```

---

## 2. Пользовательские типы данных (ENUMs)

```sql
-- Роли пользователей платформы
CREATE TYPE user_role_enum AS ENUM (
  'superadmin',            -- Главный администратор платформы
  'developer_admin',       -- Администратор компании-застройщика
  'developer_manager',     -- Старший менеджер отдела продаж застройщика
  'developer_employee',    -- Рядовой сотрудник / агент застройщика
  'portal_user'            -- Зарегистрированный покупатель недвижимости
);

-- Статусы учетных записей
CREATE TYPE user_status_enum AS ENUM (
  'active',                -- Активен, доступ разрешен
  'suspended',             -- Заблокирован администрацией
  'pending_verification'   -- Ожидает подтверждения email / телефона
);

-- Классы недвижимости
CREATE TYPE property_class_enum AS ENUM (
  'econom',                -- Эконом
  'comfort',               -- Комфорт
  'comfort_plus',          -- Комфорт+
  'business',              -- Бизнес
  'premium',               -- Премиум
  'elite'                  -- Элит
);

-- Статусы карточки ЖК
CREATE TYPE property_status_enum AS ENUM (
  'draft',                 -- Черновик (виден только застройщику)
  'on_review',             -- На проверке модератором
  'needs_correction',      -- Возвращен с замечаниями
  'approved',              -- Утвержден к публикации
  'published',             -- Опубликован в общем каталоге
  'archived',              -- В архиве
  'hidden'                 -- Скрыт застройщиком
);

-- Географические регионы Калининградской области
CREATE TYPE property_region_enum AS ENUM (
  'city',                  -- Калининград
  'sea',                   -- Побережье (Светлогорск, Зеленоградск, Пионерский, Янтарный)
  'prigorod',              -- Пригород (Гурьевский район, Чкаловск, Космодемьянского)
  'oblast'                 -- Область (Балтийск, Черняховск, Советск, Гвардейск)
);

-- Статусы процесса модерации
CREATE TYPE moderation_status_enum AS ENUM (
  'draft',                 -- Черновик заявки
  'on_review',             -- На рассмотрении
  'needs_correction',      -- Требуются исправления
  'approved',              -- Одобрено
  'rejected'               -- Отклонено
);

-- Статусы лидов в CRM
CREATE TYPE lead_status_enum AS ENUM (
  'new',                   -- Новый входящий лид
  'in_progress',           -- Взят в обработку менеджером
  'processed',             -- Консультация проведена / отправлено КП
  'meeting_scheduled',     -- Назначен показ объекта / встреча в офисе
  'deal_closed',           -- Сделка успешно заключена
  'rejected',              -- Отказ клиента / нецелевой
  'spam'                   -- Спам / фрод
);

-- Ролевой владелец лида
CREATE TYPE lead_owner_enum AS ENUM (
  'developer',             -- Лид закреплен за застройщиком
  'admin'                  -- Лид закреплен за платформой Amber Avenue
);

-- Статусы рекламных размещений
CREATE TYPE placement_status_enum AS ENUM (
  'pending_payment',       -- Ожидает оплаты
  'active',                -- Активно показывается
  'completed',             -- Срок показа истек
  'cancelled'              -- Отменено
);
```

---

## 3. Полный реестр 24 реляционных таблиц (DDL)

### 3.1 Домен: Идентификация и доступ

#### Таблица 1: `users`
Хранилище учетных записей пользователей платформы.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(32) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  role user_role_enum NOT NULL DEFAULT 'developer_employee',
  status user_status_enum NOT NULL DEFAULT 'active',
  developer_id UUID, -- Внешний ключ добавляется после создания developers
  avatar_url VARCHAR(512),
  last_login_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_dev_id ON users(developer_id);
```

#### Таблица 2: `user_sessions`
Хранение активных сессий, Refresh токенов и аудит устройств.
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255),
  user_agent TEXT,
  ip_address INET NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

---

### 3.2 Домен: Организации и сотрудники

#### Таблица 3: `developers`
Реестр девелоперских компаний Калининградской области.
```sql
CREATE TABLE developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_numeric_id INTEGER UNIQUE, -- Обратная совместимость с AMBER_DATA (1..54)
  brand_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(512) NOT NULL,
  inn VARCHAR(12) UNIQUE NOT NULL,
  ogrn VARCHAR(15) UNIQUE NOT NULL,
  kpp VARCHAR(9),
  legal_address TEXT NOT NULL,
  actual_address TEXT NOT NULL,
  settlement_account VARCHAR(20),
  correspondent_account VARCHAR(20),
  bik VARCHAR(9),
  bank_name VARCHAR(255),
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website_url VARCHAR(255),
  logo_url VARCHAR(512),
  description TEXT,
  foundation_year INTEGER CHECK (foundation_year BETWEEN 1900 AND 2100),
  experience_years INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating BETWEEN 0.00 AND 5.00),
  rating_financial_stability NUMERIC(3,2) DEFAULT 5.00,
  rating_escrow_security NUMERIC(3,2) DEFAULT 5.00,
  rating_arbitration_score NUMERIC(3,2) DEFAULT 5.00,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  active_projects_count INTEGER NOT NULL DEFAULT 0,
  completed_projects_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD CONSTRAINT fk_users_developer 
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE SET NULL;

CREATE INDEX idx_developers_inn ON developers(inn);
CREATE INDEX idx_developers_ogrn ON developers(ogrn);
CREATE INDEX idx_developers_legacy_id ON developers(legacy_numeric_id);
CREATE INDEX idx_developers_rating ON developers(rating DESC);
CREATE INDEX idx_developers_status ON developers(status);
```

#### Таблица 4: `developer_branches_geo`
География работы застройщика (районы и населенные пункты присутствия).
```sql
CREATE TABLE developer_branches_geo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  region property_region_enum NOT NULL,
  district_name VARCHAR(150) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dev_branches_dev ON developer_branches_geo(developer_id);
```

#### Таблица 5: `employees`
Сотрудники компании-застройщика с ролевыми полномочиями в кабинете.
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  cabinet_role VARCHAR(32) NOT NULL DEFAULT 'manager', -- 'admin', 'manager', 'employee'
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'blocked', 'invited'
  telegram_username VARCHAR(64),
  deals_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_dev_id ON employees(developer_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_email ON employees(email);
```

---

### 3.3 Домен: Каталог недвижимости и медиа

#### Таблица 6: `properties`
Основная таблица жилых комплексов.
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_numeric_id INTEGER UNIQUE, -- Для маппинга с AMBER_DATA / PROPERTIES (1..369)
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  region property_region_enum NOT NULL DEFAULT 'city',
  district VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  distance_text VARCHAR(150),
  property_class property_class_enum NOT NULL DEFAULT 'comfort',
  delivery_year INTEGER NOT NULL CHECK (delivery_year BETWEEN 2000 AND 2100),
  delivery_quarter INTEGER CHECK (delivery_quarter BETWEEN 1 AND 4),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_text VARCHAR(150),
  price_from NUMERIC(14,2) NOT NULL CHECK (price_from > 0),
  price_per_sqm_min NUMERIC(12,2) NOT NULL CHECK (price_per_sqm_min > 0),
  price_per_sqm_max NUMERIC(12,2),
  floors_min INTEGER NOT NULL DEFAULT 1,
  floors_max INTEGER NOT NULL DEFAULT 1,
  buildings_count INTEGER NOT NULL DEFAULT 1,
  total_apartments INTEGER,
  ceiling_height NUMERIC(4,2) CHECK (ceiling_height > 2.0 AND ceiling_height < 10.0),
  finish_type VARCHAR(100) NOT NULL DEFAULT 'white_box', -- 'without_finish', 'white_box', 'turnkey'
  wall_material VARCHAR(150) NOT NULL DEFAULT 'monolith_brick',
  heating_type VARCHAR(150) NOT NULL DEFAULT 'autonomous_gas', -- 'autonomous_gas', 'central', 'individual_boiler'
  parking_type VARCHAR(100) DEFAULT 'underground_and_surface',
  courtyard_type VARCHAR(100) DEFAULT 'closed_car_free',
  elevators_brand VARCHAR(100),
  security_features JSONB DEFAULT '["cctv", "intercom", "fenced_perimeter"]'::jsonb,
  infrastructure_features JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  special_offer JSONB,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.50 CHECK (rating BETWEEN 0.00 AND 5.00),
  reviews_count INTEGER NOT NULL DEFAULT 0,
  views_count BIGINT NOT NULL DEFAULT 0,
  clicks_count BIGINT NOT NULL DEFAULT 0,
  leads_count BIGINT NOT NULL DEFAULT 0,
  status property_status_enum NOT NULL DEFAULT 'draft',
  is_partner BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  is_top_week BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_dev_id ON properties(developer_id);
CREATE INDEX idx_properties_region ON properties(region);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_price ON properties(price_from);
CREATE INDEX idx_properties_delivery ON properties(delivery_year, delivery_quarter);
CREATE INDEX idx_properties_rating ON properties(rating DESC);
CREATE INDEX idx_properties_tags_gin ON properties USING gin(tags);
CREATE INDEX idx_properties_pros_gin ON properties USING gin(pros);
```

#### Таблица 7: `property_prices`
Планировки и ценовые срезы по типам квартир.
```sql
CREATE TABLE property_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type VARCHAR(50) NOT NULL, -- 'studio', '1k', '2k', '3k', '4k_plus'
  room_label VARCHAR(100) NOT NULL, -- 'Студии', '1-комнатные', '2-комнатные'
  price_from NUMERIC(14,2) NOT NULL CHECK (price_from > 0),
  price_to NUMERIC(14,2),
  price_per_sqm NUMERIC(12,2),
  area_min NUMERIC(6,2) NOT NULL CHECK (area_min > 0),
  area_max NUMERIC(6,2) NOT NULL CHECK (area_max >= area_min),
  available_units_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_prices_prop_id ON property_prices(property_id);
CREATE INDEX idx_property_prices_room ON property_prices(property_id, room_type);
```

#### Таблица 8: `property_photos`
Галерея фотографий, рендеров и планировок ЖК.
```sql
CREATE TABLE property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url VARCHAR(512) NOT NULL,
  thumbnail_url VARCHAR(512) NOT NULL,
  large_url VARCHAR(512),
  category VARCHAR(50) NOT NULL DEFAULT 'render', -- 'render', 'construction', 'layouts', 'yard', 'lobby'
  caption VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_photos_prop ON property_photos(property_id, sort_order);
CREATE INDEX idx_property_photos_cover ON property_photos(property_id) WHERE is_cover = TRUE;
```

#### Таблица 9: `property_documents`
Проектные декларации 214-ФЗ, разрешения на строительство и эскроу-документы ЖК.
```sql
CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) NOT NULL, -- 'declaration_214', 'building_permit', 'escrow_agreement', 'land_lease'
  file_url VARCHAR(512) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  doc_number VARCHAR(100),
  issue_date DATE,
  valid_until DATE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_docs_prop ON property_documents(property_id);
CREATE INDEX idx_property_docs_dev ON property_documents(developer_id);
```

---

### 3.4 Домен: Модерация и контроль качества

#### Таблица 10: `moderation_requests`
Заявки на публикацию/модификацию карточки ЖК.
```sql
CREATE TABLE moderation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status moderation_status_enum NOT NULL DEFAULT 'on_review',
  overall_comment TEXT,
  submitted_snapshot JSONB NOT NULL, -- Слепок всех полей ЖК на момент отправки
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_prop_status ON moderation_requests(property_id, status);
CREATE INDEX idx_moderation_dev ON moderation_requests(developer_id);
CREATE INDEX idx_moderation_submitted ON moderation_requests(submitted_at DESC);
```

#### Таблица 11: `moderation_section_comments`
Замечания модератора по 9 функциональным секциям карточки ЖК.
```sql
CREATE TABLE moderation_section_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_request_id UUID NOT NULL REFERENCES moderation_requests(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL, 
  -- Значения: 'main', 'chars', 'infra', 'prices', 'yard', 'engineering', 'comfort', 'security', 'management'
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'approved', 'warning', 'rejected'
  comment_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mod_comments_req ON moderation_section_comments(moderation_request_id);
```

---

### 3.5 Домен: CRM, лидогенерация и события

#### Таблица 12: `leads`
Единый реестр входящих обращений и заявок клиентов.
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_code VARCHAR(64) UNIQUE, -- "L-1724610000-842"
  developer_id UUID REFERENCES developers(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  owned_by lead_owner_enum NOT NULL DEFAULT 'developer',
  client_name VARCHAR(150) NOT NULL,
  client_phone VARCHAR(32) NOT NULL,
  client_email VARCHAR(255),
  client_city VARCHAR(100),
  source_type VARCHAR(50) NOT NULL, 
  -- 'card_cta', 'availability_modal', 'call_request', 'expert_question', 'mortgage_calc', 'catalog_selection'
  source_title VARCHAR(255),
  details TEXT,
  is_paid_lead BOOLEAN NOT NULL DEFAULT TRUE,
  status lead_status_enum NOT NULL DEFAULT 'new',
  deal_value NUMERIC(14,2),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  consent_personal_data BOOLEAN NOT NULL DEFAULT TRUE,
  consent_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_dev_status ON leads(developer_id, status);
CREATE INDEX idx_leads_prop ON leads(property_id);
CREATE INDEX idx_leads_owned ON leads(owned_by);
CREATE INDEX idx_leads_phone ON leads(client_phone);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);
```

#### Таблица 13: `lead_timeline_events`
История взаимодействия по лиду в CRM.
```sql
CREATE TABLE lead_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'status_change', 'comment_added', 'call_logged', 'meeting_set', 'sms_sent'
  old_status lead_status_enum,
  new_status lead_status_enum,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_timeline_lead ON lead_timeline_events(lead_id, created_at ASC);
```

---

### 3.6 Домен: Тарифы и монетизация

#### Таблица 14: `tariffs`
Каталог тарифных планов платформы.
```sql
CREATE TABLE tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- 'base', 'standard', 'pro', 'enterprise'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_rub NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tariffs_code ON tariffs(code);
```

#### Таблица 15: `tariff_modules`
Справочник функциональных модулей платформы.
```sql
CREATE TABLE tariff_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, 
  -- 'analytics-stats', 'analytics-traffic', 'analytics-competitors', 'analytics-reports', 'promo-premium', 'promo-ads', 'leads-crm-pro', 'documents-unlimited'
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'analytics', 'promo', 'crm', 'tools'
  description TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tariff_modules_code ON tariff_modules(code);
```

#### Таблица 16: `developer_tariffs`
Назначенные тарифы застройщиков с набором модулей.
```sql
CREATE TABLE developer_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  tariff_id UUID NOT NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
  enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dev_tariffs ON developer_tariffs(developer_id, status);
CREATE INDEX idx_dev_tariffs_dates ON developer_tariffs(start_date, end_date);
```

#### Таблица 17: `ad_placement_types`
8 коммерческих типов рекламных продуктов платформы.
```sql
CREATE TABLE ad_placement_types (
  id INTEGER PRIMARY KEY, -- 1..8
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  daily_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  max_concurrent_slots INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed данных 8 типов
INSERT INTO ad_placement_types (id, code, name, description, daily_price, monthly_price, max_concurrent_slots) VALUES
(1, 'type1_main_banner', 'Главный баннер на главной', 'Ротация в hero-блоке главной страницы', 1500.00, 35000.00, 3),
(2, 'type2_side_banner', 'Боковой баннер в каталоге', 'Фиксированный баннер в сайдбаре фильтров', 800.00, 19000.00, 5),
(3, 'type3_horizontal_feed', 'Горизонтальный баннер в ленте', 'Врезка между карточками каталога (каждые 5 ЖК)', 1000.00, 24000.00, 10),
(4, 'type4_recommended', 'Блок «Рекомендуемые ЖК»', 'Закрепление в ТОП блока рекомендаций', 1200.00, 28000.00, 6),
(5, 'type5_native_ads', 'Нативная реклама в табах ЖК', 'Врезки в 5 табах карточки (ипотека, цены, локация)', 600.00, 14000.00, 15),
(6, 'type6_paid_cards', 'Платные карточки ЖК', 'Прямая маршрутизация лидов и телефон застройщика', 500.00, 12000.00, 50),
(7, 'type7_menu_slider', 'Слайдер в мега-меню', 'Изображение и спецпредложение в шапке сайта', 700.00, 16000.00, 4),
(8, 'type8_premium', 'Пакет «Премиум всё включено»', 'ТОП-1 + 5 карточек + брендирование разделов', 3000.00, 75000.00, 2);
```

#### Таблица 18: `ad_placements`
Глобальная сетка бронирования и занятости рекламных слотов.
```sql
CREATE TABLE ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  placement_type_id INTEGER NOT NULL REFERENCES ad_placement_types(id),
  slot_identifier VARCHAR(100) NOT NULL, -- e.g. 'main_hero_slot_1', 'catalog_pos_5'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  status placement_status_enum NOT NULL DEFAULT 'active',
  banner_image_url VARCHAR(512),
  target_url VARCHAR(512),
  erid VARCHAR(100), -- Маркировка интернет-рекламы № 347-ФЗ
  partner_inn VARCHAR(12),
  impressions_count BIGINT NOT NULL DEFAULT 0,
  clicks_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_placement_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_ad_placements_dates ON ad_placements(placement_type_id, slot_identifier, start_date, end_date);
CREATE INDEX idx_ad_placements_dev ON ad_placements(developer_id, status);
CREATE INDEX idx_ad_placements_active ON ad_placements(status, start_date, end_date);
```

---

### 3.7 Домен: Контент и маркетинг

#### Таблица 19: `articles`
Статьи, аналитические обзоры и публикации в блоге.
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'analytics', 'investments', 'laws_214', 'trends', 'districts'
  summary TEXT NOT NULL,
  content_html TEXT NOT NULL,
  cover_image_url VARCHAR(512) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  views_count BIGINT NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 5,
  status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status_pub ON articles(status, published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_tags_gin ON articles USING gin(tags);
```

#### Таблица 20: `banners`
Рекламные баннеры портала с таргетингом и учетом статистики.
```sql
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slot_code VARCHAR(50) NOT NULL, -- 'header_top', 'catalog_sidebar', 'zhk_sidebar', 'footer_wide'
  image_url VARCHAR(512) NOT NULL,
  target_url VARCHAR(512) NOT NULL,
  erid VARCHAR(100),
  partner_inn VARCHAR(12),
  impressions_count BIGINT NOT NULL DEFAULT 0,
  clicks_count BIGINT NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_banners_slot_active ON banners(slot_code, is_active, start_date, end_date);
```

#### Таблица 21: `experts`
Карточки отраслевых экспертов по недвижимости Калининграда.
```sql
CREATE TABLE experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  role_title VARCHAR(200) NOT NULL,
  specialty VARCHAR(150) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(512) NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.90 CHECK (rating BETWEEN 0.00 AND 5.00),
  reviews_count INTEGER NOT NULL DEFAULT 0,
  deals_count INTEGER NOT NULL DEFAULT 0,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_experts_active ON experts(is_active, sort_order ASC);
```

---

### 3.8 Домен: Безопасность, аудит и аналитика

#### Таблица 22: `developer_settings`
Индивидуальные настройки личного кабинета застройщика.
```sql
CREATE TABLE developer_settings (
  developer_id UUID PRIMARY KEY REFERENCES developers(id) ON DELETE CASCADE,
  access_code_hash VARCHAR(255) NOT NULL,
  notify_lead_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_lead_sms BOOLEAN NOT NULL DEFAULT FALSE,
  notify_lead_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  notify_moderation_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_reports_monthly BOOLEAN NOT NULL DEFAULT TRUE,
  telegram_chat_id VARCHAR(64),
  telegram_bot_token VARCHAR(128),
  webhook_lead_url VARCHAR(512),
  webhook_secret VARCHAR(128),
  webhook_is_active BOOLEAN NOT NULL DEFAULT FALSE,
  crm_integration_type VARCHAR(50) DEFAULT 'none', -- 'none', 'amocrm', 'bitrix24', 'profitbase', 'custom_webhook'
  crm_api_key VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Таблица 23: `audit_logs`
Криптографический журнал аудита действий с цепочкой хэшей SHA-256.
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, 
  -- 'property.update', 'price.change', 'lead.status_change', 'moderation.submit', 'tariff.change', 'document.upload'
  entity_type VARCHAR(50) NOT NULL, -- 'property', 'lead', 'employee', 'tariff', 'company'
  entity_id VARCHAR(100) NOT NULL,
  changes JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  prev_hash VARCHAR(64) NOT NULL,
  hash_full VARCHAR(64) NOT NULL,
  hash_short VARCHAR(8) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_dev_created ON audit_logs(developer_id, created_at DESC);
CREATE INDEX idx_audit_logs_prop_created ON audit_logs(property_id, created_at DESC);
CREATE INDEX idx_audit_logs_hash ON audit_logs(hash_full);
```

#### Таблица 24: `analytics_events` (Гипертаблица с партиционированием)
Сбор потока событий кликстрима и просмотров с месячным партиционированием.
```sql
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, 
  -- 'page_view', 'card_impression', 'card_click', 'tab_open', 'cta_click', 'phone_reveal', 'dwell_time'
  target_type VARCHAR(50) NOT NULL, -- 'property', 'developer', 'banner', 'expert', 'article'
  target_id VARCHAR(100),
  developer_id UUID,
  property_id UUID,
  page_url VARCHAR(255) NOT NULL,
  traffic_source VARCHAR(50), -- 'direct', 'yandex_search', 'google_search', 'vk_ads', 'telegram', 'referral'
  referrer VARCHAR(512),
  geo_city VARCHAR(100) DEFAULT 'Калининград',
  device_type VARCHAR(30) DEFAULT 'desktop', -- 'mobile', 'desktop', 'tablet'
  dwell_seconds INTEGER DEFAULT 0,
  session_id VARCHAR(64) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Месячные партиции
CREATE TABLE analytics_events_2026_08 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE analytics_events_2026_09 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE analytics_events_2026_10 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE INDEX idx_analytics_dev_time ON analytics_events(developer_id, created_at DESC);
CREATE INDEX idx_analytics_prop_time ON analytics_events(property_id, created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
```

---

## 4. Стратегия миграции с `localStorage` на PostgreSQL

### 4.1 Таблица соответствия ключей хранилища

| Ключ в `localStorage` | Целевая таблица PostgreSQL | Порядок загрузки | Правила преобразования |
|---|---|:---:|---|
| `AMBER_DATA.developers` | `developers` | 1 | Генерация UUIDv7, сохранение legacy ID (`1..54`), нормализация ИНН/ОГРН |
| `AMBER_DATA.properties` + `PROPERTIES` | `properties`, `property_prices` | 2 | Привязка к `developer_id` через `developers.legacy_numeric_id`, развертка массива `prices` в `property_prices` |
| `amber_company_${devId}` | `developers`, `developer_settings` | 3 | UPSERT обновленных реквизитов застройщика поверх seed-данных |
| `amber_employees_${devId}` | `employees` | 4 | Вставка сотрудников с ролями `admin`/`manager`/`employee` |
| `amber_documents_${devId}` | `property_documents` | 4 | Преобразование метаданных эмулированных файлов в записи документов |
| `amber_settings_${devId}` | `developer_settings` | 4 | Хэширование 6-значных кодов доступа в Argon2id |
| `amber_leads` | `leads`, `lead_timeline_events` | 5 | Преобразование строковых дат в `TIMESTAMPTZ`, привязка `developer_id` |
| `amber_moderation_${zhkId}` | `moderation_requests`, `moderation_section_comments` | 6 | Маппинг 9 разделов комментариев в отдельные строки `moderation_section_comments` |
| `amber_tariff_${devId}` | `developer_tariffs` | 6 | Сохранение массива включенных модулей в `enabled_modules` JSONB |
| `amber_placements` | `ad_placements` | 6 | Разбор составных ключей вида `${typeId}_${subId}_${dateStr}` |
| `amber_audit_logs_queue_${devId}` | `audit_logs` | 7 | Валидация цепочки SHA-256 хэшей и сохранение в неизменяемую таблицу |
| `amber_articles` | `articles` | 8 | Генерация слаг-ссылок, санитизация HTML контента |
| `amber_banners_admin` | `banners` | 8 | Сохранение ERID и сроков показа |
| `amber_experts_admin` | `experts` | 8 | Сохранение рейтингов и контактов экспертов |
| `amber_analytics` | `analytics_events` | 9 | Парсинг клиентских событий в партиционированную таблицу |

### 4.2 Скрипт миграции данных (Node.js / TypeScript ETL Pipeline)

```typescript
import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

export async function migrateLocalStorageDump(dump: Record<string, any>) {
  console.log('[ETL] Начало миграции данных из localStorage dump...');

  await prisma.$transaction(async (tx) => {
    // 1. Миграция застройщиков
    const devMap = new Map<number, string>(); // legacy_id -> uuid
    if (dump.developers) {
      for (const dev of dump.developers) {
        const devUuid = uuidv7();
        devMap.set(dev.id, devUuid);
        
        await tx.developer.upsert({
          where: { legacyNumericId: dev.id },
          create: {
            id: devUuid,
            legacyNumericId: dev.id,
            brandName: dev.name,
            legalName: dev.fullName || dev.name,
            inn: dev.inn || `3906${String(dev.id).padStart(6, '0')}`,
            ogrn: dev.ogrn || `12639000${String(dev.id).padStart(5, '0')}`,
            phone: dev.phone || '+7 (4012) 00-00-00',
            email: dev.email || `info@dev${dev.id}.ru`,
            rating: dev.rating || 5.0,
            experienceYears: dev.experience || 5
          },
          update: {}
        });
      }
    }

    // 2. Миграция лидов
    if (dump.amber_leads && Array.isArray(dump.amber_leads)) {
      for (const lead of dump.amber_leads) {
        const devUuid = lead.developerId ? devMap.get(Number(lead.developerId)) : null;
        await tx.lead.create({
          data: {
            id: uuidv7(),
            legacyCode: lead.id,
            developerId: devUuid,
            clientName: lead.name,
            clientPhone: lead.phone,
            clientEmail: lead.email,
            sourceType: lead.sourceCode || 'card_cta',
            details: lead.details,
            ownedBy: lead.ownedBy === 'admin' ? 'admin' : 'developer',
            status: lead.status || 'new',
            createdAt: new Date(lead.createdAt || lead.date)
          }
        });
      }
    }

    console.log('[ETL] Успешно завершена миграция основных сущностей.');
  });
}
```
