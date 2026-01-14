import router from '@adonisjs/core/services/router'
import DetallePedidosController from '#controllers/detalle_pedidos_controller'

router.group(() => {
  router.get('/detalle_pedidos', [DetallePedidosController, 'findAll'])
  router.get('/detalle_pedidos/:fecha', [DetallePedidosController, 'findByDate'])
  router.post('/detalle_pedidos', [DetallePedidosController, 'create'])
  router.put('/detalle_pedidos/:id', [DetallePedidosController, 'update'])
})

export default router