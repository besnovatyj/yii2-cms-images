# yii2-cms-images

Пакет для управления изображениями в модулях Yii2 CMS.
Предоставляет базовый AR-класс, standalone Yii2 actions и AJAX-виджет загрузки — чтобы любой модуль получил полноценное
управление изображениями с минимальным кодом.

---

## Возможности

- **`BaseImage`** — абстрактный ActiveRecord с настроенным `ImageUploadBehavior` (оригиналы + миниатюры по профилям)
- **5 standalone actions** — загрузка, удаление, список, сортировка, главное изображение
- **AJAX-виджет** — drag-and-drop загрузка, сортировка, превью, параллельные загрузки
- **Pessimistic lock** — защита от race condition при параллельной загрузке (через `ImageOwnerInterface`)
- **Автоматическое управление main_image_id** — первое изображение становится главным автоматически

---

## Установка

composer.json вашего модуля:

```json
"require": {
  "besnovatyj/yii2-cms-images": "1.0.0"
}
```

---

## Быстрый старт

### 1. Создать класс изображения

```php
// src/entities/ArticleImage.php
namespace Besnovatyj\Article\entities;

use Besnovatyj\Images\base\BaseImage;

class ArticleImage extends BaseImage
{
    protected static function getParentAttribute(): string
    {
        return 'article_id'; // FK-атрибут в таблице изображений
    }

    protected static function getStorageName(): string
    {
        return 'Article'; // поддиректория в @static/origin/ и @static/cache/
    }

    protected static function getThumbProfiles(): array
    {
        return [
            'admin' => ['width' => 70,  'height' => 100],
            'thumb' => ['width' => 640, 'height' => 480],
        ];
    }

    public static function tableName(): string
    {
        return '{{%article_images}}';
    }
}
```

`BaseImage` автоматически настраивает пути к файлам:

```
@static/origin/Article/{article_id}/{image_id}.{ext}
@static/cache/Article/{article_id}/{profile}_{image_id}.{ext}
```

### 2. Создать ImageOwner-адаптер

```php
// src/image/ArticleImageOwner.php
namespace Besnovatyj\Article\image;

use Besnovatyj\Article\entities\Article;
use Besnovatyj\Article\repositories\ArticleRepository;
use Besnovatyj\Images\contracts\ImageOwnerInterface;
use Besnovatyj\Images\contracts\NullImageOwnerTrait;

class ArticleImageOwner implements ImageOwnerInterface
{
    use NullImageOwnerTrait; // lockOwner/refreshOwner — no-op (если не нужен pessimistic lock)

    public function __construct(
        private readonly Article           $article,
        private readonly ArticleRepository $repository,
    ) {}

    public function getOwnerId(): int          { return $this->article->id; }
    public function getOwnedImages(): array    { return $this->article->images; }
    public function getMainImageId(): ?int     { return $this->article->main_image_id ?: null; }
    public function setMainImageId(?int $id): void { $this->article->setMainImage($id); }
    public function saveOwner(): void          { $this->repository->save($this->article); }
}
```

### 3. Подключить actions в контроллер

```php
// src/controllers/backend/ArticleController.php
use Besnovatyj\Article\entities\ArticleImage;
use Besnovatyj\Article\image\ArticleImageOwner;
use Besnovatyj\Images\helpers\ImageActionsMap;

class ArticleController extends Controller
{
    public function actions(): array
    {
        return ImageActionsMap::get(
            ArticleImage::class,
            fn(int $id) => new ArticleImageOwner($this->repo->get($id), $this->repo),
        );
    }

    public function behaviors(): array
    {
        return [
            'verbs' => [
                'class'   => VerbFilter::class,
                'actions' => [
                    'add-image'      => ['POST'],
                    'delete-image'   => ['POST'],
                    'get-images'     => ['POST'],
                    'set-main-image' => ['POST'],
                    'set-new-sort'   => ['POST'],
                ],
            ],
        ];
    }
    // ...
}
```

### 4. Добавить виджет в view

```php
// views/backend/article/view.php
use Besnovatyj\Images\widgets\upload\Widget;
use yii\helpers\Url;

<?= Widget::widget([
    'ownerId'   => $article->id,
    'endpoints' => [
        'getImages'    => Url::to(['/Article/backend/article/get-images'], true),
        'setNewSort'   => Url::to(['/Article/backend/article/set-new-sort'], true),
        'upload'       => Url::to(['/Article/backend/article/add-image'], true),
        'deleteImage'  => Url::to(['/Article/backend/article/delete-image'], true),
        'setMainImage' => Url::to(['/Article/backend/article/set-main-image'], true),
    ],
]) ?>
```

---

## Pessimistic lock (для модулей с параллельной загрузкой)

Если несколько файлов могут загружаться одновременно и у родительской сущности есть `main_image_id`, нужен pessimistic
lock. Иначе несколько запросов одновременно увидят `main_image_id = null` и попытаются его установить → FK constraint
violation.

Пример (см. `GalleryImageOwner` в `yii2-cms-gallery`):

```php
class GalleryImageOwner implements ImageOwnerInterface
{
    // НЕ используем NullImageOwnerTrait — реализуем lock самостоятельно

    public function lockOwner(): void
    {
        $this->gallery->lock(); // PessimisticLockBehavior — SELECT FOR UPDATE
    }

    public function refreshOwner(): void
    {
        $this->gallery->refresh(); // получаем актуальные данные после lock
    }
    // ...
}
```

`UploadImageAction` всегда вызывает `lockOwner()` → `refreshOwner()` внутри транзакции.
Для модулей без lock эти методы — no-op через `NullImageOwnerTrait`.

---

## Структура пакета

```
src/
  base/
    BaseImage.php                   # Абстрактный AR с ImageUploadBehavior
  contracts/
    ImageOwnerInterface.php         # Контракт адаптера владельца
    NullImageOwnerTrait.php         # No-op реализации lock/refresh
  forms/
    UploadImageForm.php             # Форма загрузки (formName = 'AddImageForm')
  actions/
    ActionTrait.php                 # isAjax(), errorResponse()
    UploadImageAction.php           # POST add-image
    DeleteImageAction.php           # POST delete-image
    GetImagesAction.php             # POST get-images
    SetMainImageAction.php          # POST set-main-image
    SetNewSortAction.php            # POST set-new-sort
  helpers/
    ImageActionsMap.php             # ::get() — все 5 actions одним вызовом
  widgets/
    upload/
      Widget.php                    # Yii2 виджет (yii\base\Widget)
      assets/
        Assets.php                  # AssetBundle
        media/js/                   # TypeScript источники + собранный dist/index.js
```

---

## API Actions

Все actions принимают запросы с заголовком `X-Requested-With' === 'XMLHttpRequest`.

| Action           | POST-параметры                                           | Описание                    |
|------------------|----------------------------------------------------------|-----------------------------|
| `add-image`      | `AddImageForm[id]`, `AddImageForm[file]`                 | Загрузить изображение       |
| `delete-image`   | `DeleteImageForm[id]`, `DeleteImageForm[imageId]`        | Удалить изображение         |
| `get-images`     | `GetImagesForm[id]`                                      | Получить список изображений |
| `set-main-image` | `SetMainImageForm[id]`, `SetMainImageForm[imageId]`      | Установить главное          |
| `set-new-sort`   | `SetNewSortForm[id]`, `SetNewSortForm[sortOrder]` (JSON) | Обновить порядок            |

Формат ответа:

```json
{
    "status": "success"
}
{
    "status": "error",
    "message": "...",
    "data": {
        "message": "..."
    }
}
```

`get-images` при успехе возвращает:

```json
{
    "status": "success",
    "data": {
        "1": {
            "kind": "server",
            "id": 1,
            "sort": 0,
            "fileName": "photo.jpg",
            "previewUrl": "...",
            "srcUrl": "...",
            "isMain": true
        }
    }
}
```

---

## BaseImage: параметры конфигурации

| Метод                  | Возвращает | Описание                                      |
|------------------------|------------|-----------------------------------------------|
| `getParentAttribute()` | `string`   | Имя FK-атрибута (`gallery_id`, `person_id`)   |
| `getStorageName()`     | `string`   | Поддиректория хранилища (`Gallery`, `Person`) |
| `getThumbProfiles()`   | `array`    | Профили миниатюр для ImageUploadBehavior      |
| `tableName()`          | `string`   | Имя таблицы БД                                |

Публичные методы:

```php
BaseImage::make(int $parentId, UploadedFile $file): static  // фабричный метод
BaseImage::getParentAttributeName(): string                 // для Actions
$image->setSort(int $sort): void
$image->isIdEqualTo(int $id): bool
$image->getParentId(): int
```

---

## ImageActionsMap: параметры

```php
ImageActionsMap::get(
    string $imageClass,        // FQCN потомка BaseImage
    callable $ownerResolver,   // fn(int $id): ImageOwnerInterface
    string $previewProfile,    // профиль миниатюры для get-images (по умолчанию 'thumb')
): array
```

---

## Пример использования в gallery (с pessimistic lock)

`yii2-cms-gallery` — эталонная реализация с pessimistic lock:

- `src/entities/gallery/Image.php` — extends BaseImage
- `src/image/GalleryImageOwner.php` — реализует lock через PessimisticLockBehavior
- `src/controllers/backend/GalleryController.php` — подключает через ImageActionsMap

---

## Требования

- PHP >= 8.4
- yiisoft/yii2 ~2.0.0
- yiisoft/yii2-bootstrap5 ~2.0.0
- `common\components\upload\behaviors\ImageUploadBehavior` (из хост-приложения)
