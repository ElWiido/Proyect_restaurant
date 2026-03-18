import router from '@adonisjs/core/services/router'
import RankingController from '#controllers/ranking_controller'

router.group(() => {
  router.get('/ranking/productos', [RankingController, 'productosTop'])
  router.get('/ranking/meseros',   [RankingController, 'meserosTop'])
  router.get('/ranking/resumen',   [RankingController, 'resumenDia'])
  router.get('/ranking/resumen-mes', [RankingController, 'resumenMes'])
})

export default router
