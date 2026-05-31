/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// GalleryService

import type {ServerImage, ImagesData} from "@/types";

// Интерфейс для ответа сервера
interface ServerResponse<T = any> {
    status: 'success' | 'error';
    method?: string;
    message?: string;
    data: T;
}

// Интерфейс для ошибки сервера
interface ServerError {
    message: string;
    file?: string;
    line?: number;
    code?: number;
    trace?: string;
}


export default class GalleryService {
    constructor(
        private headers: Record<string, string>,
        private endpoints: { getImages: string; deleteImage: string; setNewSort: string; setMainImage: string },
        private ownerId: string,
        private formNames: Record<string, string>,
    ) {
    }

    async getImages(): Promise<ServerImage[]> {
        try {
            const formData = new FormData();
            formData.append(`${this.formNames.getImagesForm}[id]`, this.ownerId);
            const response = await fetch(this.endpoints.getImages, {
                method: 'POST',
                headers: this.headers,
                body: formData
            });
            const data = await this.handleResponse<ImagesData>(response);

            // Преобразование объекта с числовыми ключами в массив ServerImage[]
            if (typeof data !== 'object' || data === null) {
                console.error('Данные с сервера не являются объектом:', data);
                throw new Error('Некорректный формат данных с сервера');
            }
            const images = Object.keys(data)
                .filter(key => !isNaN(Number(key))) // Фильтруем только числовые ключи
                .map(key => data[key]);

            if (images.length === 0) {
                console.warn('Сервер вернул успешный ответ, но изображения отсутствуют:', data);
                return [];
            }

            return images.sort((a, b) => a.sort - b.sort); // Сортировка по полю sort
        } catch (error: unknown) {
            console.error('Ошибка в getImages:', error);
            throw error;
        }
    }

    async deleteImage(imageId: number): Promise<void> {
        try {
            const formData = new FormData();
            formData.append(`${this.formNames.deleteImageForm}[id]`, this.ownerId);
            formData.append(`${this.formNames.deleteImageForm}[imageId]`, String(imageId));
            const response = await fetch(this.endpoints.deleteImage, {
                method: 'POST',
                headers: this.headers,
                body: formData
            });
            await this.handleResponse<unknown>(response);
        } catch (error: unknown) {
            console.error('Ошибка в deleteImage:', error);
            throw error;
        }
    }

    async setMainImage(imageId: number): Promise<void> {
        try {
            const formData = new FormData();
            formData.append(`${this.formNames.setMainImageForm}[id]`, this.ownerId);
            formData.append(`${this.formNames.setMainImageForm}[imageId]`, String(imageId));
            const response = await fetch(this.endpoints.setMainImage, {
                method: 'POST',
                headers: this.headers,
                body: formData
            });
            await this.handleResponse<unknown>(response);
        } catch (error: unknown) {
            console.error('Ошибка в setMainImage:', error);
            throw error;
        }
    }

    async setNewSort(sortOrder: { id: number; sort: number }[]): Promise<void> {
        try {
            const formData = new FormData();
            formData.append(`${this.formNames.setNewSortForm}[id]`, this.ownerId);
            formData.append(`${this.formNames.setNewSortForm}[sortOrder]`, JSON.stringify(sortOrder));
            const response = await fetch(this.endpoints.setNewSort, {
                method: 'POST',
                headers: this.headers,
                body: formData
            });
            await this.handleResponse<unknown>(response);
        } catch (error: unknown) {
            console.error('Ошибка в setNewSort:', error);
            throw error;
        }
    }

    /**
     * Обработка ответа сервера.
     * showAlert() убран — Controller решает как показывать ошибки (P1 #7).
     * ServerError.trace не логируется в console — информация для атакующего в production (P3 #18).
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            throw new Error(`HTTP ошибка ${response.status}: ${response.statusText}`);
        }
        const data: ServerResponse<T> = await response.json();

        if (data.status === 'error') {
            const errorData = data.data as ServerError;
            const message = `Ошибка сервера: ${data.message || errorData.message || 'Неизвестная ошибка'}`;
            console.error('Ошибка сервера:', {
                message: errorData.message,
                file: errorData.file,
                line: errorData.line,
                code: errorData.code,
            });
            throw new Error(message);
        }

        if (data.status !== 'success') {
            console.error('Неизвестный статус ответа:', data.status);
            throw new Error('Неизвестный статус ответа сервера');
        }

        return data.data;
    }
}
