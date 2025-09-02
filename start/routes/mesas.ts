import router from '@adonisjs/core/services/router'
import MesasController from '#controllers/mesas_controller'

router.group(() => {
  router.get('/mesas', [MesasController, 'findAll'])
  router.get('/mesas/:id', [MesasController, 'findById'])
  router.post('/mesas', [MesasController, 'create'])
  router.delete('/mesas/:id', [MesasController, 'delete'])
})

export default router