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

const productosSoloBebidas = [
  'Gaseosa Personal',
  'Gaseosa 1.5L',
  'Cerveza',
  'Cafe',
  'Empanada',
  'Icopor',
]


export default class PedidosController {

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

      if (!mesa) return response.notFound({ error: 'Mesa no encontrada' })
      if (!usuario) return response.notFound({ error: 'Usuario no encontrado' })

      const productos = await Producto.query()
        .whereIn(
          'id_producto',
          data.detalles.map(d => d.id_producto)
        )
        .select('id_producto', 'nombre', 'precio')

      const productosMap = new Map(
        productos.map(p => [p.id_producto, p])
      )

      const pedido = await Pedido.create({
        id_mesa: data.id_mesa,
        id_usuario: data.id_usuario,
        estado: 'pendiente',
        fecha: hora_local,
      }, { client: trx })

      await Mesa.query({ client: trx })
        .where('id_mesa', data.id_mesa)
        .update({ estado: 'ocupada' })

      const detalles = data.detalles.map((d) => {
        const producto = productosMap.get(d.id_producto)

        return {
          id_pedido: pedido.id_pedido,
          id_producto: d.id_producto,
          detalle: d.detalle || '',
          cantidad: d.cantidad,
          precio_unitario: producto?.precio ?? 0,
          created_at: hora_local,
          updated_at: hora_local,
        }
      })

      await DetallePedido.createMany(detalles, { client: trx })
      await trx.commit()

      response.status(201).json({
        id_pedido: pedido.id_pedido,
        id_mesa: pedido.id_mesa,
        id_usuario: pedido.id_usuario,
        estado: pedido.estado,
        detalles,
        creado: pedido.fecha,
      })

      //Verificar si TODOS los productos son solo bebidas simples
      const todosSonSoloBebidas = detalles.every(d => {
        const producto = productosMap.get(d.id_producto)
        return productosSoloBebidas
          .map(p => p.toLowerCase())
          .includes((producto?.nombre ?? '').toLowerCase())
      })

      if (!todosSonSoloBebidas) {
        //Imprimir TODO el pedido
        imprimirPedidoPOS({
          mesa: mesa.numero ?? mesa.id_mesa,
          mesero: usuario.nombre_usuario,
          pedidoId: pedido.id_pedido,
          detalles: detalles.map(d => ({
            producto: productosMap.get(d.id_producto)?.nombre ?? 'Producto',
            nota: d.detalle,
            cantidad: d.cantidad
          }))
        }).catch(err => {
          console.error('Error impresión POS:', err)
        })
      }

      //Sockets
      const io = getIO()

      io.to('mesas').emit('mesa_actualizada', {
        id_mesa: data.id_mesa,
        estado: 'ocupada',
        pedido_id: pedido.id_pedido,
        timestamp: new Date(),
      })

      io.to('pedidos').emit('pedido_creado', {
        id_pedido: pedido.id_pedido,
        id_mesa: data.id_mesa,
        id_usuario: data.id_usuario,
        estado: 'pendiente',
        detalles,
        timestamp: new Date(),
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
          query
            .select([
              'id_detalle',
              'id_pedido',
              'id_producto',
              'detalle',
              'cantidad',
              'precio_unitario',
              'created_at',
              'updated_at',
            ])
            .preload('producto')
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
        return response.badRequest({ error: 'Pedido cerrado' })
      }

      const data = request.only(['productos']) as {
        productos: {
          id_producto: number
          cantidad: number
          detalle?: string
        }[]
      }

      if (!data.productos || data.productos.length === 0) {
        await trx.rollback()
        return response.badRequest({ error: 'No hay productos' })
      }

      const ids = data.productos.map(p => p.id_producto)

      const productosDB = await Producto.query()
        .whereIn('id_producto', ids)

      const productosMap = new Map(
        productosDB.map(p => [p.id_producto, p])
      )

      const hora = DateTime.now().setZone('America/Bogota')

      const detalles = data.productos.map(p => {
        const producto = productosMap.get(p.id_producto)

        return {
          id_pedido: pedido.id_pedido,
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          detalle: p.detalle || '',
          precio_unitario: producto?.precio ?? 0,
          created_at: hora,
          updated_at: hora,
        }
      })

      await DetallePedido.createMany(detalles, { client: trx })
      await trx.commit()

      //IMPRESIÓN EN UNA SOLA COMANDA
      setImmediate(async () => {
        try {
          const mesa = await Mesa.findOrFail(pedido.id_mesa)
          const usuario = await Usuario.findOrFail(pedido.id_usuario)

          //Validar si TODOS los productos son solo bebidas
          const todosSonSoloBebidas = detalles.every(d => {
            const producto = productosMap.get(d.id_producto)
            return productosSoloBebidas
              .map(p => p.toLowerCase())
              .includes((producto?.nombre ?? '').toLowerCase())
          })

          //Solo imprimir si NO son solo bebidas
          if (!todosSonSoloBebidas) {
            await imprimirPedidoPOS({
              mesa: mesa.numero ?? mesa.id_mesa,
              mesero: usuario.nombre_usuario,
              pedidoId: pedido.id_pedido,
              detalles: detalles.map(d => ({
                producto: productosMap.get(d.id_producto)?.nombre ?? 'Producto',
                nota: d.detalle,
                cantidad: d.cantidad
              }))
            })
          }

        } catch (err) {
          console.error('Error impresión lote:', err)
        }
      })

      //SOCKET
      const io = getIO()
      io.to('pedidos').emit('productos_agregados', {
        id_pedido: pedido.id_pedido,
        productos: detalles,
        timestamp: new Date(),
      })

      return response.status(201).json({
        message: 'Productos agregados en lote',
        detalles
      })

    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ error: 'Error al agregar productos' })
    }
  }

  //Mesas pendientes
  public async findPendientesByMesa({ params, response }: HttpContext) {
    try {
      const pedidos = await Pedido.query()
        .where('id_mesa', params.id)
        .where('estado', 'pendiente')
        .preload('detalles', (query) => {
          query
            .select([
              'id_detalle',
              'id_pedido',
              'id_producto',
              'detalle',
              'cantidad',
              'precio_unitario',
              'created_at',
              'updated_at',
            ])
            .preload('producto')
        })
        .orderBy('fecha', 'desc')

      return response.json(pedidos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar pedidos pendientes' })
    }
  }

  // Cancelar/eliminar pedido
  public async destroy({ params, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const pedido = await Pedido.findOrFail(params.id)

      // Eliminar detalles primero
      await DetallePedido.query({ client: trx })
        .where('id_pedido', pedido.id_pedido)
        .delete()

      // Liberar la mesa
      await Mesa.query({ client: trx })
        .where('id_mesa', pedido.id_mesa)
        .update({ estado: 'libre' })

      await pedido.useTransaction(trx).delete()
      await trx.commit()

      // Socket
      const io = getIO()
      io.to('mesas').emit('mesa_actualizada', {
        id_mesa: pedido.id_mesa,
        estado: 'libre',
        timestamp: new Date(),
      })

      return response.json({ message: 'Pedido cancelado exitosamente' })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al cancelar pedido' })
    }
  }

}