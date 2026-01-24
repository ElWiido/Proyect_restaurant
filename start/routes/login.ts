import router from '@adonisjs/core/services/router'
import LoginController from '#controllers/login_controller'

router.group(() => {
  router.post('/login', [LoginController, 'login'])
})

export default router