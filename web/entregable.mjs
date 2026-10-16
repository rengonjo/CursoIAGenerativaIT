import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = JSON.parse(await fs.readFile(path.join(root, 'capturas/resultados.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles = ['Fecha y horario de votación', 'Primeros resultados del recuento', 'Constitución de las nuevas Cortes', 'Una pregunta sin evidencia'];
const conclusions = [
  'Sí. La fecha y las horas coinciden con ambos fragmentos, incluida la referencia a la hora local.',
  'Sí. Coinciden las 21:00 peninsulares y el carácter provisional y orientativo. No se presentan como resultados oficiales definitivos.',
  'Sí. Coinciden el 22 de diciembre de 2026 a las 10:00 y las sesiones de ambas Cámaras posteriores a la proclamación oficial.',
  'La colección no aporta una predicción sobre el futuro Gobierno. La respuesta se abstiene, no cita fuentes y modelo_utilizado es false: no se llamó al generador.'
];
const footer = '<footer>Ágora Electoral · Proyecto final · Datos ficticios de demostración</footer>';
const sheet = (content, cls = '') => '<section class="sheet ' + cls + '">' + content + footer + '</section>';
const date = new Date(evidence.fecha).toLocaleString('es-ES', {timeZone:'Europe/Madrid'});
let pages = [];
pages.push(sheet(`<div class="eyebrow">Proyecto final · Aplicación web con RAG</div><h1>Ágora<br>Electoral</h1><p class="subtitle">Un asistente sobre tu documentación</p><div class="rule"></div><h2>Qué problema resuelve</h2><p>Permite consultar documentación electoral con preguntas en lenguaje natural, sin tener que buscar manualmente en cada documento. Cada respuesta muestra los fragmentos que la justifican y, cuando no encuentra evidencia suficiente, indica que la información no consta.</p><h2>De dónde salen los datos</h2><p>La colección procede de los datos inventados de <a href="maquetas.html">maquetas.html</a>, copiados en <a href="documentos/documentos.json">documentos/documentos.json</a>: cuatro documentos o registros y once fragmentos.</p><p class="notice"><strong>Escenario ficticio de curso.</strong> Las fechas, horarios y documentos de este entregable sirven para demostrar la aplicación. No acreditan una convocatoria electoral real ni proceden de una fuente oficial.</p><p>Capturas realizadas el ${escape(date)}, a través de la interfaz local, en una ventana de 1366 × 900 píxeles.</p>`, 'cover'));
for (const [i, item] of evidence.consultas.entries()) {
  pages.push(sheet(`<div class="eyebrow">Captura ${i+1} de 5 · Conversación</div><h2>${escape(titles[i])}</h2><figure><img src="${escape(item.captura)}" alt="${escape(titles[i])}"><figcaption><strong>Figura ${i+1}.</strong> ${i < 3 ? 'Pregunta enviada desde el chat y respuesta real del servidor, con sus documentos y fragmentos citados debajo.' : 'La cuarta pregunta de la misma conversación recibe el aviso de que no consta y no tiene citas. Los fragmentos visibles arriba pertenecen a la respuesta anterior.'}</figcaption></figure><p class="question">${escape(item.pregunta)}</p><p><strong>Resultado:</strong> ${escape(item.respuesta)}</p>`));
}
pages.push(sheet(`<div class="eyebrow">Captura 5 de 5 · Colección documental</div><h2>Documentos disponibles</h2><figure><img src="capturas/05-documentos.png" alt="Listado de cuatro documentos y once fragmentos"><figcaption><strong>Figura 5.</strong> La página «Mis fuentes» muestra los cuatro documentos, sus tipos y el número de fragmentos. Incluye búsqueda por contenido, filtro por tipo y ordenación.</figcaption></figure><p>El listado procede de <code>GET /api/documentos</code>. Las respuestas se fundamentan en esta colección, que puede abrirse desde la interfaz.</p><ul>${evidence.documentos.documentos.map(d=>'<li><strong>'+escape(d.id)+'</strong> · '+escape(d.titulo)+' · '+d.numero_fragmentos+' fragmentos</li>').join('')}</ul>`));
for (const start of [0, 2]) {
  let content = `<div class="eyebrow">Validación · Consultas ${start+1} y ${start+2}</div><h2>Cómo lo comprobé</h2>`;
  if (start === 0) content += '<p>El script escribió las preguntas en la interfaz, esperó a la API y comprobó que el texto y las citas aparecieran en pantalla. Cada cita se contrastó literalmente con la colección recibida. Además, se revisó el significado de estas respuestas frente a los fragmentos reproducidos aquí.</p>';
  for (let i=start; i<start+2; i++) {
    const item = evidence.consultas[i];
    content += `<article class="case"><h3>${i+1}. ${escape(item.pregunta)}</h3><p><strong>Respuesta obtenida:</strong> ${escape(item.respuesta)}</p><p><strong>Contraste:</strong> ${escape(conclusions[i])}</p>`;
    if (item.fuentes.length) {
      content += '<p><strong>Fuentes que debes abrir para confirmarlo:</strong></p>';
      for (const s of item.fuentes) {
        const href = evidence.url.replace(/\/$/,'') + '/#/documentos/' + encodeURIComponent(s.documento_id) + '?fragmento=' + encodeURIComponent(s.fragmento_id);
        content += `<div class="reference"><p><a href="${escape(href)}">${escape(s.documento_id)} · ${escape(s.titulo)}</a><br><code>${escape(s.fragmento_id)}</code> · ${escape(s.ubicacion)}</p><blockquote>${escape(s.fragmento)}</blockquote></div>`;
      }
    } else content += '<p><strong>Qué revisar:</strong> abre los cuatro documentos de «Mis fuentes» y comprueba que ninguno contiene una predicción de Gobierno. En <code>capturas/resultados.json</code>, la cuarta consulta tiene <code>fuentes: []</code> y <code>modelo_utilizado: false</code>. Esto acredita la abstención de esta ejecución, no una predicción política.</p>';
    content += '</article>';
  }
  content += '<p class="small">Los enlaces a documentos requieren la aplicación arrancada. También puedes abrir <a href="documentos/documentos.json">documentos/documentos.json</a> y localizar los identificadores de documento y fragmento indicados.</p>';
  pages.push(sheet(content));
}
pages.push(sheet(`<div class="eyebrow">Arquitectura y reproducción</div><h2>Cómo está hecho</h2><h3>Servidor Python y RAG</h3><p><code>servidor.py</code> expone una API con FastAPI y Uvicorn. Divide la colección en fragmentos, calcula embeddings con OpenAI y guarda el índice NumPy en <code>data/rag/indice.npz</code>, reutilizándolo mientras no cambien los documentos ni el modelo de embeddings.</p><p>Cada pregunta se compara con el índice mediante similitud coseno. El umbral predeterminado es 0,60 y se recuperan hasta ocho fragmentos. Si no hay evidencia similar suficiente, se devuelve «No consta» sin llamar al modelo generativo; sí se calcula el embedding de la consulta.</p><p>Con evidencia suficiente, el modelo recibe la pregunta, el historial y los fragmentos recuperados. La salida se valida con un esquema estructurado y las citas se reconstruyen desde la colección. La respuesta contiene texto, fuentes, estado y el indicador de uso del modelo.</p><h3>Modelos utilizados</h3><p>Generación: <strong>gpt-6-luna</strong>. Embeddings: <strong>text-embedding-3-small</strong>. Son los valores configurados para esta práctica; el servidor permite cambiarlos con <code>OPENAI_MODEL</code> y <code>OPENAI_EMBEDDING_MODEL</code>.</p><h3>Interfaz y seguridad de la clave</h3><p>La interfaz usa Svelte, TypeScript y Vite. Solo consume <code>POST /api/preguntar</code> y <code>GET /api/documentos</code>; Vite dirige esas rutas al servidor. La clave se carga desde <code>.env</code> en Python y no se envía al navegador.</p><h3>Cómo repetir las evidencias</h3><p>Con ambas partes arrancadas y accesibles en <code>http://127.0.0.1:5173/</code>, ejecuta desde la raíz:</p><pre>node web/capturas.mjs
node web/entregable.mjs</pre><p>El primer comando hace consultas reales y guarda cinco PNG y las respuestas en <code>capturas/</code>. El segundo genera este HTML y el PDF A4 con Playwright y el Microsoft Edge instalado, sin descargar navegadores.</p><p class="small">Durante esta comprobación, el servidor de este proyecto estaba en el puerto 8001 y Vite tenía <code>AGORA_API_PORT=8001</code>, porque el puerto 8000 lo ocupaba otra aplicación. Las imágenes se enlazan por rutas relativas: conserva <code>capturas/</code> junto al HTML.</p>`));
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ágora Electoral · Entregable</title><style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}body{margin:0;color:#243b34;background:#ebece7;font:10.5pt/1.45 "Segoe UI",Arial,sans-serif}a{color:#205e49}h1,h2,h3{color:#194c3b;line-height:1.18}h1{font-size:60pt;margin:22mm 0 6mm}h2{font-size:23pt;margin:4mm 0 7mm}h3{font-size:12pt;margin:5mm 0 2mm}p{margin:0 0 3mm}ul{padding-left:6mm}li{margin-bottom:2mm}.sheet{position:relative;width:182mm;min-height:269mm;padding:0 0 13mm;margin:12mm auto;background:white;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.eyebrow{padding-top:3mm;text-transform:uppercase;font-size:9pt;letter-spacing:1.5px;color:#677d6b}.subtitle{font-size:19pt}.rule{height:2mm;background:#235842;width:35mm;margin:12mm 0}.notice{border-left:3px solid #b6954b;background:#f7f3e7;padding:4mm;margin:7mm 0}figure{margin:0 0 6mm;break-inside:avoid;page-break-inside:avoid}img{display:block;width:100%;height:auto;border:1px solid #d4ddcf}figcaption{font-size:10pt;margin-top:3mm;color:#496154}.question{font-weight:600;margin-top:6mm}.case{break-inside:avoid;page-break-inside:avoid;border-top:1px solid #d5ddd1;margin:4mm 0;padding-top:1mm}.reference p{margin-bottom:1mm}blockquote{margin:1mm 0 3mm 3mm;border-left:2px solid #c4d4bc;padding-left:3mm;color:#4b5c4e;font-size:9.5pt}.small{font-size:9pt;color:#516354}code{font:9pt Consolas,monospace;overflow-wrap:anywhere}pre{padding:3mm;background:#eff3ec;white-space:pre-wrap;font:10pt Consolas,monospace}footer{position:absolute;bottom:1mm;left:0;right:0;border-top:1px solid #d5ddd1;padding-top:3mm;font-size:8pt;color:#667b6c} @media screen{.sheet{padding:8mm 8mm 16mm;width:198mm;min-height:285mm;box-shadow:0 2px 10px #0001}footer{left:8mm;right:8mm;bottom:5mm}}@media print{body{background:white}.sheet{margin:0}a{text-decoration:none}figure,img,.reference{break-inside:avoid}}
</style></head><body>${pages.join('')}</body></html>`;
await fs.writeFile(path.join(root, 'entregable.html'), html, 'utf8');
console.log('entregable.html generado: ' + pages.length + ' secciones para A4.');
const browser = await chromium.launch({ channel:'msedge', headless:true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root,'entregable.html')).href, { waitUntil:'networkidle' });
  await page.emulateMedia({ media:'print' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
  assert.equal(await page.locator('img').count(), 5);
  const overflow = await page.locator('.sheet').evaluateAll(nodes => nodes.map((el,i)=>({seccion:i+1,alto:el.getBoundingClientRect().height})).filter(x=>x.alto>1018));
  assert.equal(overflow.length, 0, 'Una sección excede una página A4: ' + JSON.stringify(overflow));
  await page.pdf({ path:path.join(root,'entregable.pdf'), format:'A4', printBackground:true, preferCSSPageSize:true, tagged:true });
  console.log('entregable.pdf generado con Microsoft Edge y page.pdf en A4.');
} finally { await browser.close(); }
