import type { HttpContext } from '@adonisjs/core/http'
import { PedidoValidator } from '#validators/PedidoValidator'
import Pedido from '#models/pedido'
import { DateTime } from 'luxon'

export default class PedidosController {

  // Crear un nuevo pedido
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(PedidoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const pedido = await Pedido.create({ ...data, fecha: hora_local, updated_at: hora_local })
    const estado_inicial = "pendiente"
    return response.status(201).json({
      id_pedido: pedido.id_pedido,
      id_mesa: pedido.id_mesa,
      id_usuario: pedido.id_usuario,
      estado: estado_inicial,
      creado: pedido.fecha,
    })
  }

  //Listar todos los pedidos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const pedidos = await Pedido.query().paginate(page, perPage)
    return pedidos
  }

  //Buscar un pedido por Mesa ID
  public async findByPedidoMesaId({ params, response }: HttpContext) {
    try {
      const pedido = await Pedido.query().where('id_mesa', params.id).firstOrFail()
      return response.json(pedido)
    } catch {
      return response.notFound({ error: 'Pedido no encontrado' })
    }
  }

  // Buscar pedidos por fecha
  public async findByDate({ params, response }: HttpContext) {
    try {
      const fecha = params.fecha // se espera formato "YYYY-MM-DD"
      const pedidos = await Pedido.query()
        .whereRaw(`TO_CHAR(created_at, 'YYYY-MM-DD') = ?`, [fecha])
      if (pedidos.length === 0) {
        return response.notFound({ error: 'No se encontraron pedidos en esa fecha' })
      }
      return response.json(pedidos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los pedidos' })
    }
  }

  //Actualizar pedido
  public async update({ params, request, response }: HttpContext) {
    const pedido = await Pedido.findOrFail(params.id)
    const data = request.only(['id_mesa', 'id_usuario', 'estado'])
    const hora_actualizacion = DateTime.now().setZone('America/Bogota')
    pedido.merge({...data , updated_at:hora_actualizacion})
    await pedido.save()
    return response.json(pedido)
  }
}