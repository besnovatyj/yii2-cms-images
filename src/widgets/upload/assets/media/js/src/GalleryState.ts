/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {ServerImage, UploadImage, UploadStatus, ValidationResult} from "@/types";

// GalleryState (Model)
export default class GalleryState {
    isUploading: boolean = false;
    overallProgress: number = 0;
    private _filesToUploadList: FileList | null = null;
    private nextUploadId = 0;

    constructor(
        private maxWidth: number = 1920, // Максимальная ширина по умолчанию
        private maxHeight: number = 1080 // Максимальная высота по умолчанию
    ) {
    }

    private _serverImages: ServerImage[] = [];

    get serverImages(): ServerImage[] {
        return this._serverImages;
    }

    set serverImages(images: ServerImage[]) {
        this._serverImages = images;
    }

    private _uploadImages: UploadImage[] = [];

    get uploadImages(): UploadImage[] {
        return this._uploadImages;
    }

    // Функция для получения разрешения изображения
    private async getImageResolution(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(img.src); // Освобождаем память
                resolve({
                    width: img.width,
                    height: img.height
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error(`Ошибка загрузки изображения ${file.name}`));
            };
        });
    }

    /**
     * Валидация и добавление файлов для загрузки.
     * Возвращает результат валидации вместо вызова showAlert — Controller решает как показывать ошибки.
     */
    async addUploadImages(files: FileList): Promise<ValidationResult> {
        const validFiles: File[] = [];
        const errors: ValidationResult['errors'] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Проверка разрешения изображения.
                // Если браузер не может декодировать файл (HEIC, TIFF и т.д.) — не блокируем,
                // добавляем файл и передаём решение бэкэнду.
                try {
                    const {width, height} = await this.getImageResolution(file);
                    if (width > this.maxWidth || height > this.maxHeight) {
                        errors.push({
                            fileName: file.name,
                            message: `Файл ${file.name} превышает допустимое разрешение ${this.maxWidth}x${this.maxHeight} пикселей (фактическое: ${width}x${height})`
                        });
                        continue;
                    }
                } catch {
                    // Браузер не смог определить размеры — продолжаем, бэкэнд проверит файл
                }

                // Если файл прошел проверки, добавляем его
                validFiles.push(file);
                this._uploadImages.push({
                    kind: 'upload',
                    id: this.nextUploadId++,
                    file: files[i],
                    status: 'pending',
                    progress: 0
                });
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push({
                    fileName: file.name,
                    message: `Ошибка проверки файла ${file.name}: ${message}`
                });
            }
        }

        this.setFilesToUpload(validFiles);
        return {validFiles, errors};
    }

    removeUploadImage(id: number) {
        this._uploadImages = this._uploadImages.filter(img => img.id !== id);
        const remainingFiles = this._uploadImages.map(img => img.file);
        this.setFilesToUpload(remainingFiles);
    }

    /**
     * Получить записи для загрузки с uploadId.
     * Используется вместо getFilesToUpload() для идентификации файлов по уникальному ID, а не по имени.
     */
    getUploadEntries(): Array<{ uploadId: number; file: File }> {
        return this._uploadImages
            .filter(img => img.status === 'pending' || img.status === 'uploading')
            .map(img => ({uploadId: img.id, file: img.file}));
    }

    getFilesToUpload(): FileList | null {
        return this._filesToUploadList;
    }

    clearUploadImages() {
        this._uploadImages = [];
        this.setFilesToUpload([]);
    }

    /**
     * Обновление статусов загрузки — идентификация по uploadId вместо fileName (P1 #5).
     */
    updateUploadStatus(status: UploadStatus[]) {
        status.forEach(stat => {
            const img = this._uploadImages.find(img => img.id === stat.uploadId);
            if (img) {
                img.status = stat.status;
                img.progress = stat.progress;
                img.error = stat.error;
            }
        });
        const total = this._uploadImages.length;
        // Учитываем и завершённые и упавшие файлы — иначе прогресс-бар застывает при ошибке
        const done = this._uploadImages.filter(img => img.status === 'completed' || img.status === 'failed').length;
        this.overallProgress = total > 0 ? (done / total) * 100 : 0;
    }

    reorderUploadImages(newOrderIds: number[]) {
        this._uploadImages = newOrderIds.map(id => this._uploadImages.find(img => img.id === id)!);
    }

    private setFilesToUpload(files: File[]) {
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        this._filesToUploadList = dataTransfer.files;
    }
}
