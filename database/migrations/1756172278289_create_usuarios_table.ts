import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'usuarios'

  async up() { this.schema.createTable(this.tableName, (table) => { 
    table.increments('id_usuario') 
    table.string('nombre_usuario', 100).notNullable() 
    table.string('contrasena', 255).notNullable() 
    table.enum('rol', ['mesero', 'administrador']).notNullable() 
    
    table.timestamp('created_at') 
    table.timestamp('updated_at') }) }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
