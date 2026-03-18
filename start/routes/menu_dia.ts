import router from '@adonisjs/core/services/router'
import MenuDiaController from '#controllers/menu_dia_controller'

router.get('/menu-dia', [MenuDiaController, 'show'])
router.post('/menu-dia', [MenuDiaController, 'save'])
router.delete('/menu-dia', [MenuDiaController, 'destroy'])

export default router