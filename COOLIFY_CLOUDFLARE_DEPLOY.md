# Deploy En Coolify + Cloudflare Tunnel + Zero Trust

Dominio objetivo: `ccr.albertoreyes.cl`

## 1) Preparar variables de entorno

1. En Coolify, crea variables del proyecto (basadas en `.env.production.example`):
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS=ccr.albertoreyes.cl`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://ccr.albertoreyes.cl`
- `DJANGO_DEBUG=False`
- `DJANGO_PRODUCTION=True`
- `DJANGO_ENABLE_ADMIN=False`
- `DJANGO_SECURE_SSL_REDIRECT=True`
- `DJANGO_SECURE_HSTS_SECONDS=31536000`
- `DJANGO_SESSION_COOKIE_SECURE=True`
- `DJANGO_CSRF_COOKIE_SECURE=True`

2. No uses usuarios demo ni fixtures en este despliegue.

## 2) Crear app en Coolify

1. Tipo: `Docker Compose`.
2. Archivo compose: [docker-compose.coolify.yml](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/docker-compose.coolify.yml)
3. Servicio público: `nginx` puerto `80`.
4. Dominio en Coolify: `ccr.albertoreyes.cl`.
5. Deploy inicial.

Notas:
- Este compose está preparado para usar **Postgres gestionado por Coolify** vía variables (`POSTGRES_HOST`, `POSTGRES_USER`, etc.).
- El servicio `db` quedó con perfil `local-db` solo como respaldo local, no se levanta por defecto en Coolify.

## 3) Configurar Cloudflare Tunnel

1. Crea/usa túnel en Cloudflare Zero Trust.
2. Si usas CLI de `cloudflared` (modo remoto administrado), agrega DNS del túnel:

```bash
cloudflared tunnel route dns srv-car-tunnel ccr.albertoreyes.cl
```

Esto crea/actualiza el registro DNS para que el hostname use el túnel.
3. En el túnel agrega hostname:
- Hostname: `ccr.albertoreyes.cl`
- Service type: `HTTP`
- URL destino: `http://<IP_SERVIDOR_COOLIFY>:80` (o al entrypoint de Coolify si usas proxy interno).
4. Activa el túnel y verifica que el DNS quede apuntando al túnel.

## 4) Configurar Zero Trust Access

1. Access > Applications > Add application.
2. Tipo: Self-hosted.
3. Dominio: `ccr.albertoreyes.cl`.
4. Política:
- Allow: correos de tu organización o grupo definido.
- Deny: todo lo demás.
5. Opcional: MFA obligatorio.

## 5) Pruebas obligatorias

1. Login normal.
2. Login con clave incorrecta repetida (debe limitar).
3. Refresco de sesión.
4. CRUD básico de pacientes según rol.
5. Importación de planilla.
6. Egresos / Mis Pacientes / Llamados.

## 6) Notas importantes

- Si aparece loop de redirección HTTPS, revisa que el proxy pase `X-Forwarded-Proto=https`.
- El admin (`/admin`) está bloqueado por defecto en [nginx.coolify.conf](/C:/Users/INFORMATICA%20CAR/Documents/GitHub/ListaEsperaCCR/nginx/nginx.coolify.conf).
- Si necesitas admin, publícalo en subdominio aparte y protegido con política Access más estricta.
