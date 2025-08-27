import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'nombre.required': 'El nombre es obligatorio',
    'correo.email': 'El email no es valido',
    'contrasena.minLength': 'La contraseña debe tener mínimo 4 caracteres',
})

export const UsuarioValidator = vine.compile(
  vine.object({
    nombre: vine.string()
      .minLength(3)
      .maxLength(30),

    correo: vine.string()
      .email(),

    contrasena: vine.string()
      .minLength(4),
  })
)
