FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install mysqli mbstring \
    && a2dismod mpm_event mpm_worker 2>/dev/null || true \
    && a2enmod mpm_prefork headers rewrite \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY . /var/www/html

EXPOSE 8080

# Railway menentukan PORT saat container dijalankan. Apache harus mengikuti
# nilai tersebut agar endpoint healthcheck dapat dijangkau.
CMD ["/bin/sh", "-c", "port=\"${PORT:-8080}\"; sed -ri \"s!^Listen [0-9]+$!Listen ${port}!\" /etc/apache2/ports.conf; sed -ri \"s!<VirtualHost \\*:[0-9]+>!<VirtualHost *:${port}>!\" /etc/apache2/sites-available/000-default.conf; exec apache2-foreground"]
