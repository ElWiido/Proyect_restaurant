import type { HttpContext } from '@adonisjs/core/http'
import { ProductoValidator } from '#validators/ProductoValidator'
import Producto from '#models/producto'
import { DateTime } from 'luxon'

export default class ProductosController {

  // Crear un nuevo producto
  public async create({ request, response }: HttpContext) {
    const data = await request.validateUsing(ProductoValidator)
    const hora_local = DateTime.now().setZone('America/Bogota')
    const producto = await Producto.create({...data, created_at:hora_local, updated_at:hora_local})
    return response.status(201).json({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio: producto.precio,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      Creado: producto.created_at,
    })
  }

  //Listar todos los productos (con paginación)
  public async findAll({ request }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 80)

    const productos = await Producto.query().paginate(page, perPage)
    return productos
  }

  //Buscar un producto por ID
  public async findById({ params, response }: HttpContext) {
    try {
      const producto = await Producto.findOrFail(params.id)
      return response.json(producto)
    } catch {
      return response.notFound({ error: 'Producto no encontrado' })
    }
  }

  //Actualizar producto
  public async update({ params, request, response }: HttpContext) {
    const producto = await Producto.findOrFail(params.id)
    const data = request.only(['nombre', 'precio', 'categoria', 'descripcion'])
    const hora_actualizacion = DateTime.now().setZone('America/Bogota')
    producto.merge({...data , updated_at:hora_actualizacion})
    await producto.save()
    return response.json(producto)
  }

  // Eliminar producto
  public async delete({ params, response }: HttpContext) {
    try {
      const producto = await Producto.findOrFail(params.id)
      await producto.delete()
      return response.ok({ message: 'Producto eliminado correctamente' })
    } catch (error: any) {
      return response.status(404).json({
        error: 'Producto no encontrado o error al eliminar',
        detalle: error.message, 
      })
    }
  }
}
