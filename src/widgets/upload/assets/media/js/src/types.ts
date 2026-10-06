/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// types.ts — модульные типы виджета галереи

/**
 * Способ вписывания превью в квадрат ячейки грида.
 * 'cover' — заполнить с обрезкой краёв; 'contain' — вписать целиком (возможны поля).
 */
export type PreviewFit = 'cover' | 'contain';

/**
 * Режим взаимодействия с сеткой изображений.
 * 'normal'    — чистые плитки, клик открывает панель свойств (инспектор);
 * 'selection' — режим выделения: центральные галочки + панель массовых действий;
 * 'reorder'   — режим смены порядка: перетаскивание плиток (SortableJS).
 */
export type UiMode = 'normal' | 'selection' | 'reorder';

/** Тип уведомления модального окна виджета. */
export type NotifyType = 'success' | 'error' | 'warning' | 'info';

/**
 * Параметры уведомления, показываемого в собственном модальном окне виджета
 * ({@link NotificationModal}).
 *
 * `details` — список подробностей (например, пофайловые ошибки загрузки). Именно сюда
 * складываются все технические сообщения об ошибках, чтобы они целиком доходили до
 * пользователя и не обрезались, в отличие от компактных подписей под плитками.
 *
 * `duration` — время автозакрытия в мс. Если не задано: `success` закрывается через
 * пару секунд, а `error`/`warning`/`info` не закрываются автоматически (только по крестику).
 * Значение `0` явно означает «показывать бесконечно».
 */
export interface NotifyOptions {
    type: NotifyType;
    message: string;
    title?: string;
    details?: string[];
    duration?: number;
}

/** Серверное изображение */
export interface ServerImage {
    kind: 'server'; // дискриминирующее поле (discriminant) - для обхода запроса типа переменной
    id: number;
    sort: number;
    fileName: string;
    previewUrl: string; // Пока превью не создано — URL оригинала
    previewReady: boolean; // Превью уже создано (генерация идёт в фоне через очередь)
    srcUrl: string;
    isMain: boolean; // Является ли главным изображением галереи
}

/** Загружаемое изображение */
export interface UploadImage {
    kind: 'upload'; // дискриминирующее поле (discriminant) - для обхода запроса типа переменной
    id: number;
    file: File;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    progress: number;
    error?: string;
}

/** Статус загрузки файла — идентификация по uploadId, а не по fileName */
export interface UploadStatus {
    uploadId: number;
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
}

/** Данные изображений с сервера */
export interface ImagesData {
    [key: string]: ServerImage;
}

/** Ошибка валидации файла */
export interface ValidationError {
    fileName: string;
    message: string;
}

/** Результат валидации файлов */
export interface ValidationResult {
    validFiles: File[];
    errors: ValidationError[];
}

/** Результат загрузки файлов (partial success) */
export interface UploadResult {
    succeeded: number;
    failed: Array<{ fileName: string; error: string }>;
}
