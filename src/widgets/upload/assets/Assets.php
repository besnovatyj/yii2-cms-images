<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\widgets\upload\assets;

use yii\web\AssetBundle;
use yii\web\View;

/**
 * Asset Bundle для виджета загрузки изображений.
 *
 * Публикует директорию media (JS dist) из пакета yii2-cms-images.
 */
class Assets extends AssetBundle
{
    public $sourcePath = __DIR__ . '/media';

    public $css = [];

//    public $js = ['js/dist/index.js',];

    public $jsOptions = [
        'type'     => 'module',
        'position' => View::POS_HEAD,
    ];
}
