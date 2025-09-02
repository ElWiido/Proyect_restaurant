import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Pedido from './pedido.js'

export default class Mesa extends BaseModel {
  public static table = 'mesas'

  @column({ isPrimary: true })
  declare id_mesa: number

  @column()
  declare numero: number

  @column()
  declare estado: 'libre' | 'ocupada'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relación con pedidos
  @hasMany(() => Pedido, { foreignKey: 'id_mesa' })
  declare pedidos: HasMany<typeof Pedido>
}
