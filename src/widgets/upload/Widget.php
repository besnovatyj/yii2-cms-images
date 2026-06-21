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
 * ]) ?>
 * ```
 *
 * @property int|string|null $ownerId   ID владельца (gallery_id, person_id и т.д.)
 * @property array           $endpoints Эндпойнты для запросов к бэкенду
 */
class Widget extends BaseWidget
{
    public null|int|string $ownerId = null;
    public array $endpoints = [];

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
