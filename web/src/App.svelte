<script lang="ts">
  import { onMount, tick } from 'svelte'
  import Icon from './lib/Icon.svelte'
  import Answer from './lib/Answer.svelte'
  import DocumentView from './lib/DocumentView.svelte'
  import { obtenerDocumentos, preguntar, descargar, type Documento, type Fuente, type Respuesta, type Mensaje } from './lib/api'

  type Turno = { id: string; pregunta: string; respuesta?: Respuesta; error?: string }
  type Ruta = { pagina: 'chat' | 'documentos' | 'documento'; documento?: string; fragmento?: string }
  const sugerencias = [
    { titulo: 'Fecha y horario', icono: 'calendar', pregunta: '¿Qué día y en qué horario se celebran las próximas elecciones generales en España?' },
    { titulo: 'Primeros resultados', icono: 'clock', pregunta: '¿A partir de qué hora se podrán conocer los primeros resultados reales?' },
    { titulo: 'Las nuevas Cortes', icono: 'building', pregunta: 'Una vez proclamados los resultados oficiales, ¿cuándo se constituyen las nuevas Cortes?' },
    { titulo: '¿Quién gobernará?', icono: 'chat', pregunta: '¿Quién va a gobernar tras las próximas elecciones generales?' },
  ]
  let ruta = $state<Ruta>({ pagina: 'chat' })
  let documentos = $state<Documento[]>([])
  let cargandoDocumentos = $state(true)
  let errorDocumentos = $state('')
  let turnos = $state<Turno[]>([])
  let pregunta = $state('')
  let pendiente = $state<string | null>(null)
  let anuncio = $state('')
  let aviso = $state('')
  let busqueda = $state('')
  let tipo = $state('')
  let orden = $state('id')
  let panelChat = $state<HTMLDivElement | null>(null)
  let entrada = $state<HTMLTextAreaElement | null>(null)
  let controlador: AbortController | null = null
  let controladorDocumentos: AbortController | null = null
  let temporizadorAviso: ReturnType<typeof setTimeout>
  let origenCita: string | null = null
  const totalFragmentos = $derived(documentos.reduce((suma, doc) => suma + doc.numero_fragmentos, 0))
  const documentoActivo = $derived(documentos.find(doc => doc.id === ruta.documento))
  const tipos = $derived([...new Set(documentos.map(doc => doc.tipo))].sort((a, b) => a.localeCompare(b, 'es')))
  const tituloRuta = $derived(ruta.pagina === 'chat' ? 'Conversación' : ruta.pagina === 'documentos' ? 'Mis fuentes' : 'Detalle de fuente')
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filtrados = $derived.by(() => {
    const consulta = normalizar(busqueda.trim())
    return documentos.filter(doc => (!tipo || doc.tipo === tipo) && normalizar([doc.id, doc.titulo, doc.descripcion, ...doc.fragmentos.map(f => f.texto)].join(' ')).includes(consulta)).sort((a, b) => (orden === 'titulo' ? a.titulo : a.id).localeCompare(orden === 'titulo' ? b.titulo : b.id, 'es'))
  })

  function leerRuta() {
    const [camino, consulta] = (window.location.hash.slice(1) || '/chat').split('?')
    const partes = camino.split('/').filter(Boolean)
    try {
      ruta = partes[0] === 'documentos' ? partes[1] ? { pagina: 'documento', documento: decodeURIComponent(partes[1]), fragmento: new URLSearchParams(consulta).get('fragmento') ?? undefined } : { pagina: 'documentos' } : { pagina: 'chat' }
    } catch { ruta = { pagina: 'documentos' } }
    if (ruta.pagina === 'chat') void tick().then(() => {
      if (origenCita) document.getElementById(origenCita)?.scrollIntoView({ block: 'center' })
      else void desplazarChat()
    })
  }
  async function cargarDocumentos() {
    controladorDocumentos?.abort()
    const actual = new AbortController()
    controladorDocumentos = actual
    cargandoDocumentos = true
    errorDocumentos = ''
    try { documentos = (await obtenerDocumentos(actual.signal)).documentos }
    catch (error) { if (!actual.signal.aborted) errorDocumentos = error instanceof Error ? error.message : 'No se han podido cargar las fuentes.' }
    finally { if (controladorDocumentos === actual) cargandoDocumentos = false }
  }
  onMount(() => {
    leerRuta()
    void cargarDocumentos()
    window.addEventListener('hashchange', leerRuta)
    return () => { window.removeEventListener('hashchange', leerRuta); controlador?.abort(); controladorDocumentos?.abort(); clearTimeout(temporizadorAviso) }
  })
  async function desplazarChat() { await tick(); panelChat?.scrollTo({ top: panelChat.scrollHeight, behavior: 'instant' }) }
  function avisar(texto: string) { clearTimeout(temporizadorAviso); aviso = texto; temporizadorAviso = setTimeout(() => { aviso = '' }, 3500) }
  async function enviar(texto = pregunta, reintento?: string) {
    texto = texto.trim()
    if (!texto || texto.length > 2000 || pendiente) return
    const id = reintento ?? crypto.randomUUID()
    const anteriores = reintento ? turnos.slice(0, turnos.findIndex(t => t.id === id)) : turnos
    const historial: Mensaje[] = anteriores.filter(t => t.respuesta).flatMap(t => [
      { rol: 'user' as const, contenido: t.pregunta },
      { rol: 'assistant' as const, contenido: t.respuesta!.respuesta.slice(0, 4000) },
    ]).slice(-20)
    turnos = reintento ? turnos.map(t => t.id === id ? { id, pregunta: texto } : t) : [...turnos, { id, pregunta: texto }]
    pregunta = ''; pendiente = id; origenCita = null
    const actual = new AbortController()
    controlador = actual
    anuncio = 'Consultando la documentación.'
    await desplazarChat()
    try {
      const respuesta = await preguntar(texto, historial, actual.signal)
      if (controlador !== actual) return
      turnos = turnos.map(t => t.id === id ? { ...t, respuesta } : t)
      anuncio = respuesta.estado === 'no_consta' ? 'No consta información suficiente en la documentación.' : `Respuesta recibida con ${respuesta.fuentes.length} fuentes.`
    } catch (error) {
      if (controlador !== actual) return
      const mensaje = actual.signal.aborted ? 'Consulta cancelada. Puedes volver a intentarlo.' : error instanceof Error ? error.message : 'No se ha podido consultar el servidor.'
      turnos = turnos.map(t => t.id === id ? { ...t, error: mensaje } : t)
      anuncio = mensaje
    } finally {
      if (controlador === actual) {
        pendiente = null; controlador = null
        await desplazarChat()
        if (ruta.pagina === 'chat') entrada?.focus({ preventScroll: true })
      }
    }
  }
  function nuevaConversacion() {
    controlador?.abort(); controlador = null; pendiente = null
    turnos = []; pregunta = ''; origenCita = null
    window.location.hash = '/chat'; anuncio = 'Nueva conversación preparada.'
    void tick().then(() => entrada?.focus())
  }
  function abrirFuente(fuente: Fuente, turnoId: string) {
    origenCita = turnoId
    window.location.hash = `/documentos/${encodeURIComponent(fuente.documento_id)}?fragmento=${encodeURIComponent(fuente.fragmento_id)}`
  }
  function descargarColeccion() {
    descargar('agora-coleccion-ficticia.json', JSON.stringify({ datos_ficticios: true, documentos }, null, 2), 'application/json')
    avisar('Colección descargada')
  }
</script>

<svelte:head><title>{tituloRuta} · Ágora electoral</title><meta name="description" content="Asistente sobre tu documentación electoral. Respuestas con fuentes en un escenario ficticio de práctica." /></svelte:head>
<a class="skip-link" href="#contenido">Saltar al contenido</a>
<div class="app-shell">
  <aside class="sidebar" aria-label="Espacio de trabajo">
    <a href="#/chat" class="brand" aria-label="Ágora electoral, conversación"><span class="brand-mark"><Icon name="agora" /></span><span class="brand-name">ágora<small>electoral</small></span></a>
    <div class="workspace-card"><span class="eyebrow">Mi colección</span><strong>Generales de España</strong><span>Escenario de práctica · 2026</span></div>
    <nav class="side-nav" aria-label="Navegación principal">
      <button class="new-chat" aria-label="Nueva conversación" onclick={nuevaConversacion}><Icon name="plus" /><span>Nueva conversación</span></button>
      <a href="#/chat" class:active={ruta.pagina === 'chat'} aria-current={ruta.pagina === 'chat' ? 'page' : undefined}><Icon name="chat" /><span>Conversación</span></a>
      <a href="#/documentos" class:active={ruta.pagina !== 'chat'} aria-current={ruta.pagina !== 'chat' ? 'page' : undefined}><Icon name="library" /><span>Mis fuentes</span>{#if !cargandoDocumentos && !errorDocumentos}<small class="nav-count">{documentos.length}</small>{/if}</a>
    </nav>
    {#if turnos.length}<div class="sidebar-context"><div class="eyebrow">Conversación actual</div><a href="#/chat"><span class="dot"></span><span>{turnos[0].pregunta}</span></a></div>{/if}
    <div class="sidebar-bottom"><div class="knowledge-state" class:unavailable={!!errorDocumentos}><strong><span class="dot"></span>{cargandoDocumentos ? 'Cargando colección' : errorDocumentos ? 'Fuentes no disponibles' : 'Colección disponible'}</strong><p>{!cargandoDocumentos && !errorDocumentos ? `${documentos.length} fuentes · ${totalFragmentos} fragmentos` : 'Tu documentación electoral'}</p></div><div class="profile"><span class="profile-avatar">JR</span><div><strong>Mi espacio de trabajo</strong><small>Proyecto del curso</small></div></div></div>
  </aside>
  <main class="app-main" id="contenido" tabindex="-1">
    <header class="app-header"><div class="breadcrumb"><span>Generales 2026</span><Icon name="chevron" /><strong>{tituloRuta}</strong></div><div class="header-tools"><span class="grounded-label"><Icon name="shield" />Solo tus documentos</span><a class="button" href={ruta.pagina === 'chat' ? '#/documentos' : '#/chat'}><Icon name={ruta.pagina === 'chat' ? 'library' : 'chat'} />{ruta.pagina === 'chat' ? 'Ver fuentes' : 'Ir al chat'}</a></div></header>
    <div class="demo-banner"><Icon name="flask" /><span><strong>Escenario ficticio.</strong> Los datos y documentos de esta práctica son inventados.</span><span class="demo-badge">DEMO</span></div>
    {#if ruta.pagina === 'chat'}
      <section class="chat-page" aria-label="Conversación electoral">
        <div class="chat-scroll" bind:this={panelChat}><div class="chat-stream">
          {#if !turnos.length}
            <div class="welcome"><span class="welcome-symbol"><Icon name="agora" /></span><div class="eyebrow">Tu colección, en conversación</div><h1>Respuestas que puedes<br />llevar a su fuente.</h1><p>Pregunta sobre tu documentación electoral.<br />Si la respuesta no está en los datos, te lo diré.</p><div class="starter-grid">{#each sugerencias as s}<button class="starter" onclick={() => enviar(s.pregunta)}><span class="starter-heading"><Icon name={s.icono} />{s.titulo}<Icon name="arrow" /></span><span>{s.pregunta}</span></button>{/each}</div><div class="welcome-note"><Icon name="shield" />Cada respuesta respaldada incluye sus documentos y fragmentos.</div></div>
          {:else}
            <div class="chat-intro"><Icon name="spark" /><div><h1>Tu consulta electoral</h1><p>{turnos.length} {turnos.length === 1 ? 'consulta' : 'consultas'} · Una conversación basada en tu colección</p></div></div>
            {#each turnos as turno (turno.id)}
              <article class="message-pair" id={turno.id} aria-label="Pregunta y respuesta">
                <div class="user-message"><p class="user-bubble">{turno.pregunta}</p><span class="user-avatar" aria-label="Tú">TÚ</span></div>
                {#if turno.respuesta}<Answer respuesta={turno.respuesta} onSource={(f) => abrirFuente(f, turno.id)} onNotice={avisar} />
                {:else if turno.error}<div class="assistant-message"><span class="assistant-avatar"><Icon name="agora" /></span><div class="assistant-content"><strong class="assistant-name">Ágora</strong><div class="request-error" role="alert"><Icon name="info" /><div><strong>No se ha podido completar la consulta</strong><p>{turno.error}</p><button class="button" disabled={!!pendiente} onclick={() => enviar(turno.pregunta, turno.id)}><Icon name="refresh" />Volver a intentar</button></div></div></div></div>
                {:else}<div class="assistant-message"><span class="assistant-avatar"><Icon name="agora" /></span><div class="assistant-content"><strong class="assistant-name">Ágora</strong><div class="thinking" role="status"><span class="thinking-dots"><i></i><i></i><i></i></span>Consultando los fragmentos de tu colección…</div></div></div>{/if}
              </article>
            {/each}
          {/if}
        </div></div>
        <div class="composer-area">
          {#if turnos.length}<div class="suggestions" aria-label="Preguntas sugeridas">{#each sugerencias as s}<button class="suggestion" disabled={!!pendiente} onclick={() => enviar(s.pregunta)}><Icon name="plus" />{s.titulo}</button>{/each}</div>{/if}
          <form class="composer" onsubmit={(e) => { e.preventDefault(); void enviar() }}><label class="sr-only" for="pregunta">Pregunta sobre la documentación electoral</label><textarea id="pregunta" bind:this={entrada} bind:value={pregunta} placeholder="Pregunta sobre la documentación electoral…" rows="2" maxlength="2000" disabled={!!pendiente} onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void enviar() } }}></textarea><div class="composer-bottom"><span class="composer-context"><Icon name="library" />Generales 2026<span class="context-separator">/</span>{cargandoDocumentos ? 'Cargando fuentes…' : errorDocumentos ? 'Colección electoral' : `${documentos.length} fuentes disponibles`}</span><div class="send-controls">{#if pregunta.length > 1750}<small class="character-count">{pregunta.length}/2000</small>{/if}{#if pendiente}<button class="button cancel-button" type="button" onclick={() => controlador?.abort()}>Cancelar</button>{:else}<button class="send-button" type="submit" disabled={!pregunta.trim()} aria-label="Enviar pregunta"><Icon name="up" /></button>{/if}</div></div></form>
          <p class="composer-footnote"><Icon name="shield" />Solo la documentación cargada. Comprueba las citas antes de utilizar una respuesta.</p>
        </div>
      </section>
    {:else}
      <div class="page-scroll">
        {#if cargandoDocumentos}<div class="page-state" role="status"><span class="loading-ring"></span><h1>Cargando tu colección</h1><p>Recuperando los documentos y sus fragmentos.</p></div>
        {:else if errorDocumentos}<div class="page-state error-state" role="alert"><span class="state-symbol"><Icon name="info" /></span><h1>No se han podido cargar las fuentes</h1><p>{errorDocumentos}</p><button class="button primary" onclick={cargarDocumentos}><Icon name="refresh" />Volver a intentar</button></div>
        {:else if ruta.pagina === 'documentos'}
          <section class="content-page" aria-label="Biblioteca documental">
            <div class="page-title-row"><div><div class="eyebrow page-eyebrow">Tu colección documental</div><h1>Mis fuentes</h1><p class="page-subtitle">La documentación que da forma a cada respuesta.</p></div><button class="button" disabled={!documentos.length} onclick={descargarColeccion}><Icon name="download" />Descargar colección</button></div>
            <div class="stats"><div class="stat"><span class="stat-icon"><Icon name="doc" /></span><div><strong>{documentos.length}</strong><span>Documentos y registros</span></div></div><div class="stat"><span class="stat-icon"><Icon name="fragments" /></span><div><strong>{totalFragmentos}</strong><span>Fragmentos consultables</span></div></div><div class="stat"><span class="stat-icon"><Icon name="check" /></span><div><strong>{documentos.length ? '100' : '0'}<small> %</small></strong><span>Fuentes disponibles</span></div></div></div>
            <div class="search-toolbar"><label class="search-field"><Icon name="search" /><span class="sr-only">Buscar por título, contenido o identificador</span><input type="search" bind:value={busqueda} placeholder="Buscar por título, contenido o identificador…" /></label><label class="sr-only" for="tipo">Tipo de documento</label><select id="tipo" bind:value={tipo}><option value="">Todos los tipos</option>{#each tipos as item}<option value={item}>{item}</option>{/each}</select><label class="sr-only" for="orden">Ordenar documentos</label><select id="orden" bind:value={orden}><option value="id">Orden: identificador</option><option value="titulo">Orden: título A–Z</option></select></div>
            <div class="table-caption"><span role="status">{filtrados.length} {filtrados.length === 1 ? 'fuente' : 'fuentes'} {busqueda || tipo ? 'encontradas' : 'en esta colección'}</span><span>Datos ficticios de demostración</span></div>
            <div class="table-wrapper"><table class="documents-table"><caption class="sr-only">Documentos y registros disponibles para el asistente</caption><thead><tr><th scope="col">Documento o registro</th><th scope="col">Tipo</th><th scope="col">Fragmentos</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Abrir</span></th></tr></thead><tbody>{#each filtrados as doc}<tr><td><a class="document-name" href={`#/documentos/${encodeURIComponent(doc.id)}`}><span class="file-icon"><Icon name="doc" /></span><span><strong>{doc.titulo}</strong><small>{doc.id} · {doc.formato} · Fuente ficticia</small></span></a></td><td><span class="type-badge">{doc.tipo}</span></td><td>{doc.numero_fragmentos} fragmentos</td><td><span class="available"><span class="dot"></span>Disponible</span></td><td><a class="icon-button" href={`#/documentos/${encodeURIComponent(doc.id)}`} aria-label={`Abrir ${doc.titulo}`}><Icon name="chevron" /></a></td></tr>{/each}</tbody></table>{#if !filtrados.length}<div class="empty-state"><Icon name="search" /><h2>{documentos.length ? 'No hay coincidencias' : 'La colección está vacía'}</h2><p>{documentos.length ? 'Prueba con otro término o cambia el tipo de documento.' : 'No hay documentos disponibles en el servidor.'}</p>{#if busqueda || tipo}<button class="button" onclick={() => { busqueda = ''; tipo = '' }}>Limpiar filtros</button>{/if}</div>{/if}</div>
            <div class="library-note"><Icon name="shield" /><div><strong>El asistente responde a partir de esta colección</strong><p>Cada respuesta enlaza con el documento y el fragmento que la justifican. Si los datos no contienen la respuesta, Ágora lo indica.</p></div></div>
          </section>
        {:else if documentoActivo}{#key documentoActivo.id}<DocumentView documento={documentoActivo} fragmentoId={ruta.fragmento} onNotice={avisar} />{/key}
        {:else}<div class="page-state"><span class="state-symbol"><Icon name="doc" /></span><h1>Documento no disponible</h1><p>La referencia no corresponde a un documento de la colección actual.</p><a class="button" href="#/documentos"><Icon name="back" />Volver a mis fuentes</a></div>{/if}
      </div>
    {/if}
  </main>
</div>
<div class="sr-only" role="status" aria-live="polite">{anuncio}</div>
{#if aviso}<div class="toast" role="status">{aviso}</div>{/if}
