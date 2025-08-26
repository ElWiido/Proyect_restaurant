import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Mesa from './mesa.js'
import Usuario from './usuario.js'



export default class Pedido extends BaseModel {
  public static table = 'pedidos'

  @column({ isPrimary: true })
  declare id_pedido: number

  @column()
  declare id_mesa: number

  @column()
  declare id_usuario: number

  @column()
  declare estado: 'pendiente' | 'pagado' | 'cancelado' | 'en preparacion'

  @column.dateTime({ autoCreate: true })
  declare fecha: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relaciones
  @belongsTo(() => Mesa, { foreignKey: 'id_mesa' })
  declare mesa: any

  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: any
}
