/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";

/** Состояние активного touch-перетаскивания */
interface TouchDragState {
    draggedEl: HTMLElement;
    clone: HTMLElement;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    isDragging: boolean;
    originalNextSibling: Element | null;
}

export class DragAndDropManager {
    private touchDragState: TouchDragState | null = null;
    private boundTouchMove: ((e: TouchEvent) => void) | null = null;
    private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

    /**
     * Флаг: touchstart на элементе галереи был зафиксирован.
     * touchstart всегда предшествует mousedown и dragstart — поэтому к моменту
     * срабатывания dragstart флаг уже установлен и позволяет заблокировать HTML5 DnD.
     */
    private touchInteractionActive = false;

    /**
     * ID перетаскиваемого элемента (desktop DnD).
     * При отмене drag используется для восстановления исходной позиции.
     */
    private draggedId: string | null = null;
    private dragOriginalNextSibling: Element | null = null;

    constructor(
        private container: HTMLElement,
        private type: 'server' | 'upload',
        private dispatcher: Dispatcher
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Desktop: HTML5 Drag and Drop API.
        // Каждый обработчик проверяет флаг touchInteractionActive —
        // если активно touch-взаимодействие, HTML5 DnD блокируется целиком.
        this.container.addEventListener('dragstart', (e) => {
            if (this.touchInteractionActive) { e.preventDefault(); return; }
            this.handleDragStart(e);
        });
        this.container.addEventListener('dragover', (e) => {
            if (this.touchInteractionActive) { e.preventDefault(); return; }
            this.handleDragOver(e);
        });
        this.container.addEventListener('drop', (e) => {
            if (this.touchInteractionActive) { e.preventDefault(); return; }
            this.handleDrop(e);
        });
        this.container.addEventListener('dragend', () => {
            if (this.touchInteractionActive) {
                // HTML5 DnD каким-то образом запустился несмотря на блокировку.
                // Принудительно завершаем зависший touch-drag, чтобы клон не завис на экране.
                this.forceEndTouchDrag();
                return;
            }
            this.handleDragEnd();
        });

        // Mobile: Touch Events.
        // passive: false — необходимо чтобы preventDefault() в handleTouchStart работал.
        // Браузер принимает решение о разрешении скролла на этапе touchstart,
        // и если touchstart пассивный — preventDefault() в touchmove уже не поможет.
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
    }

    // ==================== Desktop HTML5 DnD ====================

    private handleDragStart(e: DragEvent) {
        e.stopPropagation();
        const target = e.target as HTMLElement;

        const imageElement = target.closest(`.${this.type}-image`) as HTMLElement | null;
        if (!imageElement) {
            console.warn(`Не найден элемент с классом ${this.type}-image`);
            return;
        }

        const id = imageElement.dataset.id;
        if (!id || isNaN(Number(id))) {
            console.warn(`Элемент ${this.type}-image имеет некорректный data-id:`, id);
            return;
        }

        this.draggedId = id;
        // Запоминаем исходную позицию для восстановления при отмене drag
        this.dragOriginalNextSibling = imageElement.nextSibling as Element | null;
        imageElement.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', id);
    }

    private handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (!this.draggedId) return;

        const targetEl = e.target instanceof HTMLElement
            ? e.target.closest(`.${this.type}-image`) as HTMLElement | null
            : null;
        if (!targetEl) return;

        const draggedEl = this.container.querySelector(`[data-id="${this.draggedId}"]`) as HTMLElement | null;
        if (!draggedEl || targetEl === draggedEl) return;

        this.insertAtCursorPosition(draggedEl, targetEl, e.clientX);
    }

    private handleDrop(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.draggedId) return;

        const draggedEl = this.container.querySelector(`[data-id="${this.draggedId}"]`) as HTMLElement | null;
        draggedEl?.classList.remove('dragging');

        // Обнуляем до dispatchSortEvent — handleDragEnd проверит null и пропустит восстановление
        this.draggedId = null;
        this.dragOriginalNextSibling = null;
        this.dispatchSortEvent();
    }

    /**
     * Вызывается при отмене drag (клавиша Escape, бросок за пределами контейнера).
     * handleDrop срабатывает раньше и обнуляет draggedId — поэтому при успешном drop этот
     * метод ничего не делает.
     */
    private handleDragEnd() {
        if (!this.draggedId) return;

        const draggedEl = this.container.querySelector(`[data-id="${this.draggedId}"]`) as HTMLElement | null;
        if (draggedEl) {
            draggedEl.classList.remove('dragging');
            // Восстанавливаем исходную позицию — пользователь отменил перетаскивание
            this.container.insertBefore(draggedEl, this.dragOriginalNextSibling);
        }
        this.draggedId = null;
        this.dragOriginalNextSibling = null;
    }

    // ==================== Mobile Touch DnD ====================

    private handleTouchStart(e: TouchEvent) {
        const touch = e.touches[0];
        const target = touch.target as HTMLElement;

        // Кнопки действий: не блокируем тач чтобы сохранить click-события
        if (target.closest('.main-image-btn') || target.closest('.delete-btn')) return;

        const imageElement = target.closest(`.${this.type}-image`) as HTMLElement | null;
        if (!imageElement) return;

        // Блокируем скролл на этапе touchstart — это единственный надёжный способ.
        // Браузер решает разрешить ли скролл именно здесь; в touchmove уже поздно.
        e.preventDefault();

        // Флаг выставляется до того, как браузер успеет сгенерировать dragstart,
        // потому что touchstart всегда предшествует dragstart в очереди событий.
        this.touchInteractionActive = true;

        const rect = imageElement.getBoundingClientRect();
        this.touchDragState = {
            draggedEl: imageElement,
            clone: null!,
            startX: touch.clientX,
            startY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            isDragging: false,
            originalNextSibling: imageElement.nextSibling as Element | null,
        };

        // Слушатели на document: ловим touchmove/touchend за пределами контейнера
        this.boundTouchMove = (ev: TouchEvent) => this.handleTouchMove(ev);
        this.boundTouchEnd = (ev: TouchEvent) => this.handleTouchEnd(ev);
        document.addEventListener('touchmove', this.boundTouchMove, {passive: false});
        document.addEventListener('touchend', this.boundTouchEnd);
        document.addEventListener('touchcancel', this.boundTouchEnd);
    }

    private handleTouchMove(e: TouchEvent) {
        if (!this.touchDragState) return;

        // Блокируем скролл страницы сразу — до проверки порога смещения.
        // Без этого браузер начинает скролл ещё до того, как isDragging становится true.
        e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - this.touchDragState.startX;
        const dy = touch.clientY - this.touchDragState.startY;

        // Начинаем реальное перетаскивание только после минимального смещения
        if (!this.touchDragState.isDragging) {
            if (Math.sqrt(dx * dx + dy * dy) < 8) return;
            this.touchDragState.isDragging = true;
            this.touchDragState.clone = this.createDragClone(this.touchDragState.draggedEl);
            // Элемент становится прозрачным слотом — клон виден поверх всего
            this.touchDragState.draggedEl.classList.add('dragging');
        }

        // Двигаем клон за пальцем
        const {clone, offsetX, offsetY, draggedEl} = this.touchDragState;
        clone.style.left = `${touch.clientX - offsetX}px`;
        clone.style.top = `${touch.clientY - offsetY}px`;

        // Ищем изображение под пальцем и перемещаем слот в реальном времени
        // (document.elementFromPoint не проникает в Shadow DOM)
        const targetEl = this.findImageAtPoint(touch.clientX, touch.clientY);
        if (targetEl && targetEl !== draggedEl) {
            this.insertAtCursorPosition(draggedEl, targetEl, touch.clientX);
        }
    }

    private handleTouchEnd(e: TouchEvent) {
        this.touchInteractionActive = false;
        this.cleanupTouchListeners();

        if (!this.touchDragState) return;
        const state = this.touchDragState;
        this.touchDragState = null;

        // Простое касание без перетаскивания — просто чистим
        if (!state.isDragging) return;

        state.clone.remove();
        state.draggedEl.classList.remove('dragging');

        // Элемент уже на нужной позиции (перемещался во время touchmove)
        this.dispatchSortEvent();
    }

    /**
     * Принудительное завершение touch-drag.
     * Вызывается из dragend если HTML5 DnD прорвался несмотря на блокировку.
     */
    private forceEndTouchDrag() {
        this.touchInteractionActive = false;
        this.cleanupTouchListeners();

        if (!this.touchDragState) return;
        const state = this.touchDragState;
        this.touchDragState = null;

        if (state.isDragging && state.clone) {
            state.clone.remove();
        }
        state.draggedEl.classList.remove('dragging');
    }

    // ==================== Вспомогательные методы ====================

    /**
     * Вставляет draggedEl до или после targetEl в зависимости от горизонтальной позиции курсора.
     * Левая половина targetEl → вставить до; правая половина → вставить после.
     * Пропускает вставку, если элемент уже стоит на нужном месте.
     */
    private insertAtCursorPosition(draggedEl: HTMLElement, targetEl: HTMLElement, clientX: number): void {
        const rect = targetEl.getBoundingClientRect();
        const insertBefore = clientX < rect.left + rect.width / 2;

        if (insertBefore) {
            if (draggedEl.nextSibling !== targetEl) {
                this.container.insertBefore(draggedEl, targetEl);
            }
        } else {
            if (targetEl.nextSibling !== draggedEl) {
                this.container.insertBefore(draggedEl, targetEl.nextSibling);
            }
        }
    }

    /**
     * Поиск изображения по координатам через getBoundingClientRect.
     * Используется вместо document.elementFromPoint(), который не проникает в Shadow DOM.
     */
    private findImageAtPoint(x: number, y: number): HTMLElement | null {
        const elements = Array.from(
            this.container.querySelectorAll(`.${this.type}-image`)
        ) as HTMLElement[];

        for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return el;
            }
        }
        return null;
    }

    /**
     * Создаёт визуальный клон перетаскиваемого изображения.
     * Клон добавляется в document.body с position:fixed поверх всего контента.
     */
    private createDragClone(el: HTMLElement): HTMLElement {
        const rect = el.getBoundingClientRect();
        const img = el.querySelector('img') as HTMLImageElement | null;

        const clone = document.createElement('div');
        clone.style.cssText = `
            position: fixed;
            width: ${rect.width}px;
            height: ${rect.height}px;
            left: ${rect.left}px;
            top: ${rect.top}px;
            z-index: 99999;
            pointer-events: none;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            transform: scale(1.06) rotate(1deg);
            opacity: 0.92;
            transition: none;
        `;

        if (img) {
            const imgClone = document.createElement('img');
            imgClone.src = img.src;
            imgClone.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            clone.appendChild(imgClone);
        } else {
            clone.style.background = '#d1d5db';
        }

        document.body.appendChild(clone);
        return clone;
    }

    /** Публикует событие изменения сортировки */
    private dispatchSortEvent() {
        const div = this.container;
        if (this.type === 'server') {
            const newOrder = Array.from(div.children)
                .filter((el: any) => el.dataset.id)
                .map((el: any, index: number) => ({
                    id: parseInt(el.dataset.id!, 10),
                    sort: index
                }));
            this.dispatcher.publish('VIEW.SORT_CHANGED', newOrder);
        } else {
            const newOrderIds = Array.from(div.children)
                .filter((el: any) => el.dataset.id)
                .map((el: any) => parseInt(el.dataset.id!, 10));
            this.dispatcher.publish('VIEW.UPLOAD_SORT_CHANGED', newOrderIds);
        }
    }

    private cleanupTouchListeners() {
        if (this.boundTouchMove) {
            document.removeEventListener('touchmove', this.boundTouchMove);
            this.boundTouchMove = null;
        }
        if (this.boundTouchEnd) {
            document.removeEventListener('touchend', this.boundTouchEnd);
            document.removeEventListener('touchcancel', this.boundTouchEnd);
            this.boundTouchEnd = null;
        }
    }
}
