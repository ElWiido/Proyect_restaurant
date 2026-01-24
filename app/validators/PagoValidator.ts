import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'id_pedido.required': 'El ID del pedido es obligatorio',
    'id_pedido.exists': 'El ID del pedido no existe',
    'metodo_pago.required': 'El método de pago es obligatorio',
    'metodo_pago.enum': 'El método de pago debe ser "efectivo" o "transferencia"',
})

export const PagoValidator = vine.compile(
  vine.object({
    id_pedido: vine.number()
      .exists(async (db, value) => {
        // Revisa en la base de datos si existe el pedido
        const pedido = await db.from('pedidos').where('id_pedido', value).first()
        return !!pedido 
      }),

    metodo_pago: vine.enum(['efectivo', 'transferencia']),
    monto: vine.number().optional(),
  })
)

