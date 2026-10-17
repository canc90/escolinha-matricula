<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Backup
    |--------------------------------------------------------------------------
    |
    | O diretório de destino pode apontar para um bind mount do host em produção
    | (BACKUP_PATH), para que a cópia não fique presa dentro do volume Docker.
    | Em desenvolvimento o repositório inteiro é montado em /var/www/html, então
    | storage/app/backups já aparece no host sem configuração nenhuma.
    |
    */

    'backup' => [

        // Usa `?:` (e não env($chave, $padrao)) porque um BACKUP_PATH= vazio no
        // .env devolveria string vazia e quebraria o destino do backup.
        'caminho' => env('BACKUP_PATH') ?: storage_path('app/backups'),

        'retencao_dias' => (int) (env('BACKUP_RETENTION_DAYS') ?: 14),

        'conexao' => env('DB_CONNECTION', 'mysql'),

        // Caminhos dos binários, sobrescrevíveis para outros ambientes.
        'binarios' => [
            'mysqldump' => env('BACKUP_MYSQLDUMP_BINARY', 'mysqldump'),
            'mysql' => env('BACKUP_MYSQL_BINARY', 'mysql'),
            'tar' => env('BACKUP_TAR_BINARY', 'tar'),
        ],

    ],

];
