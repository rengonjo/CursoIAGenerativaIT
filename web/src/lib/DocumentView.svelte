<script lang="ts">
  import { tick } from 'svelte'
  import Icon from './Icon.svelte'
  import { descargar, type Documento } from './api'
  let { documento, fragmentoId, onNotice }: { documento: Documento; fragmentoId?: string; onNotice: (mensaje: string) => void } = $props()
  let pestaña = $state<'documento' | 'fragmentos'>('documento')
  const destacado = $derived(documento.fragmentos.find(f => f.id === fragmentoId))
  $effect(() => {
    const id = fragmentoId
    pestaña = 'documento'
    if (id) void tick().then(() => { const el = document.getElementById(`fragmento-${id}`); el?.scrollIntoView({ block: 'center' }); el?.focus({ preventScroll: true }) })
  })
  function descargarDocumento() {
    const esJson = documento.formato === 'JSON'
    const contenido = esJson ? JSON.stringify({ datos_ficticios: true, ...documento }, null, 2) : `ESCENARIO FICTICIO · DATOS DE DEMOSTRACIÓN\n\n${documento.id} · ${documento.titulo}\n\n${documento.descripcion}\n\n${documento.fragmentos.map(f => `${f.titulo}\n${f.texto}`).join('\n\n')}`
    descargar(`${documento.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-ficticio.${esJson ? 'json' : 'txt'}`, contenido, esJson ? 'application/json' : 'text/plain')
    onNotice('Fuente descargada')
  }
  async function cambiarPestaña(e: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    pestaña = e.key === 'Home' ? 'documento' : e.key === 'End' ? 'fragmentos' : pestaña === 'documento' ? 'fragmentos' : 'documento'
    await tick(); document.getElementById(`tab-${pestaña}`)?.focus()
  }
</script>
<section class="content-page document-page" aria-label="Detalle del documento">
  <a href="#/documentos" class="back-link"><Icon name="back" />Volver a mis fuentes</a>
  <div class="document-title"><span class="file-icon"><Icon name="doc" /></span><div><h1>{documento.titulo}</h1><p class="page-subtitle">{documento.id}<span class="context-separator">/</span>{documento.tipo} de demostración</p></div><button class="button" onclick={descargarDocumento}><Icon name="download" />Descargar</button></div>
  <div class="document-tabs" role="tablist" aria-label="Vista del documento"><button id="tab-documento" role="tab" aria-selected={pestaña === 'documento'} aria-controls="panel-documento" tabindex={pestaña === 'documento' ? 0 : -1} onclick={() => { pestaña = 'documento' }} onkeydown={cambiarPestaña}>Documento completo</button><button id="tab-fragmentos" role="tab" aria-selected={pestaña === 'fragmentos'} aria-controls="panel-documento" tabindex={pestaña === 'fragmentos' ? 0 : -1} onclick={() => { pestaña = 'fragmentos' }} onkeydown={cambiarPestaña}>Fragmentos<span>{documento.fragmentos.length}</span></button></div>
  {#if fragmentoId && !destacado}<p class="inline-notice" role="status">El fragmento citado no está en la versión actual de este documento. Puedes revisar su contenido completo.</p>{/if}
  <div class="document-layout"><div id="panel-documento" role="tabpanel" aria-labelledby={`tab-${pestaña}`} tabindex="0">
    {#if pestaña === 'documento'}
      <article class="document-paper"><div class="paper-eyebrow">Colección Generales 2026 · Fuente ficticia</div><h2>{documento.titulo}</h2><p class="paper-intro">{documento.descripcion}</p>{#each documento.fragmentos as f}<section class="document-fragment" class:is-highlighted={f.id === fragmentoId} id={`fragmento-${f.id}`} tabindex="-1">{#if f.id === fragmentoId}<div class="highlight-label"><Icon name="link" />Fragmento citado · {f.ubicacion}</div>{/if}<h3>{f.titulo}</h3><p>{f.texto}</p></section>{/each}<div class="paper-footer"><span>{documento.id} · Versión de demostración</span><span>Fin del documento</span></div></article>
    {:else}
      <div class="fragment-list">{#each documento.fragmentos as f}<article class="fragment-card"><small>{documento.id} / {f.id}</small><h2>{f.titulo}</h2><blockquote>«{f.texto}»</blockquote><a class="button" onclick={() => { pestaña = 'documento' }} href={`#/documentos/${encodeURIComponent(documento.id)}?fragmento=${encodeURIComponent(f.id)}`}>Ver en el documento<Icon name="arrow" /></a></article>{/each}</div>
    {/if}
  </div><aside class="document-aside" aria-label="Información de la fuente"><div class="metadata-card"><h2>Información de la fuente</h2><dl><div><dt>Identificador</dt><dd>{documento.id}</dd></div><div><dt>Tipo de fuente</dt><dd>{documento.tipo}</dd></div><div><dt>Formato</dt><dd>{documento.formato}</dd></div><div><dt>Fecha en la demo</dt><dd>{documento.fecha}</dd></div><div><dt>Fragmentos</dt><dd>{documento.numero_fragmentos} disponibles</dd></div><div><dt>Estado</dt><dd><span class="available"><span class="dot"></span>Disponible</span></dd></div></dl></div><div class="document-help"><Icon name="link" /><p>{destacado ? 'El fragmento resaltado permite comprobar el contexto de la cita.' : 'Consulta los fragmentos que el asistente puede utilizar como fuentes.'}</p><a href="#/chat">Volver a la conversación<Icon name="arrow" /></a></div></aside></div>
</section>
