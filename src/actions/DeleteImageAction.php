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
 * Standalone action удаления изображения.
 *
 * Находит изображение среди изображений владельца, удаляет его
 * (UploadBehavior автоматически удаляет файл и миниатюры),
 * и обновляет main_image_id если удалённое было главным.
 *
 * Ожидает POST-параметры: DeleteImageForm[id], DeleteImageForm[imageId].
 *
 * @property string   $imageClass    FQCN класса-потомка BaseImage
 * @property callable $ownerResolver callable(int $id): ImageOwnerInterface
 */
class DeleteImageAction extends Action
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
     * Обрабатывает удаление изображения.
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

        $ownerId  = (int) Yii::$app->request->post('DeleteImageForm')['id'];
        $imageId  = (int) Yii::$app->request->post('DeleteImageForm')['imageId'];

        $transaction = Yii::$app->db->beginTransaction();
        try {
            /** @var ImageOwnerInterface $owner */
            $owner = ($this->ownerResolver)($ownerId);

            $imageToDelete = null;
            foreach ($owner->getOwnedImages() as $image) {
                if ($image->isIdEqualTo($imageId)) {
                    $imageToDelete = $image;
                    break;
                }
            }

            if ($imageToDelete === null) {
                throw new DomainException('Image is not found.');
            }

            if (!$imageToDelete->delete()) {
                throw new \RuntimeException('Failed to delete image.');
            }

            // Обновляем main_image_id только если удалённое изображение было главным
            if ($owner->getMainImageId() === $imageToDelete->id) {
                /** @var class-string<BaseImage> $imageClass */
                $imageClass  = $this->imageClass;
                $firstImage  = $imageClass::find()
                    ->andWhere([$imageClass::getParentAttributeName() => $ownerId])
                    ->orderBy(['sort' => SORT_ASC])
                    ->one();

                $owner->setMainImageId($firstImage?->id);
                $owner->saveOwner();
            }

            $transaction->commit();
            return ['status' => 'success'];
        } catch (Throwable $e) {
            $transaction->rollBack();
            return $this->errorResponse($e);
        }
    }
}
