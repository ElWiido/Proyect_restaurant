import vine, {SimpleMessagesProvider} from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider({
    'nombre.required': 'El nombre es obligatorio',
    'precio.required': 'El precio es obligatorio',
    'precio.min': 'El precio debe ser mayor que 0',
    'precio.max': 'El precio debe ser menor que 10,000,000',
    'categoria.required': 'La categoría es obligatoria',
    'categoria.enum': 'La categoría debe ser "A la carta" , "bebida" o "ejecutivo"',
    'descripcion.required': 'La descripción es obligatoria',
    'descripcion.minLength': 'La descripción debe tener mínimo 5 caracteres',
})

export const ProductoValidator = vine.compile(
  vine.object({
    nombre: vine.string()
        .minLength(3)
        .maxLength(30),

    precio: vine.number()
        .min(1)
        .max(10000000),

    categoria: vine.enum(['A la carta', 'bebida', 'ejecutivo']),

    descripcion: vine.string()
        .minLength(5)
        .maxLength(100),
  })
)
