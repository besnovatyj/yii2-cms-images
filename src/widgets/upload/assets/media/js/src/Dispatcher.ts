/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {UploadStatus} from './types';

/** Карта событий галереи — type-safety для publish/subscribe */
export interface GalleryEventMap {
    'VIEW.FILES_DROPPED': [FileList];
    'VIEW.FILES_SELECTED': [FileList];
    'VIEW.IMAGE_DELETED': [{ type: 'server' | 'upload'; id: number }];
    'VIEW.SORT_CHANGED': [{ id: number; sort: number }[]];
    'VIEW.UPLOAD_SORT_CHANGED': [number[]];
    'VIEW.UPLOAD_CLICKED': [];
    'VIEW.CLEAR_CLICKED': [];
    'VIEW.SET_MAIN_IMAGE': [{ id: number }];
    'FileUploader:UploadStatusUpdate': [UploadStatus[]];
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
