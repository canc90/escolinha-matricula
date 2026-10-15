<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TurmaResource;
use App\Models\Turma;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TurmaController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $turmas = Turma::query()
            ->withCount('alunos')
            ->orderBy('nome')
            ->paginate(request()->integer('per_page', 25));

        return TurmaResource::collection($turmas);
    }

    public function show(Turma $turma): TurmaResource
    {
        return new TurmaResource($turma->load('professoras')->loadCount('alunos'));
    }

    public function store(Request $request): JsonResponse
    {
        $turma = Turma::create($this->validated($request));
        Audit::log('create', 'turmas', $turma->id, null, $turma->toArray());

        return (new TurmaResource($turma))->response()->setStatusCode(201);
    }

    public function update(Request $request, Turma $turma): TurmaResource
    {
        $before = $turma->toArray();
        $turma->update($this->validated($request));
        Audit::log('update', 'turmas', $turma->id, $before, $turma->fresh()->toArray());

        return new TurmaResource($turma);
    }

    public function destroy(Turma $turma): JsonResponse
    {
        $turma->delete();
        Audit::log('delete', 'turmas', $turma->id, $turma->toArray());

        return response()->json(['message' => 'Turma removida.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'turno' => ['nullable', 'string', 'max:50'],
            'ano_letivo' => ['nullable', 'integer', 'digits:4'],
        ]);
    }
}
