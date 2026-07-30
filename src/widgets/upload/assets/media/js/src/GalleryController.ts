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
        this.dispatcher.subscribe('VIEW.FILES_DROPPED', (files: FileList) => this.handleFilesAdded(files));
        this.dispatcher.subscribe('VIEW.FILES_SELECTED', (files: FileList) => this.handleFilesAdded(files));
        this.dispatcher.subscribe('VIEW.IMAGE_DELETED', (data: {
            type: 'server' | 'upload';
            id: number
        }) => this.handleImageDeleted(data));
        this.dispatcher.subscribe('VIEW.SORT_CHANGED', (newOrder: {
            id: number;
            sort: number
        }[]) => this.handleServerSortChanged(newOrder));
        this.dispatcher.subscribe('VIEW.UPLOAD_SORT_CHANGED', (newOrderIds: number[]) => this.handleUploadSortChanged(newOrderIds));
        this.dispatcher.subscribe('VIEW.UPLOAD_CLICKED', () => this.handleUploadClicked());
        this.dispatcher.subscribe('VIEW.CLEAR_CLICKED', () => this.handleClearClicked());
        this.dispatcher.subscribe('VIEW.SET_MAIN_IMAGE', (data: { id: number }) => this.handleSetMainImage(data));
        this.dispatcher.subscribe('FileUploader:UploadStatusUpdate', (status: UploadStatus[]) => this.handleUploadStatusUpdate(status));
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

    private async handleImageDeleted(data: { type: 'server' | 'upload'; id: number }) {
        if (data.type === 'server') {
            this.view.preloaderAction('start', 'delete');
            try {
                await this.service.deleteImage(data.id);
                const deletedImage = this.model.serverImages.find(img => img.id === data.id);
                const wasMain = deletedImage?.isMain ?? false;
                this.model.serverImages = this.model.serverImages.filter(img => img.id !== data.id);
                // Если удалённое изображение было главным — бэкенд назначает главным первое по sort.
                // Изображения в стейте уже отсортированы по sort, поэтому помечаем первое оставшееся.
                if (wasMain && this.model.serverImages.length > 0) {
                    this.model.serverImages = this.model.serverImages.map((img, index) => ({
                        ...img,
                        isMain: index === 0
                    }));
                }
                this.view.render(this.model);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                showAlert({message: `Не удалось удалить изображение: ${message}`, type: 'error', duration: 0});
            }
            this.view.preloaderAction('stop');
        } else {
            this.model.removeUploadImage(data.id);
            this.view.render(this.model);
        }
    }

    private async handleServerSortChanged(newOrder: { id: number; sort: number }[]) {
        this.view.topBarAction('indeterminate');
        try {
            await this.service.setNewSort(newOrder);
            const sortMap = new Map(newOrder.map(item => [item.id, item.sort]));
            this.model.serverImages = this.model.serverImages.map(img => ({
                ...img,
                sort: sortMap.get(img.id) || img.sort
            }));
            this.model.serverImages.sort((a, b) => a.sort - b.sort);
            this.view.render(this.model);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            showAlert({message: `Не удалось установить новый порядок: ${message}`, type: 'error', duration: 0});
            this.view.topBarAction('complete');
        }
    }

    private handleUploadSortChanged(newOrderIds: number[]) {
        this.model.reorderUploadImages(newOrderIds);
        this.view.render(this.model);
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
