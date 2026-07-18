/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";
import GalleryFileUploader from "@/GalleryFileUploader";
import GalleryController from "@/GalleryController";
import GalleryState from "@/GalleryState";
import GalleryService from "@/GalleryService";
import GalleryView from "@/View/GalleryView";
import type {PreviewFit} from "@/types";

// Main function to create the widget
export function createGalleryWidget(options: {
    containerId: string;
    headers: Record<string, string>;
    ownerId: string;
    endpoints: { getImages: string; deleteImage: string; setNewSort: string; upload: string; setMainImage: string };
    formNames: Record<string, string>;
    imageScale?: number;
    previewFit?: PreviewFit; // Способ вписывания превью: 'cover' (заполнить) | 'contain' (вписать)
    maxWidth?: number; // Максимальная ширина изображения
    maxHeight?: number; // Максимальная высота изображения
}) {
    const dispatcher = new Dispatcher();
    const state = new GalleryState(
        options.maxWidth || 1920, // Значение по умолчанию
        options.maxHeight || 1080  // Значение по умолчанию
    );
    const service = new GalleryService(options.headers, options.endpoints, options.ownerId, options.formNames);
    const fileUploader = new GalleryFileUploader(
        options.endpoints.upload,
        options.headers,
        state,
        dispatcher,
        options.ownerId,
        options.formNames.uploadImageForm,
        3,
    );
    const view = new GalleryView(options.containerId, dispatcher, options.imageScale || 1.0, options.previewFit || 'cover');
    const controller = new GalleryController(state, view, service, fileUploader, dispatcher);
    controller.init();
}

// Пример запуска:
// document.addEventListener("DOMContentLoaded", () => {
//     createGalleryWidget({
//         containerId: 'gallery-container',
//         headers: {'Authorization': 'Bearer token'},
//         ownerId: '123e4567-e89b-12d3-a456-426614174000',
//         endpoints: {
//             getImages: '/api/getImages',
//             deleteImage: '/api/deleteImage',
//             setNewSort: '/api/setNewSort',
//             upload: '/api/upload'
//         },
//         formNames: {
//             uploadForm: 'AddImageForm',
//             getImagesForm: 'GetImagesForm',
//             deleteImageForm: 'DeleteImageForm',
//             setNewSortForm: 'SetNewSortForm'
//         },
//         maxWidth: 1920, // Максимальная ширина
//         maxHeight: 1080 // Максимальная высота
//     });
// });
