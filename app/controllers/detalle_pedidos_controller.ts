import type { HttpContext } from '@adonisjs/core/http'
import { DetallePedidoValidator } from '#validators/Detalle_PedidoValidator'
import DetallePedido from '#models/detalle_pedido'
import { DateTime } from 'luxon'

export default class DetallePedidosController {

  // Crear un nuevo pedido
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(DetallePedidoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const detallepedido = await DetallePedido.create({ ...data, created_at: hora_local, updated_at: hora_local })
    return response.status(201).json({
      id_pedido: detallepedido.id_pedido,
      id_producto: detallepedido.id_producto,
      detalle : detallepedido.detalle,
      cantidad : detallepedido.cantidad,
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

  //Actualizar DetallePedido
  public async update({ params, request, response }: HttpContext) {
    const detallepedido = await DetallePedido.findOrFail(params.id)
    const data = request.only(['id_pedido', 'id_producto', 'detalle', 'cantidad'])
    const hora_actualizacion = DateTime.now().setZone('America/Bogota')
    detallepedido.merge({...data , updated_at:hora_actualizacion})
    await detallepedido.save()
    return response.json(detallepedido)
  }
}