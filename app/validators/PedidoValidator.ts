import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
  'id_mesa.required': 'El ID de la mesa es obligatorio',
  'id_usuario.required': 'El ID del usuario es obligatorio',
  'detalles.required': 'Debe incluir al menos un plato en el pedido',
  'detalles.minLength': 'Debe incluir al menos un plato en el pedido',
  'detalles.*.id_producto.required': 'Cada plato debe tener un ID de producto',
  'detalles.*.id_producto.number': 'El ID del producto debe ser un número',
})

export const PedidoValidator = vine.compile(
  vine.object({
    id_mesa: vine.number()
        .min(1),

    id_usuario: vine.number()
        .min(1),

    detalles: vine
      .array(
        vine.object({
          id_producto: vine.number().min(1),
          detalle: vine.string().optional(),
        })
      )
      .minLength(1),

  })
)
