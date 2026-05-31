/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

export default class PreloaderComponent extends HTMLElement {
    private container: HTMLElement | null = null;
    private iconEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private subtitleEl: HTMLElement | null = null;

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.build();
    }

    private build() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes trash-wiggle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25%  { transform: rotate(-15deg) scale(1.1); }
                75%  { transform: rotate(15deg) scale(1.1); }
            }
            @keyframes upload-bounce {
                0%, 100% { transform: translateY(0); }
                50%       { transform: translateY(-8px); }
            }
            .preloader {
                display: none;
                position: absolute;
                inset: 0;
                background: rgba(255,255,255,0.88);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                border-radius: inherit;
                z-index: 100;
                animation: fadeIn 0.18s ease;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 10px;
            }
            .preloader.visible {
                display: flex;
            }
            @media (max-width: 768px) {
                .preloader {
                    position: fixed;
                    border-radius: 0;
                }
            }
            .icon-wrap {
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .icon-wrap svg {
                width: 100%;
                height: 100%;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top-color: #4f7df3;
                border-radius: 50%;
                animation: spin 0.75s linear infinite;
            }
            .icon-delete {
                color: #ef4444;
                animation: trash-wiggle 0.6s ease-in-out infinite;
            }
            .icon-upload {
                color: #4f7df3;
                animation: upload-bounce 0.8s ease-in-out infinite;
            }
            .title {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.9em;
                font-weight: 600;
                color: #374151;
                margin: 0;
            }
            .subtitle {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.75em;
                color: #9ca3af;
                margin: 0;
            }
        `;

        this.container = document.createElement('div');
        this.container.className = 'preloader';

        const iconWrap = document.createElement('div');
        iconWrap.className = 'icon-wrap';
        this.iconEl = iconWrap;

        this.titleEl = document.createElement('p');
        this.titleEl.className = 'title';

        this.subtitleEl = document.createElement('p');
        this.subtitleEl.className = 'subtitle';

        this.container.appendChild(iconWrap);
        this.container.appendChild(this.titleEl);
        this.container.appendChild(this.subtitleEl);

        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(this.container);
    }

    public show(mode: 'loading' | 'delete' | 'upload' = 'loading', progress?: number): void {
        this.applyMode(mode, progress);
        this.container!.classList.add('visible');
    }

    /** Обновляет процент в режиме upload без перестройки DOM */
    public updateProgress(progress: number): void {
        if (this.subtitleEl) {
            this.subtitleEl.textContent = `${Math.round(progress)}%`;
        }
    }

    public hide(): void {
        this.container!.classList.remove('visible');
    }

    private applyMode(mode: 'loading' | 'delete' | 'upload', progress?: number): void {
        if (!this.iconEl || !this.titleEl || !this.subtitleEl) return;

        this.iconEl.innerHTML = '';

        if (mode === 'loading') {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            this.iconEl.appendChild(spinner);
            this.titleEl.textContent = 'Загрузка...';
            this.subtitleEl.textContent = '';
        } else if (mode === 'delete') {
            // Иконка корзины с анимацией wiggle
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 16 16');
            svg.setAttribute('fill', 'currentColor');
            svg.classList.add('icon-delete');
            svg.innerHTML = '<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>';
            this.iconEl.appendChild(svg);
            this.titleEl.textContent = 'Удаление...';
            this.subtitleEl.textContent = '';
        } else if (mode === 'upload') {
            // Иконка стрелки вверх с анимацией bounce
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 16 16');
            svg.setAttribute('fill', 'currentColor');
            svg.classList.add('icon-upload');
            svg.innerHTML = '<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>';
            this.iconEl.appendChild(svg);
            this.titleEl.textContent = 'Загрузка...';
            this.subtitleEl.textContent = progress !== undefined ? `${Math.round(progress)}%` : '';
        }
    }
}

// Регистрируем веб-компонент
customElements.define('preloader-wc', PreloaderComponent);
