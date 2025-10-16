import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'id_pedido.required': 'El id del pedido es obligatorio',
    'id_producto.required': 'El id del producto es obligatorio',    
})

export const DetallePedidoValidator = vine.compile(
  vine.object({
    id_pedido: vine.number()
        .min(1),
    id_producto: vine.number()
        .min(1),
    detalle: vine.string()
        .maxLength(200),
  })
)
