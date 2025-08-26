import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mesas'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_mesa') 
      table.integer('numero').unique() 
      table.enum('estado', ['libre', 'ocupada']).notNullable() 


      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}