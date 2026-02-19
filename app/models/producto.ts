import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import DetallePedido from './detalle_pedido.js'

export default class Producto extends BaseModel {
  public static table = 'productos'

  @column({ isPrimary: true })
  declare id_producto: number

  @column()
  declare nombre: string

  @column()
  declare precio: number

  @column()
  declare categoria: 'carta' | 'bebida' | 'ejecutivo' | 'asados' | 'desayuno' | 'otros'

  @column()
  declare descripcion: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relación con detalles
  @hasMany(() => DetallePedido, { foreignKey: 'id_producto' })
  declare detalles: HasMany<typeof DetallePedido>
}
