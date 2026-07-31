/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import GalleryFileUploader from "@/GalleryFileUploader";
import GalleryState from "@/GalleryState";
import GalleryService from "@/GalleryService";
import GalleryView from "@/View/GalleryView";
import type {UploadStatus} from "@/types";

// GalleryController
export default class GalleryController {
    constructor(
        private model: GalleryState,
        private view: GalleryView,
        private service: GalleryService,
        private fileUploader: GalleryFileUploader,
        private dispatcher: Dispatcher
    ) {
        this.setupEventListeners();
    }

    async init() {
        this.view.preloaderAction('start');
        try {
            this.model.serverImages = await this.service.getImages();
            this.view.render(this.model);
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : String(error);
            showAlert({message: `Не удалось загрузить изображения: ${message}`, type: 'error', duration: 0});
        } finally {
            this.view.preloaderAction('stop');
        }
    }

    private setupEventListeners() {
        // Загрузка
        this.dispatcher.subscribe('VIEW.FILES_DROPPED', (files: FileList) => this.handleFilesAdded(files));
        this.dispatcher.subscribe('VIEW.FILES_SELECTED', (files: FileList) => this.handleFilesAdded(files));
        this.dispatcher.subscribe('VIEW.UPLOAD_CLICKED', () => this.handleUploadClicked());
        this.dispatcher.subscribe('VIEW.CLEAR_CLICKED', () => this.handleClearClicked());
        this.dispatcher.subscribe('FileUploader:UploadStatusUpdate', (status: UploadStatus[]) => this.handleUploadStatusUpdate(status));

        // Действия над изображениями
        this.dispatcher.subscribe('VIEW.IMAGE_DELETED', (data) => this.handleImageDeleted(data));
        this.dispatcher.subscribe('VIEW.IMAGES_DELETED', (data) => this.handleImagesDeleted(data.ids));
        this.dispatcher.subscribe('VIEW.SET_MAIN_IMAGE', (data) => this.handleSetMainImage(data));
        this.dispatcher.subscribe('VIEW.SORT_CHANGED', (newOrder) => this.handleServerSortChanged(newOrder));

        // Режимы и выделение
        this.dispatcher.subscribe('VIEW.ENTER_SELECTION', () => this.transition(() => this.model.enterSelection()));
        this.dispatcher.subscribe('VIEW.ENTER_REORDER', () => this.transition(() => this.model.enterReorder()));
        this.dispatcher.subscribe('VIEW.EXIT_MODE', () => this.transition(() => this.model.exitMode()));
        this.dispatcher.subscribe('VIEW.SELECT_ALL', () => this.handleSelectAll());
        this.dispatcher.subscribe('VIEW.TILE_TOGGLE_SELECT', (data) => this.transition(() => this.model.toggleSelected(data.id)));
        this.dispatcher.subscribe('VIEW.TILE_LONGPRESS', (data) => this.transition(() => {
            this.model.enterSelection();
            this.model.toggleSelected(data.id);
        }));

        // Инспектор
        this.dispatcher.subscribe('VIEW.TILE_ACTIVATED', (data) => this.transition(() => this.model.setInspector(data.id)));
        this.dispatcher.subscribe('VIEW.CLOSE_INSPECTOR', () => this.transition(() => this.model.setInspector(null)));
    }

    /** Синхронное изменение UI-состояния + перерисовка. */
    private transition(mutate: () => void): void {
        mutate();
        this.view.render(this.model);
    }

    private handleSelectAll(): void {
        const allSelected = this.model.selectedIds.size === this.model.serverImages.length
            && this.model.serverImages.length > 0;
        this.transition(() => allSelected ? this.model.clearSelection() : this.model.selectAll());
    }

    /**
     * Обработка добавления файлов.
     * Ошибки валидации показываются Controller-ом, а не Model-ью (P1 #8).
     */
    private async handleFilesAdded(files: FileList) {
        const result = await this.model.addUploadImages(files);
        if (result.errors.length === 1) {
            showAlert({message: result.errors[0].message, type: 'error', duration: 0});
        } else if (result.errors.length > 1) {
            const fileNames = result.errors.map(e => e.fileName).join(', ');
            showAlert({
                message: `Не удалось добавить ${result.errors.length} файлов: ${fileNames}`,
                type: 'error',
                duration: 0
            });
        }
        this.view.render(this.model);
    }

    /** Одиночное удаление из очереди загрузки (server-удаление идёт через handleImagesDeleted). */
    private handleImageDeleted(data: { type: 'server' | 'upload'; id: number }) {
        if (data.type === 'upload') {
            this.model.removeUploadImage(data.id);
            this.view.render(this.model);
        } else {
            this.handleImagesDeleted([data.id]);
        }
    }

    /**
     * Массовое (и одиночное) удаление серверных изображений.
     * Удаляет по одному существующим эндпойнтом, собирая частичные ошибки; затем локально
     * убирает удалённые и переназначает главное (бэкенд назначает главным первое по sort).
     */
    private async handleImagesDeleted(ids: number[]) {
        if (ids.length === 0) return;

        const targetSet = new Set(ids);
        const wasMainDeleted = this.model.serverImages.some(img => img.isMain && targetSet.has(img.id));

        // Удаляем по одному запросу на фото → показываем реальный прогресс в верхнем баре
        const total = ids.length;
        this.view.preloaderAction('start', 'delete', 'determinate');
        this.view.busyProgress(0, `0 из ${total}`);
        const deleted: number[] = [];
        const failed: number[] = [];
        let processed = 0;
        for (const id of ids) {
            try {
                await this.service.deleteImage(id);
                deleted.push(id);
            } catch (error: unknown) {
                console.error(`Не удалось удалить изображение ${id}:`, error);
                failed.push(id);
            }
            processed++;
            this.view.busyProgress((processed / total) * 100, `${processed} из ${total}`);
        }

        const deletedSet = new Set(deleted);
        let images = this.model.serverImages.filter(img => !deletedSet.has(img.id));
        // Если удалили главное — назначаем главным первое оставшееся (список отсортирован по sort)
        if (wasMainDeleted && images.length > 0 && !images.some(img => img.isMain)) {
            images = images.map((img, index) => ({...img, isMain: index === 0}));
        }
        this.model.serverImages = images;
        this.model.exitMode(); // выходим из режима выделения после массовой операции
        this.view.render(this.model);
        this.view.preloaderAction('stop');

        if (failed.length > 0) {
            showAlert({
                message: `Не удалось удалить ${failed.length} из ${ids.length} изображений`,
                type: 'error',
                duration: 0
            });
        }
    }

    private async handleServerSortChanged(newOrder: { id: number; sort: number }[]) {
        this.view.topBarAction('indeterminate');
        try {
            await this.service.setNewSort(newOrder);
            const sortMap = new Map(newOrder.map(item => [item.id, item.sort]));
            this.model.serverImages = this.model.serverImages
                .map(img => ({...img, sort: sortMap.get(img.id) ?? img.sort}))
                .sort((a, b) => a.sort - b.sort);
            this.view.render(this.model);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            showAlert({message: `Не удалось установить новый порядок: ${message}`, type: 'error', duration: 0});
            // Откатываем визуальный порядок к состоянию модели
            this.view.render(this.model);
            this.view.topBarAction('complete');
        }
    }

    /**
     * Обработка загрузки файлов с поддержкой partial success (P1 #9).
     * Дифференцированное отображение результатов: все успешны / частичный успех / все неуспешны.
     */
    private async handleUploadClicked() {
        if (this.model.uploadImages.length === 0) {
            showAlert({message: 'Нет файлов для загрузки', type: 'warning'});
            return;
        }
        this.model.isUploading = true;
        this.view.render(this.model); // Немедленно показываем оверлей, блокируя любые действия
        try {
            const result = await this.fileUploader.uploadAll();
            // Оверлей остаётся пока грузится обновлённый список (пересоздание эскизов)
            this.model.serverImages = await this.service.getImages();
            this.model.clearUploadImages();
            this.model.isUploading = false;
            this.view.render(this.model);

            if (result.failed.length === 0) {
                showAlert({message: 'Все файлы успешно загружены', type: 'success'});
            } else if (result.succeeded > 0) {
                showAlert({
                    message: `Загружено ${result.succeeded} из ${result.succeeded + result.failed.length} файлов. Ошибки: ${result.failed.map(f => `${f.fileName}: ${f.error}`).join('; ')}`,
                    type: 'warning',
                    duration: 0
                });
            } else {
                showAlert({
                    message: `Не удалось загрузить файлы: ${result.failed.map(f => `${f.fileName}: ${f.error}`).join('; ')}`,
                    type: 'error',
                    duration: 0
                });
            }
        } catch (error: unknown) {
            this.model.isUploading = false;
            this.view.render(this.model); // Снимаем оверлей при ошибке
            const message = error instanceof Error ? error.message : String(error);
            showAlert({message: `Ошибка загрузки: ${message}`, type: 'error', duration: 0});
        }
    }

    private handleClearClicked() {
        this.model.clearUploadImages();
        this.view.render(this.model);
    }

    private async handleSetMainImage(data: { id: number }) {
        this.view.topBarAction('indeterminate');
        try {
            await this.service.setMainImage(data.id);
            this.model.serverImages = this.model.serverImages.map(img => ({
                ...img,
                isMain: img.id === data.id
            }));
            this.view.render(this.model);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            showAlert({message: `Не удалось установить главное изображение: ${message}`, type: 'error', duration: 0});
            this.view.topBarAction('complete');
        }
    }

    private handleUploadStatusUpdate(status: UploadStatus[]) {
        this.model.updateUploadStatus(status);
        this.view.render(this.model);
    }
}
