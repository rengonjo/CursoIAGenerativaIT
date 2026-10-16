<script lang="ts">
  import Icon from './Icon.svelte'
  import type { Fuente, Respuesta } from './api'
  let { respuesta, onSource, onNotice }: { respuesta: Respuesta; onSource: (fuente: Fuente) => void; onNotice: (mensaje: string) => void } = $props()
  const partes = $derived(respuesta.respuesta.split(/(\[\d+\])/g))
  function referencia(texto: string) { return /^\[\d+\]$/.test(texto) ? respuesta.fuentes.find(f => f.id === Number(texto.slice(1, -1))) : undefined }
  async function copiar() {
    try {
      await navigator.clipboard.writeText('DATOS FICTICIOS DE DEMOSTRACIÓN\n\n' + respuesta.respuesta + '\n\n' + respuesta.fuentes.map(f => `[${f.id}] ${f.documento_id} · ${f.titulo}\n${f.ubicacion}\n«${f.fragmento}»`).join('\n\n'))
      onNotice('Respuesta y fuentes copiadas')
    } catch { onNotice('El navegador no permite copiar. Puedes seleccionar el texto de la respuesta.') }
  }
</script>
<div class="assistant-message">
  <span class="assistant-avatar"><Icon name="agora" /></span>
  <div class="assistant-content">
    <div class="assistant-byline"><strong>Ágora</strong><span class="answer-state" class:without-evidence={respuesta.estado === 'no_consta'}><Icon name={respuesta.estado === 'no_consta' ? 'info' : 'check'} />{respuesta.estado === 'no_consta' ? 'Sin evidencia suficiente' : 'Respuesta con fuentes'}</span></div>
    <p class="answer">{#each partes as parte}{@const fuente = referencia(parte)}{#if fuente}<button class="citation" onclick={() => onSource(fuente)} aria-label={`Ver fuente ${fuente.id}: ${fuente.titulo}`}>{parte}</button>{:else}{parte}{/if}{/each}</p>
    {#if respuesta.estado === 'no_consta'}
      <div class="no-evidence"><div class="no-evidence-title"><Icon name="search" />No se han encontrado fragmentos que respondan</div><p>La documentación disponible no contiene evidencia suficiente para esta consulta. Puedes revisar las fuentes o hacer una pregunta más concreta.</p><div class="evidence-footer"><span><Icon name="library" />Sin fuentes que justifiquen una respuesta</span><a href="#/documentos">Revisar mis fuentes<Icon name="arrow" /></a></div></div>
    {:else}
      <div class="sources"><div class="sources-label"><Icon name="link" />Fuentes de esta respuesta · {respuesta.fuentes.length}</div>{#each respuesta.fuentes as fuente}<button class="source-row" onclick={() => onSource(fuente)} aria-label={`Abrir ${fuente.titulo}, ${fuente.ubicacion}`}><span class="source-heading"><Icon name="doc" /><span>[{fuente.id}] {fuente.titulo}</span><span class="source-location">{fuente.ubicacion}</span><Icon name="chevron" /></span><blockquote>«{fuente.fragmento}»</blockquote><span class="source-identifier">{fuente.documento_id} · {fuente.fragmento_id}</span></button>{/each}</div>
    {/if}
    <div class="answer-actions"><button class="icon-button" onclick={copiar} aria-label="Copiar respuesta y fuentes" title="Copiar respuesta y fuentes"><Icon name="copy" /></button><span>{respuesta.estado === 'no_consta' ? 'Sin citas: no hay evidencia para esta consulta' : 'Información de tu colección'}</span></div>
  </div>
</div>
