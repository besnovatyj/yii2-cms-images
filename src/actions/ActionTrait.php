<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Throwable;
use Yii;
use yii\web\Response;

/**
 * Вспомогательные методы для image standalone actions.
 *
 * Предоставляет единообразный формат JSON-ответов и проверку Ajax-запросов.
 */
trait ActionTrait
{
    /**
     * Проверяет что запрос отправлен через Ajax API виджета.
     */
    private function isAjax(): bool
    {
        return Yii::$app->getRequest()->getIsAjax();
    }

    /**
     * Устанавливает формат ответа JSON и возвращает ошибку запроса Ajax.
     *
     * @return array{status: string, message: string}
     */
    private function requireAjax(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return ['status' => 'error', 'message' => 'Request must be Ajax'];
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
