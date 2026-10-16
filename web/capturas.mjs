import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'capturas');
const url = process.env.APP_URL || 'http://127.0.0.1:5173/';
await fs.mkdir(out, { recursive: true });
const files = ['01-fecha-horario', '02-primeros-resultados', '03-nuevas-cortes', '04-no-consta'];
const questions = await Promise.all(files.map(async name => JSON.parse(await fs.readFile(path.join(root, 'ejemplos', name + '.json'), 'utf8')).pregunta));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  const docsPromise = page.waitForResponse(r => r.url().endsWith('/api/documentos') && r.ok());
  await page.goto(url, { waitUntil: 'networkidle' });
  const documents = await (await docsPromise).json();
  assert(documents.documentos.length > 0);
  const results = [];
  for (const [i, question] of questions.entries()) {
    await page.locator('#pregunta').fill(question);
    const pending = page.waitForResponse(r => r.url().endsWith('/api/preguntar') && r.request().method() === 'POST');
    await page.locator('#pregunta').press('Enter');
    const response = await pending;
    assert(response.ok(), 'La API ha fallado: ' + response.status());
    const data = await response.json();
    const turn = page.locator('.message-pair').nth(i);
    await turn.locator('.answer').waitFor();
    assert.equal((await turn.locator('.answer').innerText()).replace(/\s+/g, ' ').trim(), data.respuesta.replace(/\s+/g, ' ').trim());
    assert.equal(data.estado, i === 3 ? 'no_consta' : 'con_fuentes');
    if (i < 3) {
      assert(data.fuentes.length > 0);
      assert.equal(await turn.locator('.source-row').count(), data.fuentes.length);
      for (const source of data.fuentes) {
        const doc = documents.documentos.find(d => d.id === source.documento_id);
        const fragment = doc?.fragmentos.find(f => f.id === source.fragmento_id);
        assert.equal(fragment?.texto, source.fragmento, 'La cita debe coincidir con el documento');
      }
    } else {
      assert.equal(data.fuentes.length, 0);
      assert.equal(data.modelo_utilizado, false);
      await turn.locator('.no-evidence').waitFor();
    }
    await page.evaluate(() => { document.activeElement?.blur(); const el = document.querySelector('.chat-scroll'); if (el) el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
    const bounds = await turn.boundingBox();
    const chat = await page.locator('.chat-scroll').boundingBox();
    assert(bounds && chat && bounds.y >= chat.y - 2 && bounds.y + bounds.height <= chat.y + chat.height + 2, 'La pregunta, respuesta y fuentes deben caber completas en la captura');
    const filename = files[i] + '.png';
    await page.screenshot({ path: path.join(out, filename), animations: 'disabled', caret: 'hide' });
    assert((await fs.stat(path.join(out, filename))).size > 20000);
    results.push({ pregunta: question, ...data, captura: 'capturas/' + filename, citas_verificadas: true });
    console.log('Captura verificada: ' + filename + ' (' + data.estado + ', ' + data.fuentes.length + ' fuentes)');
  }
  await page.locator('.side-nav a[href="#/documentos"]').click();
  await page.locator('.documents-table tbody tr').first().waitFor();
  assert.equal(await page.locator('.documents-table tbody tr').count(), documents.documentos.length);
  await page.screenshot({ path: path.join(out, '05-documentos.png'), animations: 'disabled' });
  await fs.writeFile(path.join(out, 'resultados.json'), JSON.stringify({ fecha: new Date().toISOString(), url, viewport: { width: 1366, height: 900 }, documentos: documents, consultas: results }, null, 2) + '\n');
  console.log('Captura verificada: 05-documentos.png. Evidencias guardadas en capturas/resultados.json.');
} finally { await browser.close(); }
