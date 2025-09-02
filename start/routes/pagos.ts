import router from '@adonisjs/core/services/router'
import PagosController from '#controllers/pagos_controller'

router.group(() => {
  router.get('/pagos', [PagosController, 'findAll'])
  router.get('/pagos/:id', [PagosController, 'findById'])
  router.get('/pagos/:fecha', [PagosController, 'findByDate'])
  router.post('/pagos', [PagosController, 'create'])
  router.put('/pagos/:id', [PagosController, 'update'])
})

export default router