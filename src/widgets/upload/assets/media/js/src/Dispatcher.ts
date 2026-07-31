/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {UploadStatus} from './types';

/**
 * Карта событий галереи — type-safety для publish/subscribe.
 *
 * Именно `type`, а не `interface`: псевдоним типа получает неявную индексную сигнатуру и
 * потому удовлетворяет ограничению `Record<string, any[]>` в объявлении Dispatcher
 * (интерфейс — нет). Safety при этом полностью сохраняется.
 */
export type GalleryEventMap = {
    // --- Загрузка файлов ---
    'VIEW.FILES_DROPPED': [FileList];
    'VIEW.FILES_SELECTED': [FileList];
    'VIEW.UPLOAD_CLICKED': [];
    'VIEW.CLEAR_CLICKED': [];
    'FileUploader:UploadStatusUpdate': [UploadStatus[]];

    // --- Действия над изображениями ---
    'VIEW.IMAGE_DELETED': [{ type: 'server' | 'upload'; id: number }]; // одиночное (очередь/инспектор)
    'VIEW.IMAGES_DELETED': [{ ids: number[] }];                        // массовое (bulk-панель)
    'VIEW.SET_MAIN_IMAGE': [{ id: number }];
    'VIEW.SORT_CHANGED': [{ id: number; sort: number }[]];             // новый порядок серверных изображений

    // --- Переключение режимов и выделение ---
    'VIEW.ENTER_SELECTION': [];
    'VIEW.ENTER_REORDER': [];
    'VIEW.EXIT_MODE': [];
    'VIEW.SELECT_ALL': [];
    'VIEW.TILE_ACTIVATED': [{ id: number }];      // клик по плитке в normal → открыть инспектор
    'VIEW.TILE_TOGGLE_SELECT': [{ id: number }];  // клик по плитке в selection → инвертировать выбор
    'VIEW.TILE_LONGPRESS': [{ id: number }];      // long-press (мобилка) → войти в selection и выбрать

    // --- Инспектор ---
    'VIEW.CLOSE_INSPECTOR': [];
}

export default class Dispatcher<EventMap extends Record<string, any[]> = GalleryEventMap> {

    private subscriptions = new Map<string, Array<(...args: any[]) => void>>();

    /**
     * Subscribe to an event with a handler
     * @param eventName Name of the event
     * @param handler Callback function
     */
    subscribe<K extends keyof EventMap & string>(eventName: K, handler: (...args: EventMap[K]) => void): () => void {
        // Контекст не нужен. В обычных функциях значение this определяется в момент вызова функции.
        // Стрелочные функции не создают собственный контекст this. Вместо этого они захватывают значение
        // this из окружающего лексического контекста при их определении.
        let handlers = this.subscriptions.get(eventName);
        if (!handlers) {
            handlers = [];
            this.subscriptions.set(eventName, handlers);
        }
        handlers.push(handler);

        // Возвращаем функцию для отписки
        return () => {
            const index = handlers!.indexOf(handler);
            if (index !== -1) {
                handlers!.splice(index, 1);
                if (handlers!.length === 0) {
                    this.subscriptions.delete(eventName);
                }
            }
        };
    }

    /**
     * Publish an event with given arguments
     * @param eventName Name of the event
     * @param args Arguments to pass to handlers
     */
    publish<K extends keyof EventMap & string>(eventName: K, ...args: EventMap[K]): void {
        const handlers = this.subscriptions.get(eventName);
        if (handlers) {
            for (const handler of handlers) {
                handler(...args);
            }
        }
    }
}
