import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class RankingController {

  /**
   * GET /ranking/productos?mes=2026-03&limite=10
   * Productos más vendidos — filtra por mes completo (YYYY-MM)
   */
  public async productosTop({ request, response }: HttpContext) {
    try {
      const mesParam = request.input('mes')   // ← antes era 'fecha'
      const limite   = Number(request.input('limite', 10))

      const query = db
        .from('detalle_pedidos as dp')
        .join('productos as p', 'dp.id_producto', 'p.id_producto')
        .join('pedidos as pe',  'dp.id_pedido',   'pe.id_pedido')
        .select(
          'p.id_producto',
          'p.nombre',
          'p.categoria',
          db.raw('SUM(dp.cantidad) as total_vendido'),
          db.raw('SUM(dp.cantidad * dp.precio_unitario) as total_ingresos'),
          db.raw('COUNT(DISTINCT dp.id_pedido) as en_pedidos'),
        )
        .whereNot('pe.estado', 'cancelado')
        .groupBy('p.id_producto', 'p.nombre', 'p.categoria')
        .orderBy('total_vendido', 'desc')
        .limit(limite)

      // Si viene mes (YYYY-MM), filtrar con YEAR + MONTH en lugar de DATE =
      if (mesParam) {
        const [anio, mes] = mesParam.split('-')
        query.whereRaw('YEAR(dp.created_at) = ? AND MONTH(dp.created_at) = ?', [anio, mes])
      }

      const result = await query

      return response.json({
        mes: mesParam ?? 'todos los tiempos',
        productos: result.map((r: any) => ({
          id_producto:    r.id_producto,
          nombre:         r.nombre,
          categoria:      r.categoria,
          total_vendido:  Number(r.total_vendido),
          total_ingresos: Number(r.total_ingresos),
          en_pedidos:     Number(r.en_pedidos),
        })),
      })
    } catch (error: any) {
      console.error(error)
      return response.internalServerError({ error: 'Error al obtener ranking de productos' })
    }
  }

  /**
   * GET /ranking/meseros?mes=2026-03&limite=10
   * Meseros que más venden — filtra por mes completo (YYYY-MM)
   */
  public async meserosTop({ request, response }: HttpContext) {
    try {
      const mesParam = request.input('mes')   // ← antes era 'fecha'
      const limite   = Number(request.input('limite', 10))

      const query = db
        .from('pedidos as pe')
        .join('usuarios as u', 'pe.id_usuario', 'u.id_usuario')
        .join('pagos as pa',   'pe.id_pedido',  'pa.id_pedido')
        .select(
          'u.id_usuario',
          'u.nombre_usuario',
          db.raw('COUNT(DISTINCT pe.id_pedido) as total_pedidos'),
          db.raw('SUM(pa.monto) as total_vendido'),
          db.raw('AVG(pa.monto) as ticket_promedio'),
        )
        .whereNot('pe.estado', 'cancelado')
        .groupBy('u.id_usuario', 'u.nombre_usuario')
        .orderBy('total_vendido', 'desc')
        .limit(limite)

      // Si viene mes (YYYY-MM), filtrar con YEAR + MONTH
      if (mesParam) {
        const [anio, mes] = mesParam.split('-')
        query.whereRaw('YEAR(pe.fecha) = ? AND MONTH(pe.fecha) = ?', [anio, mes])
      }

      const result = await query

      return response.json({
        mes: mesParam ?? 'todos los tiempos',
        meseros: result.map((r: any) => ({
          id_usuario:      r.id_usuario,
          nombre_usuario:  r.nombre_usuario,
          total_pedidos:   Number(r.total_pedidos),
          total_vendido:   Number(r.total_vendido),
          ticket_promedio: Number(Number(r.ticket_promedio).toFixed(0)),
        })),
      })
    } catch (error: any) {
      console.error(error)
      return response.internalServerError({ error: 'Error al obtener ranking de meseros' })
    }
  }

  /**
   * GET /ranking/resumen?fecha=2026-03-16
   * Resumen del día (sin cambios)
   */
  public async resumenDia({ request, response }: HttpContext) {
    try {
      const fecha = request.input('fecha', new Date().toISOString().split('T')[0])

      const [ventas, pedidos, productoTop, meseroTop] = await Promise.all([
        db.from('pagos')
          .whereRaw('DATE(created_at) = ?', [fecha])
          .where('metodo_pago', '!=', 'anotar')
          .sum('monto as total')
          .first(),

        db.from('pedidos')
          .whereRaw('DATE(fecha) = ?', [fecha])
          .whereNot('estado', 'cancelado')
          .count('* as total')
          .first(),

        db.from('detalle_pedidos as dp')
          .join('productos as p', 'dp.id_producto', 'p.id_producto')
          .join('pedidos as pe', 'dp.id_pedido', 'pe.id_pedido')
          .whereRaw('DATE(dp.created_at) = ?', [fecha])
          .whereNot('pe.estado', 'cancelado')
          .select('p.nombre', db.raw('SUM(dp.cantidad) as total'))
          .groupBy('p.id_producto', 'p.nombre')
          .orderBy('total', 'desc')
          .first(),

        db.from('pedidos as pe')
          .join('usuarios as u', 'pe.id_usuario', 'u.id_usuario')
          .join('pagos as pa', 'pe.id_pedido', 'pa.id_pedido')
          .whereRaw('DATE(pe.fecha) = ?', [fecha])
          .whereNot('pe.estado', 'cancelado')
          .select('u.nombre_usuario', db.raw('SUM(pa.monto) as total'))
          .groupBy('u.id_usuario', 'u.nombre_usuario')
          .orderBy('total', 'desc')
          .first(),
      ])

      return response.json({
        fecha,
        total_ventas:  Number((ventas as any)?.total ?? 0),
        total_pedidos: Number((pedidos as any)?.total ?? 0),
        producto_top:  productoTop ? { nombre: (productoTop as any).nombre, vendido: Number((productoTop as any).total) } : null,
        mesero_top:    meseroTop   ? { nombre: (meseroTop as any).nombre_usuario, vendido: Number((meseroTop as any).total) } : null,
      })
    } catch (error: any) {
      console.error(error)
      return response.internalServerError({ error: 'Error al obtener resumen del día' })
    }
  }

  /**
   * GET /ranking/resumen-mes?mes=2026-03
   * Resumen del mes (sin cambios, ya usaba YEAR + MONTH correctamente)
   */
  public async resumenMes({ request, response }: HttpContext) {
    try {
      const mesParam = request.input('mes', new Date().toISOString().slice(0, 7))
      const [anio, mes] = mesParam.split('-')

      const [ventas, pedidos, productoTop, meseroTop, porDia] = await Promise.all([
        db.from('pagos')
          .whereRaw('YEAR(created_at) = ? AND MONTH(created_at) = ?', [anio, mes])
          .where('metodo_pago', '!=', 'anotar')
          .sum('monto as total')
          .first(),

        db.from('pedidos')
          .whereRaw('YEAR(fecha) = ? AND MONTH(fecha) = ?', [anio, mes])
          .whereNot('estado', 'cancelado')
          .count('* as total')
          .first(),

        db.from('detalle_pedidos as dp')
          .join('productos as p', 'dp.id_producto', 'p.id_producto')
          .join('pedidos as pe', 'dp.id_pedido', 'pe.id_pedido')
          .whereRaw('YEAR(dp.created_at) = ? AND MONTH(dp.created_at) = ?', [anio, mes])
          .whereNot('pe.estado', 'cancelado')
          .select('p.nombre', db.raw('SUM(dp.cantidad) as total'))
          .groupBy('p.id_producto', 'p.nombre')
          .orderBy('total', 'desc')
          .first(),

        db.from('pedidos as pe')
          .join('usuarios as u', 'pe.id_usuario', 'u.id_usuario')
          .join('pagos as pa', 'pe.id_pedido', 'pa.id_pedido')
          .whereRaw('YEAR(pe.fecha) = ? AND MONTH(pe.fecha) = ?', [anio, mes])
          .whereNot('pe.estado', 'cancelado')
          .select('u.nombre_usuario', db.raw('SUM(pa.monto) as total'))
          .groupBy('u.id_usuario', 'u.nombre_usuario')
          .orderBy('total', 'desc')
          .first(),

        db.from('pagos')
          .whereRaw('YEAR(created_at) = ? AND MONTH(created_at) = ?', [anio, mes])
          .where('metodo_pago', '!=', 'anotar')
          .select(
            db.raw('DATE(created_at) as dia'),
            db.raw('SUM(monto) as total_ventas'),
            db.raw('COUNT(*) as total_pagos')
          )
          .groupByRaw('DATE(created_at)')
          .orderBy('total_ventas', 'desc'),
      ])

      return response.json({
        mes: mesParam,
        total_ventas:  Number((ventas as any)?.total ?? 0),
        total_pedidos: Number((pedidos as any)?.total ?? 0),
        producto_top:  productoTop ? { nombre: (productoTop as any).nombre, vendido: Number((productoTop as any).total) } : null,
        mesero_top:    meseroTop   ? { nombre: (meseroTop as any).nombre_usuario, vendido: Number((meseroTop as any).total) } : null,
        por_dia: porDia.map((d: any) => ({
          dia:          d.dia,
          total_ventas: Number(d.total_ventas),
          total_pagos:  Number(d.total_pagos),
        })),
      })
    } catch (error: any) {
      console.error(error)
      return response.internalServerError({ error: 'Error al obtener resumen del mes' })
    }
  }
}