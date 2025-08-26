import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pedidos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_pedido') 
      table.integer('id_mesa').unsigned().references('id_mesa')
                                        .inTable('mesas')  
                                        .onDelete('CASCADE')
                                        .notNullable()
      table.integer('id_usuario').unsigned()
                                .references('id_usuario')
                                .inTable('usuarios')
                                .onDelete('CASCADE')
                                .notNullable()
      table.enum('estado', ['pendiente', 'pagado', 'cancelado', 'en preparacion']).notNullable()

      table.timestamp('fecha').defaultTo(this.now())
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}