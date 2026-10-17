<?php

namespace App\Contracts;

/**
 * Grava o dump completo do banco de dados configurado.
 *
 * Existe como interface para que o comando de backup possa ser testado sem um
 * servidor MySQL de verdade (os testes trocam o binding por um dublê).
 */
interface DatabaseDumper
{
    /**
     * Grava o dump do banco no caminho informado.
     *
     * @throws \RuntimeException quando o dump falha
     */
    public function dump(string $sqlFilePath): void;
}
