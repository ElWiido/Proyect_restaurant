import type { HttpContext } from '@adonisjs/core/http'
import { PagoValidator } from '#validators/PagoValidator'
import Pago from '#models/pago'
import { DateTime } from 'luxon'

export default class PagosController {

  // Crear un nuevo pago
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(PagoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const pago = await Pago.create({ ...data, created_at: hora_local, updated_at: hora_local })
    return response.status(201).json({
      id_pago: pago.id_pago,
      id_pedido: pago.id_pedido,
      monto: pago.monto,
      metodo_pago: pago.metodo_pago,
      creado: pago.created_at,
    })
  }

  //Listar todos los pagos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const pagos = await Pago.query().paginate(page, perPage)
    return pagos
  }

  //Buscar un pago por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const pago = await Pago.findOrFail(params.id)
      return response.json(pago)
    } catch {
      return response.notFound({ error: 'Pago no encontrado' })
    }
  }

  // Buscar pagos por fecha
  public async findByDate({ params, response }: HttpContext) {
    try {
      const fecha = params.fecha // se espera formato "YYYY-MM-DD"
      const pagos = await Pago.query()
        .whereRaw(`TO_CHAR(created_at, 'YYYY-MM-DD') = ?`, [fecha])
      if (pagos.length === 0) {
        return response.notFound({ error: 'No se encontraron pagos en esa fecha' })
      }
      return response.json(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ error: 'Error al buscar los pagos' })
    }
  }

  //Actualizar pago
  public async update({ params, request, response }: HttpContext) {
    const pago = await Pago.findOrFail(params.id)
    const data = request.only(['id_pedido', 'metodo_pago', 'monto'])
    const hora_actualizacion = DateTime.now().setZone('America/Bogota')
    pago.merge({...data , updated_at:hora_actualizacion})
    await pago.save()
    return response.json(pago)
  }
}