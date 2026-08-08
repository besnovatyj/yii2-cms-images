/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import GalleryState from "@/GalleryState";
import DropZone from "@/View/DropZone";
import {ControlsComponent} from "@/View/ControlsComponent";
import GridToolbar from "@/View/GridToolbar";
import ImageGrid from "@/View/ImageGrid";
import UploadQueue from "@/View/UploadQueue";
import BulkActionBar from "@/View/BulkActionBar";
import InspectorPanel from "@/View/InspectorPanel";
import PreloaderComponent from "@/View/PreloaderComponent";
import TopProgressBar from "@/View/TopProgressBar";
import NotificationModal from "@/View/NotificationModal";
import type {NotifyOptions, PreviewFit} from "@/types";

/**
 * Корневой оркестратор представления.
 *
 * Владеет всеми слоями UI и раскладкой, но не содержит бизнес-логики: получает состояние
 * через {@link render} и распределяет его по компонентам, а также транслирует глобальный
 * Esc в интенты закрытия. Действия компонентов идут в контроллер через Dispatcher.
 *
 * Слои (сверху вниз): тулбар режимов → панель массовых действий → сетка изображений →
 * секция загрузки (дропзона + очередь + кнопки). Поверх: инспектор (fixed), прелоадер,
 * верхний прогресс-бар.
 */
export default class GalleryView {
    private readonly container: HTMLElement;

    private readonly toolbar: GridToolbar;
    private readonly grid: ImageGrid;
    private readonly queue: UploadQueue;
    private readonly bulkBar: BulkActionBar;
    private readonly inspector: InspectorPanel;
    private readonly preloader: PreloaderComponent;
    private readonly topBar: TopProgressBar;
    private readonly notifier: NotificationModal;

    private topBarActive = false;
    private wasUploading = false;

    constructor(
        containerId: string,
        private dispatcher: Dispatcher,
        imageScale: number,
        previewFit: PreviewFit = 'cover'
    ) {
        this.container = document.getElementById(containerId)!;
        this.container.innerHTML = '';
        this.applyContainerStyles();

        const imageSize = 100 * imageScale;

        this.topBar = new TopProgressBar();
        this.toolbar = new GridToolbar(this.dispatcher);
        this.bulkBar = new BulkActionBar(this.dispatcher);
        this.grid = new ImageGrid(this.dispatcher, imageSize, previewFit);
        this.queue = new UploadQueue(this.dispatcher, imageSize, previewFit);
        this.inspector = new InspectorPanel(this.dispatcher, previewFit);
        this.preloader = new PreloaderComponent();
        // Модальное окно уведомлений живёт на уровне body (fixed-оверлей поверх всего),
        // а не внутри контейнера виджета — чтобы перекрывать всю страницу по центру.
        this.notifier = new NotificationModal();
        document.body.appendChild(this.notifier);

        const controls = new ControlsComponent(this.dispatcher);
        const dropZone = new DropZone(this.dispatcher);

        // Секция загрузки: дропзона + очередь + кнопки
        const uploadSection = document.createElement('div');
        uploadSection.className = 'gu-upload-section';
        uploadSection.append(dropZone, this.queue, controls);

        this.container.append(
            this.toolbar,
            this.bulkBar,
            this.grid,
            uploadSection,
            this.preloader,
            this.inspector,
        );

        this.bindGlobalKeys();
    }

    render(model: GalleryState): void {
        this.toolbar.update(model.uiMode, model.serverImages.length);
        this.grid.render(model.serverImages, model.uiMode, model.selectedIds);
        this.queue.render(model.uploadImages);

        const inSelection = model.uiMode === 'selection';
        this.bulkBar.setVisible(inSelection);
        if (inSelection) this.bulkBar.update(model.selectedIds, model.serverImages);

        this.inspector.update(model.inspectorImage);

        if (model.isUploading) {
            this.wasUploading = true;
            this.preloader.show('upload', model.overallProgress);
            this.preloader.setSubtitle(`${model.uploadDoneCount} из ${model.uploadTotalCount}`);
            this.topBar.setProgress(model.overallProgress);
        } else {
            this.preloader.hide();
            if (this.wasUploading || this.topBarActive) {
                this.topBar.complete();
                this.wasUploading = false;
                this.topBarActive = false;
            }
        }
    }

    /**
     * Показать уведомление пользователю в собственном модальном окне виджета.
     * Единая точка вывода успехов/ошибок/предупреждений — сюда должны доходить все
     * сообщения об ошибках целиком (с пофайловыми подробностями в `details`).
     */
    public notify(options: NotifyOptions): void {
        this.notifier.notify(options);
    }

    /**
     * Оверлей для операций init и delete.
     * Для upload оверлей управляется через render() + model.isUploading.
     * Для sort и setMainImage оверлей не нужен — используйте topBarAction().
     *
     * @param progress 'indeterminate' — shimmer (неизвестная длительность);
     *                 'determinate'   — реальный прогресс с 0% (обновляется через {@link busyProgress}).
     */
    public preloaderAction(
        action: 'start' | 'stop',
        mode: 'loading' | 'delete' | 'upload' = 'loading',
        progress: 'indeterminate' | 'determinate' = 'indeterminate'
    ): void {
        if (action === 'start') {
            this.preloader.show(mode);
            if (progress === 'determinate') {
                this.topBar.setProgress(0);
            } else {
                this.topBar.setIndeterminate();
            }
            this.topBarActive = true;
        } else {
            this.preloader.hide();
        }
    }

    /**
     * Обновить детерминированный прогресс верхнего бара и (опц.) подпись оверлея.
     * Для пошаговых операций, где известно общее число шагов (пакетное удаление).
     */
    public busyProgress(value: number, subtitle?: string): void {
        this.topBar.setProgress(value);
        this.topBarActive = true;
        if (subtitle !== undefined) this.preloader.setSubtitle(subtitle);
    }

    /** Top bar для быстрых операций без оверлея (sort, setMainImage). */
    public topBarAction(action: 'indeterminate' | 'complete'): void {
        if (action === 'indeterminate') {
            this.topBar.setIndeterminate();
            this.topBarActive = true;
        } else {
            this.topBar.complete();
            this.topBarActive = false;
        }
    }

    /** Esc закрывает инспектор, а затем выходит из активного режима. */
    private bindGlobalKeys(): void {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (this.inspector.style.display !== 'none') {
                this.dispatcher.publish('VIEW.CLOSE_INSPECTOR');
            } else {
                this.dispatcher.publish('VIEW.EXIT_MODE');
            }
        });
    }

    /** Базовые стили контейнера + палитра как CSS-переменные (наследуются в Shadow DOM). */
    private applyContainerStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .gallery-upload {
                --gu-accent: #4f7df3;
                --gu-accent-hover: #3b6de0;
                --gu-accent-soft: #93c5fd;
                --gu-danger: #ef4444;
                --gu-cover: rgba(245,158,11,.95);
                --gu-surface: #f3f4f6;
                --gu-border: #e5e7eb;
                --gu-tile-bg: #e9ecef;
                --gu-text: #374151;
                --gu-text-strong: #1f2937;
                --gu-text-muted: #9ca3af;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .gallery-upload .gu-upload-section {
                border: 1px solid var(--gu-border);
                border-radius: 12px;
                padding: 12px;
                margin-top: 12px;
                background: #fafafa;
            }
        `;
        document.head.appendChild(style);
    }
}
