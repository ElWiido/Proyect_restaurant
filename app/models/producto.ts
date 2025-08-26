import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Producto extends BaseModel {
  public static table = 'productos'

  @column({ isPrimary: true })
  declare id_producto: number

  @column()
  declare nombre: string

  @column()
  declare precio: number

  @column()
  declare categoria: 'A la carta' | 'bebida' | 'ejecutivo'

  @column()
  declare descripcion: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
