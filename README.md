# Backend Restaurante
Esta API gestiona usuarios, productos, mesas, pedidos (con detalles) y pagos. 
Construida con AdonisJS, Lucid ORM y MySQL.

## Stack(Backend)
Node Version: 22.18.0
AdonisJS (HTTP, VineJS validators, Lucid ORM)
Base de datos: MySql 9.4.0

## Stack(Frontend)
Flutter 3.38.4
Android Studio

## Configuración
1. Clonar el repo y entrar al proyecto.
2. Instalar dependencias:
   - Windows (PowerShell):
     ```
     npm install
     ```
3. Configurar `.env` (DB, puerto, etc.). ASI:
   ```
    TZ=UTC
    HOST=localhost
    LOG_LEVEL=info
    APP_KEY=tu_appkey
    NODE_ENV=development
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=tu_password
    DB_DATABASE=restaurante
    PORT=3333
   ```
4. Ejecutar migraciones:
   ```
   node ace migration:run
   ```

## Ejecución
- Desarrollo:
  ```
  node ace serve --watch
  ```
- La API estará en: `http://localhost:3333`

## Endpoints

### Usuarios
- POST /usuarios
- GET /usuarios
- GET /usuarios/:id
- PUT /usuarios/:id
- DELETE /usuarios/:id

Body (crear):
```json
{
  "nombre": "Juan",
  "correo": "juan@example.com",
  "contrasena": "1234"
}
```

### Productos
- POST /productos
- GET /productos
- GET /productos/:id
- PUT /productos/:id
- DELETE /productos/:id

Body (crear):
```json
{
  "nombre": "Hamburguesa",
  "precio": 25000,
  "categoria": "A la carta",
  "descripcion": "Con queso"
}
```

### Mesas
- POST /mesas
- GET /mesas
- GET /mesas/:id
- DELETE /mesas/:id

Body (crear):
```json
{ "numero": 5 }
```
Notas:
- Al crear pedido, la mesa pasa a “ocupada”.
- Al pagar, la mesa pasa a “libre”.

### Pedidos
- POST /pedidos  (crea pedido con detalles)
- GET /pedidos
- GET /pedidos/mesa/:id  (último por mesa)
- GET /pedidos/date/:fecha
- PUT /pedidos/:id

Body (crear con platos):
```json
{
  "id_mesa": 1,
  "id_usuario": 1,
  "detalles": [
    { "id_producto": 3, "detalle": "Sin cebolla" },
    { "id_producto": 5, "detalle": "Término medio" }
  ]
}
```
Notas:
- Estado inicial del pedido: "pendiente".
- Se usa transacción para crear pedido + detalles.
- La mesa se marca "ocupada" en la misma transacción.

### Pagos
- POST /pagos
- GET /pagos
- GET /pagos/:id
- GET /pagos/date/:fecha  (suma total por día)
- PUT /pagos/:id

Body (crear pago, sin monto):
```json
{
  "id_pedido": 1,
  "metodo_pago": "efectivo"
}
```

Respuesta (creación):
```json
{
  "id_pago": 1,
  "id_pedido": 1,
  "monto": 50000,
  "metodo_pago": "efectivo",
  "pedido_estado": "pagado",
  "mesa_estado": "libre",
  "creado": "2026-01-14T14:00:00.000-05:00"
}
```

Total por fecha:
- GET /pagos/date/2026-01-14
Respuesta:
```json
{ "fecha": "2026-01-14", "total": 95000 }
```

Notas del flujo de pago:
- El monto se calcula con `SUM(precio)` de los productos en `detalle_pedidos`.
- Se actualiza el pedido a "pagado" y la mesa a "libre" en transacción.
- Se usa `DATE(columna)` en consultas de fecha (MySQL).
