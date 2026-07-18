/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import type {PreviewFit, ServerImage, UploadImage} from "@/types";

/**
 * Фабрика элементов изображений.
 * Визуальные стили (цвета, анимации, hover) управляются через CSS в ImageListComponent.
 * ImageElementFactory отвечает только за структуру и CSS-классы.
 */
export default class ImageElementFactory {
    static createImageElement(image: ServerImage | UploadImage, imageSize: number, dispatcher: Dispatcher, existingElement: HTMLElement | null = null, previewFit: PreviewFit = 'cover'): HTMLElement {
        const imgEl = ImageElementFactory.createContainer(image, existingElement);
        ImageElementFactory.updateImage(imgEl, image, previewFit);
        ImageElementFactory.createMainImageButton(imgEl, image, dispatcher);
        ImageElementFactory.createDragHandle(imgEl);
        ImageElementFactory.createDeleteButton(imgEl, image, dispatcher);
        return imgEl;
    }

    /** Создание или обновление контейнера изображения */
    private static createContainer(image: ServerImage | UploadImage, existingElement: HTMLElement | null): HTMLElement {
        const imgEl = existingElement || document.createElement('div');
        imgEl.className = `gallery-image ${image.kind}-image`;
        imgEl.draggable = true;
        imgEl.dataset.id = image.id.toString();
        // Ширина и высота задаются CSS grid в ImageListComponent (width: 100%; aspect-ratio: 1)
        imgEl.style.position = 'relative';
        return imgEl;
    }

    /**
     * Создание или обновление тега img.
     * Перед перезаписью src — вызывается URL.revokeObjectURL() для предотвращения утечки памяти (P1 #6).
     */
    private static updateImage(container: HTMLElement, image: ServerImage | UploadImage, previewFit: PreviewFit = 'cover'): void {
        let imgTag = container.querySelector('img') as HTMLImageElement | null;
        if (!imgTag) {
            imgTag = document.createElement('img');
            container.appendChild(imgTag);
        }

        // Освобождаем предыдущий ObjectURL перед созданием нового (чтобы избежать утечек памяти)
        if (imgTag.dataset.objectUrl) {
            URL.revokeObjectURL(imgTag.dataset.objectUrl);
            delete imgTag.dataset.objectUrl;
        }

        if (image.kind === 'server') {
            imgTag.src = image.previewUrl;
            imgTag.alt = image.fileName;
        } else {
            imgTag.src = URL.createObjectURL(image.file);
            imgTag.alt = image.file.name;
            imgTag.dataset.objectUrl = imgTag.src; // Сохраняем URL для последующего освобождения
        }
        imgTag.style.width = '100%';
        imgTag.style.height = '100%';
        // 'cover' — заполнить квадрат с обрезкой; 'contain' — вписать целиком (поля по краям)
        imgTag.style.objectFit = previewFit;
        imgTag.style.display = 'block';
    }

    /**
     * Создание кнопки назначения главного изображения (только для серверных изображений).
     * Обновляет класс is-main при каждом вызове, т.к. isMain может меняться.
     */
    private static createMainImageButton(container: HTMLElement, image: ServerImage | UploadImage, dispatcher: Dispatcher): void {
        if (image.kind !== 'server') return;

        let starBtn = container.querySelector('.main-image-btn') as HTMLElement | null;
        if (!starBtn) {
            starBtn = document.createElement('button');
            starBtn.className = 'main-image-btn';
            starBtn.type = 'button';
            starBtn.title = 'Сделать главным изображением';
            starBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">' +
                '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>' +
                '</svg>';
            container.appendChild(starBtn);
            const imageId = (image as ServerImage).id;
            starBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dispatcher.publish('VIEW.SET_MAIN_IMAGE', {id: imageId});
            });
        }

        // Обновляем CSS-класс в зависимости от статуса главного изображения
        starBtn.classList.toggle('is-main', (image as ServerImage).isMain);
    }

    /**
     * Создание маркера-ручки перетаскивания (низ-слева, зеркально кнопке удаления).
     * На десктопе перетаскивается вся карточка (draggable=true), ручка — визуальная
     * подсказка и второй способ. На тач-устройствах перетаскивание стартует ТОЛЬКО
     * с этой ручки (см. DragAndDropManager), поэтому касание тела карточки на мобилке
     * прокручивает страницу, а не начинает drag.
     */
    private static createDragHandle(container: HTMLElement): void {
        if (container.querySelector('.drag-handle')) return; // Ручка уже существует

        const handle = document.createElement('button');
        handle.className = 'drag-handle';
        handle.type = 'button';
        handle.title = 'Перетащите для изменения порядка';
        handle.setAttribute('aria-label', 'Перетащить для сортировки');
        handle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">' +
            '<path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>' +
            '</svg>';
        container.appendChild(handle);
        // Ручка — только для перетаскивания: гасим click, чтобы случайный тап не всплывал.
        handle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    /** Создание кнопки удаления */
    private static createDeleteButton(container: HTMLElement, image: ServerImage | UploadImage, dispatcher: Dispatcher): void {
        let deleteBtn = container.querySelector('.delete-btn') as HTMLElement | null;
        if (deleteBtn) return; // Кнопка уже существует

        deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Удалить изображение';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">\n' +
            ' <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>\n' +
            '</svg>';
        container.appendChild(deleteBtn);
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dispatcher.publish('VIEW.IMAGE_DELETED', {type: image.kind, id: image.id});
            const imgTag = container.querySelector('img') as HTMLImageElement | null;
            if (imgTag?.dataset.objectUrl) {
                // Освобождаем URL (чтобы избежать утечек памяти)
                URL.revokeObjectURL(imgTag.dataset.objectUrl);
            }
        });
    }
}
