import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pagos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_pago') 
      table.integer('id_pedido').unsigned().references('id_pedido')
                                        .inTable('pedidos')  
                                        .onDelete('CASCADE')
                                        .notNullable()
      table.enum('metodo_pago', ['efectivo', 'transferencia']).notNullable() 
      table.decimal('monto').notNullable()

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}