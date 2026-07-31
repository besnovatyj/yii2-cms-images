/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {icons} from "@/View/icons";
import type {PreviewFit, ServerImage} from "@/types";

/**
 * Фабрика плиток серверных изображений.
 *
 * Плитка «чистая»: она несёт только индикацию состояния, а не кнопки действий
 * (действия живут в тулбаре, панели массовых действий и инспекторе). На плитке есть:
 *   - `<img>` превью;
 *   - бейдж «Обложка» на главном изображении (статус, а не таргет для клика);
 *   - большая центральная полупрозрачная галочка выбора (видна только в режиме selection,
 *     переключается CSS-классом режима на контейнере сетки в ImageGrid).
 *
 * Вся визуалка (цвета, анимации, видимость по режиму) — в Shadow CSS ImageGrid.
 * Фабрика отвечает только за структуру, data-атрибуты и классы состояния.
 */
export default class TileFactory {
    /**
     * Создать новую или обновить существующую плитку (in-place для эффективного ре-рендера).
     *
     * @param image      серверное изображение
     * @param previewFit способ вписывания превью ('cover' | 'contain')
     * @param selected   выбрана ли плитка в режиме selection
     * @param existing   существующий DOM-элемент плитки для обновления (иначе создаётся новый)
     */
    static createOrUpdate(
        image: ServerImage,
        previewFit: PreviewFit,
        selected: boolean,
        existing: HTMLElement | null = null
    ): HTMLElement {
        const tile = existing ?? TileFactory.build();
        tile.dataset.id = image.id.toString();
        tile.classList.toggle('is-selected', selected);
        tile.classList.toggle('is-main', image.isMain);
        tile.classList.toggle('fit-contain', previewFit === 'contain');

        TileFactory.updateImage(tile, image, previewFit);
        return tile;
    }

    /** Собрать «скелет» плитки один раз (без данных). */
    private static build(): HTMLElement {
        const tile = document.createElement('div');
        tile.className = 'tile';

        const img = document.createElement('img');
        img.draggable = false; // перетаскивание — забота SortableJS на уровне плитки
        img.className = 'tile__img';

        const badge = document.createElement('span');
        badge.className = 'tile__badge';
        badge.textContent = 'Обложка';

        const check = document.createElement('span');
        check.className = 'tile__check';
        check.innerHTML = icons.check(20);

        tile.append(img, badge, check);
        return tile;
    }

    /** Обновить src/alt превью (у серверных изображений ObjectURL не используется). */
    private static updateImage(tile: HTMLElement, image: ServerImage, previewFit: PreviewFit): void {
        const img = tile.querySelector('img.tile__img') as HTMLImageElement;
        if (img.getAttribute('src') !== image.previewUrl) {
            img.src = image.previewUrl;
        }
        img.alt = image.fileName;
        img.style.objectFit = previewFit;
    }
}
