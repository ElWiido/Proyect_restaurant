import router from '@adonisjs/core/services/router'
import UsuariosController from '#controllers/usuarios_controller'

router.group(() => {
  router.get('/usuarios', [UsuariosController, 'findAll'])
  router.get('/usuarios/:id', [UsuariosController, 'findById'])
  router.post('/usuarios', [UsuariosController, 'create'])
  router.put('/usuarios/:id', [UsuariosController, 'update'])
  router.delete('/usuarios/:id', [UsuariosController, 'delete'])
})

export default router