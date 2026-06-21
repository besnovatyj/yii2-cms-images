<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Besnovatyj\Images\base\BaseImage;
use Besnovatyj\Images\contracts\ImageOwnerInterface;
use DomainException;
use Throwable;
use Yii;
use yii\base\Action;
use yii\web\Response;

/**
 * Standalone action установки главного изображения.
 *
 * Проверяет что изображение принадлежит владельцу,
 * затем обновляет main_image_id и сохраняет владельца.
 *
 * Ожидает POST-параметры: SetMainImageForm[id], SetMainImageForm[imageId].
 *
 * @property string   $imageClass    FQCN класса-потомка BaseImage
 * @property callable $ownerResolver callable(int $id): ImageOwnerInterface
 */
class SetMainImageAction extends Action
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
     * Устанавливает главное изображение.
     *
     * @return array{status: string, message?: string, data?: array}
     * @throws Throwable
     */
    public function run(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (!$this->isAjax()) {
            return $this->requireAjax();
        }

        try {
            $ownerId = (int) Yii::$app->request->post('SetMainImageForm')['id'];
            $imageId = (int) Yii::$app->request->post('SetMainImageForm')['imageId'];

            /** @var class-string<BaseImage> $imageClass */
            $imageClass   = $this->imageClass;
            $imageExists  = $imageClass::find()
                ->andWhere(['id' => $imageId, $imageClass::getParentAttributeName() => $ownerId])
                ->exists();

            if (!$imageExists) {
                throw new DomainException('Image not found in this owner.');
            }

            /** @var ImageOwnerInterface $owner */
            $owner = ($this->ownerResolver)($ownerId);
            $owner->setMainImageId($imageId);
            $owner->saveOwner();

            return ['status' => 'success'];
        } catch (Throwable $e) {
            return $this->errorResponse($e);
        }
    }
}
