<?php

/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Besnovatyj\Upload\thumbnails\ThumbnailRegenerator;
use Yii;
use yii\base\Action;
use yii\web\BadRequestHttpException;
use yii\web\MethodNotAllowedHttpException;
use yii\web\Response;

/**
 * Standalone action прогрева превью всех изображений модуля.
 *
 * Ставит в очередь одно задание: воркер обходит все изображения класса `imageClass` и создаёт
 * недостающие превью (`force=1` — пересоздаёт все, после смены размеров профилей). Ответ
 * приходит сразу, сколько бы изображений ни было.
 *
 * Ожидает POST (AJAX), параметр `force` — необязательный. Ошибки — нативным ErrorHandler
 * (HTTP 4xx/5xx + JSON-тело Yii), успех — `{status: 'success', message}`.
 *
 * @property string $imageClass FQCN класса-потомка BaseImage
 */
class RegenerateThumbsAction extends Action
{
    /** @var string FQCN класса-потомка BaseImage */
    public string $imageClass;

    public function __construct($id, $controller, private readonly ThumbnailRegenerator $regenerator, $config = [])
    {
        parent::__construct($id, $controller, $config);
    }

    /**
     * Ставит прогрев превью в очередь.
     *
     * @return array{status: string, message: string}
     * @throws BadRequestHttpException
     * @throws MethodNotAllowedHttpException
     */
    public function run(): array
    {
        $request = Yii::$app->request;
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (!$request->getIsPost()) {
            throw new MethodNotAllowedHttpException('Ожидается POST-запрос.');
        }
        if (!$request->getIsAjax()) {
            throw new BadRequestHttpException('Ожидается AJAX-запрос.');
        }

        $force = (bool)$request->post('force');
        $this->regenerator->enqueue($this->imageClass, 'file', $force);

        return [
            'status' => 'success',
            'message' => $force
                ? 'Перегенерация превью поставлена в очередь.'
                : 'Прогрев превью поставлен в очередь.',
        ];
    }
}
