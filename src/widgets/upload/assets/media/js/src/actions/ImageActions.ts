/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import {icons} from "@/View/icons";
import type {ServerImage} from "@/types";

/**
 * Декларативный реестр действий над изображениями.
 *
 * Смысл: UI-слои (панель массовых действий, инспектор) не знают о конкретных действиях —
 * они рендерят кнопки из этого реестра по месту размещения (`placement`) и вызывают
 * `run()`. Само действие не содержит бизнес-логики: оно лишь публикует интент через
 * `Dispatcher`, а обрабатывает его `GalleryController`. Благодаря этому добавление новой
 * возможности (скачать, кроп, поворот, alt-текст…) — это одна запись в `imageActions`,
 * без правки вёрстки компонентов.
 *
 * Реестр пока внутренний: подключаемые модули CMS свои действия не регистрируют.
 */

/** Где может отображаться действие. */
export type ActionPlacement = 'bulk-toolbar' | 'inspector';

/** Контекст для вычисления доступности действия. */
export interface ActionContext {
    /** Все серверные изображения галереи. */
    images: ServerImage[];
    /** ID изображений, к которым применяется действие (выбор или одно из инспектора). */
    selectedIds: number[];
}

/** Одно действие над одним или несколькими изображениями. */
export interface ImageAction {
    /** Уникальный идентификатор действия. */
    id: string;
    /** Подпись кнопки. */
    label: string;
    /** Inline-SVG иконки. */
    icon: string;
    /** Места размещения кнопки. */
    placement: ActionPlacement[];
    /** true — действие осмысленно для нескольких изображений (массовое). */
    bulk: boolean;
    /**
     * Доступность действия в текущем контексте.
     * Если не задано — действие доступно всегда при непустом наборе.
     */
    enabled?: (ctx: ActionContext) => boolean;
    /**
     * Выполнить действие: публикует интент в шину. Бизнес-логику выполняет контроллер.
     * @param ids        целевые изображения
     * @param dispatcher шина событий
     */
    run: (ids: number[], dispatcher: Dispatcher) => void;
}

/**
 * Реестр действий виджета. Порядок в массиве = порядок кнопок в UI.
 *
 * Расширение: добавьте новый объект `ImageAction` и укажите `placement`. Например,
 * будущее «Скачать»: `{ id:'download', bulk:true, placement:['bulk-toolbar','inspector'],
 * run:(ids,d)=>d.publish('VIEW.DOWNLOAD_IMAGES',{ids}) }` (интент и обработчик в контроллере
 * добавляются отдельно).
 */
export const imageActions: ImageAction[] = [
    {
        id: 'set-main',
        label: 'Сделать обложкой',
        icon: icons.star(15),
        // В инспекторе роль назначается собственным селектором ролей, поэтому здесь — только bulk-панель
        placement: ['bulk-toolbar'],
        bulk: false,
        // Обложка — ровно одно изображение; в bulk-панели кнопка активна только при одном выбранном
        enabled: (ctx) => ctx.selectedIds.length === 1,
        run: (ids, dispatcher) => dispatcher.publish('VIEW.SET_MAIN_IMAGE', {id: ids[0]}),
    },
    {
        id: 'delete',
        label: 'Удалить',
        icon: icons.trash(15),
        placement: ['bulk-toolbar', 'inspector'],
        bulk: true,
        enabled: (ctx) => ctx.selectedIds.length > 0,
        run: (ids, dispatcher) => dispatcher.publish('VIEW.IMAGES_DELETED', {ids}),
    },
];

/** Действия для конкретного места размещения. */
export function actionsFor(placement: ActionPlacement): ImageAction[] {
    return imageActions.filter(a => a.placement.includes(placement));
}
