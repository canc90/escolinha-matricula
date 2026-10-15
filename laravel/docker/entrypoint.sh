#!/bin/sh
set -e

log() {
    echo "[entrypoint] $*"
}

wait_for_db() {
    [ -n "${DB_HOST:-}" ] || return 0

    log "aguardando o banco em ${DB_HOST}:${DB_PORT:-3306}..."
    tentativa=0

    while ! php -r 'exit(@fsockopen(getenv("DB_HOST"), (int) (getenv("DB_PORT") ?: 3306)) ? 0 : 1);'; do
        tentativa=$((tentativa + 1))

        if [ "$tentativa" -ge 30 ]; then
            log "banco nao respondeu em 60s; seguindo mesmo assim"
            return 0
        fi

        sleep 2
    done
}

bootstrap() {
    if [ -z "${APP_KEY:-}" ]; then
        log "ERRO: APP_KEY nao definido."
        log "Gere uma chave com: docker compose -f docker-compose.prod.yml run --rm app php artisan key:generate --show"
        exit 1
    fi

    wait_for_db

    php artisan storage:link >/dev/null 2>&1 || true
    php artisan migrate --force
    php artisan package:discover --ansi
    php artisan optimize

    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

    log "aplicacao pronta."
}

case "${1:-serve}" in
    serve)
        bootstrap
        php-fpm -D
        exec nginx -g 'daemon off;'
        ;;
    *)
        exec "$@"
        ;;
esac
