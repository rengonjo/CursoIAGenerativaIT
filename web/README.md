# Interfaz de Ágora electoral

Svelte 5 + TypeScript con Vite. Sigue el diseño de `../maquetas.html` y obtiene
todas las respuestas y los documentos del servidor Python.

## Arranque

En una terminal, desde la raíz del proyecto:

```powershell
uv run servidor.py
```

En otra terminal, desde la raíz:

```powershell
cd web
npm.cmd run dev
```

Abrir **http://127.0.0.1:5173/**. El puerto 8000 debe estar disponible para Python.
Si `uv` no está en el PATH, consultar el README de la raíz para añadir
`%USERPROFILE%\.local\bin` a la terminal actual.

## Pantallas

- `#/chat`: conversación con cuatro preguntas sugeridas, historial, citas
  pulsables bajo cada respuesta y aviso cuando el servidor indica `no_consta`.
- `#/documentos`: biblioteca obtenida de la API, con búsqueda por título,
  identificador o contenido, filtros por tipo, ordenación y descarga.
- `#/documentos/DOC-002?fragmento=guia-resultados`: documento completo,
  fragmento citado resaltado y pestaña con sus fragmentos individuales.

La navegación conserva la conversación en memoria. Recargar la página o pulsar
«Nueva conversación» la reinicia. No se guarda el historial en almacenamiento
persistente del navegador. Enter envía; Mayús+Enter añade un salto de línea.
Se puede cancelar o reintentar una consulta y volver al chat después de abrir
una fuente. El historial enviado contiene como máximo los últimos diez pares
de pregunta y respuesta, según los límites de la API.

## Comunicación con Python

El cliente solo realiza `GET /api/documentos` y `POST /api/preguntar`.
El proxy de desarrollo de `vite.config.ts` reenvía `/api` a
`http://127.0.0.1:8000`. Las citas y el detalle se construyen con los datos
recibidos de esas rutas; no se incluyen respuestas de ejemplo en el cliente.
Las preguntas sugeridas se envían realmente al servidor.

Vite tiene `envDir: false`: no lee archivos `.env`. La clave solo la carga
Python en el servidor; no hay llamadas del navegador al proveedor ni se envía
una cabecera de autorización desde la interfaz. Los textos del servidor se
renderizan como texto de Svelte, sin insertar HTML del modelo.

Un fallo de red, una respuesta inválida o HTTP 503 se muestran como errores de
consulta y permiten reintentar. Solo una respuesta válida con estado `no_consta`
activa el aviso de falta de evidencia. Las descargas contienen únicamente los
datos ficticios ya recibidos de la API.

## Archivos principales

- `src/App.svelte`: navegación, conversación y biblioteca.
- `src/lib/api.ts`: tipos del contrato, validación y peticiones a `/api`.
- `src/lib/Answer.svelte`: respuestas, citas y aviso de falta de evidencia.
- `src/lib/DocumentView.svelte`: lectura de documentos y fragmentos.
- `src/lib/Icon.svelte`: iconos SVG locales, sin librerías adicionales.
- `src/app.css`: estilo de la maqueta y adaptación a portátil y móvil.

## Comprobaciones

```powershell
npm.cmd run check
npm.cmd run build
```

Se han comprobado en el navegador las cuatro consultas contra el RAG real,
la apertura de citas y conservación del historial, búsqueda, filtros,
ordenación, cancelación, reintentos y estados de error; también la adaptación
de 390 a 1366 píxeles. Las pruebas de error usaron respuestas interceptadas
solo en el navegador de pruebas; no hay un modo simulado en la aplicación.

`npm run build` genera `dist/`; el proxy `/api` pertenece al servidor de
**desarrollo**, así que `npm run preview` por sí solo no lo sustituye.

## Si el puerto 8000 está ocupado

Se puede mantener la otra aplicación en marcha y usar 8001 para esta API.
Desde la raíz, en la primera terminal:

```powershell
uv run python -m uvicorn servidor:app --host 127.0.0.1 --port 8001
```

En otra terminal:

```powershell
cd web
$env:AGORA_API_PORT = '8001'
npm.cmd run dev
```

Abrir http://127.0.0.1:5173/. `AGORA_API_PORT` solo configura el proxy de Vite;
no se incluye en el código del navegador. Sin esa variable, el destino de la
API sigue siendo el puerto 8000. En Windows se utiliza `python -m uvicorn`
para evitar problemas con el lanzador `uvicorn.exe`.
