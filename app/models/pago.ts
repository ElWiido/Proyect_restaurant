import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Pedido from './pedido.js'

export default class Pago extends BaseModel {
  public static table = 'pagos'

  @column({ isPrimary: true })
  declare id_pago: number

  @column()
  declare id_pedido: number

  @column()
  declare metodo_pago: 'efectivo' | 'transferencia' | 'anotar'

  @column()
  declare monto: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relación con pedido
  @belongsTo(() => Pedido, { foreignKey: 'id_pedido' })
  declare pedido: BelongsTo<typeof Pedido>
}
