import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

const APP_ROOT = new URL('../', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('HTTP', () => import('#start/kernel'))
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGTERM', () => app.terminate())
  })
  .httpServer()
  .start()
  .then(async () => {
    // Inicializar la cola de impresión con la función real
    const { printQueue }       = await import('#jobs/print_queue')
    const { imprimirPedidoPOS } = await import('#controllers/print_controller')
    printQueue.init(imprimirPedidoPOS)
    console.log('🖨️  Cola de impresión lista')
  })
  .catch(prettyPrintError)
