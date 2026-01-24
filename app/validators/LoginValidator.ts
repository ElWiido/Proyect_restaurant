import vine, { SimpleMessagesProvider } from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
  'nombre_usuario.required': 'El nombre de usuario es obligatorio',
  'contrasena.required': 'La contraseña es obligatoria',
  'contrasena.minLength': 'La contraseña debe tener al menos 4 caracteres',
})

export const LoginValidator = vine.compile(
  vine.object({
    nombre_usuario: vine.string(),
    contrasena: vine.string().minLength(4),
  })
)