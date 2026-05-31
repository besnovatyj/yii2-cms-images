<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use common\components\controller\ControllerTrait;
use Throwable;
use Yii;
use yii\web\Response;

/**
 * Вспомогательные методы для image standalone actions.
 *
 * Предоставляет единообразный формат JSON-ответов и проверку Fetch-запросов.
 */
trait ActionTrait
{
    /**
     * Проверяет что запрос отправлен через Fetch API виджета.
     *
     * @see ControllerTrait::isFetchRequest()
     */
    private function isFetchRequest(): bool
    {
        return Yii::$app->request->headers->get('X-Requested-With-Fetch') === 'true';
    }

    /**
     * Устанавливает формат ответа JSON и возвращает ошибку запроса Fetch.
     *
     * @return array{status: string, message: string}
     */
    private function requireFetchRequest(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return ['status' => 'error', 'message' => 'Request must be Fetch'];
    }

    /**
     * Формирует JSON-ответ об ошибке с опциональными данными отладки.
     *
     * @return array{status: string, message: string, data?: array}
     */
    private function errorResponse(Throwable $e): array
    {
        Yii::$app->errorHandler->logException($e);
        $response = ['status' => 'error', 'message' => 'Ошибка'];
        if (YII_DEBUG) {
            $response['data'] = [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ];
        }
        return $response;
    }
}
