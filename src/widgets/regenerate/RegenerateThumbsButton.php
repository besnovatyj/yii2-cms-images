<?php

/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\widgets\regenerate;

use Yii;
use yii\base\InvalidConfigException;
use yii\base\Widget;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\helpers\Url;
use yii\web\View;

/**
 * Кнопки «Прогреть превью» и «Перегенерировать превью» для страницы списка сущностей модуля.
 *
 * Бьёт AJAX-POST в action `regenerate-thumbs` контроллера модуля (см.
 * {@see \Besnovatyj\Images\helpers\ImageActionsMap}). Задание уходит в очередь, поэтому ответ
 * приходит сразу; итог генерации виден в модуле Upload (журнал сбоев, плитка дашборда).
 *
 * JS — самодостаточный инлайн (fetch) в позиции POS_END, без внешних ассетов и jQuery.
 * Ошибка показывается рядом с кнопками полным текстом из нативного JSON-тела ошибки Yii.
 *
 * Пример:
 * ```php
 * <?= RegenerateThumbsButton::widget(['url' => ['regenerate-thumbs']]) ?>
 * ```
 */
class RegenerateThumbsButton extends Widget
{
    /** @var array|string Маршрут или URL action `regenerate-thumbs` */
    public array|string $url = [];

    /**
     * {@inheritdoc}
     *
     * @throws InvalidConfigException
     */
    public function run(): string
    {
        if ($this->url === [] || $this->url === '') {
            throw new InvalidConfigException('RegenerateThumbsButton: свойство "url" обязательно.');
        }

        $id = 'regenerate-thumbs-' . $this->getId();
        $endpoint = Json::encode(Url::to($this->url));
        $csrfParam = Json::encode(Yii::$app->request->csrfParam);
        $csrfToken = Json::encode(Yii::$app->request->getCsrfToken());
        $confirm = Json::encode('Существующие превью будут удалены и созданы заново. Продолжить?');

        $this->view->registerJs(
            <<<JS
            (function () {
                var root = document.getElementById('{$id}');
                if (!root) { return; }
                var status = root.querySelector('[data-thumbs-status]');
                root.querySelectorAll('[data-thumbs-force]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var force = btn.getAttribute('data-thumbs-force') === '1';
                        if (force && !window.confirm({$confirm})) { return; }
                        var body = new FormData();
                        body.append({$csrfParam}, {$csrfToken});
                        body.append('force', force ? '1' : '0');
                        status.className = 'small ms-2 text-muted';
                        status.textContent = 'Отправка…';
                        fetch({$endpoint}, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: body })
                            .then(function (r) {
                                return r.json().catch(function () { return {}; }).then(function (data) {
                                    if (!r.ok) { throw new Error(data.message || data.name || ('HTTP ' + r.status)); }
                                    return data;
                                });
                            })
                            .then(function (data) {
                                status.className = 'small ms-2 text-success';
                                status.textContent = data.message || 'Поставлено в очередь';
                            })
                            .catch(function (e) {
                                status.className = 'small ms-2 text-danger';
                                status.textContent = '⚠ ' + e.message;
                            });
                    });
                });
            })();
            JS,
            View::POS_END
        );

        $warm = Html::button('<i class="bi bi-images me-1"></i>Прогреть превью', [
            'type' => 'button',
            'class' => 'btn btn-outline-secondary',
            'data-thumbs-force' => '0',
            'title' => 'Создать недостающие превью всех изображений (через очередь)',
        ]);
        $force = Html::button('<i class="bi bi-arrow-repeat me-1"></i>Перегенерировать превью', [
            'type' => 'button',
            'class' => 'btn btn-outline-danger',
            'data-thumbs-force' => '1',
            'title' => 'Пересоздать все превью (после смены размеров профилей)',
        ]);
        $status = Html::tag('span', '', ['data-thumbs-status' => true, 'class' => 'small ms-2 text-muted']);

        return Html::tag('span', $warm . ' ' . $force . $status, [
            'id' => $id,
            'class' => 'd-inline-flex align-items-center flex-wrap gap-1',
        ]);
    }
}
