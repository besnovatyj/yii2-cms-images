<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\contracts;

/**
 * No-op реализации lockOwner() и refreshOwner() из ImageOwnerInterface.
 *
 * Используйте этот трейт в ImageOwnerInterface-реализациях для модулей,
 * которым не нужен pessimistic lock (большинство модулей кроме Gallery).
 *
 * Пример:
 * ```php
 * class PersonImageOwner implements ImageOwnerInterface
 * {
 *     use NullImageOwnerTrait;
 *     // ... остальные методы
 * }
 * ```
 */
trait NullImageOwnerTrait
{
    /**
     * No-op. Переопределите если нужен SELECT FOR UPDATE.
     */
    public function lockOwner(): void
    {
        // Блокировка не требуется
    }

    /**
     * No-op. Переопределите если вызываете lockOwner().
     */
    public function refreshOwner(): void
    {
        // Refresh не требуется
    }
}
