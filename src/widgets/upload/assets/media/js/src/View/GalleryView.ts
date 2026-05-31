/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import GalleryState from "@/GalleryState";
import DropZone from "@/View/DropZone";
import {ControlsComponent} from "@/View/ControlsComponent";
import ImageListComponent from "@/View/ImageListComponent";
import PreloaderComponent from "@/View/PreloaderComponent";
import TopProgressBar from "@/View/TopProgressBar";

export default class GalleryView {
    private container: HTMLElement;
    private preloader: PreloaderComponent | null = null;
    private serverImageList: ImageListComponent | undefined;
    private uploadImageList: ImageListComponent | undefined;
    private topBar!: TopProgressBar;
    private topBarActive = false;
    private wasUploading = false;

    constructor(
        containerId: string,
        private dispatcher: Dispatcher,
        imageScale: number
    ) {
        this.container = document.getElementById(containerId)!;
        this.container.innerHTML = '';
        this.applyContainerStyles();
        this.setupComponents(imageScale);
    }

    /** Инжектируем базовые стили во внешний контейнер виджета */
    private applyContainerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .gallery-upload {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
            }
        `;
        document.head.appendChild(style);

        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '0';
    }

    private setupComponents(imageScale: number) {
        this.topBar = new TopProgressBar();
        const controls = new ControlsComponent(this.dispatcher);
        const dropZone = new DropZone(this.dispatcher);
        this.serverImageList = new ImageListComponent(this.dispatcher, 'server', imageScale, 'В галерее');
        this.uploadImageList = new ImageListComponent(this.dispatcher, 'upload', imageScale, 'Выбрано для загрузки');
        this.preloader = new PreloaderComponent();

        // Секция загрузки: дропзона + очередь + кнопки — всё рядом
        const uploadSection = document.createElement('div');
        uploadSection.style.cssText = `
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 12px;
            margin-top: 12px;
            background: #fafafa;
        `;
        uploadSection.append(
            dropZone,
            this.uploadImageList,
            controls,
        );

        this.container.append(
            this.serverImageList,
            uploadSection,
            this.preloader,
        );
    }

    render(model: GalleryState) {
        this.serverImageList?.render(model.serverImages);
        this.uploadImageList?.render(model.uploadImages);

        if (model.isUploading) {
            this.wasUploading = true;
            // Обновляем прогресс без перестройки DOM если оверлей уже показан
            this.preloader!.show('upload', model.overallProgress);
            this.topBar.setProgress(model.overallProgress);
        } else {
            this.preloader!.hide();
            // Завершаем top bar только если он был активен (upload, delete или init)
            if (this.wasUploading || this.topBarActive) {
                this.topBar.complete();
                this.wasUploading = false;
                this.topBarActive = false;
            }
        }
    }

    /**
     * Управление оверлеем для операций init и delete.
     * Для upload оверлей управляется через render() + model.isUploading.
     * Для sort и setMainImage оверлей не нужен — используйте topBarAction().
     */
    public preloaderAction(action: 'start' | 'stop', mode: 'loading' | 'delete' | 'upload' = 'loading'): void {
        if (action === 'start') {
            this.preloader!.show(mode);
            this.topBar.setIndeterminate();
            this.topBarActive = true;
        } else {
            this.preloader!.hide();
        }
    }

    /** Управление top bar для быстрых операций без оверлея (sort, setMainImage) */
    public topBarAction(action: 'indeterminate' | 'complete'): void {
        if (action === 'indeterminate') {
            this.topBar.setIndeterminate();
            this.topBarActive = true;
        } else {
            this.topBar.complete();
            this.topBarActive = false;
        }
    }
}
