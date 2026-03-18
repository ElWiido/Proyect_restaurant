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
import { printQueue } from '#jobs/print_queue'

interface DetalleInput {
  id_producto: number
  detalle?: string
  cantidad: number
}

const PRODUCTOS_SIN_IMPRESION = [
  'gaseosa personal', 'gaseosa 1.5l', 'coca-cola 1.5l', 'botella con agua',
  'gatorade', 'pony malta', 'speedmax', 'bretaña', 'hidralyte', 'vive100',
  'amper', 'sabiloe', 'cerveza', 'sopa', 'carne', 'porcion arroz',
  'porcion francesa', 'cafe', 'chocolate', 'empanada', 'icopor', 'mazamorra',
  'pintadito', 'milo', 'milito', 'productos mostrador',
]

function debeImprimir(detalles: any[], productosMap: Map<number, any>): boolean {
  return !detalles.every(d => {
    const nombre = (productosMap.get(d.id_producto)?.nombre ?? '').toLowerCase()
    return PRODUCTOS_SIN_IMPRESION.includes(nombre)
  })
}

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
      // Consultar mesa y usuario en paralelo
      const [mesa, usuario] = await Promise.all([
        Mesa.find(data.id_mesa),
        Usuario.find(data.id_usuario),
      ])

      if (!mesa)    return response.notFound({ error: 'Mesa no encontrada' })
      if (!usuario) return response.notFound({ error: 'Usuario no encontrado' })

      const productos = await Producto.query()
        .whereIn('id_producto', data.detalles.map(d => d.id_producto))
        .select('id_producto', 'nombre', 'precio')

      const productosMap = new Map(productos.map(p => [p.id_producto, p]))

      const monto_editado = data.detalles.reduce((sum, d) => {
        return sum + Number(productosMap.get(d.id_producto)?.precio ?? 0) * d.cantidad
      }, 0)

      const pedido = await Pedido.create({
        id_mesa:      data.id_mesa,
        id_usuario:   data.id_usuario,
        estado:       'pendiente',
        monto_editado,
        fecha:        hora_local,
      }, { client: trx })

      await Mesa.query({ client: trx })
        .where('id_mesa', data.id_mesa)
        .update({ estado: 'ocupada' })

      const detalles = data.detalles.map((d) => ({
        id_pedido:      pedido.id_pedido,
        id_producto:    d.id_producto,
        detalle:        d.detalle || '',
        cantidad:       d.cantidad,
        precio_unitario: productosMap.get(d.id_producto)?.precio ?? 0,
        created_at:     hora_local,
        updated_at:     hora_local,
      }))

      await DetallePedido.createMany(detalles, { client: trx })
      await trx.commit()

      // Responder INMEDIATO — impresión y sockets van después
      response.status(201).json({
        id_pedido:     pedido.id_pedido,
        id_mesa:       pedido.id_mesa,
        id_usuario:    pedido.id_usuario,
        estado:        pedido.estado,
        monto_editado: pedido.monto_editado,
        detalles,
        creado:        pedido.fecha,
      })

      // Cola de impresión async (no bloquea)
      if (debeImprimir(detalles, productosMap)) {
        printQueue.add({
          mesa:    mesa.numero ?? mesa.id_mesa,
          mesero:  usuario.nombre_usuario,
          pedidoId: pedido.id_pedido,
          detalles: detalles.map(d => ({
            producto: productosMap.get(d.id_producto)?.nombre ?? 'Producto',
            nota:     d.detalle,
            cantidad: d.cantidad,
          })),
        })
      }

      // Sockets
      const io = getIO()
      io.to('mesas').emit('mesa_actualizada', {
        id_mesa: data.id_mesa, estado: 'ocupada',
        pedido_id: pedido.id_pedido, timestamp: new Date(),
      })
      io.to('pedidos').emit('pedido_creado', {
        id_pedido: pedido.id_pedido, id_mesa: data.id_mesa,
        id_usuario: data.id_usuario, estado: 'pendiente',
        monto_editado: pedido.monto_editado, timestamp: new Date(),
      })

    } catch (error: any) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({ error: 'Error al crear pedido', detalle: error.message })
    }
  }

  public async findAll({ request }: HttpContext) {
    const page    = request.input('page', 1)
    const perPage = request.input('perPage', 20)
    return Pedido.query()
      .preload('detalles', q => q.preload('producto'))
      .orderBy('fecha', 'desc')
      .paginate(page, perPage)
  }

  public async findByPedidoMesaId({ params, response }: HttpContext) {
    try {
      const pedido = await Pedido.query()
        .where('id_mesa', params.id)
        .preload('detalles', q =>
          q.select(['id_detalle','id_pedido','id_producto','detalle','cantidad','precio_unitario','created_at','updated_at'])
           .preload('producto')
        )
        .orderBy('fecha', 'desc')
        .firstOrFail()
      return response.json(pedido)
    } catch {
      return response.notFound({ error: 'Pedido no encontrado' })
    }
  }

  public async findByDate({ params, response }: HttpContext) {
    try {
      const pedidos = await Pedido.query()
        .whereRaw('DATE(fecha) = ?', [params.fecha])
        .preload('detalles', q => q.preload('producto'))
      if (pedidos.length === 0)
        return response.notFound({ error: 'No se encontraron pedidos en esa fecha' })
      return response.json(pedidos)
    } catch (error) {
      return response.internalServerError({ error: 'Error al buscar pedidos' })
    }
  }

  public async findById({ params, response }: HttpContext) {
    try {
      const pedido = await Pedido.findOrFail(params.id)
      await pedido.load('detalles', q => q.preload('producto'))
      await pedido.load('usuario')
      return response.json({ ...pedido.serialize(), nombreUsuario: pedido.usuario?.nombre_usuario ?? '' })
    } catch {
      return response.notFound({ error: 'Pedido no encontrado' })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const pedido = await Pedido.findOrFail(params.id)
      const data   = request.only(['id_mesa', 'id_usuario', 'estado'])
      pedido.merge({ ...data, updated_at: DateTime.now().setZone('America/Bogota') })
      await pedido.save()

      if (data.estado) {
        getIO().to('pedidos').emit('pedido_actualizado', {
          id_pedido: pedido.id_pedido, id_mesa: pedido.id_mesa,
          estado: data.estado, timestamp: new Date(),
        })
      }
      return response.json(pedido)
    } catch (error) {
      return response.status(404).json({ error: 'Pedido no encontrado o error al actualizar' })
    }
  }

  public async updateMonto({ params, request, response }: HttpContext) {
    try {
      const { monto_editado } = request.only(['monto_editado'])
      if (monto_editado === undefined || monto_editado === null)
        return response.badRequest({ error: 'monto_editado es requerido' })
      const pedido = await Pedido.findOrFail(params.id)
      pedido.merge({ monto_editado: Number(monto_editado), updated_at: DateTime.now().setZone('America/Bogota') })
      await pedido.save()
      return response.json({ id_pedido: pedido.id_pedido, monto_editado: pedido.monto_editado })
    } catch (error) {
      return response.status(404).json({ error: 'Pedido no encontrado o error al actualizar monto' })
    }
  }

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

      const data = request.only(['productos']) as { productos: { id_producto: number; cantidad: number; detalle?: string }[] }
      if (!data.productos || data.productos.length === 0) {
        await trx.rollback()
        return response.badRequest({ error: 'No hay productos' })
      }

      const productosDB  = await Producto.query().whereIn('id_producto', data.productos.map(p => p.id_producto))
      const productosMap = new Map(productosDB.map(p => [p.id_producto, p]))
      const hora         = DateTime.now().setZone('America/Bogota')

      const detalles = data.productos.map(p => ({
        id_pedido:      pedido.id_pedido,
        id_producto:    p.id_producto,
        cantidad:       p.cantidad,
        detalle:        p.detalle || '',
        precio_unitario: productosMap.get(p.id_producto)?.precio ?? 0,
        created_at:     hora,
        updated_at:     hora,
      }))

      await DetallePedido.createMany(detalles, { client: trx })

      const sumaNuevos   = detalles.reduce((sum, d) => sum + Number(d.precio_unitario) * d.cantidad, 0)
      const pedidoActual = await Pedido.query({ client: trx }).where('id_pedido', pedido.id_pedido).firstOrFail()
      const nuevoMonto   = Number(pedidoActual.monto_editado) + sumaNuevos

      await Pedido.query({ client: trx })
        .where('id_pedido', pedido.id_pedido)
        .update({ monto_editado: nuevoMonto, updated_at: hora.toUTC().toFormat('yyyy-MM-dd HH:mm:ss') })

      await trx.commit()

      // Cola de impresión async
      if (debeImprimir(detalles, productosMap)) {
        const [mesa, usuario] = await Promise.all([
          Mesa.findOrFail(pedido.id_mesa),
          Usuario.findOrFail(pedido.id_usuario),
        ])
        printQueue.add({
          mesa:    mesa.numero ?? mesa.id_mesa,
          mesero:  usuario.nombre_usuario,
          pedidoId: pedido.id_pedido,
          detalles: detalles.map(d => ({
            producto: productosMap.get(d.id_producto)?.nombre ?? 'Producto',
            nota:     d.detalle,
            cantidad: d.cantidad,
          })),
        })
      }

      getIO().to('pedidos').emit('productos_agregados', {
        id_pedido: pedido.id_pedido, productos: detalles, timestamp: new Date(),
      })

      return response.status(201).json({ message: 'Productos agregados en lote', detalles })

    } catch (error: any) {
      await trx.rollback()
      return response.internalServerError({ error: 'Error al agregar productos' })
    }
  }

  public async findPendientesByMesa({ params, response }: HttpContext) {
    try {
      const pedidos = await Pedido.query()
        .where('id_mesa', params.id)
        .where('estado', 'pendiente')
        .preload('detalles', q =>
          q.select(['id_detalle','id_pedido','id_producto','detalle','cantidad','precio_unitario','created_at','updated_at'])
           .preload('producto')
        )
        .orderBy('fecha', 'desc')
      return response.json(pedidos)
    } catch (error) {
      return response.internalServerError({ error: 'Error al buscar pedidos pendientes' })
    }
  }

  public async cambiarMesa({ params, request, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const pedido = await Pedido.findOrFail(params.id)
      if (pedido.estado === 'pagado' || pedido.estado === 'cancelado') {
        await trx.rollback()
        return response.badRequest({ error: 'No se puede cambiar la mesa de un pedido cerrado' })
      }

      const { id_mesa_nueva } = request.only(['id_mesa_nueva'])
      if (!id_mesa_nueva) {
        await trx.rollback()
        return response.badRequest({ error: 'id_mesa_nueva es requerido' })
      }

      const mesaNueva = await Mesa.find(id_mesa_nueva)
      if (!mesaNueva) {
        await trx.rollback()
        return response.notFound({ error: 'Mesa destino no encontrada' })
      }

      const mesaAnteriorId = pedido.id_mesa
      const hora           = DateTime.now().setZone('America/Bogota')

      await Mesa.query({ client: trx }).where('id_mesa', mesaAnteriorId).update({ estado: 'libre' })
      await Mesa.query({ client: trx }).where('id_mesa', id_mesa_nueva).update({ estado: 'ocupada' })
      await Pedido.query({ client: trx })
        .where('id_pedido', pedido.id_pedido)
        .update({ id_mesa: id_mesa_nueva, updated_at: hora.toUTC().toFormat('yyyy-MM-dd HH:mm:ss') })

      await trx.commit()

      const io = getIO()
      io.to('mesas').emit('mesa_actualizada', { id_mesa: mesaAnteriorId, estado: 'libre',   timestamp: new Date() })
      io.to('mesas').emit('mesa_actualizada', { id_mesa: id_mesa_nueva,  estado: 'ocupada', timestamp: new Date() })

      return response.json({ message: 'Mesa cambiada correctamente', id_pedido: pedido.id_pedido, id_mesa_anterior: mesaAnteriorId, id_mesa_nueva })
    } catch (error: any) {
      await trx.rollback()
      return response.status(500).json({ error: 'Error al cambiar mesa', detalle: error.message })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    const trx = await db.transaction()
    try {
      const pedido = await Pedido.findOrFail(params.id)
      await DetallePedido.query({ client: trx }).where('id_pedido', pedido.id_pedido).delete()
      await Mesa.query({ client: trx }).where('id_mesa', pedido.id_mesa).update({ estado: 'libre' })
      await pedido.useTransaction(trx).delete()
      await trx.commit()

      getIO().to('mesas').emit('mesa_actualizada', { id_mesa: pedido.id_mesa, estado: 'libre', timestamp: new Date() })
      return response.json({ message: 'Pedido cancelado exitosamente' })
    } catch (error) {
      await trx.rollback()
      return response.status(500).json({ error: 'Error al cancelar pedido' })
    }
  }
}
