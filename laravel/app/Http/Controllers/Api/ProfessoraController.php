<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProfessoraResource;
use App\Models\Professora;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProfessoraController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $professoras = Professora::query()
            ->when($request->filled('busca'), fn ($query) => $query->where('nome', 'like', '%'.$request->string('busca').'%'))
            ->orderBy('nome')
            ->paginate($request->integer('per_page', 25));

        return ProfessoraResource::collection($professoras);
    }

    public function show(Professora $professora): ProfessoraResource
    {
        return new ProfessoraResource($professora->load('turmas'));
    }

    public function store(Request $request): JsonResponse
    {
        $professora = Professora::create($this->validated($request));
        Audit::log('create', 'professoras', $professora->id, null, $professora->toArray());

        return (new ProfessoraResource($professora))->response()->setStatusCode(201);
    }

    public function update(Request $request, Professora $professora): ProfessoraResource
    {
        $before = $professora->toArray();
        $professora->update($this->validated($request));
        Audit::log('update', 'professoras', $professora->id, $before, $professora->fresh()->toArray());

        return new ProfessoraResource($professora);
    }

    public function destroy(Professora $professora): JsonResponse
    {
        $professora->delete();
        Audit::log('delete', 'professoras', $professora->id, $professora->toArray());

        return response()->json(['message' => 'Professora removida.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:254'],
            'telefone' => ['nullable', 'string', 'max:50'],
            'especialidade' => ['nullable', 'string', 'max:255'],
            'rg' => ['nullable', 'string', 'max:20'],
            'cpf' => ['nullable', 'string', 'max:14'],
            'turno' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
