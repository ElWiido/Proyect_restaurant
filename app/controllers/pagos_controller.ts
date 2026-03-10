import type { HttpContext } from '@adonisjs/core/http'
import { PagoValidator } from '#validators/PagoValidator'
import Pago from '#models/pago'
import Pedido from '#models/pedido'
import Mesa from '#models/mesa'
import DetallePedido from '#models/detalle_pedido'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { getIO } from '#start/socket'
import vine from '@vinejs/vine'


export default class PagosController {

  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(PagoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const ts = hora_local.toFormat('yyyy-LL-dd HH:mm:ss')

    const trx = await db.transaction()
    try {
      const pedido = await Pedido.findOrFail(data.id_pedido, { client: trx })
      if (pedido.estado === 'pagado') return response.badRequest({ error: 'El pedido ya fue pagado' })
      if (pedido.estado === 'cancelado') return response.badRequest({ error: 'No se puede pagar un pedido cancelado' })

      const totalRow = await DetallePedido.query({ client: trx })
        .where('id_pedido', data.id_pedido)
        .select(db.raw('SUM(detalle_pedidos.precio_unitario * detalle_pedidos.cantidad) as total'))
        .first()

      // Tomar el monto enviado desde el frontend o calcularlo automáticamente
      const montoTotal = data.monto !== undefined && !isNaN(Number(data.monto))
        ? Number(data.monto)
        : Number(totalRow?.$extras.total ?? 0)

      if (!montoTotal) {
        return response.badRequest({ error: 'El pedido no tiene un monto válido' })
      }

      const pago = await Pago.create({
        id_pedido: data.id_pedido,
        metodo_pago: data.metodo_pago,
        monto: montoTotal,
        created_at: hora_local,
        updated_at: hora_local,
      }, { client: trx })

      await Pedido.query({ client: trx })
        .where('id_pedido', data.id_pedido)
        .update({ estado: 'pagado', updated_at: ts })

      await Mesa.query({ client: trx })
        .where('id_mesa', pedido.id_mesa)
        .update({ estado: 'libre', updated_at: ts })

      await trx.commit()

      const io = getIO()

      io.to('mesas').emit('mesa_actualizada', {
        id_mesa: pedido.id_mesa,
        estado: 'libre',
        timestamp: new Date(),
      })

      io.to('pagos').emit('pago_completado', {
        id_pago: pago.id_pago,
        id_pedido: pago.id_pedido,
        id_mesa: pedido.id_mesa,
        monto: pago.monto,
        metodo_pago: pago.metodo_pago,
        timestamp: new Date(),
      })

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

  // ── Actualizar método de pago ─────────────────────────────────────────────
  public async updateMetodoPago({ params, request, response }: HttpContext) {
    try {
      const validator = vine.compile(
        vine.object({
          metodo_pago: vine.enum(['efectivo', 'transferencia', 'anotar']),
        })
      )
      const { metodo_pago } = await request.validateUsing(validator)

      const pago = await Pago.findOrFail(params.id)

      const hora_local = DateTime.now().setZone('America/Bogota')
      pago.metodo_pago = metodo_pago
      pago.updated_at = hora_local
      await pago.save()

      // Emitir evento para que otros dispositivos actualicen la vista
      const io = getIO()
      io.to('pagos').emit('pago_metodo_actualizado', {
        id_pago: pago.id_pago,
        metodo_pago: pago.metodo_pago,
        timestamp: new Date(),
      })

      return response.json({
        id_pago: pago.id_pago,
        metodo_pago: pago.metodo_pago,
      })
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ error: 'Pago no encontrado' })
      }
      console.error(error)
      return response.status(500).json({ error: 'Error al actualizar método de pago', detalle: error.message })
    }
  }

  // ── Buscar un pago por ID ─────────────────────────────────────────────────
  public async findById({ params, response }: HttpContext) {
    try {
      const pago = await Pago.findOrFail(params.id)
      return response.json(pago)
    } catch {
      return response.notFound({ error: 'Pago no encontrado' })
    }
  }

  // ── Total de pagos en una fecha (excluye anotados) ────────────────────────
  public async findByDate({ params, response }: HttpContext) {
    try {
      const row = await Pago.query()
        .whereRaw('DATE(created_at) = ?', [params.fecha])
        .where('metodo_pago', '!=', 'anotar')
        .sum('monto as total')
        .first()

      const total = Number(row?.$extras.total ?? 0)
      return response.json({ fecha: params.fecha, total })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los pagos' })
    }
  }

  // ── Todos los pagos de una fecha ──────────────────────────────────────────
  public async getAllbyDate({ params, response }: HttpContext) {
    try {
      const pagos = await Pago.query()
        .join('pedidos', 'pagos.id_pedido', 'pedidos.id_pedido')
        .join('mesas', 'pedidos.id_mesa', 'mesas.id_mesa')
        .join('usuarios', 'pedidos.id_usuario', 'usuarios.id_usuario')
        .whereRaw('DATE(pagos.created_at) = ?', [params.fecha])
        .orderBy('pagos.created_at', 'asc')
        .select(
          'pagos.*',
          'pedidos.id_mesa as id_mesa',
          'mesas.numero as numero_mesa',
          'usuarios.nombre_usuario as nombre_usuario'
        )

      const data = pagos.map((p) => {
        return {
          ...p.serialize(),
          Mesa: p.$extras.numero_mesa,
          Usuario: p.$extras.nombre_usuario
        }
      })

      return response.json(data)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los pagos' })
    }
  }
}