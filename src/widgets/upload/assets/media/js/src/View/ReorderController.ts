/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Sortable from "sortablejs";

/**
 * Обёртка над SortableJS для режима «Изменить порядок».
 *
 * Инкапсулирует единственную зависимость от библиотеки перетаскивания в одном месте:
 * остальной код работает с простым контрактом enable()/disable() и колбэком нового
 * порядка id. Экземпляр Sortable создаётся только на время режима reorder и уничтожается
 * при выходе — в normal/selection никаких обработчиков перетаскивания не висит.
 *
 * Ручка не нужна: в выделенном режиме тащится вся плитка целиком (Вариант А из TODO),
 * поэтому `handle` не задаётся, а `delay` не нужен (long-press остаётся под selection mode).
 */
export default class ReorderController {
    private sortable: Sortable | null = null;

    /**
     * @param container корневой элемент сетки (внутри Shadow DOM), чьи прямые дети — плитки
     * @param onReorder вызывается по завершении перетаскивания с новым порядком data-id
     */
    constructor(
        private container: HTMLElement,
        private onReorder: (orderedIds: number[]) => void
    ) {
    }

    /** Активна ли сортировка. */
    get active(): boolean {
        return this.sortable !== null;
    }

    /** Включить перетаскивание (идемпотентно). */
    enable(): void {
        if (this.sortable) return;
        this.sortable = Sortable.create(this.container, {
            animation: 150,
            // forceFallback: единый кастомный «призрак» на десктопе и на тач-устройствах,
            // иначе нативный HTML5-drag на десктопе тащит саму <img> (проблема WebKit).
            forceFallback: true,
            ghostClass: 'tile--ghost',   // слот-плейсхолдер на месте перетаскиваемой плитки
            chosenClass: 'tile--chosen', // выбранная плитка
            dragClass: 'tile--drag',     // визуальный клон под пальцем/курсором
            fallbackTolerance: 4,
            onEnd: () => this.emitOrder(),
        });
    }

    /** Выключить и полностью снять обработчики. */
    disable(): void {
        this.sortable?.destroy();
        this.sortable = null;
    }

    /** Собрать текущий порядок id из DOM и отдать наружу. */
    private emitOrder(): void {
        const ids = Array.from(this.container.children)
            .map(el => (el as HTMLElement).dataset.id)
            .filter((id): id is string => !!id && !isNaN(Number(id)))
            .map(id => parseInt(id, 10));
        this.onReorder(ids);
    }
}
