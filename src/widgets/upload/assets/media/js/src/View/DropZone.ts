/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";

export default class DropZone extends HTMLElement {

    private dispatcher: Dispatcher;

    private readonly fileInput: HTMLInputElement;

    constructor(dispatcher: Dispatcher) {
        super();
        this.dispatcher = dispatcher;

        this.attachShadow({mode: 'open'});

        // Создаем файловый input, который скрыт
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = true;
        this.fileInput.accept = 'image/*'; // UI-подсказка браузеру; реальная валидация — на бэкэнде
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Создаем стили для компонента
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                background: #fafafa;
                text-align: center;
                padding: 28px 16px;
                box-sizing: border-box;
                cursor: pointer;
                transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
                user-select: none;
            }
            :host(:hover) {
                border-color: #4f7df3;
                background: #f0f5ff;
            }
            :host([dragover]) {
                border-color: #3b82f6;
                background: #dbeafe;
                transform: scale(1.008);
            }
            .drop-icon {
                color: #9ca3af;
                margin-bottom: 10px;
                transition: color 0.2s ease;
                display: block;
            }
            :host(:hover) .drop-icon,
            :host([dragover]) .drop-icon {
                color: #4f7df3;
            }
            .drop-title {
                font-size: 0.95em;
                font-weight: 600;
                color: #374151;
                margin: 0 0 4px;
            }
            .drop-hint {
                font-size: 0.78em;
                color: #9ca3af;
                margin: 0;
            }
        `;

        // SVG иконка загрузки
        const icon = document.createElement('span');
        icon.className = 'drop-icon';
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.502 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
            <path d="M14 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM4 1a1 1 0 0 0-1 1v10l2.224-2.224a.5.5 0 0 1 .61-.075L8 11l2.157-3.02a.5.5 0 0 1 .76-.063L13 10V4.5h-2A1.5 1.5 0 0 1 9.5 3V1z"/>
        </svg>`;

        const title = document.createElement('p');
        title.className = 'drop-title';

        const hint = document.createElement('p');
        hint.className = 'drop-hint';

        if (!window.FileReader) {
            title.textContent = 'Загрузка файлов не поддерживается браузером';
            hint.textContent = 'Обновите браузер до актуальной версии';
        } else {
            title.textContent = 'Перетащите изображения сюда';
            hint.textContent = 'или нажмите для выбора файлов';
        }

        // Добавляем элементы в теневой DOM
        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(icon);
        this.shadowRoot?.appendChild(title);
        this.shadowRoot?.appendChild(hint);
        this.shadowRoot?.appendChild(this.fileInput);

        // Обработчики событий для Drag and Drop
        this.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.addEventListener('dragover', this.handleDragOver.bind(this));
        this.addEventListener('drop', this.handleDrop.bind(this));
        this.addEventListener('click', this.handleClick.bind(this));
    }

    private handleDragEnter(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.setAttribute('dragover', '');
    }

    private handleDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.removeAttribute('dragover');
    }

    private handleDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            // @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect
            event.dataTransfer.dropEffect = "copy";
        }
    }

    /** Загрузка через 'Drag And Drop' */
    private handleDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.removeAttribute('dragover');

        if (event.dataTransfer?.files) {
            this.dispatcher.publish('VIEW.FILES_DROPPED', event.dataTransfer.files);
        }
    }

    /** Транслирует клик с любого места веб-компонента на 'Input'. */
    private handleClick(): void {
        this.fileInput.click();
    }

    /** Загрузка через 'Input'. */
    private handleFileSelect(event: Event): void {
        if (this.fileInput.files) {
            this.dispatcher.publish('VIEW.FILES_SELECTED', this.fileInput.files);
        }
    }

}

customElements.define('dropzone-wc', DropZone);
