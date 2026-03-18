import router from '@adonisjs/core/services/router'
import PrintManualController from '#controllers/print_manual_controller'

router.group(() => {
  router.post('/imprimir/pedido/:id', [PrintManualController, 'imprimirPedido'])
  router.post('/imprimir/custom',     [PrintManualController, 'imprimirCustom'])
  router.get('/imprimir/estado',      [PrintManualController, 'estadoCola'])
})

export default router
