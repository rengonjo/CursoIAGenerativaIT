# Ágora electoral

Base local del proyecto final del curso: servidor Python con FastAPI y una
interfaz Vite + Svelte + TypeScript. Las maquetas originales están en
`maquetas.html` y se pueden abrir directamente en el navegador.

El proyecto incluye una API de salud para verificar la conexión con Vite.
La interfaz conserva la plantilla inicial de Svelte; el asistente RAG y la
base de datos se desarrollarán en los siguientes pasos. Los datos electorales
de las maquetas son ficticios.

## Requisitos

- Python 3.14, seleccionado en `.python-version`.
- uv. En este equipo está en `%USERPROFILE%\.local\bin\uv.exe`.
- Node.js y npm. La preparación se ha realizado con Node.js 24.20.0 y npm 11.19.0.

En PowerShell, si `uv` no aparece en el PATH, se puede añadir a la terminal actual:

```powershell
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
```

Se usa `npm.cmd` en los ejemplos de Windows para evitar el bloqueo del lanzador
`npm.ps1`, sin modificar la política de ejecución de PowerShell.

## Configuración y dependencias

El `.env` existente se conserva y no se versiona. En una copia nueva del
repositorio, crear el archivo a partir del ejemplo solo si no existe:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Completar las variables necesarias en `.env`. FastAPI carga ese archivo con
`python-dotenv`. Durante esta preparación, `proxy` y `https-proxy` de npm se han
configurado en el perfil de usuario con el valor de `HTTPS_PROXY` del `.env`;
esa configuración pertenece al equipo y no se incluye en Git.

Las dependencias ya están instaladas. Para reproducir la instalación:

```powershell
# En la raíz del proyecto
uv sync --locked

# Dependencias de la interfaz
cd web
npm.cmd ci
```

Para añadir futuras dependencias Python, utilizar `uv add nombre-del-paquete`.
Se conservan `uv.lock` y `web/package-lock.json` en Git.

## Ejecutar en local

Abrir dos terminales en la raíz del proyecto.

Primera terminal, servidor Python:

```powershell
uv run --locked uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API de salud: <http://127.0.0.1:8000/api/health>
- Documentación de FastAPI: <http://127.0.0.1:8000/docs>

Segunda terminal, interfaz:

```powershell
cd web
npm.cmd run dev
```

Abrir <http://127.0.0.1:5173>. Vite usa un puerto fijo y solo escucha en la
interfaz local del equipo.

Las peticiones relativas a `/api` se reenvían desde Vite a
`http://127.0.0.1:8000`, conservando la ruta completa. Por ejemplo, una llamada
de la interfaz a `fetch('/api/health')` llega a FastAPI como `/api/health`.
Este proxy corresponde al servidor de desarrollo de Vite.

Para comprobarlo desde otra terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:5173/api/health
```

La respuesta esperada es `status: ok` y `service: agora-electoral-api`.
Detener ambos servidores con `Ctrl+C` en sus respectivas terminales.

## Comprobaciones de la interfaz

```powershell
cd web
npm.cmd run check
npm.cmd run build
```

`check` valida Svelte y TypeScript; `build` genera la compilación en `web/dist/`,
que está excluida de Git. No se realiza ningún despliegue.

## Estructura

```text
main.py                 Aplicación FastAPI y /api/health
pyproject.toml          Dependencias Python gestionadas con uv
uv.lock                 Versiones resueltas de Python
.python-version         Versión de Python del proyecto
.env.example            Variables de configuración, sin credenciales
.gitignore              Secretos, entornos, dependencias y bases de datos
maquetas.html           Maquetas autónomas con datos ficticios
web/                    Plantilla Svelte con TypeScript y Vite
  src/                  Código de la interfaz
  vite.config.ts        Configuración y proxy /api
  package-lock.json     Versiones resueltas de npm
data/                   Ubicación prevista de datos locales, excluida de Git
```

El servidor no crea todavía una base de datos ni realiza llamadas a OpenAI.

## Referencias

- [Proyectos con uv](https://docs.astral.sh/uv/concepts/projects/init/)
- [Proxy de desarrollo de Vite](https://vite.dev/config/server-options.html#server-proxy)
- [Configuración de npm](https://docs.npmjs.com/cli/v11/commands/npm-config/)
