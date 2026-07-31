/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import {icons} from "@/View/icons";
import type {UiMode} from "@/types";

/**
 * Тулбар над сеткой изображений.
 *
 * Содержит переключатели режимов работы с галереей — это «резерв на будущее»: всё новое,
 * что не является частым действием над одной картинкой, добавляется сюда, а не на плитку.
 * Сейчас: «Выбрать» (вход в selection) и «Изменить порядок» (вход в reorder). В режиме
 * reorder показывает «Готово» для выхода; в selection тулбар скрыт — им управляет
 * панель массовых действий.
 *
 * Кнопки режимов — не «действия над изображениями», поэтому они здесь, а не в реестре
 * {@link ImageAction} (реестр — только про операции над картинками).
 */
export default class GridToolbar extends HTMLElement {
    constructor(private dispatcher: Dispatcher) {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = this.template();
        this.bind();
    }

    /**
     * Синхронизировать тулбар с состоянием.
     * @param mode       текущий режим
     * @param imageCount число серверных изображений (при 0 переключатели прячутся)
     */
    update(mode: UiMode, imageCount: number): void {
        const hasImages = imageCount > 0;
        this.toggle('.js-mode-buttons', hasImages && mode === 'normal');
        this.toggle('.js-reorder-done', mode === 'reorder');
        // В selection всем управляет BulkActionBar — тулбар не показываем
        this.style.display = (mode === 'normal' && hasImages) || mode === 'reorder' ? 'block' : 'none';
    }

    private bind(): void {
        this.on('.js-select', 'VIEW.ENTER_SELECTION');
        this.on('.js-reorder', 'VIEW.ENTER_REORDER');
        this.on('.js-reorder-done', 'VIEW.EXIT_MODE');
    }

    private on(selector: string, event: 'VIEW.ENTER_SELECTION' | 'VIEW.ENTER_REORDER' | 'VIEW.EXIT_MODE'): void {
        this.shadowRoot!.querySelector(selector)!.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish(event);
        });
    }

    private toggle(selector: string, visible: boolean): void {
        (this.shadowRoot!.querySelector(selector) as HTMLElement).style.display = visible ? 'flex' : 'none';
    }

    private template(): string {
        return `
            <style>
                :host { display: block; }
                .bar { display: flex; gap: 8px; align-items: center; padding: 2px 0 10px; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 13px;
                    font: 500 13px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: var(--gu-text, #374151);
                    background: var(--gu-surface, #f3f4f6);
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease, transform .1s ease;
                }
                .btn:hover { background: #e9eaec; color: var(--gu-text-strong, #1f2937); }
                .btn:active { transform: scale(.97); }
                .btn--primary {
                    color: #fff;
                    background: var(--gu-accent, #4f7df3);
                    border-color: transparent;
                    box-shadow: 0 1px 3px rgba(79,125,243,.35);
                }
                .btn--primary:hover { background: var(--gu-accent-hover, #3b6de0); color: #fff; }
                svg { flex-shrink: 0; }
            </style>
            <div class="bar">
                <span class="js-mode-buttons" style="display:flex; gap:8px;">
                    <button type="button" class="btn js-select">${icons.select(15)} Выбрать</button>
                    <button type="button" class="btn js-reorder">${icons.reorder(15)} Изменить порядок</button>
                </span>
                <button type="button" class="btn btn--primary js-reorder-done" style="display:none;">
                    ${icons.check(15)} Готово
                </button>
            </div>
        `;
    }
}

customElements.define('grid-toolbar', GridToolbar);
