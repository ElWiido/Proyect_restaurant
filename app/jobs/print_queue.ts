import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const QUEUE_FILE = resolve('./print_jobs.json')

const DELAY_RAPIDO_MS  = 10_000
const MAX_INTENTOS     = 2 

interface PrintJob {
  id:            number
  data:          PrintData
  intentos:      number
  creado:        Date
  ultimoIntento: Date | null
}

interface PrintData {
  mesa:     string | number
  mesero:   string
  pedidoId: number
  detalles: { producto: string; nota?: string; cantidad: number }[]
}

type PrintFn = (data: PrintData) => Promise<void>

class PrintQueue {
  private queue:     PrintJob[] = []
  private procesando = false
  private jobId      = 0
  private printFn:   PrintFn | null = null
  private timer:     ReturnType<typeof setTimeout> | null = null

  init(fn: PrintFn) {
    this.printFn = fn
    this._cargarDesdeDisco()
    console.log(`🖨️  Cola de impresión lista — ${this.queue.length} jobs pendientes`)
    if (this.queue.length > 0) {
      setImmediate(() => this._procesarSiguiente())
    }
  }

  add(data: PrintData): number {
    const id = ++this.jobId
    this.queue.push({ id, data, intentos: 0, creado: new Date(), ultimoIntento: null })
    this._guardarEnDisco()
    console.log(`🖨️  Job #${id} encolado — mesa ${data.mesa} (cola: ${this.queue.length})`)
    this._procesarSiguiente()
    return id
  }

  status() {
    return {
      pendientes: this.queue.length,
      procesando: this.procesando,
      jobs: this.queue.map(j => ({
        id:       j.id,
        mesa:     j.data.mesa,
        intentos: j.intentos,
        creado:   j.creado,
      })),
    }
  }

  private _guardarEnDisco() {
    try {
      writeFileSync(QUEUE_FILE, JSON.stringify(this.queue), 'utf8')
    } catch (err) {
      console.error('Error al guardar cola en disco:', err)
    }
  }

  private _cargarDesdeDisco() {
    if (!existsSync(QUEUE_FILE)) return
    try {
      const raw  = readFileSync(QUEUE_FILE, 'utf8')
      const data = JSON.parse(raw) as PrintJob[]
      // Restaurar fechas que JSON serializa como strings
      this.queue = data.map(j => ({
        ...j,
        creado:        new Date(j.creado),
        ultimoIntento: j.ultimoIntento ? new Date(j.ultimoIntento) : null,
      }))
      this.jobId = this.queue.length > 0 ? Math.max(...this.queue.map(j => j.id)) : 0
      if (this.queue.length > 0) {
        console.log(`📂 Recuperados ${this.queue.length} jobs pendientes del disco`)
      }
    } catch {
      console.error('Error al cargar cola de impresión desde disco — se inicia vacía')
    }
  }

  private _delayParaJob(_job: PrintJob): number {
    return DELAY_RAPIDO_MS
  }

  private async _procesarSiguiente() {
    if (this.procesando || this.queue.length === 0 || !this.printFn) return

    const ahora  = Date.now()

    // Solo procesar jobs que aún no agotaron sus intentos y cuyo delay ya pasó
    const jobIdx = this.queue.findIndex(j => {
      if (j.intentos >= MAX_INTENTOS) return false          // ya agotó reintentos, queda en disco
      if (!j.ultimoIntento) return true                     // primer intento, inmediato
      return ahora - j.ultimoIntento.getTime() >= this._delayParaJob(j)
    })

    if (jobIdx === -1) {
      // Puede haber jobs esperando su reintento a los 10s
      const pendientesActivos = this.queue.filter(j => j.intentos < MAX_INTENTOS)
      if (pendientesActivos.length === 0) return            // todos agotados, nada que hacer

      const proximoDelay = Math.min(
        ...pendientesActivos.map(j => {
          if (!j.ultimoIntento) return 0
          const transcurrido = ahora - j.ultimoIntento.getTime()
          return Math.max(0, this._delayParaJob(j) - transcurrido)
        })
      )
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => this._procesarSiguiente(), proximoDelay + 100)
      return
    }

    const job = this.queue[jobIdx]
    this.procesando   = true
    job.intentos++
    job.ultimoIntento = new Date()
    this._guardarEnDisco()

    console.log(`🖨️  Procesando Job #${job.id} — mesa ${job.data.mesa} (intento ${job.intentos}/${MAX_INTENTOS})`)

    try {
      await this.printFn!(job.data)
      this.queue.splice(jobIdx, 1)
      this._guardarEnDisco()
      console.log(`✅ Job #${job.id} impreso correctamente`)
    } catch (err: any) {
      if (job.intentos >= MAX_INTENTOS) {
        // Agotó reintentos — queda persistido en disco para revisión manual
        console.error(`❌ Job #${job.id} falló en intento ${job.intentos}/${MAX_INTENTOS}: ${err.message} — guardado en ${QUEUE_FILE} para revisión manual`)
      } else {
        console.error(`❌ Job #${job.id} falló: ${err.message} — reintentará en ${DELAY_RAPIDO_MS / 1000}s`)
      }
      this._guardarEnDisco()
    } finally {
      this.procesando = false
      if (this.queue.length > 0) {
        setImmediate(() => this._procesarSiguiente())
      }
    }
  }
}

export const printQueue = new PrintQueue()