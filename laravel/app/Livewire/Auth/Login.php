<?php

namespace App\Livewire\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::guest')]
#[Title('Entrar')]
class Login extends Component
{
    public string $usuario = '';

    public string $senha = '';

    public bool $remember = false;

    public function authenticate()
    {
        $this->validate([
            'usuario' => ['required', 'string'],
            'senha' => ['required', 'string'],
        ]);

        $this->ensureIsNotRateLimited();

        if (! Auth::attempt([
            'usuario' => $this->usuario,
            'password' => $this->senha,
        ], $this->remember)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'usuario' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
        session()->regenerate();

        $user = Auth::user();

        return redirect()->intended(
            $user->isProfessora() ? route('dashboard.professora') : route('dashboard')
        );
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    protected function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout(request()));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'usuario' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    protected function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->usuario).'|'.request()->ip());
    }

    public function render()
    {
        return view('livewire.auth.login');
    }
}
