/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import {icons} from "@/View/icons";
import {actionsFor, type ImageAction} from "@/actions/ImageActions";
import type {ServerImage} from "@/types";

/**
 * Панель массовых действий режима выделения.
 *
 * Появляется, когда включён режим selection. Показывает счётчик выбранного, кнопку
 * «Выбрать всё» и действия из декларативного реестра (место размещения `bulk-toolbar`):
 * «Сделать обложкой» (активно ровно при одном выбранном), «Удалить (N)». Выход — «Отмена».
 *
 * Панель ничего не знает о конкретных действиях: их набор и доступность приходят из
 * {@link actionsFor}. Десктоп — панель сверху сетки; мобилка — фиксированная снизу.
 */
export default class BulkActionBar extends HTMLElement {
    private readonly actions = actionsFor('bulk-toolbar');
    private readonly actionButtons = new Map<string, HTMLButtonElement>();
    private readonly countEl: HTMLElement;
    /** Последний известный выбор — источник целей для кнопок действий. */
    private selection: number[] = [];

    constructor(private dispatcher: Dispatcher) {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = this.template();
        this.countEl = this.shadowRoot!.querySelector('.js-count')!;
        this.buildActionButtons();
        this.bindStatic();
        this.style.display = 'none';
    }

    /**
     * Обновить панель под выбор.
     * @param selectedIds выбранные изображения
     * @param images      все серверные изображения (для вычисления доступности действий)
     */
    update(selectedIds: ReadonlySet<number>, images: ServerImage[]): void {
        const ids = [...selectedIds];
        this.selection = ids;
        this.countEl.textContent = `Выбрано: ${ids.length}`;
        const ctx = {images, selectedIds: ids};
        this.actions.forEach((action) => {
            const btn = this.actionButtons.get(action.id)!;
            btn.disabled = action.enabled ? !action.enabled(ctx) : ids.length === 0;
        });
    }

    public setVisible(visible: boolean): void {
        this.style.display = visible ? 'block' : 'none';
    }

    private buildActionButtons(): void {
        const slot = this.shadowRoot!.querySelector('.js-actions')!;
        this.actions.forEach((action) => {
            const btn = this.makeButton(action);
            this.actionButtons.set(action.id, btn);
            slot.appendChild(btn);
        });
    }

    private makeButton(action: ImageAction): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = action.id === 'delete' ? 'btn btn--danger' : 'btn';
        btn.innerHTML = `${action.icon}<span>${action.label}</span>`;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.disabled) return;
            action.run(this.selection.slice(), this.dispatcher);
        });
        return btn;
    }

    private bindStatic(): void {
        this.shadowRoot!.querySelector('.js-select-all')!.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.SELECT_ALL');
        });
        this.shadowRoot!.querySelector('.js-cancel')!.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.EXIT_MODE');
        });
    }

    private template(): string {
        return `
            <style>
                :host { display: block; }
                .bar {
                    display: flex; align-items: center; gap: 10px;
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    background: var(--gu-surface, #f3f4f6);
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 10px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .count { font-size: 13px; font-weight: 600; color: var(--gu-text-strong, #1f2937); white-space: nowrap; }
                .spacer { flex: 1; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 6px 12px;
                    font: 500 13px/1 inherit;
                    color: var(--gu-text, #374151);
                    background: #fff;
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 7px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
                }
                .btn:hover:not(:disabled) { background: #f3f4f6; color: var(--gu-text-strong, #1f2937); }
                .btn:disabled { opacity: .45; cursor: default; }
                .btn--danger { color: var(--gu-danger, #ef4444); border-color: rgba(239,68,68,.35); }
                .btn--danger:hover:not(:disabled) { background: rgba(239,68,68,.08); color: var(--gu-danger, #ef4444); }
                .btn--ghost { background: transparent; border-color: transparent; }
                svg { flex-shrink: 0; }

                /* Мобилка: панель прижата к низу экрана */
                @media (max-width: 640px) {
                    .bar {
                        position: fixed;
                        left: 8px; right: 8px; bottom: 8px;
                        margin: 0;
                        z-index: 50;
                        box-shadow: 0 6px 24px rgba(0,0,0,.18);
                        flex-wrap: wrap;
                    }
                }
            </style>
            <div class="bar">
                <span class="count js-count">Выбрано: 0</span>
                <button type="button" class="btn btn--ghost js-select-all">${icons.select(15)} Выбрать всё</button>
                <span class="spacer"></span>
                <span class="js-actions" style="display:inline-flex; gap:8px;"></span>
                <button type="button" class="btn btn--ghost js-cancel">${icons.close(15)} Отмена</button>
            </div>
        `;
    }
}

customElements.define('bulk-action-bar', BulkActionBar);
