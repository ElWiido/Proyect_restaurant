import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'detalle_pedidos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_detalle') 
      table.integer('id_pedido').unsigned().references('id_pedido')
                                        .inTable('pedidos')  
                                        .onDelete('CASCADE')
                                        .notNullable()
      table.integer('id_producto').unsigned().references('id_producto')
                                        .inTable('productos')  
                                        .onDelete('CASCADE')
                                        .notNullable()
      table.string('detalle',255).notNullable() 
      table.integer('cantidad').notNullable()

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}