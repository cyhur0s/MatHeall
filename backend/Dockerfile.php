FROM php:8.3-apache

RUN docker-php-ext-install mysqli mbstring \
    && a2enmod headers rewrite \
    && sed -ri 's!^Listen 80$!Listen 8080!' /etc/apache2/ports.conf \
    && sed -ri 's!<VirtualHost \*:80>!<VirtualHost *:8080>!' /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html
COPY . /var/www/html

EXPOSE 8080
