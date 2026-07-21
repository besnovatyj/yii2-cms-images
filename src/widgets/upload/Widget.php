<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\widgets\upload;

use Besnovatyj\Images\widgets\upload\assets\Assets;
use Yii;
use yii\base\InvalidConfigException;
use yii\base\Widget as BaseWidget;
use yii\helpers\Html;
use yii\helpers\Json;

/**
 * Виджет AJAX-загрузки изображений.
 *
 * Рендерит контейнер и инициализирует TypeScript-виджет с конфигурацией
 * эндпойнтов. Виджет не привязан к конкретному модулю — все эндпойнты
 * передаются извне.
 *
 * Пример использования:
 * ```php
 * <?= Widget::widget([
 *     'ownerId'   => $entity->id,
 *     'endpoints' => [
 *         'getImages'    => Url::to(['/Module/backend/controller/get-images'], true),
 *         'setNewSort'   => Url::to(['/Module/backend/controller/set-new-sort'], true),
 *         'upload'       => Url::to(['/Module/backend/controller/add-image'], true),
 *         'deleteImage'  => Url::to(['/Module/backend/controller/delete-image'], true),
 *         'setMainImage' => Url::to(['/Module/backend/controller/set-main-image'], true),
 *     ],
 *     'previewFit' => Widget::PREVIEW_FIT_CONTAIN, // необязательно; по умолчанию cover
 * ]) ?>
 * ```
 *
 * @property int|string|null $ownerId    ID владельца (gallery_id, person_id и т.д.)
 * @property array           $endpoints  Эндпойнты для запросов к бэкенду
 * @property string          $previewFit Способ вписывания превью в квадрат ячейки:
 *                                       'cover' — заполнить с обрезкой, 'contain' — вписать целиком
 */
class Widget extends BaseWidget
{
    /** Превью заполняет квадрат ячейки с обрезкой краёв. */
    public const string PREVIEW_FIT_COVER = 'cover';
    /** Превью вписывается в квадрат ячейки целиком (возможны поля по краям). */
    public const string PREVIEW_FIT_CONTAIN = 'contain';

    public null|int|string $ownerId = null;
    public array $endpoints = [];

    /**
     * Способ отображения превью в сетке. Одно из PREVIEW_FIT_* (по умолчанию cover).
     *
     * @var string
     */
    public string $previewFit = self::PREVIEW_FIT_CONTAIN;

    /**
     * {@inheritdoc}
     *
     * @throws InvalidConfigException
     */
    public function run(): void
    {
        if (empty($this->endpoints)) {
            throw new InvalidConfigException('Endpoints is required');
        }
        if (!$this->ownerId) {
            throw new InvalidConfigException('ownerId is required');
        }
        if (!in_array($this->previewFit, [self::PREVIEW_FIT_COVER, self::PREVIEW_FIT_CONTAIN], true)) {
            throw new InvalidConfigException("previewFit must be '" . self::PREVIEW_FIT_COVER . "' or '" . self::PREVIEW_FIT_CONTAIN . "'");
        }

        $config = [
            'containerId' => 'manage-img-widget_' . $this->getId(),
            'headers' => [
                'x-csrf-token'           => Yii::$app->request->getCsrfToken(), // Yii2 CSRF protect
                'X-Requested-With'       => 'XMLHttpRequest', // Detect Ajax in Yii2
            ],
            'ownerId'   => $this->ownerId,
            'endpoints' => $this->endpoints,
            'formNames' => [
                'getImagesForm'    => 'GetImagesForm',
                'uploadImageForm'  => 'AddImageForm',
                'deleteImageForm'  => 'DeleteImageForm',
                'setNewSortForm'   => 'SetNewSortForm',
                'setMainImageForm' => 'SetMainImageForm',
            ],
            'imageScale' => 0.95, // размер каждого изображения в сетке виджета
            'previewFit' => $this->previewFit, // 'cover' (заполнить) | 'contain' (вписать)
            'maxWidth'   => 5000, // максимальная ширина изображения в пикселях
            'maxHeight'  => 5000, // максимальная высота изображения в пикселях
        ];

        $jsonConfig  = Json::encode($config);
        $assetBundle = Assets::register($this->view);

        echo Html::tag('div', '', [
            'id'    => $config['containerId'],
            'class' => 'gallery-upload',
        ]);

        $js = "
            import { createGalleryWidget } from '$assetBundle->baseUrl/js/dist/index.js';
            document.addEventListener('DOMContentLoaded', () => {
                createGalleryWidget({$jsonConfig});
            })
        ";

        echo Html::script($js, ['type' => 'module']);
    }
}
