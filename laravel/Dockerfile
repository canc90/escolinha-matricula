FROM php:8.4-cli-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libonig-dev \
        libxml2-dev \
        libicu-dev \
        default-mysql-client \
        sqlite3 \
        libsqlite3-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        pdo_sqlite \
        mbstring \
        zip \
        bcmath \
        gd \
        intl \
        exif \
        pcntl \
        opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Limites de upload/memória adequados ao processamento de imagens (fotos de celular).
RUN printf '%s\n' \
    'memory_limit=512M' \
    'upload_max_filesize=10M' \
    'post_max_size=12M' \
    'max_execution_time=120' \
    > /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html

EXPOSE 8000
