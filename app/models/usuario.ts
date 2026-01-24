import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Pedido from './pedido.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Usuario extends BaseModel {
  public static table = 'usuarios'

  @column({ isPrimary: true })
  declare id_usuario: number

  @column()
  declare nombre_usuario: string

  @column()
  declare contrasena: string

  @column()
  declare rol: 'mesero' | 'administrador'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true  })
  declare updated_at: DateTime

  // Relaciones
  @hasMany(() => Pedido, { foreignKey: 'id_usuario' })
  declare pedidos: HasMany<typeof Pedido>
}
