/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

export default class TopProgressBar {
    private bar: HTMLElement;
    private inner: HTMLElement;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes top-bar-shimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
            }
            .top-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 99999;
                pointer-events: none;
                display: none;
            }
            .top-progress-bar-inner {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4f7df3, #10b981);
                transition: width 0.25s ease;
                border-radius: 0 99px 99px 0;
            }
            .top-progress-bar-inner.indeterminate {
                width: 100% !important;
                background: linear-gradient(90deg, #4f7df3 0%, #10b981 50%, #4f7df3 100%);
                background-size: 200% auto;
                animation: top-bar-shimmer 1.5s linear infinite;
                transition: none;
                border-radius: 0;
            }
        `;
        document.head.appendChild(style);

        this.bar = document.createElement('div');
        this.bar.className = 'top-progress-bar';
        this.inner = document.createElement('div');
        this.inner.className = 'top-progress-bar-inner';
        this.bar.appendChild(this.inner);
        document.body.appendChild(this.bar);
    }

    /** Determinate: реальный прогресс 0–100 (для upload) */
    setProgress(value: number): void {
        this.cancelHideTimer();
        this.inner.classList.remove('indeterminate');
        this.bar.style.display = 'block';
        this.inner.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    /** Indeterminate: shimmer-анимация (для delete/fetch) */
    setIndeterminate(): void {
        this.cancelHideTimer();
        this.bar.style.display = 'block';
        this.inner.classList.add('indeterminate');
    }

    /** Завершение: быстро доводит до 100%, затем плавно скрывает */
    complete(): void {
        this.cancelHideTimer();
        this.inner.classList.remove('indeterminate');
        this.inner.style.width = '100%';
        this.hideTimer = setTimeout(() => {
            this.bar.style.display = 'none';
            this.inner.style.width = '0%';
        }, 400);
    }

    private cancelHideTimer(): void {
        if (this.hideTimer !== null) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }
}
