import router from '@adonisjs/core/services/router'
import PedidosController from '#controllers/pedidos_controller'

router.group(() => {
  router.get('/pedidos', [PedidosController, 'findAll'])
  router.get('/pedidos/mesa/:id', [PedidosController, 'findByPedidoMesaId'])
  router.get('/pedidos/:fecha', [PedidosController, 'findByDate'])
  router.get('/pedido/:id', [PedidosController, 'findById'])
  router.post('/pedidos', [PedidosController, 'create'])
  router.post('/pedidos/:id/productos', [PedidosController, 'addProducto'])
  router.put('/pedidos/:id', [PedidosController, 'update'])
  router.get('/pedidos/mesa/:id/pendientes', [PedidosController, 'findPendientesByMesa'])
  router.delete('/pedidos/:id', [PedidosController, 'destroy'])
})

export default router