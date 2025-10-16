import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'id_mesa.required': 'El ID de la mesa es obligatorio',
    'id_usuario.required': 'El ID del usuario es obligatorio',
    'estado.required': 'El estado es obligatorio',
})

export const PedidoValidator = vine.compile(
  vine.object({
    id_mesa: vine.number()
        .min(1),

    id_usuario: vine.number()
        .min(1),

    estado: vine.enum(['pendiente', 'pagado', 'cancelado', 'en preparacion']),

  })
)
