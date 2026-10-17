<?php

namespace App\Contracts;

/**
 * Compacta e descompacta diretórios de arquivos.
 *
 * Existe como interface para que os comandos de backup e de restauração possam
 * ser testados sem depender de um binário externo.
 */
interface FileArchiver
{
    /**
     * Compacta todo o conteúdo do diretório de origem no arquivo informado.
     */
    public function create(string $sourceDir, string $archivePath): void;

    /**
     * Descompacta o arquivo no diretório de destino.
     */
    public function extract(string $archivePath, string $destinationDir): void;

    /**
     * Lista os nomes das entradas do arquivo, uma por item.
     *
     * Usado para recusar entradas com `..` ou caminho absoluto antes de extrair.
     *
     * @return array<int, string>
     */
    public function list(string $archivePath): array;
}
