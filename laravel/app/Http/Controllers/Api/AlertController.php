<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use App\Services\RiskEngine;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AlertController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $alerts = Alert::query()
            ->with(['turma', 'aluno'])
            ->when($request->filled('resolved'), fn ($query) => $query->where('resolved', $request->boolean('resolved')))
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 25));

        return AlertResource::collection($alerts);
    }

    /**
     * Gera alertas de frequência para turmas em risco.
     */
    public function gerar(RiskEngine $engine): JsonResponse
    {
        $gerados = $engine->gerarAlertas();
        Audit::log('generate', 'alerts', null, null, ['gerados' => $gerados]);

        return response()->json(['gerados' => $gerados]);
    }

    /**
     * Marca um alerta como resolvido.
     */
    public function resolver(Request $request, Alert $alert): AlertResource
    {
        $alert->update([
            'resolved' => true,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        Audit::log('resolve', 'alerts', $alert->id);

        return new AlertResource($alert->load(['turma', 'aluno']));
    }
}
