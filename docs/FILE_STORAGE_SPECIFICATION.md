# Спецификация подсистемы файлового хранилища (S3 / CDN / Sharp)

**Проект:** Amber Avenue — Агрегатор новостроек Калининграда и курортного побережья Балтики  
**Версия спецификации:** 2.0.0 (Media Infrastructure Blueprint)  
**Хранилище:** S3-совместимое объектное хранилище (Yandex Object Storage / MinIO)  
**Сеть доставки контента (CDN):** Yandex Cloud CDN / Cloudflare CDN  
**Медиа-процессинг:** Sharp + libvips Node.js Worker Pipeline

---

## 1. Архитектура бакетов и политики доступа

Файловая инфраструктура Amber Avenue разделена на **3 изолированных S3-бакета** с четким разграничением публичного и приватного доступа:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          S3 OBJECT STORAGE CLUSTER                          │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│    amber-properties-public   │      amber-media-public      │ amber-docs-   │
│                              │                              │ private       │
│ • Фото фасадов и рендеров    │ • Баннеры и реклама          │ • Декларации  │
│ • Планировки этажей          │ • Фоны хэдеров страниц       │   214-ФЗ      │
│ • Фотографии дворов и МОП    │ • Аватары экспертов          │ • Разрешения  │
│ • Прогресс строительства     │ • Логотипы девелоперов       │   на стройку  │
│                              │                              │ • Договоры    │
│                              │                              │   эскроу      │
├──────────────────────────────┼──────────────────────────────┼───────────────┤
│  Публичный доступ через CDN  │  Публичный доступ через CDN  │ Только        │
│  (Read-Only Public Policy)   │  (Read-Only Public Policy)   │ Presigned GET │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

### 1.1 Структура путей в бакетах (Object Key Hierarchy)

```
amber-properties-public/
├── properties/
│   └── {propertyId}/
│       ├── original/{photoId}.jpg
│       ├── hero/{photoId}.webp       # 1920x1080 Q88
│       ├── preview/{photoId}.webp    # 800x600 Q85
│       └── thumb/{photoId}.webp      # 320x240 Q80
└── layouts/
    └── {propertyId}/
        ├── original/{layoutId}.png
        └── webp/{layoutId}.webp

amber-media-public/
├── developers/
│   └── {developerId}/logo.webp
├── banners/
│   └── {bannerId}/banner.webp
├── experts/
│   └── {expertId}/avatar.webp
└── headers/
    ├── hero-slider-{index}.webp
    └── category-{region}.webp

amber-documents-private/
└── developers/
    └── {developerId}/
        ├── 214fz/
        │   └── {propertyId}/{docId}.pdf
        └── contracts/
            └── {docId}.pdf
```

---

## 2. Протокол прямой загрузки (Direct-to-S3 via Presigned PUT URL)

Для снижения нагрузки на Node.js API серверы и ускорения загрузки тяжелых медиафайлов клиенты загружают файлы напрямую в S3 по временным подписанным ссылкам.

```
Client (SPA)                     API Server                      S3 Bucket / Worker
    │                                │                                    │
    │ 1. POST /api/v1/storage/upload-url (MIME, size, context)            │
    ├───────────────────────────────►│                                    │
    │                                │ 2. Проверка прав (RBAC)            │
    │                                │ 3. Валидация размера и расширения  │
    │                                │ 4. Генерация Presigned PUT URL     │
    │ 5. { uploadUrl, fileKey }      │                                    │
    │◄───────────────────────────────┤                                    │
    │                                                                     │
    │ 6. HTTP PUT uploadUrl (Binary File Stream)                          │
    ├────────────────────────────────────────────────────────────────────►│
    │ 7. 200 OK                                                           │
    │◄────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │ 8. POST /api/v1/storage/confirm-upload { fileKey, context }         │
    ├───────────────────────────────►│                                    │
    │                                │ 9. Проверка наличия объекта в S3   │
    │                                │ 10. Постановка задачи в BullMQ     │
    │ 11. 200 OK (Файл зарегистрирован)                                   │
    │◄───────────────────────────────┤                                    │
    │                                │                                    │
    │                                │ 12. Фоновая оптимизация Sharp      │
    │                                │───────────────────────────────────►│
```

### 2.1 Спецификация запроса Presigned URL
- **Эндпоинт:** `POST /api/v1/storage/upload-url`
- **Request Body:**
```json
{
  "bucketType": "properties_public",
  "fileName": "baltic-facade-render.jpg",
  "contentType": "image/jpeg",
  "fileSizeBytes": 4829100,
  "targetEntity": "property",
  "targetId": "018e4f1a-bc23-74d1-9f12-000000000010"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "fileKey": "properties/018e4f1a-bc23-74d1-9f12-000000000010/original/018e4f1a-bc23-74d1-9f12-000000000999.jpg",
    "uploadUrl": "https://amber-properties-public.storage.yandexcloud.net/properties/...X-Amz-Signature=...",
    "expiresIn": 300
  }
}
```

---

## 3. Доступ к приватным юридическим документам (Presigned GET URLs)

Юридические документы (проектные декларации, разрешения на строительство, акты приема-передачи) хранятся в закрытом бакете `amber-documents-private`.

### 3.1 Алгоритм безопасной выдачи документа
1. Пользователь запрашивает документ: `GET /api/v1/documents/{id}/download`.
2. Сервер проверяет права доступа (авторизован ли пользователь, принадлежит ли документ его компании или документ помечен как публичный для покупателей).
3. Сервер генерирует временный подписанный URL со следующими параметрами:
   - **TTL:** 15 минут (900 секунд).
   - **Content-Disposition:** `attachment; filename="Proektnaya_Deklaraciya_ZHK_Riviera.pdf"`.
   - **X-Amz-Expires:** 900.
4. Сервер выполняет редирект `302 Found` на сгенерированный S3 URL.

---

## 4. Пайплайн обработки изображений (Sharp & libvips Microservice)

Фоновый микросервис обработки медиа слушает очередь `media-processing-queue` в BullMQ и генерирует набор оптимизированных адаптивных форматов.

### 4.1 Стандарты генерации графических форматов

| Формат / Профиль | Разрешение | Кодек и качество | Назначение |
|---|---|---|---|
| **Thumbnail** | $320 \times 240$ px | WebP (Q=80) | Миниатюры в списках, предпросмотр в админке |
| **Card Preview** | $800 \times 600$ px | WebP (Q=85) | Карточки в каталоге, мобильная версия |
| **Hero HD** | $1920 \times 1080$ px | WebP (Q=88) + AVIF | Главный слайдер, полноэкранная галерея карточки ЖК |
| **Floor Plan** | $1200 \times 900$ px | PNG / WebP (Q=90) | Планировки квартир (высокая четкость линий) |

### 4.2 Алгоритм обработки в Node.js (Sharp Worker)
```typescript
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function processPropertyPhoto(bucket: string, originalKey: string, propertyId: string, photoId: string) {
  const s3 = new S3Client({ region: 'ru-central1' });

  // 1. Получение исходного изображения из S3
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: originalKey }));
  const inputBuffer = await response.Body.transformToByteArray();

  // 2. Обработка через Sharp: удаление EXIF, автоориентация
  const baseImage = sharp(inputBuffer).rotate();

  // 3. Генерация Thumbnail (320x240)
  const thumbBuffer = await baseImage
    .clone()
    .resize(320, 240, { fit: 'cover', position: 'center' })
    .webp({ quality: 80 })
    .toBuffer();

  // 4. Генерация Card Preview (800x600)
  const previewBuffer = await baseImage
    .clone()
    .resize(800, 600, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toBuffer();

  // 5. Генерация Hero HD (1920x1080) с наложением водяного знака для партнеров
  const heroBuffer = await baseImage
    .clone()
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  // 6. Параллельная выгрузка в S3
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `properties/${propertyId}/thumb/${photoId}.webp`,
      Body: thumbBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable'
    })),
    s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `properties/${propertyId}/preview/${photoId}.webp`,
      Body: previewBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable'
    })),
    s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `properties/${propertyId}/hero/${photoId}.webp`,
      Body: heroBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable'
    }))
  ]);
}
```

---

## 5. Кеширование на CDN и правила инвалидации

1. **Заголовки кеширования:** Все статические изображения отдаются с заголовком `Cache-Control: public, max-age=31536000, immutable`. В URL включается хэш или UUID изображения, что обеспечивает бесконечное кеширование в браузере и на Edge-серверах CDN.
2. **Инвалидация кеша (Purge API):** При обновлении логотипа девелопера или фонового баннера сервер отправляет запрос к CDN Purge API:
   ```bash
   POST https://api.cdn.yandexcloud.net/v1/cache/purge
   {
     "resourceId": "cdn-amberavenue",
     "paths": ["/media/developers/018e4f1a-bc23-74d1-9f12-000000000003/*"]
   }
   ```

---

## 6. Валидация файлов и антивирусный контроль

1. **Проверка Magic Bytes:** Сервер валидирует первые байты файла (сигнатуры JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `25 50 44 46`, WebP `52 49 46 46`), предотвращая подделку расширения файла.
2. **Лимиты размеров файлов:**
   - Фотографии ЖК, рендеры, баннеры: максимум **15 МБ**.
   - Документы и проектные декларации PDF: максимум **50 МБ**.
   - Аватары и логотипы: максимум **5 МБ**.
3. **Антивирусное сканирование (ClamAV Daemon):** Приватные юридические документы PDF при загрузке отправляются в фоновый сканер ClamAV. Зараженные файлы немедленно изолируются в карантинном бакете.
