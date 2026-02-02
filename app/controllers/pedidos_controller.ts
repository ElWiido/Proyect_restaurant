import type { HttpContext } from '@adonisjs/core/http'
import { PedidoValidator } from '#validators/PedidoValidator'
import Pedido from '#models/pedido'
import DetallePedido from '#models/detalle_pedido'
import Mesa from '#models/mesa'
import Usuario from '#models/usuario'
import Producto from '#models/producto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { getIO } from '#start/socket'
import { imprimirPedidoPOS } from './print_controller.js'

interface DetalleInput {
  id_producto: number
  detalle?: string
  cantidad: number
}

export default class PedidosController {

  // Crear un nuevo pedido con detalle
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(PedidoValidator) as {
      id_mesa: number
      id_usuario: number
      detalles: DetalleInput[]
    }
    
    const hora_local = DateTime.now().setZone('America/Bogota')

    const trx = await db.transaction()
    try {
      const mesa = await Mesa.find(data.id_mesa)
      const usuario = await Usuario.find(data.id_usuario)
      
      if (!mesa) {
        return response.notFound({ error: 'Mesa no encontrada' })
      }
      if (!usuario) {
        return response.notFound({ error: 'Usuario no encontrado' })
      }

      const productosIds = data.detalles.map((d) => d.id_producto)
      const productos = await Producto.query()
        .whereIn('id_producto', productosIds)
        .exec()
      
      if (productos.length !== productosIds.length) {
        return response.notFound({ error: 'Uno o más productos no existen' })
      }

      const pedido = await Pedido.create({
        id_mesa: data.id_mesa,
        id_usuario: data.id_usuario,
        estado: 'pendiente',
        fecha: hora_local,
      }, { client: trx })

      await Mesa.query({ client: trx })
        .where('id_mesa', data.id_mesa)
        .update({ estado: 'ocupada' })

      const detalles = data.detalles.map((detalle) => ({
        id_pedido: pedido.id_pedido,
        id_producto: detalle.id_producto,
        detalle: detalle.detalle || '',
        cantidad: detalle.cantidad,
        created_at: hora_local,
        updated_at: hora_local,
      }))
      await DetallePedido.createMany(detalles, { client: trx })

      await trx.commit()

      // 🔎 Consultar datos completos para imprimir
      const mesaCompleta = await Mesa.findOrFail(data.id_mesa)
      const usuarioCompleto = await Usuario.findOrFail(data.id_usuario)

      const detallesCompletos = await DetallePedido.query()
        .where('id_pedido', pedido.id_pedido)
        .preload('producto')

      // Imprimir pedido en POS
      try {
        await imprimirPedidoPOS({
          mesa: mesaCompleta.numero ?? mesaCompleta.id_mesa, 
          mesero: `${usuarioCompleto.nombre_usuario}`,
          pedidoId: pedido.id_pedido,
          detalles: detallesCompletos.map((d) => ({
            producto: d.producto.nombre,
            nota: d.detalle,
            cantidad: d.cantidad
          }))
        })
      } catch (error) {
        console.error("Error al imprimir pedido:", error)
      }


      // Obtener instancia de Socket.IO
      const io = getIO()

      // Emitir evento WebSocket a canal 'mesas'
      io.to('mesas').emit('mesa_actualizada', {
        id_mesa: data.id_mesa,
        estado: 'ocupada',
        pedido_id: pedido.id_pedido,
        timestamp: new Date(),
      })

      // Emitir evento WebSocket a canal 'pedidos'
      io.to('pedidos').emit('pedido_creado', {
        id_pedido: pedido.id_pedido,
        id_mesa: data.id_mesa,
        id_usuario: data.id_usuario,
        estado: 'pendiente',
        detalles: detalles,
        timestamp: new Date(),
      })

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

  public async findByDate({ params, response }: HttpContext) {
    try {
      const fecha = params.fecha
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

  //Buscar pedido por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const pedido = await Pedido.findOrFail(params.id)
      await pedido.load('detalles', (query) => {
        query.preload('producto')
      })
      return response.json(pedido)
    } catch {
      return response.notFound({ error: 'Pedido no encontrado' })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const pedido = await Pedido.findOrFail(params.id)
      const data = request.only(['id_mesa', 'id_usuario', 'estado'])
      const hora_actualizacion = DateTime.now().setZone('America/Bogota')
      
      pedido.merge({ ...data, updated_at: hora_actualizacion })
      await pedido.save()

      // Obtener instancia de Socket.IO
      const io = getIO()

      // Emitir evento WebSocket si cambió el estado
      if (data.estado) {
        io.to('pedidos').emit('pedido_actualizado', {
          id_pedido: pedido.id_pedido,
          id_mesa: pedido.id_mesa,
          estado: data.estado,
          timestamp: new Date(),
        })
      }

      return response.json(pedido)
    } catch (error) {
      console.error(error)
      return response.status(404).json({ error: 'Pedido no encontrado o error al actualizar' })
    }
  }

  //agregar productos al pedido
  public async addProducto({ params, request, response }: HttpContext) {
    const trx = await db.transaction()

    try {
      const pedido = await Pedido.find(params.id)

      if (!pedido) {
        await trx.rollback()
        return response.notFound({ error: 'Pedido no encontrado' })
      }

      if (pedido.estado === 'cancelado' || pedido.estado === 'pagado') {
        await trx.rollback()
        return response.badRequest({ error: 'No se puede modificar un pedido cerrado' })
      }

      const data = request.only(['id_producto', 'cantidad', 'detalle']) as {
        id_producto: number
        cantidad: number
        detalle?: string
      }

      const producto = await Producto.find(data.id_producto)
      if (!producto) {
        await trx.rollback()
        return response.notFound({ error: 'Producto no existe' })
      }

      const hora = DateTime.now().setZone('America/Bogota')

      const detalle = await DetallePedido.create({
        id_pedido: pedido.id_pedido,
        id_producto: data.id_producto,
        cantidad: data.cantidad,
        detalle: data.detalle || '',
        created_at: hora,
        updated_at: hora,
      }, { client: trx })

      await trx.commit()

      // 🔎 Traer datos completos para imprimir
      const mesa = await Mesa.findOrFail(pedido.id_mesa)
      const usuario = await Usuario.findOrFail(pedido.id_usuario)

      // 🖨️ IMPRIMIR SOLO EL NUEVO PRODUCTO
      try {
        await imprimirPedidoPOS({
          mesa: mesa.numero ?? mesa.id_mesa,
          mesero: usuario.nombre_usuario,
          pedidoId: pedido.id_pedido,
          detalles: [
            {
              producto: `${producto.nombre} x${data.cantidad}`,
              nota: data.detalle || '',
              cantidad: data.cantidad
            }
          ]
        })
      } catch (error) {
        console.error('Error al imprimir agregado:', error)
      }

      // 🔔 Socket
      const io = getIO()
      io.to('pedidos').emit('producto_agregado', {
        id_pedido: pedido.id_pedido,
        producto: {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          cantidad: data.cantidad,
          detalle: data.detalle || ''
        },
        timestamp: new Date(),
      })

      return response.status(201).json({
        message: 'Producto agregado e impreso',
        detalle
      })

    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ error: 'Error al agregar producto' })
    }
  }

}