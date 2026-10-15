<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'usuario' => ['required', 'string'],
            'senha' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
