import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'numero.required': 'El numero de mesa es obligatorio',
})

export const MesaValidator = vine.compile(
  vine.object({
    numero: vine.string(),
  })
)
