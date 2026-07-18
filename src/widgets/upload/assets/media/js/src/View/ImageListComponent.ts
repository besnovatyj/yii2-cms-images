/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {DragAndDropManager} from "@/View/DragAndDropManager";
import ImageElementFactory from "@/View/ImageElementFactory";
import Dispatcher from "@/Dispatcher";
import type {PreviewFit, ServerImage, UploadImage} from "@/types";

export default class ImageListComponent extends HTMLElement {
    private dragAndDropManager: DragAndDropManager;
    private readonly imageSize: number; // Размер одного изображения в пикселях
    private readonly previewFit: PreviewFit; // Способ вписывания превью в ячейку
    private readonly container: HTMLElement;
    private readonly sectionLabel: HTMLElement;

    constructor(
        private dispatcher: Dispatcher,
        private type: 'server' | 'upload',
        imageScale: number = 1.0,  // Коэффициент масштабирования (по умолчанию 1.0)
        label: string = '',
        previewFit: PreviewFit = 'cover'
    ) {
        super();
        this.previewFit = previewFit;
        this.imageSize = 100 * imageScale; // Базовый размер 100px, умноженный на коэффициент
        // CSS-переменная для grid-template-columns — используется в shadow DOM стилях
        this.style.setProperty('--image-size', `${this.imageSize}px`);
        this.attachShadow({mode: 'open'});

        const style = document.createElement('style');
        style.textContent = `
            /* Кастомный элемент по умолчанию display:inline — явно растягиваем на всю ширину родителя */
            :host {
                display: block;
                width: 100%;
            }

            /* === Заголовок секции === */
            .section-label {
                font-size: 0.72em;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #9ca3af;
                margin: 0 0 8px;
                display: none;
                align-items: center;
                gap: 8px;
            }
            .section-label::after {
                content: '';
                flex: 1;
                height: 1px;
                background: #e5e7eb;
            }
            .section-label.visible {
                display: flex;
            }

            /* === Сетка изображений === */
            /* auto-fill: столько колонок, сколько влезает; 1fr: все колонки равной ширины */
            .gallery-section {
                position: relative;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(var(--image-size), 1fr));
                gap: 4px;
                padding: 2px 0 4px;
            }

            /* === Карточка изображения === */
            .gallery-image {
                /* Размер задаётся grid-ячейкой; aspect-ratio сохраняет квадратную форму */
                width: 100%;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
                transition: transform 0.18s ease, box-shadow 0.18s ease;
                cursor: grab;
                background: #e9ecef;
                border: 1.5px solid transparent;
            }
            .gallery-image:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 0 8px 20px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08);
                z-index: 2;
            }
            .gallery-image:active {
                cursor: grabbing;
                transform: scale(0.98);
            }

            /* Выделение загруженных изображений ожидающих отправки */
            .upload-image {
                border-color: #93c5fd;
            }

            /* Режим contain: превью вписано с полями. Даём плитке видимый контур и
               подложку, иначе серые поля соседних превью сливаются через 4px-зазор
               грида и промежутки визуально пропадают (в cover картинки встык — зазор
               виден сам по себе). Контур — только серверным плиткам: у upload уже свой. */
            .gallery-image.fit-contain {
                background: #f3f4f6;
            }
            .server-image.fit-contain {
                border-color: #e5e7eb;
            }

            /* Перетаскиваемый элемент — невидимый слот, показывающий будущую позицию */
            .gallery-image.dragging {
                opacity: 0;
                pointer-events: none;
            }

            /* === Кнопки действий === */
            .main-image-btn,
            .delete-btn,
            .drag-handle {
                position: absolute;
                opacity: 0;
                transition: opacity 0.18s ease, transform 0.18s ease, background 0.15s ease;
                transform: scale(0.8);
                border: none;
                cursor: pointer;
                padding: 4px 5px 3px;
                line-height: 1;
                border-radius: 5px;
                z-index: 3;
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
            }
            .gallery-image:hover .main-image-btn,
            .gallery-image:hover .delete-btn,
            .gallery-image:hover .drag-handle {
                opacity: 1;
                transform: scale(1);
            }

            /* Звезда — главное изображение */
            .main-image-btn {
                top: 5px;
                left: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
            }
            .main-image-btn:hover {
                background: rgba(245,158,11,0.92) !important;
                color: #1c1401 !important;
            }
            /* Всегда видима и золотая для главного изображения */
            .main-image-btn.is-main {
                opacity: 1 !important;
                transform: scale(1) !important;
                background: rgba(245,158,11,0.9) !important;
                color: #1c1401 !important;
            }

            /* На тач-устройствах hover недоступен — кнопки всегда видны */
            @media (hover: none), (pointer: coarse) {
                .main-image-btn,
                .delete-btn,
                .drag-handle {
                    opacity: 1 !important;
                    transform: scale(1) !important;
                }
            }

            /* Кнопка удаления */
            .delete-btn {
                bottom: 5px;
                right: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
            }
            .delete-btn:hover {
                background: rgba(239,68,68,0.92) !important;
            }

            /* Маркер перетаскивания — низ-слева, зеркально кнопке удаления.
               На тач-устройствах именно с него начинается перетаскивание (см.
               DragAndDropManager): касание тела карточки при этом скроллит страницу. */
            .drag-handle {
                bottom: 5px;
                left: 5px;
                background: rgba(17,24,39,0.45);
                color: #fff;
                cursor: grab;
                touch-action: none; /* палец на ручке не инициирует скролл/зум браузера */
            }
            .drag-handle:active {
                cursor: grabbing;
            }
            .drag-handle:hover {
                background: rgba(59,130,246,0.92) !important;
            }

        `;

        // Заголовок секции
        this.sectionLabel = document.createElement('div');
        this.sectionLabel.className = 'section-label';
        this.sectionLabel.textContent = label;

        // Основной контейнер
        this.container = document.createElement('div');
        this.container.className = 'gallery-section';

        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(this.sectionLabel);
        this.shadowRoot?.appendChild(this.container);

        this.dragAndDropManager = new DragAndDropManager(this.container, this.type, this.dispatcher);
    }

    render(images: ServerImage[] | UploadImage[]) {
        // Показываем/скрываем заголовок секции
        this.sectionLabel.classList.toggle('visible', images.length > 0);

        // Имеющиеся в компоненте элементы
        const existingElements = new Map<string, HTMLElement>();
        Array.from(this.container.children).forEach((el: any) => {
            if (el.dataset.id) existingElements.set(el.dataset.id, el);
        });

        // Изображения из модели (состояния)
        images.forEach((img: ServerImage | UploadImage, index) => {
            // Элемент компонента с ID элемента из модели
            const existingElement = existingElements.get(img.id.toString());
            // Если существует `existingElement`, то обновляет его, если нет возвращает новый заполненный элемент.
            const imgEl = ImageElementFactory.createImageElement(
                img, this.imageSize, this.dispatcher, existingElement as HTMLElement, this.previewFit
            );
            // Если в компоненте не было элемента с ID из модели (состояния) - `existingElement`, значит добавляем вновь созданный
            if (!existingElement) {
                this.container.insertBefore(imgEl, this.container.children[index] || null);
            }
            // Так как изображение с таким ID уже обработано, удаляем его из коллекции
            existingElements.delete(img.id.toString());
        });

        // Удаляем все элементы представления, которых не оказалось в текущем состоянии модели.
        existingElements.forEach((el) => el.remove());
    }
}

customElements.define('image-list', ImageListComponent);
