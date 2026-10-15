<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportSqlite extends Command
{
    protected $signature = 'escola:import-sqlite {--file=/old-db/database.sqlite}';

    protected $description = 'Importa os dados do banco SQLite do sistema antigo (Node) para o MySQL do Laravel';

    private \PDO $pdo;

    public function handle(): int
    {
        $file = $this->option('file');

        if (! is_file($file)) {
            $this->error("Arquivo não encontrado: {$file}");

            return self::FAILURE;
        }

        $this->pdo = new \PDO('sqlite:'.$file);
        $this->pdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $targets = [
            'alerts', 'frequencias', 'diario_classe', 'turma_professora', 'alunos',
            'logs', 'audit_logs', 'bi_snapshots', 'report_cache', 'users', 'turmas', 'professoras',
        ];

        Schema::disableForeignKeyConstraints();
        foreach ($targets as $t) {
            if (Schema::hasTable($t)) {
                DB::table($t)->truncate();
            }
        }
        Schema::enableForeignKeyConstraints();

        $this->info('Importando dados...');

        // professoras
        $this->import('professoras', 'professoras', fn ($r) => [
            'id' => $r['id'],
            'nome' => $r['nome'] ?? '',
            'email' => $r['email'] ?? null,
            'telefone' => $r['telefone'] ?? null,
            'especialidade' => $r['especialidade'] ?? null,
            'turma' => $r['turma'] ?? null,
            'turno' => $r['turno'] ?? null,
            'rg' => $r['rg'] ?? null,
            'cpf' => $r['cpf'] ?? null,
            'foto' => $r['foto'] ?? null,
            'foto_documento' => $r['foto_documento'] ?? null,
            'deleted_by' => $r['deleted_by'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
            'updated_at' => $r['updated_at'] ?? $r['created_at'] ?? now(),
            'deleted_at' => $this->deletedAt($r),
        ]);

        // turmas
        $this->import('turmas', 'turmas', fn ($r) => [
            'id' => $r['id'],
            'nome' => $r['nome'] ?? '',
            'turno' => $r['turno'] ?? null,
            'ano_letivo' => $r['ano_letivo'] ?? null,
            'deleted_by' => $r['deleted_by'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
            'updated_at' => $r['updated_at'] ?? $r['created_at'] ?? now(),
            'deleted_at' => $this->deletedAt($r),
        ]);

        // usuarios -> users
        $this->import('users', 'usuarios', fn ($r) => [
            'id' => $r['id'],
            'usuario' => $r['usuario'] ?? ('user'.$r['id']),
            'name' => $r['nome'] ?? $r['usuario'] ?? 'Usuário',
            'email' => $r['email'] ?? null,
            'password' => $this->bcryptHash($r['senha'] ?? ''),
            'role' => $r['role'] ?? 'admin',
            'token_version' => $r['token_version'] ?? 0,
            'professora_id' => $r['professora_id'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
            'updated_at' => $r['updated_at'] ?? $r['created_at'] ?? now(),
        ]);

        // turma_professora
        $this->import('turma_professora', 'turma_professora', fn ($r) => [
            'id' => $r['id'],
            'turma_id' => $r['turma_id'],
            'professora_id' => $r['professora_id'],
            'principal' => $r['principal'] ?? false,
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // alunos
        $this->import('alunos', 'alunos', fn ($r) => [
            'id' => $r['id'],
            'id_alu' => $r['id_alu'] ?? null,
            'nome' => $r['nome'] ?? null,
            'data_nascimento' => $this->date($r['data_nascimento'] ?? null),
            'genero' => $r['genero'] ?? null,
            'endereco_rua' => $r['endereco_rua'] ?? null,
            'endereco_bairro' => $r['endereco_bairro'] ?? null,
            'endereco_cidade' => $r['endereco_cidade'] ?? null,
            'nome_pai' => $r['nome_pai'] ?? null,
            'contato_pai' => $r['contato_pai'] ?? null,
            'nome_mae' => $r['nome_mae'] ?? null,
            'contato_mae' => $r['contato_mae'] ?? null,
            'email_aluno' => $r['email_aluno'] ?? null,
            'alergia_intolerancia' => (bool) ($r['alergia_intolerancia'] ?? false),
            'descricao_alergia' => $r['descricao_alergia'] ?? null,
            'usa_medicamento' => (bool) ($r['usa_medicamento'] ?? false),
            'necessita_atencao_medicamento' => (bool) ($r['necessita_atencao_medicamento'] ?? false),
            'autorizacao_fotos_redes' => (bool) ($r['autorizacao_fotos_redes'] ?? false),
            'autorizacao_passeios' => (bool) ($r['autorizacao_passeios'] ?? false),
            'aniversario_escola' => (bool) ($r['aniversario_escola'] ?? false),
            'observacoes_aniversario_escola' => $r['observacoes_aniversario_escola'] ?? null,
            'contato_emergencia_nome' => $r['contato_emergencia_nome'] ?? null,
            'contato_emergencia_telefone' => $r['contato_emergencia_telefone'] ?? null,
            'responsaveis_retirada' => $r['responsaveis_retirada'] ?? null,
            'pode_brincar_areia' => (bool) ($r['pode_brincar_areia'] ?? false),
            'turma' => $r['turma'] ?? null,
            'turno' => $r['turno'] ?? null,
            'turma_id' => $r['turma_id'] ?? null,
            'cpf_aluno' => $r['cpf_aluno'] ?? null,
            'cpf_pai' => $r['cpf_pai'] ?? null,
            'cpf_mae' => $r['cpf_mae'] ?? null,
            'foto' => $r['foto'] ?? null,
            'foto_documento' => $r['foto_documento'] ?? null,
            'deleted_by' => $r['deleted_by'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
            'updated_at' => $r['updated_at'] ?? $r['created_at'] ?? now(),
            'deleted_at' => $this->deletedAt($r),
        ]);

        // diario_classe
        $this->import('diario_classe', 'diario_classe', fn ($r) => [
            'id' => $r['id'],
            'turma_id' => $r['turma_id'],
            'professora_id' => $r['professora_id'] ?? null,
            'data' => $this->date($r['data'] ?? null),
            'conteudo_aula' => $r['conteudo_aula'] ?? null,
            'observacoes' => $r['observacoes'] ?? null,
            'deleted_by' => $r['deleted_by'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
            'updated_at' => $r['updated_at'] ?? $r['created_at'] ?? now(),
            'deleted_at' => $this->deletedAt($r),
        ]);

        // frequencias
        $this->import('frequencias', 'frequencias', fn ($r) => [
            'id' => $r['id'],
            'turma_id' => $r['turma_id'],
            'aluno_id' => $r['aluno_id'],
            'data' => $this->date($r['data'] ?? null),
            'presente' => (bool) ($r['presente'] ?? true),
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // logs
        $this->import('logs', 'logs', fn ($r) => [
            'id' => $r['id'],
            'user_id' => $r['user_id'] ?? null,
            'action' => $r['action'] ?? '',
            'entity' => $r['entity'] ?? null,
            'entity_id' => $r['entity_id'] ?? null,
            'details' => $r['details'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // audit_logs
        $this->import('audit_logs', 'audit_logs', fn ($r) => [
            'id' => $r['id'],
            'user_id' => $r['user_id'] ?? null,
            'role' => $r['role'] ?? null,
            'action' => $r['action'] ?? '',
            'entity' => $r['entity'] ?? null,
            'entity_id' => $r['entity_id'] ?? null,
            'payload_before' => $this->json($r['payload_before'] ?? null),
            'payload_after' => $this->json($r['payload_after'] ?? null),
            'ip_address' => $r['ip_address'] ?? null,
            'user_agent' => $r['user_agent'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // bi_snapshots
        $this->import('bi_snapshots', 'bi_snapshots', fn ($r) => [
            'id' => $r['id'],
            'tipo' => $r['tipo'] ?? '',
            'periodo' => $r['periodo'] ?? '',
            'dados' => $this->json($r['dados'] ?? '[]') ?? '[]',
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // report_cache
        $this->import('report_cache', 'report_cache', fn ($r) => [
            'id' => $r['id'],
            'key' => $r['key'] ?? ('cache'.$r['id']),
            'dados' => $this->json($r['dados'] ?? '{}') ?? '{}',
            'expires_at' => $r['expires_at'] ?? now(),
            'created_at' => $r['created_at'] ?? now(),
        ]);

        // alerts
        $this->import('alerts', 'alerts', fn ($r) => [
            'id' => $r['id'],
            'aluno_id' => $r['aluno_id'] ?? null,
            'turma_id' => $r['turma_id'] ?? null,
            'type' => $r['type'] ?? '',
            'severity' => $r['severity'] ?? 'LOW',
            'message' => $r['message'] ?? '',
            'details' => $this->json($r['details'] ?? null),
            'resolved' => (bool) ($r['resolved'] ?? false),
            'resolved_by' => $r['resolved_by'] ?? null,
            'resolved_at' => $r['resolved_at'] ?? null,
            'created_at' => $r['created_at'] ?? now(),
        ]);

        $this->info('Importação concluída.');

        return self::SUCCESS;
    }

    private function rows(string $table): array
    {
        try {
            return $this->pdo->query("SELECT * FROM {$table}")->fetchAll();
        } catch (\PDOException $e) {
            return [];
        }
    }

    private function import(string $target, string $source, callable $map): void
    {
        $rows = $this->rows($source);

        if (empty($rows)) {
            $this->line("  {$source}: 0 registros");

            return;
        }

        $count = 0;
        foreach (array_chunk($rows, 500) as $chunk) {
            $data = array_map($map, $chunk);
            DB::table($target)->insert($data);
            $count += count($data);
        }

        $this->line("  {$source} -> {$target}: {$count} registros");
    }

    /**
     * O bcrypt do Node usa o prefixo $2b$/$2a$; o PHP/Laravel espera $2y$.
     * São algoritmicamente idênticos, então apenas normalizamos o prefixo.
     */
    private function bcryptHash(string $value): string
    {
        if (preg_match('/^\$2[abx]\$/', $value)) {
            return '$2y$'.substr($value, 4);
        }

        return $value;
    }

    private function date($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = trim($value);

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
            return substr($value, 0, 10);
        }

        if (preg_match('#^(\d{2})/(\d{2})/(\d{4})$#', $value, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }

        $ts = strtotime($value);

        return $ts ? date('Y-m-d', $ts) : null;
    }

    private function deletedAt(array $row): ?string
    {
        if (! empty($row['deleted_at'])) {
            return $row['deleted_at'];
        }

        if (! empty($row['deleted'])) {
            return $row['updated_at'] ?? $row['created_at'] ?? now()->toDateTimeString();
        }

        return null;
    }

    private function json($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            json_decode($value);

            if (json_last_error() === JSON_ERROR_NONE) {
                return $value;
            }

            return json_encode($value);
        }

        return json_encode($value);
    }
}
