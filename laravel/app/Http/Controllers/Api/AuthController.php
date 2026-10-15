<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Emite um token de API para as credenciais informadas.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('usuario', $request->validated('usuario'))->first();

        if (! $user || ! Hash::check($request->validated('senha'), $user->password)) {
            throw ValidationException::withMessages([
                'usuario' => [trans('auth.failed')],
            ]);
        }

        $token = $user->createToken($request->validated('device_name'))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Revoga o token utilizado na requisição atual.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    /**
     * Retorna o usuário autenticado pelo token.
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
