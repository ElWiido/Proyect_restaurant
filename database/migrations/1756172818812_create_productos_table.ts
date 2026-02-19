import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'productos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_producto') 
      table.string('nombre', 100).notNullable() 
      table.decimal('precio').notNullable() 
      table.enum('categoria', ['carta', 'bebida', 'ejecutivo', 'asados', 'desayuno','otros']).notNullable() 
      table.string('descripcion', 100).notNullable() 

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}