import type { HttpContext } from '@adonisjs/core/http'
import { PedidoValidator } from '#validators/PedidoValidator'
import Pedido from '#models/pedido'
import DetallePedido from '#models/detalle_pedido'
import Mesa from '#models/mesa'
import Usuario from '#models/usuario'
import Producto from '#models/producto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

interface DetalleInput {
  id_producto: number
  detalle?: string
}

export default class PedidosController {

  // Crear un nuevo pedido con detalle
  public async create({ request, response }: HttpContext) {
    // Validar con Vine
    const data = await request.validateUsing(PedidoValidator) as {
      id_mesa: number
      id_usuario: number
      detalles: DetalleInput[]
    }
    
    const hora_local = DateTime.now().setZone('America/Bogota')

    const trx = await db.transaction()
    try {
      // Verificar que existan mesa y usuario
      const mesa = await Mesa.find(data.id_mesa)
      const usuario = await Usuario.find(data.id_usuario)
      
      if (!mesa) {
        return response.notFound({ error: 'Mesa no encontrada' })
      }
      if (!usuario) {
        return response.notFound({ error: 'Usuario no encontrado' })
      }

      // Validar que todos los productos existan
      const productosIds = data.detalles.map((d) => d.id_producto)
      const productos = await Producto.query()
        .whereIn('id_producto', productosIds)
        .exec()
      
      if (productos.length !== productosIds.length) {
        return response.notFound({ error: 'Uno o más productos no existen' })
      }

      // Crear pedido
      const pedido = await Pedido.create({
        id_mesa: data.id_mesa,
        id_usuario: data.id_usuario,
        estado: 'pendiente',
        fecha: hora_local,
      }, { client: trx })

      // Actualizar estado de la mesa a ocupada
      await Mesa.query({ client: trx })
        .where('id_mesa', data.id_mesa)
        .update({ estado: 'ocupada' })

      // Crear detalle_pedidos
      const detalles = data.detalles.map((detalle) => ({
        id_pedido: pedido.id_pedido,
        id_producto: detalle.id_producto,
        detalle: detalle.detalle || '',
        created_at: hora_local,
        updated_at: hora_local,
      }))
      await DetallePedido.createMany(detalles, { client: trx })

      await trx.commit()

      return response.status(201).json({
        id_pedido: pedido.id_pedido,
        id_mesa: pedido.id_mesa,
        id_usuario: pedido.id_usuario,
        estado: pedido.estado,
        detalles: detalles,
        creado: pedido.fecha,
      })
    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ 
        error: 'Error al crear pedido con detalle',
        detalle: error.message 
      })
    }
  }

  //Listar todos los pedidos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const pedidos = await Pedido.query()
      .preload('detalles', (query) => {
        query.preload('producto')
      })
      .orderBy('fecha', 'desc')
      .paginate(page, perPage)
    return pedidos
  }

  //Buscar un pedido por Mesa ID
  public async findByPedidoMesaId({ params, response }: HttpContext) {
    try {
      const pedido = await Pedido.query()
        .where('id_mesa', params.id)
        .preload('detalles', (query) => {
          query.preload('producto')
        })
        .orderBy('fecha', 'desc')
        .firstOrFail()
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
        .whereRaw('DATE(fecha) = ?', [fecha])
        .preload('detalles', (query) => {
          query.preload('producto')
        })
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
    try {
      const pedido = await Pedido.findOrFail(params.id)
      const data = request.only(['id_mesa', 'id_usuario', 'estado'])
      const hora_actualizacion = DateTime.now().setZone('America/Bogota')
      pedido.merge({...data , updated_at:hora_actualizacion})
      await pedido.save()
      return response.json(pedido)
    } catch (error) {
      console.error(error)
      return response.status(404).json({ error: 'Pedido no encontrado o error al actualizar' })
    }
  }
}