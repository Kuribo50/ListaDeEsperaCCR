# Deploy Con Dockerfile En Coolify (Sin Docker Compose)

Este proyecto se despliega más simple en **2 aplicaciones**:

1. `backend` (Django, puerto 8000)
2. `frontend` (Next.js, puerto 3000)

Además usa recursos gestionados por Coolify:

- PostgreSQL
- Redis

## 1) Crear recurso Postgres en Coolify

- No público.
- Variables (ejemplo):
  - `POSTGRES_DB=lista_espera_ccr`
  - `POSTGRES_USER=ccr_app`
  - `POSTGRES_PASSWORD=<password-seguro>`

## 2) Crear recurso Redis en Coolify

- No público.

## 3) Crear app backend (Dockerfile)

- Source: tu repo GitHub.
- Branch: `main`.
- Build Pack: `Dockerfile`.
- Base Directory: `backend`
- Dockerfile Location: `Dockerfile`
- Port: `8000`

Variables mínimas backend:

- `DJANGO_ENV=production`
- `DJANGO_PRODUCTION=True`
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY=<secret-largo>`
- `DJANGO_ALLOWED_HOSTS=<tu-dominio>`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://<tu-dominio>`
- `DJANGO_ENABLE_ADMIN=False`
- `DJANGO_DB_ENGINE=postgres`
- `DJANGO_CACHE_BACKEND=redis`
- `POSTGRES_DB=<db>`
- `POSTGRES_USER=<user>`
- `POSTGRES_PASSWORD=<password>`
- `POSTGRES_HOST=<host-interno-postgres-coolify>`
- `POSTGRES_PORT=5432`
- `REDIS_HOST=<host-interno-redis-coolify>`
- `REDIS_PORT=6379`
- `DJANGO_SECURE_SSL_REDIRECT=True`
- `DJANGO_SESSION_COOKIE_SECURE=True`
- `DJANGO_CSRF_COOKIE_SECURE=True`

## 4) Crear app frontend (Dockerfile)

- Source: tu repo GitHub.
- Branch: `main`.
- Build Pack: `Dockerfile`.
- Base Directory: `frontend`
- Dockerfile Location: `Dockerfile`
- Port: `3000`

Variables mínimas frontend:

- `NODE_ENV=production`
- `NEXT_PUBLIC_API_PROXY=1`
- `NEXT_API_PROXY_TARGET=https://<url-backend-coolify>`
- `BACKEND_INTERNAL_URL=https://<url-backend-coolify>`

Notas:

- El frontend usa `/api/*` y lo proxea al backend con `NEXT_API_PROXY_TARGET`.
- En producción, pon el dominio final en frontend y backend.

## 5) Dominio público + Cloudflare Tunnel

- Publica solo el frontend con tu dominio final.
- Si usas Tunnel/Zero Trust, apunta el hostname al frontend.
- Backend puede quedar público o restringido según tu arquitectura.

## 6) Orden recomendado de deploy

1. Deploy Postgres y Redis.
2. Deploy backend.
3. Deploy frontend.
4. Probar login, tablas, llamados, egresos, importación.
