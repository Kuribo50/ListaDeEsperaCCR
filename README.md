# ListaEsperaCCR

Sistema de gestion de lista de espera CCR con Django REST (backend), Next.js (frontend) y Docker Compose.

## Stack

- Backend: Django 5 + DRF + SimpleJWT
- Frontend: Next.js App Router + TypeScript + Tailwind
- Infra local: PostgreSQL + Redis + Nginx

## Estructura

```text
ListaEsperaCCR/
├── backend/
├── frontend/
├── nginx/
├── docker-compose.yml
├── Makefile
└── README.md
```

## Requisitos

- Docker
- Docker Compose
- Make

## Variables de entorno

Variables principales requeridas en `.env`:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `REDIS_HOST`, `REDIS_PORT`
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `DJANGO_DB_ENGINE`, `DJANGO_CACHE_BACKEND`
- `NEXT_PUBLIC_API_BASE_URL`
- `BACKEND_INTERNAL_URL`

Para desarrollo local sin Docker puedes usar `SQLite`:

- `DJANGO_DB_ENGINE=sqlite`
- `SQLITE_PATH=backend/db.sqlite3` (opcional, si quieres ruta personalizada)
- `DJANGO_CACHE_BACKEND=locmem`

## Levantar proyecto con Docker

```powershell
make up
make migrate
make loaddata
```

Servicios definidos en `docker-compose.yml`:

- `db`
- `redis`
- `backend`
- `frontend`
- `nginx`

Accesos:

- Frontend: `http://localhost/`
- API: `http://localhost/api/`
- Admin Django: `http://localhost/admin/`

## Comandos Make disponibles

- `make up`
- `make down`
- `make migrate`
- `make loaddata`
- `make shell`
- `make logs`

## Credenciales iniciales

Fixture: `backend/fixtures/initial_data.json`

- 4 kines: `11111111K`, `22222222K`, `33333333K`, `44444444K`
- 1 admin: `66666666K`
- Password fixture: `Ccr2025*`

Usuario administrativo demo adicional (opcional):

```powershell
docker-compose exec backend python manage.py generar_usuarios_demo
```

## Roles del sistema

- `KINE`
- `ADMINISTRATIVO`
- `ADMIN`

Resumen funcional:

- `KINE`: asignarse pacientes libres, gestionar estados clinicos y revisar historial.
- `ADMINISTRATIVO`: registrar llamados, confirmar asistencia (`INGRESADO`) en pacientes con kine asignado, importacion de derivaciones.
- `ADMIN`: acceso total, incluyendo gestion de usuarios.

## Autenticacion JWT

Endpoints:

- `POST /api/auth/login/` (body: `{ rut, password }`)
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`

Flujo implementado:

- Login devuelve `access` + `refresh`.
- Frontend guarda tokens en cookies `httpOnly` (`access-token`, `refresh-token`).
- Middleware de Next protege rutas y refresca token si expiro.
- Cliente API adjunta `Authorization: Bearer <access>`.

## Endpoints principales

Pacientes:

- `GET /api/pacientes/`
- `POST /api/pacientes/`
- `POST /api/pacientes/{id}/asignar/`
- `POST /api/pacientes/{id}/cambiar-estado/`
- `POST /api/pacientes/{id}/registrar-llamado/`
- `GET /api/pacientes/{id}/historial/`

Importacion:

- `POST /api/importar/derivaciones/`

Reportes:

- `GET /api/reportes/resumen/`
- `GET /api/reportes/por-kine/`

Usuarios:

- `GET /api/usuarios/`
- `POST /api/usuarios/`
- `PATCH /api/usuarios/{id}/`

## Importacion Excel de derivaciones

Parser: `backend/apps/importar/parser.py`

Soporta:

- Formato antiguo con columna `PERCAPITA`
- Formato nuevo con columna `DESDE`
- Deteccion de formato nuevo por:
  - Columna B vacia
  - Columna F con centro valido (`CAR`, `CST`, `CCEQ`, `CCE`, `CES`, `HT`, `TMT`, `FST`, `HLH`, `TMT HT`, `FST HT`, `CEQ`, `CESFAM`, `CECOSF`, `SANTO`)

Normalizaciones:

- Prioridad (`ALTA GES`, `MDORADA`, `MODERDA`, etc.)
- Fechas en `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY` o serial Excel

Reglas:

- Duplicados por `RUT + fecha_derivacion`
- `mayor_60` se calcula automaticamente desde edad

Respuesta del endpoint:

```json
{
  "total": 0,
  "importados": 0,
  "duplicados": 0,
  "errores": [
    { "fila": 0, "motivo": "..." }
  ]
}
```

## Crear usuarios desde Admin Django

1. Entrar a `http://localhost/admin/`
2. Iniciar sesion con un usuario `ADMIN`
3. Ir a `Usuarios`
4. Crear usuario con `rut`, `nombre`, `rol` y password

## Notas de desarrollo

- Nginx usa `nginx/nginx.conf`.
- `make loaddata` carga `backend/fixtures/initial_data.json`.
- Si `next lint` falla por configuracion de ESLint en tu entorno, el build de Next igualmente compila y la app levanta.
