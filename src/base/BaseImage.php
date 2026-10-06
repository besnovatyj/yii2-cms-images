<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\base;

use Besnovatyj\Upload\heap\ThumbnailMode;
use Besnovatyj\Upload\heap\ThumbnailProfile;
use Besnovatyj\Upload\heap\UploadBehavior;
use yii\db\ActiveRecord;
use yii\web\UploadedFile;

/**
 * Базовый абстрактный ActiveRecord для изображений.
 *
 * Автоматически конфигурирует UploadBehavior на основе
 * абстрактных методов дочернего класса. Дочерний класс обязан реализовать:
 * - getParentAttribute(): string  — имя FK-атрибута ('gallery_id', 'person_id')
 * - getStorageName(): string      — имя поддиректории хранилища ('Gallery', 'Person')
 * - getThumbProfiles(): array     — конфигурация профилей миниатюр
 * - tableName(): string           — стандартный AR
 *
 * Пример минимального подкласса:
 * ```php
 * class ArticleImage extends BaseImage
 * {
 *     protected static function getParentAttribute(): string { return 'article_id'; }
 *     protected static function getStorageName(): string { return 'Article'; }
 *     protected static function getThumbProfiles(): array {
 *         return ['thumb' => ['width' => 800, 'height' => 600]];
 *     }
 *     public static function tableName(): string { return '{{%article_images}}'; }
 * }
 * ```
 *
 * @property int $id
 * @property int $sort
 * @property string $file
 *
 * @mixin UploadBehavior
 */
abstract class BaseImage extends ActiveRecord
{
    /**
     * Фабричный метод создания нового изображения.
     *
     * @param int $parentId ID родительской сущности
     * @param UploadedFile $file Загруженный файл
     * @return static
     */
    public static function make(int $parentId, UploadedFile $file): static
    {
        $image = new static();
        $image->file = $file;
        $image->{static::getParentAttribute()} = $parentId;
        return $image;
    }

    /**
     * Публичный алиас getParentAttribute() для использования в Actions.
     *
     * Позволяет Actions получить имя FK-атрибута без нарушения инкапсуляции.
     */
    final public static function getParentAttributeName(): string
    {
        return static::getParentAttribute();
    }

    /**
     * Имя FK-атрибута, связывающего изображение с родителем.
     *
     * Например: 'gallery_id', 'person_id', 'article_id'.
     */
    abstract protected static function getParentAttribute(): string;

    /**
     * Имя поддиректории в файловом хранилище. Соответствует названию модуля.
     *
     * Используется в путях к файлам и миниатюрам.
     * Например: 'Gallery', 'Person', 'Article'.
     */
    abstract protected static function getStorageName(): string;

    /**
     * Конфигурация профилей миниатюр для UploadBehavior.
     *
     * Ключ массива — имя профиля; значение маппится в {@see ThumbnailProfile}:
     * `width`/`height` обязательны, `quality` (по умолчанию 80), `mode`
     * ({@see ThumbnailMode}, по умолчанию Resize) и `format` (webp/avif/…, по умолчанию
     * формат оригинала) — опциональны.
     *
     * @return array<string, array{width: int, height: int, quality?: int, mode?: ThumbnailMode, format?: string}>
     */
    abstract protected static function getThumbProfiles(): array;

    /**
     * Устанавливает порядок сортировки.
     */
    public function setSort(int $sort): void
    {
        $this->sort = $sort;
    }

    /**
     * Проверяет совпадение ID.
     */
    public function isIdEqualTo(int $id): bool
    {
        return $this->id === $id;
    }

    /**
     * Возвращает ID родительской сущности.
     */
    public function getParentId(): int
    {
        return (int)$this->{static::getParentAttribute()};
    }

    /**
     * {@inheritdoc}
     */
    public function behaviors(): array
    {
        $parentAttr = static::getParentAttribute();
        $storage = static::getStorageName();
        $thumbnails = [];
        foreach (static::getThumbProfiles() as $name => $config) {
            $thumbnails[] = new ThumbnailProfile(
                name: $name,
                width: $config['width'],
                height: $config['height'],
                quality: $config['quality'] ?? 80,
                mode: $config['mode'] ?? ThumbnailMode::Resize,
                format: $config['format'] ?? null,
            );
        }

        return [
            'photoUpload' => [
                'class' => UploadBehavior::class,
                'attribute' => 'file',
                'pathTemplate' => 'origin/' . $storage . '/{attr.' . $parentAttr . '}/{pk}.{extension}',
                'thumbnails' => $thumbnails,
                'thumbPathTemplate' => 'cache/' . $storage . '/{attr.' . $parentAttr . '}/{profile}_{pk}.{extension}',
            ],

            ...parent::behaviors(),
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function transactions(): array
    {
        return [self::SCENARIO_DEFAULT => self::OP_ALL];
    }
}
