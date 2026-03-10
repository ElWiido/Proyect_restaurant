import type { HttpContext } from '@adonisjs/core/http'
import { DetallePedidoValidator } from '#validators/Detalle_PedidoValidator'
import DetallePedido from '#models/detalle_pedido' 
import { DateTime } from 'luxon'
import { imprimirPedidoPOS } from './print_controller.js'
import db from '@adonisjs/lucid/services/db'
import Pedido from '#models/pedido'
import Mesa from '#models/mesa'
import Usuario from '#models/usuario'
import Producto from '#models/producto'

export default class DetallePedidosController {

  // Crear un nuevo pedido
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(DetallePedidoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const detallepedido = await DetallePedido.create({
      ...data,
      created_at: hora_local,
      updated_at: hora_local,
    })
    return response.status(201).json({
      id_pedido: detallepedido.id_pedido,
      id_producto: detallepedido.id_producto,
      detalle: detallepedido.detalle,
      cantidad: detallepedido.cantidad,
      precioUnitario: detallepedido.precioUnitario,
      creado: detallepedido.created_at,
    })
  }

  //Listar todos los DetallePedidos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const detallepedidos = await DetallePedido.query().paginate(page, perPage)
    return detallepedidos
  }


  // Buscar DetallePedidos por fecha
  public async findByDate({ params, response }: HttpContext) {
    try {
      const fecha = params.fecha // se espera formato "YYYY-MM-DD"
      const detallepedidos = await DetallePedido.query()
        .whereRaw(`TO_CHAR(created_at, 'YYYY-MM-DD') = ?`, [fecha])
      if (detallepedidos.length === 0) {
        return response.notFound({ error: 'No se encontraron DetallePedidos en esa fecha' })
      }
      return response.json(detallepedidos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los DetallePedidos' })
    }
  }

  // ✅ Eliminar un detalle y recalcular monto_editado del pedido
  public async destroy({ params, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const detalle = await DetallePedido.findOrFail(params.id)
      const idPedido = detalle.id_pedido
      await detalle.useTransaction(trx).delete()

      // Recalcular monto_editado desde los detalles restantes
      const detallesRestantes = await DetallePedido.query({ client: trx })
        .where('id_pedido', idPedido)

      const nuevoMonto = detallesRestantes.reduce(
        (sum, d) => sum + Number(d.precioUnitario) * d.cantidad,
        0
      )

      const hora = DateTime.now().setZone('America/Bogota')
      await Pedido.query({ client: trx })
        .where('id_pedido', idPedido)
        .update({
          monto_editado: nuevoMonto,
          updated_at: hora.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
        })

      await trx.commit()

      return response.json({
        message: 'Producto eliminado del pedido',
        monto_actualizado: nuevoMonto,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al eliminar detalle', detalle: error.message })
    }
  }

  // ✅ Update ya existente — se agrega recálculo del total
  public async update({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const detallepedido = await DetallePedido.findOrFail(params.id)
      const data = request.only(['id_pedido', 'id_producto', 'cantidad', 'precio_unitario'])
      const hora_actualizacion = DateTime.now().setZone('America/Bogota')

      const detalle = request.body().hasOwnProperty('detalle')
        ? (request.input('detalle') ?? '')
        : detallepedido.detalle

      detallepedido.useTransaction(trx).merge({ ...data, detalle, updated_at: hora_actualizacion })
      await detallepedido.save()

      // ✅ Recalcular monto_editado desde todos los detalles actuales
      const detallesActuales = await DetallePedido.query({ client: trx })
        .where('id_pedido', detallepedido.id_pedido)

      const nuevoMonto = detallesActuales.reduce(
        (sum, d) => sum + Number(d.precioUnitario) * d.cantidad,
        0
      )

      await Pedido.query({ client: trx })
        .where('id_pedido', detallepedido.id_pedido)
        .update({
          monto_editado: nuevoMonto,
          updated_at: hora_actualizacion.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
        })

      await trx.commit()

      // Imprimir comanda actualizada
      setImmediate(async () => {
        try {
          const pedido = await Pedido.findOrFail(detallepedido.id_pedido)
          const mesa = await Mesa.findOrFail(pedido.id_mesa)
          const usuario = await Usuario.findOrFail(pedido.id_usuario)
          const producto = await Producto.findOrFail(detallepedido.id_producto)

          await imprimirPedidoPOS({
            mesa: mesa.numero ?? mesa.id_mesa,
            mesero: usuario.nombre_usuario,
            pedidoId: pedido.id_pedido,
            detalles: [{
              producto: producto.nombre,
              nota: detallepedido.detalle,
              cantidad: detallepedido.cantidad,
            }]
          })
        } catch (err) {
          console.error('Error impresión actualización:', err)
        }
      })

      return response.json({ ...detallepedido.toJSON(), monto_pedido_actualizado: nuevoMonto })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al actualizar detalle', detalle: error.message })
    }
  }
}