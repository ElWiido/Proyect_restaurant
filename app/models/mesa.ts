import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Mesa extends BaseModel {
  public static table = 'mesas' 

  @column({ isPrimary: true })
  declare id_mesa: number

  @column()
  declare numero: number

  @column()
  declare estado: 'libre' | 'ocupado'


  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}