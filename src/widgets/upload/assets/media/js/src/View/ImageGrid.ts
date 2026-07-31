/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import ReorderController from "@/View/ReorderController";
import TileFactory from "@/View/TileFactory";
import type {PreviewFit, ServerImage, UiMode} from "@/types";

/** Порог длинного нажатия для входа в режим выделения на тач-устройствах (мс). */
const LONG_PRESS_MS = 300;
/** Смещение пальца, отменяющее long-press (px) — это скролл, а не удержание. */
const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * Сетка серверных изображений (Web Component, Shadow DOM).
 *
 * Рендерит чистые плитки (см. {@link TileFactory}) и реагирует на текущий режим:
 *   - normal    — клик по плитке открывает инспектор; long-press (тач) входит в selection;
 *   - selection — клик по плитке инвертирует выбор (центральная галочка);
 *   - reorder   — перетаскивание плиток (делегируется {@link ReorderController}).
 *
 * Компонент публикует только интенты через Dispatcher; бизнес-логику ведёт контроллер.
 */
export default class ImageGrid extends HTMLElement {
    private readonly grid: HTMLElement;
    private readonly reorder: ReorderController;

    /** Текущий режим (для обработчиков ввода без чтения DOM). */
    private mode: UiMode = 'normal';
    /** Активный таймер long-press. */
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    /** Координаты начала касания — для отмены long-press при скролле. */
    private pressStart: { x: number; y: number } | null = null;
    /** true — только что сработал long-press; ближайший click подавляем. */
    private longPressFired = false;

    constructor(
        private dispatcher: Dispatcher,
        imageSize: number,
        private previewFit: PreviewFit
    ) {
        super();
        this.style.setProperty('--tile-size', `${imageSize}px`);
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = ImageGrid.template();

        this.grid = this.shadowRoot!.querySelector('.grid')!;
        this.reorder = new ReorderController(this.grid, (ids) => this.emitSort(ids));
        this.bindEvents();
    }

    /** Обновить сетку под новое состояние. */
    render(images: ServerImage[], mode: UiMode, selectedIds: ReadonlySet<number>): void {
        this.applyMode(mode);

        const existing = new Map<string, HTMLElement>();
        Array.from(this.grid.children).forEach((el) => {
            const id = (el as HTMLElement).dataset.id;
            if (id) existing.set(id, el as HTMLElement);
        });

        // Патчим и выстраиваем плитки строго в порядке модели: appendChild переносит
        // существующий узел в конец, поэтому проход по порядку гарантирует, что DOM всегда
        // совпадает с моделью (в т.ч. корректный откат порядка при ошибке сохранения сортировки).
        images.forEach((img) => {
            const prev = existing.get(img.id.toString()) ?? null;
            const tile = TileFactory.createOrUpdate(img, this.previewFit, selectedIds.has(img.id), prev);
            this.grid.appendChild(tile);
            existing.delete(img.id.toString());
        });

        existing.forEach((el) => el.remove());
    }

    disconnectedCallback(): void {
        this.reorder.disable();
        this.clearLongPress();
    }

    // ==================== Режимы ====================

    private applyMode(mode: UiMode): void {
        if (mode === this.mode) return;
        this.mode = mode;
        this.grid.classList.remove('grid--normal', 'grid--selection', 'grid--reorder');
        this.grid.classList.add(`grid--${mode}`);
        // Перетаскивание существует только в reorder — в остальных режимах его нет вовсе
        if (mode === 'reorder') {
            this.reorder.enable();
        } else {
            this.reorder.disable();
        }
    }

    // ==================== Ввод ====================

    private bindEvents(): void {
        this.grid.addEventListener('click', (e) => this.handleClick(e));
        // Long-press для входа в selection — только на тач-устройствах и только в normal
        this.grid.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.grid.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.grid.addEventListener('pointerup', () => this.clearLongPress());
        this.grid.addEventListener('pointercancel', () => this.clearLongPress());
        // Гасим контекстное меню, чтобы long-press не вызывал системное меню на мобилке
        this.grid.addEventListener('contextmenu', (e) => {
            if (this.mode !== 'reorder') e.preventDefault();
        });
    }

    private handleClick(e: Event): void {
        const tile = this.tileFrom(e.target);
        if (!tile) return;

        // Подавляем клик, синтезированный после сработавшего long-press
        if (this.longPressFired) {
            this.longPressFired = false;
            return;
        }

        const id = this.tileId(tile);
        if (id === null) return;

        if (this.mode === 'selection') {
            this.dispatcher.publish('VIEW.TILE_TOGGLE_SELECT', {id});
        } else if (this.mode === 'normal') {
            this.dispatcher.publish('VIEW.TILE_ACTIVATED', {id});
        }
        // reorder — клики игнорируются (взаимодействие идёт через перетаскивание)
    }

    private handlePointerDown(e: PointerEvent): void {
        if (this.mode !== 'normal' || e.pointerType !== 'touch') return;
        const tile = this.tileFrom(e.target);
        if (!tile) return;

        const id = this.tileId(tile);
        if (id === null) return;

        this.pressStart = {x: e.clientX, y: e.clientY};
        this.longPressTimer = setTimeout(() => {
            this.longPressFired = true;
            // Тактильный отклик критично сообщает, что режим включился
            navigator.vibrate?.(10);
            this.dispatcher.publish('VIEW.TILE_LONGPRESS', {id});
            this.clearLongPress();
        }, LONG_PRESS_MS);
    }

    private handlePointerMove(e: PointerEvent): void {
        if (!this.pressStart) return;
        const dx = e.clientX - this.pressStart.x;
        const dy = e.clientY - this.pressStart.y;
        // Палец поехал — это скролл, отменяем удержание
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) this.clearLongPress();
    }

    private clearLongPress(): void {
        if (this.longPressTimer !== null) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.pressStart = null;
    }

    // ==================== Вспомогательное ====================

    /** Событие изменения порядка → массив {id, sort} для контроллера. */
    private emitSort(orderedIds: number[]): void {
        const newOrder = orderedIds.map((id, sort) => ({id, sort}));
        this.dispatcher.publish('VIEW.SORT_CHANGED', newOrder);
    }

    private tileFrom(target: EventTarget | null): HTMLElement | null {
        // Element, а не HTMLElement: клик может прийти по вложенному <svg>/<path> галочки —
        // это SVGElement, и проверка instanceof HTMLElement отсекла бы его (клик «в пустоту»).
        return target instanceof Element ? (target.closest('.tile') as HTMLElement | null) : null;
    }

    private tileId(tile: HTMLElement): number | null {
        const id = tile.dataset.id;
        return id && !isNaN(Number(id)) ? parseInt(id, 10) : null;
    }

    private static template(): string {
        return `
            <style>
                :host { display: block; width: 100%; }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(var(--tile-size), 1fr));
                    gap: 6px;
                    padding: 2px 0;
                }

                .tile {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 10px;
                    overflow: hidden;
                    background: var(--gu-tile-bg, #e9ecef);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
                    border: 2px solid transparent;
                    transition: transform .18s ease, box-shadow .18s ease, border-color .15s ease;
                    -webkit-user-select: none;
                    user-select: none;
                }
                .tile__img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    -webkit-user-drag: none;
                }
                /* В contain даём подложку/контур, иначе поля соседних превью сливаются */
                .tile.fit-contain { background: var(--gu-surface, #f3f4f6); }
                .tile.fit-contain { border-color: var(--gu-border, #e5e7eb); }

                /* === Бейдж «Обложка» — статус главного изображения === */
                .tile__badge {
                    position: absolute;
                    top: 6px; left: 6px;
                    display: none;
                    align-items: center;
                    padding: 3px 7px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .03em;
                    text-transform: uppercase;
                    color: #1c1401;
                    background: var(--gu-cover, rgba(245,158,11,.95));
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,.2);
                    pointer-events: none;
                }
                .tile.is-main .tile__badge { display: inline-flex; }

                /* === Центральная галочка выбора (видна только в selection) === */
                .tile__check {
                    position: absolute;
                    inset: 0;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: rgba(17,24,39,.12);
                    transition: background .15s ease;
                    /* Оверлей декоративный: клики должна ловить сама плитка, а не иконка */
                    pointer-events: none;
                }
                .tile__check > svg {
                    width: 44%;
                    height: 44%;
                    opacity: .55;
                    transform: scale(.9);
                    transition: opacity .15s ease, transform .15s ease;
                    filter: drop-shadow(0 1px 3px rgba(0,0,0,.5));
                }

                /* Режимы: как ведут себя плитки */
                .grid--normal .tile { cursor: pointer; }
                .grid--normal .tile:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 8px 20px rgba(0,0,0,.12), 0 3px 6px rgba(0,0,0,.08);
                    z-index: 2;
                }

                .grid--selection .tile { cursor: pointer; }
                .grid--selection .tile__check { display: flex; }
                .grid--selection .tile.is-selected {
                    border-color: var(--gu-accent, #4f7df3);
                }
                .grid--selection .tile.is-selected .tile__check {
                    background: rgba(79,125,243,.35);
                }
                .grid--selection .tile.is-selected .tile__check > svg {
                    opacity: 1;
                    transform: scale(1);
                }

                .grid--reorder .tile { cursor: grab; touch-action: none; }
                .grid--reorder .tile:active { cursor: grabbing; }

                /* Классы SortableJS */
                .tile--ghost { opacity: .35; }
                .tile--chosen { box-shadow: 0 8px 24px rgba(0,0,0,.22); }
                .tile--drag { transform: scale(1.05); opacity: .95; }

                @media (max-width: 640px) {
                    .grid { gap: 4px; }
                }
            </style>
            <div class="grid grid--normal"></div>
        `;
    }
}

customElements.define('image-grid', ImageGrid);
