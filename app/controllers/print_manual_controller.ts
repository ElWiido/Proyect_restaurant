import type { HttpContext } from '@adonisjs/core/http'
import { imprimirPedidoPOS } from './print_controller.js'
import { printQueue } from '#jobs/print_queue'
import Pedido from '#models/pedido'
import Mesa from '#models/mesa'
import Usuario from '#models/usuario'

export default class PrintManualController {

  /**
   * POST /imprimir/pedido/:id
   * Reimprimir un pedido existente desde el frontend.
   * Body opcional: { forzar: true } para imprimir aunque sean solo bebidas
   */
  public async imprimirPedido({ params, request, response }: HttpContext) {
    try {
      const pedido  = await Pedido.findOrFail(params.id)
      const forzar  = request.input('forzar', false)

      await pedido.load('detalles', q => q.preload('producto'))

      const [mesa, usuario] = await Promise.all([
        Mesa.findOrFail(pedido.id_mesa),
        Usuario.findOrFail(pedido.id_usuario),
      ])

      const detalles = pedido.detalles.map(d => ({
        producto: d.producto?.nombre ?? 'Producto',
        nota:     d.detalle,
        cantidad: d.cantidad,
      }))

      if (detalles.length === 0) {
        return response.badRequest({ error: 'El pedido no tiene productos' })
      }

      // Encolar la impresión (async, no bloquea)
      printQueue.add({
        mesa:    mesa.numero ?? mesa.id_mesa,
        mesero:  usuario.nombre_usuario,
        pedidoId: pedido.id_pedido,
        detalles,
      })

      return response.json({
        message:  'Impresión encolada correctamente',
        pedido_id: pedido.id_pedido,
        mesa:     mesa.numero ?? mesa.id_mesa,
        productos: detalles.length,
        cola:     printQueue.status(),
      })
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND')
        return response.notFound({ error: 'Pedido no encontrado' })
      console.error(error)
      return response.internalServerError({ error: 'Error al encolar impresión', detalle: error.message })
    }
  }

  /**
   * POST /imprimir/custom
   * Imprimir ticket personalizado desde el frontend.
   * Body: { mesa, mesero, pedidoId, detalles: [{ producto, nota, cantidad }] }
   */
  public async imprimirCustom({ request, response }: HttpContext) {
    try {
      const { mesa, mesero, pedidoId, detalles } = request.only(['mesa', 'mesero', 'pedidoId', 'detalles'])

      if (!mesa || !mesero || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
        return response.badRequest({ error: 'Faltan datos: mesa, mesero y detalles son requeridos' })
      }

      printQueue.add({ mesa, mesero, pedidoId: pedidoId ?? 0, detalles })

      return response.json({
        message:  'Impresión encolada correctamente',
        cola:     printQueue.status(),
      })
    } catch (error: any) {
      console.error(error)
      return response.internalServerError({ error: 'Error al encolar impresión', detalle: error.message })
    }
  }

  /**
   * GET /imprimir/estado
   * Ver estado actual de la cola de impresión
   */
  public async estadoCola({ response }: HttpContext) {
    return response.json(printQueue.status())
  }
}
