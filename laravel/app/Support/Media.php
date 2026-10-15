<?php

namespace App\Support;

use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Image;
use Illuminate\Support\Facades\Storage;

/**
 * Armazenamento de arquivos enviados (fotos e documentos) no disco público.
 */
class Media
{
    /**
     * Redimensiona, converte para JPEG e armazena uma foto de perfil enviada.
     */
    public static function storePhoto(UploadedFile $file, string $directory, ?string $previous = null): string
    {
        return static::persistPhoto(Image::fromUpload($file), $directory, $previous);
    }

    /**
     * Redimensiona e armazena uma foto de perfil a partir de um arquivo local.
     */
    public static function storePhotoFromPath(string $source, string $directory, ?string $previous = null): string
    {
        return static::persistPhoto(Image::fromPath($source), $directory, $previous);
    }

    /**
     * Armazena um documento enviado, substituindo o anterior quando existir.
     */
    public static function storeDocument(UploadedFile $file, string $directory, ?string $previous = null): string
    {
        static::delete($previous);

        return $file->storePublicly($directory, 'public');
    }

    /**
     * Armazena um documento a partir de um arquivo local, preservando o nome.
     */
    public static function storeDocumentFromPath(string $source, string $directory, ?string $previous = null): string
    {
        static::delete($previous);

        return (string) Storage::disk('public')->putFileAs($directory, new File($source), basename($source));
    }

    /**
     * Remove um arquivo previamente armazenado no disco público.
     */
    public static function delete(?string $path): void
    {
        if (filled($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Aplica o recorte padrão (quadrado) e codifica a foto em JPEG.
     */
    private static function persistPhoto(\Illuminate\Image\Image $image, string $directory, ?string $previous): string
    {
        static::delete($previous);

        return $image->cover(400, 400)
            ->toJpeg()
            ->quality(85)
            ->storePublicly($directory, 'public');
    }
}
