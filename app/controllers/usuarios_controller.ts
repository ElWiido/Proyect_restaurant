import type { HttpContext } from '@adonisjs/core/http'
import { UsuarioValidator } from '#validators/UsuarioValidator'
import Usuario from '#models/usuario'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

export default class UsuariosController {

  // Crear un nuevo usuario
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(UsuarioValidator)
    const hashcontrasena = await hash.make(data.contrasena)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const usuario = await Usuario.create({...data,contrasena: hashcontrasena, rol:'mesero', created_at:hora_local, updated_at:hora_local})
    return response.status(201).json({
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      Creado: usuario.created_at,
    })
  }

  //Listar todos los usuarios (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const usuarios = await Usuario.query().paginate(page, perPage)
    return usuarios
  }

  //Buscar un usuario por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.findOrFail(params.id)
      return response.json(usuario)
    } catch {
      return response.notFound({ error: 'Usuario no encontrado' })
    }
  }

  //Actualizar usuario
  public async update({ params, request, response }: HttpContext) {
    const usuario = await Usuario.findOrFail(params.id)
    const data = request.only(['nombre', 'correo', 'rol'])
    const hora_actualizacion = DateTime.now().setZone('America/Bogota')
    usuario.merge({...data , updated_at:hora_actualizacion})
    await usuario.save()
    return response.json(usuario)
  }

  // Eliminar usuario
  public async delete({ params, response }: HttpContext) {
    try {
      const usuario = await Usuario.findOrFail(params.id)
      await usuario.delete()
      return response.ok({ message: 'Usuario eliminado correctamente' })
    } catch (error: any) {
      return response.status(404).json({
        error: 'Usuario no encontrado o error al eliminar',
        detalle: error.message, 
      })
    }
  }
}
