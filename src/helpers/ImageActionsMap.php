<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\helpers;

use Besnovatyj\Images\actions\DeleteImageAction;
use Besnovatyj\Images\actions\GetImagesAction;
use Besnovatyj\Images\actions\RegenerateThumbsAction;
use Besnovatyj\Images\actions\SetMainImageAction;
use Besnovatyj\Images\actions\SetNewSortAction;
use Besnovatyj\Images\actions\UploadImageAction;
use Besnovatyj\Images\base\BaseImage;
use Besnovatyj\Images\contracts\ImageOwnerInterface;

/**
 * Хелпер для регистрации всех image-actions в контроллере одной строкой.
 *
 * Пример максимально простого подключения:
 * ```php
 * // В контроллере
 * public function actions(): array
 * {
 *     return ImageActionsMap::get(
 *         Photo::class,
 *         fn(int $id) => new PersonImageOwner($this->persons->get($id), $this->persons),
 *     );
 * }
 * ```
 *
 * Не забудьте добавить HTTP-методы в VerbFilter:
 * ```php
 * 'actions' => [
 *     'add-image'      => ['POST'],
 *     'delete-image'   => ['POST'],
 *     'get-images'     => ['POST'],
 *     'set-main-image' => ['POST'],
 *     'set-new-sort'   => ['POST'],
 *     'regenerate-thumbs' => ['POST'],
 * ],
 * ```
 *
 * `regenerate-thumbs` — прогрев превью всех изображений модуля через очередь; кнопка для страницы
 * списка — {@see \Besnovatyj\Images\widgets\regenerate\RegenerateThumbsButton}.
 */
final class ImageActionsMap
{
    /**
     * Возвращает конфигурацию всех image-actions для Controller::actions().
     *
     * @param class-string<BaseImage>      $imageClass     FQCN потомка BaseImage
     * @param callable                     $ownerResolver  callable(int $id): ImageOwnerInterface
     * @param string                       $previewProfile Профиль миниатюры для GetImagesAction
     * @return array<string, array<string, mixed>>
     */
    public static function get(
        string $imageClass,
        callable $ownerResolver,
        string $previewProfile = 'thumb',
    ): array {
        return [
            'add-image'      => [
                'class'         => UploadImageAction::class,
                'imageClass'    => $imageClass,
                'ownerResolver' => $ownerResolver,
            ],
            'delete-image'   => [
                'class'         => DeleteImageAction::class,
                'imageClass'    => $imageClass,
                'ownerResolver' => $ownerResolver,
            ],
            'get-images'     => [
                'class'              => GetImagesAction::class,
                'imageClass'         => $imageClass,
                'ownerResolver'      => $ownerResolver,
                'previewThumbProfile' => $previewProfile,
            ],
            'set-main-image' => [
                'class'         => SetMainImageAction::class,
                'imageClass'    => $imageClass,
                'ownerResolver' => $ownerResolver,
            ],
            'set-new-sort'   => [
                'class'         => SetNewSortAction::class,
                'imageClass'    => $imageClass,
                'ownerResolver' => $ownerResolver,
            ],
            'regenerate-thumbs' => [
                'class'      => RegenerateThumbsAction::class,
                'imageClass' => $imageClass,
            ],
        ];
    }
}
