<?php


/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

declare(strict_types=1);

namespace Besnovatyj\Images\forms;

use yii\base\Model;
use yii\web\UploadedFile;

/**
 * Форма загрузки одного изображения.
 *
 * Используется UploadImageAction. Имя формы фиксировано ('AddImageForm'),
 * так как виджет отправляет именно это имя — изменение потребует пересборки TypeScript.
 *
 * @property UploadedFile|null $file Загруженный файл
 * @property int|null          $id   ID владельца (gallery_id, person_id и т.д.)
 */
class UploadImageForm extends Model
{
    public UploadedFile|null $file = null;
    public int|null $id = null;

    /**
     * {@inheritdoc}
     *
     * Фиксированное имя формы — виджет всегда отправляет 'AddImageForm'.
     * NB: Claude обманывает, в виджете `\Besnovatyj\Images\widgets\upload\Widget` можно настроить имена всех форм, только там это ещё не вынесено в свойство класса.
     */
    public function formName(): string
    {
        return 'AddImageForm';
    }

    /**
     * {@inheritdoc}
     */
    public function rules(): array
    {
        return [
            [['file', 'id'], 'required'],
            // TODO Добавить проверку MIME-типа - MimeCheckHelper?
            ['id', 'integer'],
            [
                ['file'],
                'image',
                'skipOnEmpty'  => true,
                // 'checkExtensionByMimeType' => false,
                // https://github.com/yiisoft/yii2/issues/17839
                'extensions'   => 'png jpg jpeg webp heic heif',
                'mimeTypes'    => 'image/*',
                'minWidth'     => 100,
                'maxWidth'     => 7000,
                'minHeight'    => 100,
                'maxHeight'    => 7000,
            ],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function beforeValidate(): bool
    {
        if (parent::beforeValidate()) {
            $this->file = UploadedFile::getInstance($this, 'file');
            return true;
        }
        return false;
    }
}
