export type Fragmento = { id: string; titulo: string; ubicacion: string; texto: string }
export type Documento = { id: string; titulo: string; tipo: string; formato: string; fecha: string; descripcion: string; ficticio: boolean; fragmentos: Fragmento[]; numero_fragmentos: number; estado: 'disponible' }
export type Listado = { documentos: Documento[]; total: number; total_fragmentos: number; datos_ficticios: boolean }
export type Mensaje = { rol: 'user' | 'assistant'; contenido: string }
export type Fuente = { id: number; documento_id: string; titulo: string; fragmento_id: string; ubicacion: string; fragmento: string; similitud: number }
export type Respuesta = { respuesta: string; fuentes: Fuente[]; estado: 'con_fuentes' | 'no_consta'; modelo_utilizado: boolean; datos_ficticios: boolean }

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const textos = (v: Record<string, unknown>, claves: string[]) => claves.every(k => typeof v[k] === 'string')
const fragmentoValido = (v: unknown): v is Fragmento => objeto(v) && textos(v, ['id', 'titulo', 'ubicacion', 'texto'])
const documentoValido = (v: unknown): v is Documento => objeto(v) && textos(v, ['id', 'titulo', 'tipo', 'formato', 'fecha', 'descripcion']) && typeof v.ficticio === 'boolean' && typeof v.numero_fragmentos === 'number' && v.estado === 'disponible' && Array.isArray(v.fragmentos) && v.fragmentos.every(fragmentoValido)
const fuenteValida = (v: unknown): v is Fuente => objeto(v) && textos(v, ['documento_id', 'titulo', 'fragmento_id', 'ubicacion', 'fragmento']) && typeof v.id === 'number' && typeof v.similitud === 'number'

// Solo peticiones al servidor local; ninguna credencial ni SDK de modelos en el navegador.
async function solicitar(ruta: '/api/documentos' | '/api/preguntar', opciones: RequestInit, limite: number): Promise<unknown> {
  const plazo = AbortSignal.timeout(limite)
  const signal = opciones.signal ? AbortSignal.any([opciones.signal, plazo]) : plazo
  try {
    const respuesta = await fetch(ruta, { ...opciones, signal, headers: { Accept: 'application/json', ...opciones.headers } })
    const datos: unknown = await respuesta.json().catch(() => null)
    if (!respuesta.ok) {
      if (respuesta.status === 404) throw new Error('El servidor no ofrece esta ruta. Comprueba que has iniciado servidor.py en el puerto 8000.')
      if (respuesta.status === 422) throw new Error('La consulta no tiene el formato esperado. Revisa la pregunta y vuelve a intentarlo.')
      if (respuesta.status === 503) throw new Error('El servicio de consulta no está disponible. Inténtalo de nuevo en unos instantes.')
      throw new Error('No se ha podido completar la petición. Comprueba que el servidor Python esté en marcha.')
    }
    return datos
  } catch (error) {
    if (opciones.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
    if (plazo.aborted) throw new Error('El servidor está tardando demasiado en responder. Puedes volver a intentarlo.')
    if (error instanceof TypeError) throw new Error('No se puede conectar con el servidor. Comprueba que Python esté en marcha en el puerto 8000.')
    throw error
  }
}

export async function obtenerDocumentos(signal?: AbortSignal): Promise<Listado> {
  const d = await solicitar('/api/documentos', { signal }, 20000)
  if (!objeto(d) || !Array.isArray(d.documentos) || !d.documentos.every(documentoValido) || typeof d.total !== 'number' || typeof d.total_fragmentos !== 'number' || typeof d.datos_ficticios !== 'boolean') throw new Error('La colección recibida no tiene el formato esperado. Comprueba que estés utilizando el servidor de Ágora.')
  return d as Listado
}

export async function preguntar(pregunta: string, historial: Mensaje[], signal?: AbortSignal): Promise<Respuesta> {
  const d = await solicitar('/api/preguntar', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pregunta, historial }) }, 180000)
  if (!objeto(d) || typeof d.respuesta !== 'string' || !Array.isArray(d.fuentes) || !d.fuentes.every(fuenteValida) || !['con_fuentes', 'no_consta'].includes(String(d.estado)) || typeof d.modelo_utilizado !== 'boolean' || typeof d.datos_ficticios !== 'boolean' || (d.estado === 'no_consta' && d.fuentes.length !== 0) || (d.estado === 'con_fuentes' && !d.fuentes.length)) throw new Error('La respuesta del servidor no tiene el formato esperado. No se puede mostrar como una respuesta documentada.')
  return d as Respuesta
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
