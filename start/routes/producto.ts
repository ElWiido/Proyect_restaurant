import router from '@adonisjs/core/services/router'
import ProductosController from '#controllers/productos_controller'

router.group(() => {
  router.get('/productos', [ProductosController, 'findAll'])
  router.get('/productos/:id', [ProductosController, 'findById'])
  router.post('/productos', [ProductosController, 'create'])
  router.put('/productos/:id', [ProductosController, 'update'])
  router.delete('/productos/:id', [ProductosController, 'delete'])
})

export default router