<?php

namespace App\Contracts;

/**
 * Aplica um script SQL no banco de dados configurado.
 *
 * Existe como interface para que o comando de restauração possa ser testado sem
 * um servidor MySQL de verdade (os testes trocam o binding por um dublê que
 * aplica o mesmo SQL no SQLite em memória).
 */
interface DatabaseRestorer
{
    /**
     * Aplica o script SQL do caminho informado no banco configurado.
     *
     * @throws \RuntimeException quando a restauração falha
     */
    public function restore(string $sqlFilePath): void;
}
