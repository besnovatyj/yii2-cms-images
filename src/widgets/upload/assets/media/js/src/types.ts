/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// types.ts — модульные типы виджета галереи

/** Конфигурация для глобальной функции showAlert */
export interface ShowAlertConfig {
    message: string; // Текст сообщения (обязательное поле)
    type: 'success' | 'error' | 'warning' | 'info'; // Тип сообщения (обязательное поле)
    duration?: number; // Длительность отображения в миллисекундах (необязательное поле)
}

// Объявление типа для глобальной функции showAlert
declare global {
    function showAlert(config: ShowAlertConfig): void;
}

/** Серверное изображение */
export interface ServerImage {
    kind: 'server'; // дискриминирующее поле (discriminant) - для обхода запроса типа переменной
    id: number;
    sort: number;
    fileName: string;
    previewUrl: string;
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
