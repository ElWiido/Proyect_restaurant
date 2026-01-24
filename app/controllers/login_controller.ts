import type { HttpContext } from '@adonisjs/core/http'
import { LoginValidator } from '#validators/LoginValidator'
import Usuario from '#models/usuario'
import hash from '@adonisjs/core/services/hash'

export default class LoginController {

  // Login con correo y contraseña
  public async login({ request, response }: HttpContext) {
    const data = await request.validateUsing(LoginValidator)

    try {
      // Buscar usuario por nombre_usuario
      const usuario = await Usuario.query()
        .where('nombre_usuario', data.nombre_usuario)
        .first()

      if (!usuario) {
        return response.unauthorized({
          error: 'Usuario o contraseña incorrectos',
        })
      }

      // Comparar contraseña encriptada con hash.verify()
      const contrasenaValida = await hash.verify(usuario.contrasena, data.contrasena)

      if (!contrasenaValida) {
        return response.unauthorized({
          error: 'Usuario o contraseña incorrectos',
        })
      }

      // Login exitoso
      return response.ok({
        rol: usuario.rol,
        id_usuario: usuario.id_usuario,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({
        error: 'Error al procesar el login',
      })
    }
  }

}