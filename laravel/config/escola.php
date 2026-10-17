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

    /*
    |--------------------------------------------------------------------------
    | Alertas de erro 5xx
    |--------------------------------------------------------------------------
    |
    | Erros 5xx disparam uma notificação para um webhook configurável (n8n,
    | Slack, etc.) sem edição de código: basta trocar ALERT_WEBHOOK_URL.
    | URL vazia ou entrega que falha NÃO é silêncio: o alerta cai no canal
    | de log `alertas` (criado em config/logging.php). Todos os números usam
    | `?:` (como BACKUP_RETENTION_DAYS) para um ALERT_* vazio não virar 0 e
    | desligar timeouts/deduplicação.
    |
    */

    'alertas' => [

        // Vazio/ausente = fallback para o log; "sem canal" é um estado legítimo,
        // então aqui NÃO há default com `?:` — é um env sem valor padrão.
        'webhook_url' => env('ALERT_WEBHOOK_URL'),

        // Timeout TOTAL da entrega em segundos.
        'webhook_timeout' => (int) (env('ALERT_WEBHOOK_TIMEOUT') ?: 5),

        // Timeout de CONEXÃO em segundos: sem ele, um host que não responde
        // prende o worker até o timeout total.
        'webhook_connect_timeout' => (int) (env('ALERT_WEBHOOK_CONNECT_TIMEOUT') ?: 2),

        // Janela de deduplicação, em minutos: o MESMO erro (status + classe +
        // rota) é avisado uma vez por janela.
        'dedup_minutos' => (int) (env('ALERT_DEDUP_MINUTES') ?: 10),

        // Teto global de alertas por hora (erro distintos); o excedente vai
        // para o canal de log em vez de virar enxurrada.
        'max_por_hora' => (int) (env('ALERT_MAX_PER_HOUR') ?: 30),

        // Canal de log do fallback (config/logging.php). Nome de canal não é
        // segredo nem precisa de configurabilidade, então fica aqui.
        'canal_log' => 'alertas',

    ],

];
