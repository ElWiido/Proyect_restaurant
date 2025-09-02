import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

import "./routes/usuarios.js";
import "./routes/mesas.js";
import "./routes/pagos.js"
import "./routes/producto.js"
