/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import {icons} from "@/View/icons";
import type {PreviewFit, UploadImage} from "@/types";

/**
 * Очередь файлов, выбранных для загрузки (Web Component, Shadow DOM).
 *
 * Простой список превью: у каждого — кнопка удаления и индикатор статуса (прогресс/ошибка).
 * Перетаскивание сознательно не поддерживается: порядок очереди = порядок выбора файлов.
 * Превью строятся из ObjectURL; URL освобождается при удалении элемента и при снятии его из
 * DOM, чтобы не текла память.
 */
export default class UploadQueue extends HTMLElement {
    private readonly grid: HTMLElement;
    private readonly label: HTMLElement;

    constructor(
        private dispatcher: Dispatcher,
        imageSize: number,
        private previewFit: PreviewFit
    ) {
        super();
        this.style.setProperty('--tile-size', `${imageSize}px`);
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.innerHTML = UploadQueue.template();
        this.grid = this.shadowRoot!.querySelector('.queue')!;
        this.label = this.shadowRoot!.querySelector('.label')!;
    }

    render(images: UploadImage[]): void {
        this.label.classList.toggle('visible', images.length > 0);

        const existing = new Map<string, HTMLElement>();
        Array.from(this.grid.children).forEach((el) => {
            const id = (el as HTMLElement).dataset.id;
            if (id) existing.set(id, el as HTMLElement);
        });

        images.forEach((img, index) => {
            const prev = existing.get(img.id.toString()) ?? null;
            const item = this.createOrUpdate(img, prev);
            if (!prev) this.grid.insertBefore(item, this.grid.children[index] || null);
            existing.delete(img.id.toString());
        });

        existing.forEach((el) => this.removeItem(el));
    }

    private createOrUpdate(image: UploadImage, existing: HTMLElement | null): HTMLElement {
        const item = existing ?? this.build(image);
        item.dataset.id = image.id.toString();
        item.classList.toggle('is-failed', image.status === 'failed');
        item.classList.toggle('is-uploading', image.status === 'uploading' || image.status === 'pending');

        const status = item.querySelector('.q-status') as HTMLElement;
        if (image.status === 'failed') {
            status.textContent = image.error ? `Ошибка: ${image.error}` : 'Ошибка';
        } else if (image.status === 'uploading') {
            status.textContent = `${image.progress}%`;
        } else {
            status.textContent = '';
        }
        return item;
    }

    private build(image: UploadImage): HTMLElement {
        const item = document.createElement('div');
        item.className = 'q-item';

        const img = document.createElement('img');
        img.className = 'q-img';
        img.draggable = false;
        const url = URL.createObjectURL(image.file);
        img.src = url;
        img.alt = image.file.name;
        img.style.objectFit = this.previewFit;
        item.dataset.objectUrl = url;

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'q-del';
        del.title = 'Убрать из очереди';
        del.innerHTML = icons.close(13);
        del.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.IMAGE_DELETED', {type: 'upload', id: image.id});
        });

        const status = document.createElement('div');
        status.className = 'q-status';

        item.append(img, del, status);
        return item;
    }

    private removeItem(el: HTMLElement): void {
        const url = el.dataset.objectUrl;
        if (url) URL.revokeObjectURL(url);
        el.remove();
    }

    private static template(): string {
        return `
            <style>
                :host { display: block; width: 100%; }
                .label {
                    font-size: .72em; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
                    color: var(--gu-text-muted, #9ca3af); margin: 6px 0 8px;
                    display: none; align-items: center; gap: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .label::after { content: ''; flex: 1; height: 1px; background: var(--gu-border, #e5e7eb); }
                .label.visible { display: flex; }

                .queue {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(var(--tile-size), 1fr));
                    gap: 6px;
                }
                .q-item {
                    position: relative;
                    aspect-ratio: 1;
                    border-radius: 10px; overflow: hidden;
                    background: var(--gu-tile-bg, #e9ecef);
                    border: 1.5px solid var(--gu-accent-soft, #93c5fd);
                }
                .q-item.is-failed { border-color: var(--gu-danger, #ef4444); }
                .q-img { width: 100%; height: 100%; display: block; -webkit-user-drag: none; }
                .q-del {
                    position: absolute; top: 5px; right: 5px;
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 4px; line-height: 1;
                    color: #fff; background: rgba(17,24,39,.55);
                    border: none; border-radius: 5px; cursor: pointer;
                    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                    transition: background .15s ease;
                }
                .q-del:hover { background: var(--gu-danger, rgba(239,68,68,.92)); }
                .q-status {
                    position: absolute; left: 0; right: 0; bottom: 0;
                    padding: 3px 6px;
                    font: 600 10px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #fff; background: rgba(17,24,39,.55);
                    text-align: center;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .q-status:empty { display: none; }
                .q-item.is-failed .q-status { background: rgba(239,68,68,.9); }
            </style>
            <div class="label">Выбрано для загрузки</div>
            <div class="queue"></div>
        `;
    }
}

customElements.define('upload-queue', UploadQueue);
