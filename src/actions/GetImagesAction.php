<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Besnovatyj\Images\base\BaseImage;
use Besnovatyj\Images\contracts\ImageOwnerInterface;
use Throwable;
use Yii;
use yii\base\Action;
use yii\web\Response;

/**
 * Standalone action получения списка изображений.
 *
 * Возвращает изображения владельца в формате, ожидаемом TypeScript-виджетом
 * (интерфейс ServerImage). Используется виджетом при инициализации
 * для отображения уже загруженных изображений.
 *
 * Ожидает POST-параметры: GetImagesForm[id].
 *
 * @property string   $imageClass        FQCN класса-потомка BaseImage
 * @property callable $ownerResolver     callable(int $id): ImageOwnerInterface
 * @property string   $previewThumbProfile Профиль миниатюры для previewUrl (по умолчанию 'thumb')
 */
class GetImagesAction extends Action
{
    use ActionTrait;

    /** @var string FQCN класса-потомка BaseImage */
    public string $imageClass;

    /**
     * Callable для получения ImageOwnerInterface по ID владельца.
     *
     * @var callable
     */
    public $ownerResolver;

    /**
     * Профиль миниатюры UploadBehavior для поля previewUrl.
     *
     * Должен совпадать с одним из ключей getThumbProfiles() в imageClass.
     */
    public string $previewThumbProfile = 'thumb';

    /**
     * Возвращает список изображений в формате ServerImage для виджета.
     *
     * @return array{status: string, data?: array<int, array>, message?: string}
     * @throws Throwable
     */
    public function run(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (!$this->isAjax()) {
            return $this->requireAjax();
        }

        try {
            $ownerId = (int) Yii::$app->request->post('GetImagesForm')['id'];

            /** @var ImageOwnerInterface $owner */
            $owner = ($this->ownerResolver)($ownerId);

            /** @var class-string<BaseImage> $imageClass */
            $imageClass = $this->imageClass;
            $images     = $imageClass::find()
                ->andWhere([$imageClass::getParentAttributeName() => $ownerId])
                ->orderBy(['sort' => SORT_ASC])
                ->all();

            $data = [];
            foreach ($images as $image) {
                /** @var BaseImage $image */
                $data[$image->id] = [
                    'kind'       => 'server',
                    'id'         => $image->id,
                    'sort'       => $image->sort,
                    'fileName'   => $image->file,
                    // Пока превью не создано, previewUrl указывает на оригинал, а виджет
                    // по previewReady показывает статус и перезапрашивает список.
                    'previewUrl'   => $image->getThumbUrl('file', $this->previewThumbProfile),
                    'previewReady' => $image->hasThumb('file', $this->previewThumbProfile),
                    'srcUrl'       => $image->getUploadUrl('file'),
                    'isMain'     => $image->id === $owner->getMainImageId(),
                ];
            }

            return ['status' => 'success', 'data' => $data];
        } catch (Throwable $e) {
            return $this->errorResponse($e);
        }
    }
}
