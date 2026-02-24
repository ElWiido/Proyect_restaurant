import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Usuario from './usuario.js'
import Mesa from './mesa.js'
import DetallePedido from './detalle_pedido.js'
import Pago from './pago.js'

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

  @column()
  declare monto_editado: number

  @column.dateTime({autoCreate: true})
  declare fecha: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relaciones
  @belongsTo(() => Usuario, { foreignKey: 'id_usuario' })
  declare usuario: BelongsTo<typeof Usuario>

  @belongsTo(() => Mesa, { foreignKey: 'id_mesa' })
  declare mesa: BelongsTo<typeof Mesa>

  @hasMany(() => DetallePedido, { foreignKey: 'id_pedido' })
  declare detalles: HasMany<typeof DetallePedido>

  @hasMany(() => Pago, { foreignKey: 'id_pedido' })
  declare pagos: HasMany<typeof Pago>
}
