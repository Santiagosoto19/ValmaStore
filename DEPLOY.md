# Desplegar Valma en GitHub + Vercel + Neon

## Requisitos

- Cuenta en [GitHub](https://github.com)
- Cuenta en [Vercel](https://vercel.com)
- Base de datos en [Neon](https://neon.tech) (ya configurada)
- Node.js 18+ en tu PC

## 1. Preparar el repositorio Git (solo carpeta `valma`)

**Importante:** Tu Git actual está en `C:\Users\Fiury` (carpeta de usuario). El proyecto debe tener su **propio** repositorio dentro de `valma`, no en la carpeta padre.

Abre PowerShell:

```powershell
cd C:\Users\Fiury\valma
git init
git add .
git status
```

Verifica que **NO** aparezcan estos archivos (deben estar ignorados):

- `.env` (secretos)
- `node_modules/`
- `public/images/products/*` (imágenes subidas localmente)

Crea el primer commit:

```powershell
git commit -m "Valma: tienda e-commerce con panel admin"
```

## 2. Subir a GitHub

1. En GitHub → **New repository** → nombre ej. `valma-tienda` → **sin** README (ya existe en el proyecto).
2. Conecta y sube:

```powershell
git branch -M main
git remote add origin https://github.com/TU_USUARIO/valma-tienda.git
git push -u origin main
```

Reemplaza `TU_USUARIO` y el nombre del repo por los tuyos.

## 3. Variables de entorno en Vercel

El archivo `.env` **no se sube a GitHub**. Debes copiar las mismas variables en Vercel.

En el [Dashboard de Vercel](https://vercel.com/dashboard) → tu proyecto → **Settings** → **Environment Variables**, agrega:

| Variable | Valor | Notas |
|----------|-------|-------|
| `DATABASE_URL` | Cadena de conexión de Neon | La misma que tienes en `.env` local |
| `JWT_SECRET` | Secreto largo y aleatorio | **No** uses el de ejemplo |
| `JWT_EXPIRES_IN` | `24h` | Opcional |
| `WHATSAPP_NUMBER` | ej. `573001234567` | Sin espacios ni `+` |
| `BASE_URL` | `https://tu-app.vercel.app` | URL final de Vercel (sin `/` al final) |
| `CLOUDINARY_CLOUD_NAME` | De tu dashboard Cloudinary | Para subir imágenes desde el admin |
| `CLOUDINARY_API_KEY` | De tu dashboard Cloudinary | |
| `CLOUDINARY_API_SECRET` | De tu dashboard Cloudinary | |
| `NODE_ENV` | `production` | Vercel suele setearlo solo |

Marca las variables para **Production** (y Preview si quieres).

## 4. Conectar Vercel con GitHub

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Selecciona el repo `valma-tienda`
3. Framework: **Other** (es Express, no Next.js)
4. Root Directory: `.` (raíz del repo)
5. Build Command: déjalo vacío
6. Output Directory: déjalo vacío
7. **Deploy**

El archivo `vercel.json` y `api/index.js` ya redirigen todo el tráfico a Express.

## 5. Después del deploy

1. Copia la URL que te da Vercel (ej. `https://valma-tienda.vercel.app`)
2. Actualiza `BASE_URL` en Vercel con esa URL exacta
3. Redeploy (Deployments → ⋮ → Redeploy)

Prueba:

- Tienda: `https://tu-app.vercel.app/`
- Admin: `https://tu-app.vercel.app/admin`
- API: `https://tu-app.vercel.app/api/health`

Admin por defecto (si ya ejecutaste `node scripts/ensure-admin.js` contra Neon):

- Email: `admin@valma.com`
- Contraseña: `admin123` (cámbiala en producción)

## 6. Base de datos Neon

- La conexión va en `DATABASE_URL` (con `?sslmode=require` al final si Neon lo pide).
- Los datos ya están en Neon si migraste el dump.
- Para resetear admin en Neon desde tu PC:

```powershell
cd C:\Users\Fiury\valma
node scripts/ensure-admin.js admin123
```

(Asegúrate de que tu `.env` local apunte a Neon.)

## Imágenes de productos (Cloudinary)

El admin puede arrastrar imágenes y se suben a **Cloudinary** (gratis hasta cierto límite).

### Configurar Cloudinary

1. Crea cuenta en [cloudinary.com](https://cloudinary.com)
2. En **Dashboard** copia: Cloud Name, API Key, API Secret
3. Agrégalos en tu `.env` local y en **Vercel → Environment Variables**:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

4. Redeploy en Vercel

### Flujo

```
Admin arrastra imagen → API sube a Cloudinary → guarda URL https://res.cloudinary.com/... en Neon → tienda la muestra
```

Si **no** configuras Cloudinary, en local las imágenes se guardan en `public/images/products/`. En Vercel sin Cloudinary las subidas **no persisten**.

También puedes pegar una **URL externa** manualmente en el formulario de producto.

## Flujo de trabajo recomendado

```
Código (GitHub)  →  Vercel despliega automáticamente
Variables (.env) →  Solo en Vercel Dashboard (nunca en Git)
Datos            →  Neon PostgreSQL (siempre en la nube)
```

Cada `git push` a `main` vuelve a desplegar en Vercel.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| Error de conexión a BD | Revisa `DATABASE_URL` en Vercel; debe incluir SSL |
| Login no guarda sesión | Confirma `BASE_URL` y que usas HTTPS en producción |
| Imágenes rotas | Usa URLs externas o configura `BASE_URL` correcto |
| 404 en rutas | Verifica que existan `vercel.json` y `api/index.js` |
| Admin lento al inicio | Normal con Neon (cold start + latencia de red) |
