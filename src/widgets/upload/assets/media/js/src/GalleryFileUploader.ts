/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import GalleryState from "@/GalleryState";
import type {UploadStatus, UploadResult} from "@/types";

export default class GalleryFileUploader {
    private readonly maxConcurrentUploads: number;
    private currentUploads: number = 0;
    private uploadQueue: {
        uploadId: number;
        file: File;
        resolve: (value: void | PromiseLike<void>) => void;
        reject: (reason?: unknown) => void
    }[] = [];
    private uploadStatus: UploadStatus[] = [];

    constructor(
        private connector: string,
        private headers: Record<string, string>,
        private galleryState: GalleryState,
        private dispatcher: Dispatcher,
        private ownerId: string,
        private formName: string = 'AddImageForm', // Имя формы для Yii2
        maxConcurrentUploads: number = 3
    ) {
        this.maxConcurrentUploads = maxConcurrentUploads;
    }

    /**
     * Загрузка всех файлов с поддержкой partial success (P1 #9).
     * Если часть файлов упала, остальные всё равно загружаются, результат содержит обе группы.
     */
    public async uploadAll(): Promise<UploadResult> {
        const entries = this.galleryState.getUploadEntries();
        if (entries.length === 0) {
            throw new Error('Нет файлов для загрузки');
        }

        this.uploadStatus = entries.map(entry => ({
            uploadId: entry.uploadId,
            fileName: entry.file.name,
            progress: 0,
            status: 'pending' as const
        }));

        // Каждый файл получает свой Promise — ошибка одного не отменяет другие
        const filePromises = entries.map(entry =>
            this.uploadFileQueued(entry.uploadId, entry.file)
                .then(() => ({success: true as const, fileName: entry.file.name}))
                .catch((error: unknown) => ({
                    success: false as const,
                    fileName: entry.file.name,
                    error: error instanceof Error ? error.message : String(error)
                }))
        );

        const results = await Promise.all(filePromises);

        return {
            succeeded: results.filter(r => r.success).length,
            failed: results
                .filter((r): r is { success: false; fileName: string; error: string } => !r.success)
                .map(r => ({fileName: r.fileName, error: r.error}))
        };
    }

    /**
     * Постановка файла в очередь загрузки с ограничением параллельных загрузок.
     * Идентификация по uploadId, а не по имени файла (P1 #5).
     */
    private uploadFileQueued(uploadId: number, file: File): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.uploadQueue.push({uploadId, file, resolve, reject});
            this.processQueue();
        });
    }

    private processQueue(): void {
        while (this.currentUploads < this.maxConcurrentUploads && this.uploadQueue.length > 0) {
            const {uploadId, file, resolve, reject} = this.uploadQueue.shift()!;
            this.currentUploads++;
            this.uploadFile(uploadId, file)
                .then(() => {
                    this.currentUploads--;
                    this.processQueue();
                    resolve();
                })
                .catch(error => {
                    this.currentUploads--;
                    this.processQueue();
                    reject(error);
                });
        }
    }

    private uploadFile(uploadId: number, file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            // Добавляем файл с ключом, соответствующим атрибуту модели, например, 'file'
            formData.append(`${this.formName}[file]`, file);
            // Добавляем метаданные в формате AddImageForm[attribute]
            formData.append(`${this.formName}[fileName]`, file.name);
            formData.append(`${this.formName}[id]`, this.ownerId);
            // Добавляем метод, если сервер его ожидает
            formData.append('method', 'upload');

            const uploadIndex = this.uploadStatus.findIndex(status => status.uploadId === uploadId);
            if (uploadIndex === -1) {
                return reject(new Error('Файл не найден в статусах загрузки'));
            }

            xhr.open('POST', this.connector, true);
            for (const [key, value] of Object.entries(this.headers)) {
                xhr.setRequestHeader(key, value);
            }

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this.updateUploadStatus(uploadIndex, {progress, status: 'uploading'});
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText) as { status: string; message?: string; data?: { message?: string } };
                        if (response.status === 'success') {
                            this.updateUploadStatus(uploadIndex, {progress: 100, status: 'completed'});
                            resolve();
                        } else {
                            const errorMsg = response.message
                                ?? response.data?.message
                                ?? 'Ошибка сервера';
                            this.updateUploadStatus(uploadIndex, {progress: 0, status: 'failed', error: errorMsg});
                            reject(new Error(errorMsg));
                        }
                    } catch {
                        this.updateUploadStatus(uploadIndex, {progress: 0, status: 'failed', error: 'Неверный формат ответа'});
                        reject(new Error('Неверный формат ответа сервера'));
                    }
                } else {
                    this.updateUploadStatus(uploadIndex, {progress: 0, status: 'failed', error: xhr.statusText});
                    reject(new Error(`Ошибка загрузки: ${xhr.status}: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                this.updateUploadStatus(uploadIndex, {progress: 0, status: 'failed', error: 'Сетевая ошибка'});
                reject(new Error('Сетевая ошибка'));
            };

            xhr.send(formData);
        });
    }

    private updateUploadStatus(index: number, updates: Partial<UploadStatus>): void {
        this.uploadStatus[index] = {...this.uploadStatus[index], ...updates};
        this.dispatcher.publish('FileUploader:UploadStatusUpdate', this.uploadStatus);
    }
}
