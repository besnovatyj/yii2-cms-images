/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import {icons} from "@/View/icons";
import {actionsFor} from "@/actions/ImageActions";
import type {PreviewFit, ServerImage} from "@/types";

/**
 * Панель свойств одного изображения (инспектор).
 *
 * Открывается кликом по плитке в обычном режиме. Десктоп — выезжающая панель справа;
 * мобилка — bottom sheet. Показывает крупное превью, имя файла, селектор ролей и действия
 * из реестра (место `inspector`).
 *
 * Селектор ролей — точка роста «звёздочки»: сейчас роль одна (обложка/главное изображение),
 * но контейнер `.roles` рассчитан на несколько ролей. Прочие будущие свойства (alt-текст,
 * описание, кроп, поворот, замена файла) добавляются в секцию-точку расширения `.js-extra`
 * без переделки каркаса панели.
 */
export default class InspectorPanel extends HTMLElement {
    private readonly deleteActions = actionsFor('inspector');
    private current: ServerImage | null = null;

    private readonly imgEl: HTMLImageElement;
    private readonly nameEl: HTMLElement;
    private readonly coverBtn: HTMLButtonElement;
    private readonly actionsSlot: HTMLElement;

    constructor(
        private dispatcher: Dispatcher,
        private previewFit: PreviewFit
    ) {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = this.template();

        this.imgEl = this.shadowRoot!.querySelector('.js-preview')!;
        this.nameEl = this.shadowRoot!.querySelector('.js-name')!;
        this.coverBtn = this.shadowRoot!.querySelector('.js-cover')!;
        this.actionsSlot = this.shadowRoot!.querySelector('.js-actions')!;

        this.buildActions();
        this.bind();
        this.style.display = 'none';
    }

    /**
     * Показать/скрыть панель.
     * @param image изображение для отображения; null — закрыть.
     */
    update(image: ServerImage | null): void {
        this.current = image;
        if (!image) {
            this.close();
            return;
        }
        this.imgEl.src = image.previewUrl;
        this.imgEl.alt = image.fileName;
        this.imgEl.style.objectFit = this.previewFit;
        this.nameEl.textContent = image.fileName;
        this.renderCoverRole(image.isMain);
        this.open();
    }

    private renderCoverRole(isMain: boolean): void {
        this.coverBtn.classList.toggle('role--active', isMain);
        this.coverBtn.disabled = isMain; // текущую обложку заново назначать незачем
        this.coverBtn.innerHTML = isMain
            ? `${icons.star(15)}<span>Текущая обложка</span>`
            : `${icons.star(15)}<span>Сделать обложкой</span>`;
    }

    private buildActions(): void {
        this.deleteActions.forEach((action) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = action.id === 'delete' ? 'btn btn--danger' : 'btn';
            btn.innerHTML = `${action.icon}<span>${action.label}</span>`;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.current) action.run([this.current.id], this.dispatcher);
            });
            this.actionsSlot.appendChild(btn);
        });
    }

    private bind(): void {
        this.coverBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.current && !this.current.isMain) {
                this.dispatcher.publish('VIEW.SET_MAIN_IMAGE', {id: this.current.id});
            }
        });
        this.shadowRoot!.querySelector('.js-close')!.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.CLOSE_INSPECTOR');
        });
        this.shadowRoot!.querySelector('.js-backdrop')!.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.CLOSE_INSPECTOR');
        });
    }

    private open(): void {
        this.style.display = 'block';
        // reflow перед добавлением класса, чтобы сработала transition открытия
        void this.offsetWidth;
        this.shadowRoot!.querySelector('.sheet')!.classList.add('sheet--open');
        this.shadowRoot!.querySelector('.js-backdrop')!.classList.add('backdrop--open');
    }

    private close(): void {
        const sheet = this.shadowRoot!.querySelector('.sheet') as HTMLElement;
        const backdrop = this.shadowRoot!.querySelector('.js-backdrop') as HTMLElement;
        sheet.classList.remove('sheet--open');
        backdrop.classList.remove('backdrop--open');
        // Снимаем display после анимации закрытия
        setTimeout(() => {
            if (!this.current) this.style.display = 'none';
        }, 220);
    }

    private template(): string {
        return `
            <style>
                :host { position: fixed; inset: 0; z-index: 60; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .js-backdrop {
                    position: absolute; inset: 0;
                    background: rgba(17,24,39,.35);
                    opacity: 0; transition: opacity .2s ease;
                }
                .js-backdrop.backdrop--open { opacity: 1; }

                .sheet {
                    position: absolute;
                    background: #fff;
                    display: flex; flex-direction: column;
                    box-shadow: -8px 0 30px rgba(0,0,0,.18);
                }
                /* Десктоп: панель справа */
                @media (min-width: 641px) {
                    .sheet {
                        top: 0; right: 0; bottom: 0;
                        width: min(380px, 92vw);
                        transform: translateX(100%);
                        transition: transform .22s ease;
                    }
                    .sheet--open { transform: translateX(0); }
                }
                /* Мобилка: bottom sheet */
                @media (max-width: 640px) {
                    .sheet {
                        left: 0; right: 0; bottom: 0;
                        max-height: 85vh;
                        border-radius: 16px 16px 0 0;
                        transform: translateY(100%);
                        transition: transform .22s ease;
                    }
                    .sheet--open { transform: translateY(0); }
                }

                .head {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--gu-border, #e5e7eb);
                }
                .head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--gu-text-strong, #1f2937); }
                .icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 30px; height: 30px;
                    color: var(--gu-text, #6b7280);
                    background: transparent; border: none; border-radius: 7px; cursor: pointer;
                }
                .icon-btn:hover { background: var(--gu-surface, #f3f4f6); }

                .body { padding: 16px; overflow-y: auto; }
                .preview-wrap {
                    width: 100%; aspect-ratio: 1;
                    background: var(--gu-surface, #f3f4f6);
                    border-radius: 12px; overflow: hidden;
                    margin-bottom: 14px;
                }
                .js-preview { width: 100%; height: 100%; display: block; }

                .section { margin-bottom: 16px; }
                .section__title {
                    font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
                    color: var(--gu-text-muted, #9ca3af); margin: 0 0 8px;
                }
                .filename { font-size: 13px; color: var(--gu-text, #374151); word-break: break-all; }

                .roles { display: flex; flex-wrap: wrap; gap: 8px; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 8px 13px; font: 500 13px/1 inherit;
                    color: var(--gu-text, #374151);
                    background: #fff; border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 8px; cursor: pointer;
                    transition: background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
                }
                .btn:hover:not(:disabled) { background: var(--gu-surface, #f3f4f6); }
                .btn:disabled { cursor: default; }
                .role--active {
                    color: #1c1401; background: var(--gu-cover, rgba(245,158,11,.95));
                    border-color: transparent; opacity: 1;
                }
                .btn--danger { color: var(--gu-danger, #ef4444); border-color: rgba(239,68,68,.35); }
                .btn--danger:hover { background: rgba(239,68,68,.08); }
                .actions { display: flex; flex-wrap: wrap; gap: 8px; }
                svg { flex-shrink: 0; }
            </style>
            <div class="js-backdrop"></div>
            <div class="sheet">
                <div class="head">
                    <h3>Свойства изображения</h3>
                    <button type="button" class="icon-btn js-close" aria-label="Закрыть">${icons.close(18)}</button>
                </div>
                <div class="body">
                    <div class="preview-wrap"><img class="js-preview" alt=""></div>

                    <div class="section">
                        <p class="section__title">Файл</p>
                        <div class="filename js-name"></div>
                    </div>

                    <div class="section">
                        <p class="section__title">Роль изображения</p>
                        <div class="roles">
                            <button type="button" class="btn js-cover"></button>
                        </div>
                    </div>

                    <!-- Точка расширения: сюда добавляются будущие свойства
                         (alt-текст, описание, кроп, поворот, замена файла) без переделки каркаса. -->
                    <div class="js-extra"></div>

                    <div class="section">
                        <p class="section__title">Действия</p>
                        <div class="actions js-actions"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('inspector-panel', InspectorPanel);
