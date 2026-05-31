<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\contracts;

use Besnovatyj\Images\base\BaseImage;
use yii\db\Exception;

/**
 * Контракт для сущностей-владельцев набора изображений.
 *
 * Реализуется родительским ActiveRecord (Gallery, Person и т.д.).
 * Через этот интерфейс Actions взаимодействуют с бизнес-логикой
 * конкретного модуля, не зная о нём напрямую.
 *
 * Для модулей без pessimistic lock используйте NullImageOwnerTrait,
 * который предоставляет no-op реализации lockOwner() и refreshOwner().
 */
interface ImageOwnerInterface
{
    /**
     * Возвращает ID владельца.
     */
    public function getOwnerId(): int;

    /**
     * Возвращает изображения владельца, отсортированные по sort.
     *
     * @return BaseImage[]
     */
    public function getOwnedImages(): array;

    /**
     * Возвращает ID главного изображения или null если не установлено.
     */
    public function getMainImageId(): ?int;

    /**
     * Устанавливает главное изображение. Сохранение — ответственность вызывающей стороны.
     */
    public function setMainImageId(?int $imageId): void;

    /**
     * Сохраняет владельца (например, после обновления main_image_id).
     *
     * @throws Exception
     */
    public function saveOwner(): void;

    /**
     * Блокирует строку владельца (SELECT FOR UPDATE) внутри транзакции.
     *
     * Реализуется только если нужен pessimistic lock (например, Gallery).
     * Для остальных модулей используйте NullImageOwnerTrait (no-op).
     */
    public function lockOwner(): void;

    /**
     * Обновляет данные владельца из БД (refresh).
     *
     * Вызывается после lockOwner() для получения актуальных данных.
     * Для модулей без lock используйте NullImageOwnerTrait (no-op).
     */
    public function refreshOwner(): void;
}
