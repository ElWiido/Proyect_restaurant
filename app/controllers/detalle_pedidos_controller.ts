import type { HttpContext } from '@adonisjs/core/http'
import { DetallePedidoValidator } from '#validators/Detalle_PedidoValidator'
import DetallePedido from '#models/detalle_pedido'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Pedido from '#models/pedido'
import Mesa from '#models/mesa'
import Usuario from '#models/usuario'
import Producto from '#models/producto'
import { printQueue } from '#jobs/print_queue'

export default class DetallePedidosController {

  public async create({ request, response }: HttpContext) {
    const data        = await request.validateUsing(DetallePedidoValidator)
    const hora_local  = DateTime.now().setZone('America/Bogota')
    const detallepedido = await DetallePedido.create({
      ...data,
      created_at: hora_local,
      updated_at: hora_local,
    })
    return response.status(201).json({
      id_pedido:      detallepedido.id_pedido,
      id_producto:    detallepedido.id_producto,
      detalle:        detallepedido.detalle,
      cantidad:       detallepedido.cantidad,
      precioUnitario: detallepedido.precioUnitario,
      creado:         detallepedido.created_at,
    })
  }

  public async findAll({ request }: HttpContext) {
    const page    = request.input('page', 1)
    const perPage = request.input('perPage', 20)
    return DetallePedido.query().paginate(page, perPage)
  }

  public async findByDate({ params, response }: HttpContext) {
    try {
      // ✅ Sintaxis MySQL correcta (antes era TO_CHAR de PostgreSQL)
      const detallepedidos = await DetallePedido.query()
        .whereRaw('DATE(created_at) = ?', [params.fecha])
      if (detallepedidos.length === 0)
        return response.notFound({ error: 'No se encontraron detalles en esa fecha' })
      return response.json(detallepedidos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los detalles' })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const detalle  = await DetallePedido.findOrFail(params.id)
      const idPedido = detalle.id_pedido
      await detalle.useTransaction(trx).delete()

      const detallesRestantes = await DetallePedido.query({ client: trx })
        .where('id_pedido', idPedido)

      const nuevoMonto = detallesRestantes.reduce(
        (sum, d) => sum + Number(d.precioUnitario) * d.cantidad, 0
      )

      const hora = DateTime.now().setZone('America/Bogota')
      await Pedido.query({ client: trx })
        .where('id_pedido', idPedido)
        .update({
          monto_editado: nuevoMonto,
          updated_at:    hora.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
        })

      await trx.commit()

      return response.json({ message: 'Producto eliminado del pedido', monto_actualizado: nuevoMonto })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al eliminar detalle', detalle: error.message })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const detallepedido = await DetallePedido.findOrFail(params.id)
      const data          = request.only(['id_pedido', 'id_producto', 'cantidad', 'precio_unitario'])
      const hora          = DateTime.now().setZone('America/Bogota')

      const detalle = request.body().hasOwnProperty('detalle')
        ? (request.input('detalle') ?? '')
        : detallepedido.detalle

      // Guardar valores anteriores para detectar cambios relevantes
      const precioAnterior  = detallepedido.precioUnitario
      const productoAnterior = detallepedido.id_producto
      const detalleAnterior = detallepedido.detalle

      detallepedido.useTransaction(trx).merge({ ...data, detalle, updated_at: hora })
      await detallepedido.save()

      const detallesActuales = await DetallePedido.query({ client: trx })
        .where('id_pedido', detallepedido.id_pedido)

      const nuevoMonto = detallesActuales.reduce(
        (sum, d) => sum + Number(d.precioUnitario) * d.cantidad, 0
      )

      await Pedido.query({ client: trx })
        .where('id_pedido', detallepedido.id_pedido)
        .update({
          monto_editado: nuevoMonto,
          updated_at:    hora.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
        })

      await trx.commit()

      // Detectar si hubo cambios que requieren reimpresión
      const bodyKeys       = Object.keys(request.body())
      const cambioPrecio   = bodyKeys.includes('precio_unitario') && Number(data.precio_unitario) !== Number(precioAnterior)
      const cambioProducto = bodyKeys.includes('id_producto') && data.id_producto !== productoAnterior
      const cambioDetalle  = request.body().hasOwnProperty('detalle') && detalle !== detalleAnterior
      const requiereImpresion = cambioPrecio || cambioProducto || cambioDetalle

      // ✅ Usar printQueue en lugar de setImmediate directo — con reintentos automáticos
      if (requiereImpresion) {
        const pedidoBase = await Pedido.findOrFail(detallepedido.id_pedido)
        const [mesa, usuario, producto] = await Promise.all([
          Mesa.findOrFail(pedidoBase.id_mesa),
          Usuario.findOrFail(pedidoBase.id_usuario),
          Producto.findOrFail(detallepedido.id_producto),
        ])
        printQueue.add({
          mesa:    mesa.numero ?? mesa.id_mesa,
          mesero:  usuario.nombre_usuario,
          pedidoId: detallepedido.id_pedido,
          detalles: [{
            producto: producto.nombre,
            nota:     detallepedido.detalle,
            cantidad: detallepedido.cantidad,
          }],
        })
      }

      return response.json({ ...detallepedido.toJSON(), monto_pedido_actualizado: nuevoMonto })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al actualizar detalle', detalle: error.message })
    }
  }
}
