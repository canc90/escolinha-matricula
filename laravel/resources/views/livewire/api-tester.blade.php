<div x-data="apiTester()" data-base-url="{{ $baseUrl }}">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h3 class="mb-0"><i class="bi bi-plug"></i> Testar API</h3>
        <span class="badge" :class="token ? 'text-bg-success' : 'text-bg-secondary'"
              x-text="token ? ('token ativo' + (user ? ' — ' + user.name : '')) : 'sem token'"></span>
    </div>
    <p class="text-muted small">
        Ferramenta de diagnóstico. As chamadas saem deste navegador para
        <code x-text="baseUrl"></code> e mostram o status e o JSON retornado — sem precisar de curl ou console.
    </p>

    <div class="row g-3">
        <div class="col-lg-5">
            {{-- 1. Login --}}
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-white"><i class="bi bi-key"></i> 1. Login — <code>POST /login</code></div>
                <div class="card-body">
                    <div class="mb-2">
                        <label class="form-label small mb-1">Usuário</label>
                        <input type="text" class="form-control form-control-sm" x-model="form.usuario" placeholder="admin">
                    </div>
                    <div class="mb-2">
                        <label class="form-label small mb-1">Senha</label>
                        <input type="password" class="form-control form-control-sm" x-model="form.senha"
                               x-on:keydown.enter="login()">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small mb-1">device_name</label>
                        <input type="text" class="form-control form-control-sm" x-model="form.device_name">
                    </div>
                    <div class="d-grid gap-2">
                        <button type="button" class="btn btn-primary btn-sm" x-on:click="login()" x-bind:disabled="loading">
                            <i class="bi bi-box-arrow-in-right"></i> Entrar e obter token
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" x-show="token" x-on:click="logout()">
                            <i class="bi bi-box-arrow-left"></i> Revogar token (logout)
                        </button>
                    </div>

                    <template x-if="token">
                        <div class="alert alert-success small mt-3 mb-0">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <strong><i class="bi bi-check-circle"></i> Token emitido</strong>
                                <button type="button" class="btn btn-sm btn-link p-0 small" x-on:click="copiarToken()">
                                    <i class="bi bi-clipboard"></i> copiar
                                </button>
                            </div>
                            <code class="text-break" x-text="token"></code>
                        </div>
                    </template>
                </div>
            </div>

            {{-- 2. Rotas rápidas --}}
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-white"><i class="bi bi-lightning"></i> 2. Rotas rápidas</div>
                <div class="card-body d-flex flex-wrap gap-2">
                    @foreach ([
                        ['GET', '/me'],
                        ['GET', '/dashboard'],
                        ['GET', '/alunos'],
                        ['GET', '/professoras'],
                        ['GET', '/turmas'],
                        ['GET', '/alerts'],
                        ['POST', '/alerts/gerar'],
                    ] as [$metodo, $caminho])
                        <button type="button" class="btn btn-sm {{ $metodo === 'GET' ? 'btn-outline-primary' : 'btn-outline-warning' }}"
                                x-on:click="send('{{ $metodo }}', '{{ $caminho }}')">
                            <span class="badge text-bg-dark me-1">{{ $metodo }}</span><code>{{ $caminho }}</code>
                        </button>
                    @endforeach
                </div>
                <div class="card-footer bg-white small text-muted">
                    Sem token, as rotas protegidas retornam <strong>401</strong> — comportamento esperado.
                </div>
            </div>

            {{-- 3. Requisição personalizada --}}
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-sliders"></i> 3. Requisição personalizada</div>
                <div class="card-body">
                    <div class="row g-2 mb-2">
                        <div class="col-4">
                            <select class="form-select form-select-sm" x-model="customMethod">
                                <option>GET</option>
                                <option>POST</option>
                                <option>PUT</option>
                                <option>PATCH</option>
                                <option>DELETE</option>
                            </select>
                        </div>
                        <div class="col-8">
                            <input type="text" class="form-control form-control-sm" x-model="customPath"
                                   placeholder="/alunos/1">
                        </div>
                    </div>
                    <textarea class="form-control form-control-sm font-monospace mb-2" rows="4" x-model="customBody"
                              placeholder='Corpo JSON (opcional), ex.: {"nome": "Aluno Teste"}'></textarea>
                    <div class="d-grid">
                        <button type="button" class="btn btn-dark btn-sm" x-on:click="custom()">
                            <i class="bi bi-send"></i> Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {{-- Resposta --}}
        <div class="col-lg-7">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-terminal"></i> Resposta</span>
                    <span class="badge" :class="statusClass" x-text="result ? (result.status + ' ' + result.statusText) : '—'"></span>
                </div>
                <div class="card-body">
                    <template x-if="!result">
                        <p class="text-muted mb-0 small">
                            Nenhuma chamada ainda. Faça login e clique em uma rota para ver a resposta em JSON.
                        </p>
                    </template>
                    <template x-if="result">
                        <div>
                            <div class="small text-muted mb-2">
                                <span class="badge text-bg-dark" x-text="result.method"></span>
                                <code x-text="result.url"></code>
                                <span class="ms-2"><i class="bi bi-stopwatch"></i> <span x-text="result.ms"></span> ms</span>
                            </div>
                            <pre class="bg-dark text-light p-3 rounded small mb-0" style="max-height: 60vh; overflow: auto;" x-text="result.body"></pre>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    window.apiTester = function () {
        return {
            baseUrl: '',
            form: { usuario: '', senha: '', device_name: 'painel-teste' },
            token: '',
            user: null,
            loading: false,
            result: null,
            customMethod: 'GET',
            customPath: '/alunos',
            customBody: '',

            init() {
                this.baseUrl = this.$el.dataset.baseUrl;
                this.token = sessionStorage.getItem('api-tester-token') || '';
                this.user = JSON.parse(sessionStorage.getItem('api-tester-user') || 'null');
            },

            get statusClass() {
                if (!this.result) {
                    return 'text-bg-secondary';
                }

                const status = this.result.status;

                if (status >= 200 && status < 300) return 'text-bg-success';
                if (status === 0 || status === 401 || status === 403) return 'text-bg-warning';
                if (status >= 400) return 'text-bg-danger';

                return 'text-bg-secondary';
            },

            async login() {
                this.loading = true;

                try {
                    const response = await this.send('POST', '/login', this.form, false);

                    if (response.ok) {
                        const data = JSON.parse(response.raw);
                        this.token = data.token;
                        this.user = data.user;
                        sessionStorage.setItem('api-tester-token', this.token);
                        sessionStorage.setItem('api-tester-user', JSON.stringify(this.user));
                    }
                } finally {
                    this.loading = false;
                }
            },

            async logout() {
                if (this.token) {
                    await this.send('POST', '/logout');
                }

                this.token = '';
                this.user = null;
                sessionStorage.removeItem('api-tester-token');
                sessionStorage.removeItem('api-tester-user');
            },

            async custom() {
                let body = null;

                if (this.customBody.trim() !== '') {
                    try {
                        body = JSON.parse(this.customBody);
                    } catch (error) {
                        this.result = {
                            method: this.customMethod,
                            url: this.baseUrl + this.customPath,
                            status: 0,
                            statusText: 'JSON inválido',
                            ok: false,
                            ms: 0,
                            body: 'O corpo precisa ser um JSON válido.\n\n' + error.message,
                            raw: '',
                        };

                        return;
                    }
                }

                await this.send(this.customMethod, this.customPath, body);
            },

            async send(method, path, body = null, autenticado = true) {
                const url = this.baseUrl + path;
                const headers = { Accept: 'application/json' };
                const temCorpo = body !== null && method !== 'GET';

                if (temCorpo) {
                    headers['Content-Type'] = 'application/json';
                }

                if (autenticado && this.token) {
                    headers['Authorization'] = 'Bearer ' + this.token;
                }

                const inicio = performance.now();

                try {
                    const response = await fetch(url, {
                        method,
                        headers,
                        body: temCorpo ? JSON.stringify(body) : undefined,
                    });

                    const raw = await response.text();

                    this.result = {
                        method,
                        url,
                        status: response.status,
                        statusText: response.statusText || (response.status === 0 ? 'Falha de rede' : ''),
                        ok: response.ok,
                        ms: Math.round(performance.now() - inicio),
                        body: this.formatar(raw),
                        raw,
                    };
                } catch (error) {
                    this.result = {
                        method,
                        url,
                        status: 0,
                        statusText: 'Falha de rede',
                        ok: false,
                        ms: Math.round(performance.now() - inicio),
                        body: String(error),
                        raw: '',
                    };
                }

                return this.result;
            },

            formatar(raw) {
                if (!raw) {
                    return '(corpo vazio)';
                }

                try {
                    return JSON.stringify(JSON.parse(raw), null, 2);
                } catch (error) {
                    return raw;
                }
            },

            copiarToken() {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(this.token);
                }
            },
        };
    };
</script>
