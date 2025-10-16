import router from '@adonisjs/core/services/router'
import PedidosController from '#controllers/pedidos_controller'

router.group(() => {
  router.get('/pedidos', [PedidosController, 'findAll'])
  router.get('/pedidos/mesa/:id', [PedidosController, 'findByPedidoMesaId'])
  router.get('/pedidos/:fecha', [PedidosController, 'findByDate'])
  router.post('/pedidos', [PedidosController, 'create'])
  router.put('/pedidos/:id', [PedidosController, 'update'])
})

export default router