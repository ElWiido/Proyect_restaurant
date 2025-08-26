import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Usuario extends BaseModel {
  public static table = 'usuarios'

  @column({ isPrimary: true })
  declare id_usuario: number

  @column()
  declare nombre: string

  @column()
  declare correo: string

  @column()
  declare contrasena: string

  @column()
  declare rol: 'mesero' | 'administrador'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
