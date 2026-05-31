/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Web Component индикатора перетаскивания.
 * Убраны дублирующие inline-стили, которые перекрывали стили из Shadow DOM `<style>` (P3 #17).
 */
export default class DropIndicator extends HTMLElement {
    private readonly container: HTMLElement;
    private readonly topHalf: HTMLElement;
    private readonly bottomHalf: HTMLElement;

    constructor(targetEl: HTMLElement) {
        super();
        this.attachShadow({mode: 'open'});

        // Создаем стили для компонента
        const style = document.createElement('style');
        style.textContent = `
            .drop-indicator {
                position: absolute;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 10;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                opacity: 0;
                animation: fadeIn 0.2s ease forwards;
            }
            .indicator-top, .indicator-bottom {
                height: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s ease;
            }
            .indicator-top svg, .indicator-bottom svg {
                stroke: white;
            }
            @keyframes fadeIn {
                to {
                    opacity: 1;
                }
            }
        `;

        this.container = document.createElement('div');
        this.container.className = 'drop-indicator';
        // Динамические размеры — только они остаются inline
        this.container.style.width = `${targetEl.offsetWidth}px`;
        this.container.style.height = `${targetEl.offsetHeight}px`;

        this.topHalf = document.createElement('div');
        this.topHalf.className = 'indicator-top';
        this.topHalf.style.opacity = '0.5';
        this.topHalf.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    `;

        this.bottomHalf = document.createElement('div');
        this.bottomHalf.className = 'indicator-bottom';
        this.bottomHalf.style.opacity = '0.5';
        this.bottomHalf.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;

        this.container.appendChild(this.topHalf);
        this.container.appendChild(this.bottomHalf);

        // Динамическое позиционирование
        const rect = targetEl.getBoundingClientRect();
        const parentRect = targetEl.parentElement!.getBoundingClientRect();
        const scrollOffset = targetEl.parentElement!.scrollTop;
        this.container.style.left = `${rect.left - parentRect.left}px`;
        this.container.style.top = `${rect.top - parentRect.top + scrollOffset}px`;

        // Добавляем элементы в теневой DOM
        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(this.container);
    }

    public highlightHalf(isTopHalf: boolean) {
        this.topHalf.style.opacity = isTopHalf ? '1' : '0.5';
        this.bottomHalf.style.opacity = isTopHalf ? '0.5' : '1';
    }
}

// Регистрируем веб-компонент
customElements.define('drop-indicator-wc', DropIndicator);
