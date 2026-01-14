import type { HttpContext } from '@adonisjs/core/http'
import { PagoValidator } from '#validators/PagoValidator'
import Pago from '#models/pago'
import Pedido from '#models/pedido'
import Mesa from '#models/mesa'
import DetallePedido from '#models/detalle_pedido'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class PagosController {
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(PagoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const ts = hora_local.toFormat('yyyy-LL-dd HH:mm:ss')

    const trx = await db.transaction()
    try {
      // Pedido
      const pedido = await Pedido.findOrFail(data.id_pedido, { client: trx })
      if (pedido.estado === 'pagado') return response.badRequest({ error: 'El pedido ya fue pagado' })
      if (pedido.estado === 'cancelado') return response.badRequest({ error: 'No se puede pagar un pedido cancelado' })

      // Calcular total del pedido (join detalles + productos)
      const totalRow = await DetallePedido.query({ client: trx })
        .where('id_pedido', data.id_pedido)
        .join('productos', 'productos.id_producto', 'detalle_pedidos.id_producto')
        .sum('productos.precio as total')
        .first()

      const montoTotal = Number(totalRow?.$extras.total ?? 0)
      if (!montoTotal || Number.isNaN(montoTotal)) {
        return response.badRequest({ error: 'El pedido no tiene productos con precio válido' })
      }

      // Crear pago (Lucid maneja DateTime)
      const pago = await Pago.create({
        id_pedido: data.id_pedido,
        metodo_pago: data.metodo_pago,
        monto: montoTotal,
        created_at: hora_local,
        updated_at: hora_local,
      }, { client: trx })

      // Actualizar pedido y mesa (usar string para updated_at en query)
      await Pedido.query({ client: trx })
        .where('id_pedido', data.id_pedido)
        .update({ estado: 'pagado', updated_at: ts })

      await Mesa.query({ client: trx })
        .where('id_mesa', pedido.id_mesa)
        .update({ estado: 'libre', updated_at: ts })

      await trx.commit()

      return response.status(201).json({
        id_pago: pago.id_pago,
        id_pedido: pago.id_pedido,
        monto: pago.monto,
        metodo_pago: pago.metodo_pago,
        pedido_estado: 'pagado',
        mesa_estado: 'libre',
        creado: pago.created_at,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al procesar el pago', detalle: error.message })
    }
  }

  //Listar todos los pagos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const pagos = await Pago.query().paginate(page, perPage)
    return pagos
  }

  //Buscar un pago por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const pago = await Pago.findOrFail(params.id)
      return response.json(pago)
    } catch {
      return response.notFound({ error: 'Pago no encontrado' })
    }
  }

  // Buscar pago total por fecha
  public async findByDate({ params, response }: HttpContext) {
    try {
      const row = await Pago.query()
        .whereRaw('DATE(created_at) = ?', [params.fecha])
        .sum('monto as total')
        .first()

      const total = Number(row?.$extras.total ?? 0)
      return response.json({ fecha: params.fecha, total })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los pagos' })
    }
  }
}