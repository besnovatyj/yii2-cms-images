<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Besnovatyj\Images\base\BaseImage;
use Throwable;
use Yii;
use yii\base\Action;
use yii\helpers\Json;
use yii\web\Response;

/**
 * Standalone action обновления порядка сортировки изображений.
 *
 * Принимает новый порядок сортировки от виджета и обновляет
 * поле sort для каждого изображения в рамках транзакции.
 *
 * Ожидает POST-параметры: SetNewSortForm[id], SetNewSortForm[sortOrder] (JSON).
 *
 * @property string   $imageClass    FQCN класса-потомка BaseImage
 * @property callable $ownerResolver callable(int $id): ImageOwnerInterface (не используется здесь,
 *                                   но передаётся из ImageActionsMap для единообразия)
 */
class SetNewSortAction extends Action
{
    use ActionTrait;

    /** @var string FQCN класса-потомка BaseImage */
    public string $imageClass;

    /**
     * Callable для получения ImageOwnerInterface по ID владельца.
     * Принимается для единообразия конфигурации, в данном action не используется.
     *
     * @var callable
     */
    public $ownerResolver;

    /**
     * Обновляет порядок сортировки изображений.
     *
     * @return array{status: string, message?: string}
     */
    public function run(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (!$this->isAjax()) {
            return $this->requireAjax();
        }

        $ownerId   = (int) Yii::$app->request->post('SetNewSortForm')['id'];
        $sortJson  = Yii::$app->request->post('SetNewSortForm')['sortOrder'];

        /** @var class-string<BaseImage> $imageClass */
        $imageClass = $this->imageClass;

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $sortOrder = Json::decode($sortJson);

            $sortMap = [];
            foreach ($sortOrder as $item) {
                $sortMap[$item['id']] = $item['sort'];
            }

            $images = $imageClass::find()
                ->andWhere([$imageClass::getParentAttributeName() => $ownerId])
                ->all();

            foreach ($images as $image) {
                /** @var BaseImage $image */
                if (isset($sortMap[$image->id])) {
                    $image->sort = $sortMap[$image->id];
                    if (!$image->save()) {
                        throw new \RuntimeException('Failed to save image ID ' . $image->id);
                    }
                }
            }

            $transaction->commit();
            return ['status' => 'success'];
        } catch (Throwable $e) {
            $transaction->rollBack();
            return $this->errorResponse($e);
        }
    }
}
