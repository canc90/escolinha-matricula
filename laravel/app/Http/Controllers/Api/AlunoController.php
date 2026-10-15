<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlunoResource;
use App\Models\Aluno;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AlunoController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $alunos = Aluno::query()
            ->with('turmaVinculada')
            ->when($request->filled('busca'), fn ($query) => $query->where('nome', 'like', '%'.$request->string('busca').'%'))
            ->when($request->filled('turma_id'), fn ($query) => $query->where('turma_id', $request->integer('turma_id')))
            ->orderBy('nome')
            ->paginate($request->integer('per_page', 25));

        return AlunoResource::collection($alunos);
    }

    public function show(Aluno $aluno): AlunoResource
    {
        return new AlunoResource($aluno->load('turmaVinculada'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $aluno = Aluno::create($data);
        Audit::log('create', 'alunos', $aluno->id, null, $aluno->toArray());

        return (new AlunoResource($aluno))->response()->setStatusCode(201);
    }

    public function update(Request $request, Aluno $aluno): AlunoResource
    {
        $before = $aluno->toArray();
        $aluno->update($this->validated($request));
        Audit::log('update', 'alunos', $aluno->id, $before, $aluno->fresh()->toArray());

        return new AlunoResource($aluno);
    }

    public function destroy(Aluno $aluno): JsonResponse
    {
        $aluno->delete();
        Audit::log('delete', 'alunos', $aluno->id, $aluno->toArray());

        return response()->json(['message' => 'Aluno removido.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'data_nascimento' => ['nullable', 'date'],
            'genero' => ['nullable', 'string', 'max:50'],
            'cpf_aluno' => ['nullable', 'string', 'max:14'],
            'turma_id' => ['nullable', 'exists:turmas,id'],
            'turno' => ['nullable', 'string', 'max:50'],
            'nome_mae' => ['nullable', 'string', 'max:255'],
            'contato_mae' => ['nullable', 'string', 'max:100'],
            'nome_pai' => ['nullable', 'string', 'max:255'],
            'contato_pai' => ['nullable', 'string', 'max:100'],
            'email_aluno' => ['nullable', 'email', 'max:255'],
        ]);
    }
}
