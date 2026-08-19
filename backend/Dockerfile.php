FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install mysqli mbstring \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY . /var/www/html

EXPOSE 8080

# Railway menyediakan PORT ketika container dijalankan. Server bawaan PHP
# cukup untuk endpoint API dan file materi MatHeal tanpa konfigurasi Apache.
CMD ["/bin/sh", "-c", "exec php -S 0.0.0.0:${PORT:-8080} -t /var/www/html"]
