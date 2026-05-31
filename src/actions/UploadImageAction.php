<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\actions;

use Besnovatyj\Images\base\BaseImage;
use Besnovatyj\Images\contracts\ImageOwnerInterface;
use Besnovatyj\Images\forms\UploadImageForm;
use Throwable;
use Yii;
use yii\base\Action;
use yii\web\Response;

/**
 * Standalone action загрузки одного изображения.
 *
 * Обрабатывает Fetch POST-запрос от виджета загрузки.
 * Открывает транзакцию, применяет pessimistic lock через ownerResolver
 * (для Gallery — реальная блокировка, для других модулей — no-op),
 * сохраняет изображение и обновляет main_image_id если он ещё не установлен.
 *
 * Регистрация в контроллере:
 * ```php
 * public function actions(): array {
 *     return ImageActionsMap::get(
 *         Photo::class,
 *         fn(int $id) => new PersonImageOwner($this->persons->get($id), $this->persons),
 *     );
 * }
 * ```
 *
 * @property string   $imageClass    FQCN класса-потомка BaseImage
 * @property callable $ownerResolver callable(int $id): ImageOwnerInterface
 */
class UploadImageAction extends Action
{
    use ActionTrait;

    /** @var string FQCN класса-потомка BaseImage */
    public string $imageClass;

    /**
     * Callable для получения ImageOwnerInterface по ID владельца.
     *
     * Сигнатура: function(int $ownerId): ImageOwnerInterface
     *
     * @var callable
     */
    public $ownerResolver;

    /**
     * Обрабатывает загрузку изображения.
     *
     * @return array{status: string, message?: string, data?: array}
     * @throws Throwable
     */
    public function run(): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (!$this->isFetchRequest()) {
            return $this->requireFetchRequest();
        }

        $form = new UploadImageForm();

        if (!$form->load(Yii::$app->request->post()) || !$form->validate()) {
            return [
                'status'  => 'error',
                'message' => 'Validation error',
                'data'    => ['message' => implode('; ', array_merge(...array_values($form->getErrors())))],
            ];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            /** @var ImageOwnerInterface $owner */
            $owner = ($this->ownerResolver)($form->id);

            // Блокировка строки владельца (SELECT FOR UPDATE) перед созданием изображения.
            // Исключает race condition при параллельной загрузке нескольких файлов:
            // без блокировки несколько запросов одновременно видят main_image_id = null
            // и пытаются его установить, что приводит к FK constraint violation.
            // Для модулей без параллельной загрузки lockOwner() — no-op.
            $owner->lockOwner();
            $owner->refreshOwner();

            /** @var class-string<BaseImage> $imageClass */
            $imageClass = $this->imageClass;
            $image = $imageClass::make($owner->getOwnerId(), $form->file);

            $maxSort = $imageClass::find()
                ->andWhere([$imageClass::getParentAttributeName() => $owner->getOwnerId()])
                ->max('sort');
            $image->setSort($maxSort !== null ? (int) $maxSort + 1 : 0);

            if (!$image->save()) {
                throw new \RuntimeException('Failed to save image.');
            }

            // Устанавливаем первое загруженное изображение как главное
            if ($owner->getMainImageId() === null) {
                $owner->setMainImageId($image->id);
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
