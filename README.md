# Ágora Electoral

Aplicación web que responde preguntas sobre una colección documental mediante RAG y muestra las fuentes y sus fragmentos bajo cada respuesta. Si no encuentra evidencia suficiente, responde «No consta en la documentación disponible».

Los datos son **ficticios**, proceden de [maquetas.html](maquetas.html) y están en [documentos/documentos.json](documentos/documentos.json): cuatro documentos y once fragmentos. Las fechas electorales son parte del ejercicio, no información oficial.

## Arranque local

Requisitos: Python 3.14, uv, Node.js y npm. Copia `.env.example` a `.env` si no existe y configura `OPENAI_API_KEY` (y `HTTPS_PROXY` si tu red lo necesita). La clave solo se usa en el servidor.

Primera terminal, desde la raíz:

```powershell
uv sync --locked
uv run servidor.py
```

Segunda terminal:

```powershell
cd web
npm.cmd ci
npm.cmd run dev
```

Abre **http://127.0.0.1:5173/**. Vite reenvía `/api` al servidor Python en el puerto 8000.

Si el puerto 8000 está ocupado, arranca el servidor con `uv run python -m uvicorn servidor:app --host 127.0.0.1 --port 8001` y, antes de ejecutar Vite en PowerShell, establece `$env:AGORA_API_PORT = '8001'`.

El servidor usa FastAPI, un índice de embeddings persistente en `data/rag/indice.npz`, `text-embedding-3-small` y el modelo generativo `gpt-6-luna`. Los modelos se pueden configurar desde `.env`. El índice se genera en el primer arranque y no se incluye en Git.

## Preguntas comprobadas

1. ¿Qué día y en qué horario se celebran las próximas elecciones generales en España? → 29/11/2026, de 09:00 a 20:00, hora local; citas de DOC-001 y DOC-002.
2. ¿A partir de qué hora se podrán conocer los primeros resultados reales? → Desde las 21:00 peninsulares, provisionales y con horario orientativo; cita de DOC-002.
3. Una vez proclamados los resultados oficiales, ¿cuándo se constituyen las nuevas Cortes? → 22/12/2026 a las 10:00; cita de DOC-003.
4. ¿Quién va a gobernar tras las próximas elecciones generales? → No consta; sin fuentes ni llamada al modelo generativo.

Las preguntas se enviaron desde la interfaz. Se verificaron las citas frente a la colección y se guardaron las respuestas en [capturas/resultados.json](capturas/resultados.json).

## Entregable y comprobaciones

**[Abrir entregable.pdf](entregable.pdf)** — nueve páginas A4 con portada, cinco capturas, contraste de fuentes y arquitectura. También está disponible [entregable.html](entregable.html); conserva la carpeta `capturas/` junto a él.

Con la aplicación arrancada, para regenerar las evidencias desde la raíz (requiere Microsoft Edge instalado; no descarga navegadores):

```powershell
node web/capturas.mjs
node web/entregable.mjs
```

Comprobaciones del código:

```powershell
uv run python -m unittest discover -s tests -v
cd web
npm.cmd run check
npm.cmd run build
```

`.env`, entornos, dependencias, bases de datos e índice local están excluidos mediante `.gitignore`.
