import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Pedido from './pedido.js'
import Producto from './producto.js'

export default class DetallePedido extends BaseModel {
  public static table = 'detalle_pedidos'

  @column({ isPrimary: true })
  declare id_detalle: number

  @column()
  declare id_pedido: number

  @column()
  declare id_producto: number

  @column()
  declare detalle: string

  @column()
  declare cantidad: number

  @column()
  declare precioUnitario: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relaciones
  @belongsTo(() => Pedido, { foreignKey: 'id_pedido' })
  declare pedido: BelongsTo<typeof Pedido>

  @belongsTo(() => Producto, { foreignKey: 'id_producto' })
  declare producto: BelongsTo<typeof Producto>
}
