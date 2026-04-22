# Checklist De Publicación (Público)

Este checklist está orientado a este repo (`Django + Next + Nginx + Docker`) y es de tipo `GO/NO-GO`.

## 1) Pre-Deploy (Obligatorio)

- [ ] Crear `.env.production` desde [.env.production.example](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/.env.production.example).
- [ ] Cambiar `DJANGO_SECRET_KEY`.
- [ ] Cambiar `POSTGRES_PASSWORD`.
- [ ] Configurar `DJANGO_ALLOWED_HOSTS` con tu dominio real.
- [ ] Configurar `DJANGO_CSRF_TRUSTED_ORIGINS` con `https://tu-dominio`.
- [ ] Confirmar `DJANGO_DEBUG=False`.
- [ ] Confirmar `DJANGO_ENABLE_ADMIN=False` (recomendado para público).
- [ ] No usar fixtures demo en producción.

## 2) Certificados Y Red

- [ ] Cargar certificados TLS en `nginx/certs/`:
  - `fullchain.pem`
  - `privkey.pem`
- [ ] Abrir solo puertos `80/443` en firewall.
- [ ] Bloquear acceso externo directo a DB/Redis/Backend.
- [ ] Verificar resolución DNS del dominio al servidor.

## 3) Despliegue

- [ ] Levantar stack productivo:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- [ ] Verificar estado:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f backend
```

## 4) Endurecimiento Activo En Este Repo

- [ ] `Django` con settings de seguridad en [settings.py](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/backend/config/settings.py):
  - `SECURE_SSL_REDIRECT`
  - `SESSION_COOKIE_SECURE`
  - `CSRF_COOKIE_SECURE`
  - `HSTS`
  - `X_FRAME_OPTIONS`
  - `DRF throttling`
- [ ] `Auth throttling` para login/refresh en:
  - [auth_views.py](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/backend/apps/usuarios/auth_views.py)
  - [auth_urls.py](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/backend/apps/usuarios/auth_urls.py)
- [ ] Cookies frontend con `httpOnly + secure + sameSite=lax` en:
  - [actions.ts](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/frontend/app/actions.ts)
  - [middleware.ts](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/frontend/middleware.ts)
- [ ] Nginx productivo con TLS, headers y rate-limit en:
  - [nginx.prod.conf](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/nginx/nginx.prod.conf)

## 5) Validaciones Funcionales

- [ ] Login válido/inválido.
- [ ] Refresh token funcionando.
- [ ] Permisos por rol (`KINE`, `ADMINISTRATIVO`, `ADMIN`).
- [ ] Carga de tablas críticas: lista de espera, mis pacientes, llamados, egresos.
- [ ] Importación de archivo y validación de duplicados.
- [ ] Generación/descarga de reportes.

## 6) Validaciones De Seguridad

- [ ] `https://tu-dominio` responde con certificado válido.
- [ ] `http://tu-dominio` redirige a HTTPS.
- [ ] `/admin/` retorna `403` (o está protegido por VPN/allowlist).
- [ ] No hay credenciales demo activas.
- [ ] Fuerza bruta de login limitada (429 al exceder).

## 7) Operación Continua

- [ ] Backup diario de Postgres.
- [ ] Prueba de restauración de backup (al menos mensual).
- [ ] Logs centralizados (Nginx + Backend).
- [ ] Alertas mínimas: caídas del contenedor, error rate alto, disco bajo.
- [ ] Plan de rollback: tag de imagen anterior + backup válido.

## 8) Criterio GO / NO-GO

- `GO`: todas las secciones 1, 2, 3 y 6 completas.
- `NO-GO`: falta TLS, hay credenciales por defecto, o `DEBUG=True`.
