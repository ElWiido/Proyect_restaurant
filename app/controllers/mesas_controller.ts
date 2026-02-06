import type { HttpContext } from '@adonisjs/core/http'
import { MesaValidator } from '#validators/MesaValidator'
import Mesa from '#models/mesa'
import { DateTime } from 'luxon'

export default class MesasController {
  
  // Crear una nueva mesa
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(MesaValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const mesa = await Mesa.create({...data,estado: "libre", created_at:hora_local, updated_at:hora_local})
    return response.status(201).json({
      id_mesa: mesa.id_mesa,
      numero: mesa.numero,
      estado: mesa.estado,
      Creado: mesa.created_at,
    })
  }

  //Listar todas las mesas (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 40)

    const mesas = await Mesa.query().paginate(page, perPage)
    return mesas
  }

  //Buscar una mesa por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const mesa = await Mesa.findOrFail(params.id)
      return response.json(mesa)
    } catch {
      return response.notFound({ error: 'Mesa no encontrada' })
    }
  }

  // Eliminar mesa
  public async delete({ params, response }: HttpContext) {
    try {
      const mesa = await Mesa.findOrFail(params.id)
      await mesa.delete()
      return response.ok({ message: 'Mesa eliminada correctamente' })
    } catch (error: any) {
      return response.status(404).json({
        error: 'Mesa no encontrada o error al eliminar',
        detalle: error.message, 
      })
    }
  }
}