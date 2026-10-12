# Instrucciones de Deploy — InventaPro Backend

## PASO 1: Crear tablas en Supabase

1. Ve a https://supabase.com → tu proyecto
2. En el menú izquierdo: **SQL Editor**
3. Clic en **"New query"**
4. Copia y pega TODO el contenido del archivo `src/db/schema.sql`
5. Clic en **"Run"** (botón verde)
6. Deberías ver "Success. No rows returned"

---

## PASO 2: Subir el código a GitHub

1. Ve a https://github.com → botón verde "New" (nuevo repositorio)
2. Nombre: `inventapro-backend`
3. Privado ✓
4. Clic "Create repository"
5. GitHub te mostrará comandos. Comparte aquí el link del repo y yo subo el código.

---

## PASO 3: Deploy en Railway

1. Ve a https://railway.app → "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Elige `inventapro-backend`
4. Railway detecta automáticamente que es Node.js

### Variables de entorno en Railway:
En Railway → tu proyecto → "Variables" → agregar:

| Variable | Valor |
|---|---|
| DATABASE_URL | postgresql://postgres:Intermilan10!!@db.dzjepcbatqosghrfgbkn.supabase.co:5432/postgres |
| JWT_SECRET | inventapro_jwt_secret_2024_muy_seguro_xK9mP2nQ8rL5vW3 |
| NODE_ENV | production |

5. Railway hace el deploy automático
6. Te da una URL tipo: `https://inventapro-backend-production.up.railway.app`

---

## PASO 4: Verificar que funciona

Abre en el navegador:
```
https://TU-URL-RAILWAY.up.railway.app/health
```

Debes ver:
```json
{"status": "ok", "db": "conectada"}
```

---

## PASO 5: Conectar el frontend

Una vez que tengas la URL de Railway, compártela aquí y yo modifico el archivo
HTML de InventaPro para que use la API en lugar de localStorage.
