/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {NotifyOptions, NotifyType} from "@/types";

/**
 * Собственное модальное окно уведомлений виджета загрузки (Web Component, Shadow DOM).
 *
 * Зачем своё окно, а не глобальный тост в углу: сообщения об ошибках загрузки бывают
 * длинными и пофайловыми — в маленьком угловом алерте они обрезаются и не читаются.
 * Это окно показывает сообщение целиком: заголовок, основной текст и прокручиваемый
 * список подробностей ({@link NotifyOptions.details}).
 *
 * Раскладка: на десктопе — по центру вьюпорта шириной около трети экрана; на мобильных —
 * во весь экран. Закрытие — крестиком.
 *
 * Поведение автозакрытия:
 *  - `success` — закрывается сам через пару секунд (и крестиком);
 *  - `error` / `warning` / `info` — не закрываются автоматически, только по крестику,
 *    чтобы пользователь гарантированно увидел и, при необходимости, скопировал текст.
 *
 * Очередь: если во время показа одного уведомления приходят новые, они встают в очередь
 * и показываются по очереди — ни одна ошибка не теряется.
 */
export default class NotificationModal extends HTMLElement {
    /** Автозакрытие success по умолчанию (мс). */
    private static readonly SUCCESS_DURATION_MS = 2500;

    private readonly panel: HTMLElement;
    private readonly iconBox: HTMLElement;
    private readonly titleBox: HTMLElement;
    private readonly messageBox: HTMLElement;
    private readonly detailsBox: HTMLElement;
    private readonly queueHint: HTMLElement;

    private readonly queue: NotifyOptions[] = [];
    private current: NotifyOptions | null = null;
    private autoCloseTimer: number | null = null;

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = NotificationModal.template();

        this.panel = this.shadowRoot!.querySelector('.panel')!;
        this.iconBox = this.shadowRoot!.querySelector('.icon')!;
        this.titleBox = this.shadowRoot!.querySelector('.title')!;
        this.messageBox = this.shadowRoot!.querySelector('.message')!;
        this.detailsBox = this.shadowRoot!.querySelector('.details')!;
        this.queueHint = this.shadowRoot!.querySelector('.queue-hint')!;

        this.shadowRoot!.querySelector('.close')!
            .addEventListener('click', () => this.closeCurrent());
    }

    /**
     * Показать уведомление. Если окно уже занято — уведомление встаёт в очередь,
     * поэтому вызывать можно из любого обработчика, ничего не потеряется.
     */
    notify(options: NotifyOptions): void {
        this.queue.push(options);
        if (this.current === null) {
            this.showNext();
        } else {
            this.updateQueueHint();
        }
    }

    /** Показать следующее уведомление из очереди либо скрыть окно, если очередь пуста. */
    private showNext(): void {
        this.clearAutoClose();
        const next = this.queue.shift() ?? null;
        this.current = next;

        if (next === null) {
            this.classList.remove('open');
            return;
        }

        this.renderContent(next);
        this.classList.add('open');

        const duration = next.duration ?? (next.type === 'success' ? NotificationModal.SUCCESS_DURATION_MS : 0);
        if (duration > 0) {
            this.autoCloseTimer = window.setTimeout(() => this.closeCurrent(), duration);
        }
    }

    /** Закрыть текущее уведомление и перейти к следующему в очереди (если есть). */
    private closeCurrent(): void {
        this.showNext();
    }

    private renderContent(options: NotifyOptions): void {
        this.panel.dataset.type = options.type;
        this.iconBox.innerHTML = NotificationModal.icon(options.type);
        this.titleBox.textContent = options.title ?? NotificationModal.defaultTitle(options.type);
        this.messageBox.textContent = options.message;

        this.detailsBox.replaceChildren();
        const details = options.details ?? [];
        if (details.length > 0) {
            const list = document.createElement('ul');
            for (const line of details) {
                const li = document.createElement('li');
                li.textContent = line;
                list.appendChild(li);
            }
            this.detailsBox.appendChild(list);
            this.detailsBox.hidden = false;
        } else {
            this.detailsBox.hidden = true;
        }

        this.updateQueueHint();
    }

    private updateQueueHint(): void {
        const pending = this.queue.length;
        if (pending > 0) {
            this.queueHint.textContent = `Ещё сообщений: ${pending}`;
            this.queueHint.hidden = false;
        } else {
            this.queueHint.hidden = true;
        }
    }

    private clearAutoClose(): void {
        if (this.autoCloseTimer !== null) {
            window.clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }

    private static defaultTitle(type: NotifyType): string {
        switch (type) {
            case 'success':
                return 'Готово';
            case 'error':
                return 'Ошибка';
            case 'warning':
                return 'Предупреждение';
            default:
                return 'Информация';
        }
    }

    /** Inline-SVG иконки типов (24×24, currentColor — цвет задаётся через data-type панели). */
    private static icon(type: NotifyType): string {
        const svg = (body: string): string =>
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${body}</svg>`;
        switch (type) {
            case 'success':
                return svg('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>');
            case 'error':
                return svg('<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>');
            case 'warning':
                return svg('<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>');
            default:
                return svg('<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>');
        }
    }

    private static template(): string {
        return `
            <style>
                :host {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    background: rgba(17, 24, 39, .55);
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity .18s ease, visibility .18s ease;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                :host(.open) { opacity: 1; visibility: visible; }

                .panel {
                    --nm-accent: #4f7df3;
                    width: 33vw;
                    min-width: 340px;
                    max-width: 560px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    border-radius: 16px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, .35);
                    overflow: hidden;
                    transform: translateY(12px) scale(.98);
                    transition: transform .18s ease;
                }
                :host(.open) .panel { transform: translateY(0) scale(1); }

                .panel[data-type="success"] { --nm-accent: #16a34a; }
                .panel[data-type="error"]   { --nm-accent: #dc2626; }
                .panel[data-type="warning"] { --nm-accent: #d97706; }
                .panel[data-type="info"]    { --nm-accent: #2563eb; }

                .header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 18px 18px 14px;
                    border-top: 4px solid var(--nm-accent);
                }
                .icon {
                    flex: none;
                    display: inline-flex;
                    color: var(--nm-accent);
                }
                .title {
                    flex: 1;
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #1f2937;
                }
                .close {
                    flex: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    color: #6b7280;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease;
                }
                .close:hover { background: #f3f4f6; color: #111827; }

                .body {
                    padding: 0 18px 18px;
                    overflow-y: auto;
                }
                .message {
                    margin: 0;
                    font-size: .95rem;
                    line-height: 1.5;
                    color: #374151;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .details {
                    margin: 12px 0 0;
                    padding: 10px 12px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    max-height: 40vh;
                    overflow-y: auto;
                }
                .details[hidden] { display: none; }
                .details ul {
                    margin: 0;
                    padding-left: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .details li {
                    font-size: .85rem;
                    line-height: 1.45;
                    color: #4b5563;
                    word-break: break-word;
                }

                .queue-hint {
                    padding: 10px 18px;
                    font-size: .78rem;
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                }
                .queue-hint[hidden] { display: none; }

                @media (max-width: 640px) {
                    :host { padding: 0; }
                    .panel {
                        width: 100vw;
                        min-width: 0;
                        max-width: none;
                        height: 100vh;
                        max-height: none;
                        border-radius: 0;
                    }
                }
            </style>
            <div class="panel" role="alertdialog" aria-modal="true" data-type="info">
                <div class="header">
                    <span class="icon"></span>
                    <h2 class="title"></h2>
                    <button class="close" type="button" aria-label="Закрыть">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                    </button>
                </div>
                <div class="body">
                    <p class="message"></p>
                    <div class="details" hidden></div>
                </div>
                <div class="queue-hint" hidden></div>
            </div>
        `;
    }
}

customElements.define('gu-notification-modal', NotificationModal);
