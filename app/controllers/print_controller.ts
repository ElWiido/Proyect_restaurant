import ThermalPrinter from "node-thermal-printer";
import PrinterTypes from "node-thermal-printer";
import 'dotenv/config';

interface TicketDetalle {
  producto: string;
  nota?: string;
  cantidad: number;
}

// ── Constantes de layout ──────────────────────────────────────────────────────
// Con setTextSize(1,1) una impresora de 80 mm tiene ~24 chars por línea.
// Ajusta COLS si tu impresora es de 58 mm (usa ~16).
const COLS = 24;

/**
 * Construye una línea "PRODUCTO .......... Xn" que siempre cabe en COLS chars.
 * Si el producto es muy largo lo trunca con "…" y aún deja espacio para la cantidad.
 */
function lineaProductoCantidad(
  num: number,
  producto: string,
  cantidad: number
): string {
  const sufijo = `X${cantidad}`;           // ej. "X3"
  const prefijo = `${num}. `;              // ej. "1. "
  // Espacio disponible para el nombre (dejamos 1 char de separación)
  const maxNombre = COLS - prefijo.length - sufijo.length - 1;

  let nombre = producto;
  if (nombre.length > maxNombre) {
    nombre = nombre.slice(0, maxNombre - 1) + "…";
  }

  // Rellenamos con espacios para que la cantidad quede pegada a la derecha
  const espacios = COLS - prefijo.length - nombre.length - sufijo.length;
  return `${prefijo}${nombre}${" ".repeat(Math.max(1, espacios))}${sufijo}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function imprimirPedidoPOS(data: {
  mesa: string | number;
  mesero: string;
  pedidoId: number;
  detalles: TicketDetalle[];
}) {

  const printer = new ThermalPrinter.printer({
    type: PrinterTypes.types.EPSON,
    interface: `tcp://${process.env.IP_PRINTER}:9100`,
    //interface: "\\\\localhost\\POS-80C", // tu impresora compartida de Windows
    characterSet: "SLOVENIA" as any,
    removeSpecialCharacters: false,
  });

  // ── 🔔 Beep ANTES de imprimir ─────────────────────────────────────────────
  // beep(tiempos, duración): 1 pitido de 100 ms
  printer.beep(1, 2);

  // ── Encabezado ────────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println("NUEVO PEDIDO");
  printer.setTextNormal();
  printer.bold(false);

  printer.drawLine();

  // ── Info superior ─────────────────────────────────────────────────────────
  printer.alignLeft();
  printer.setTextSize(1, 1);
  printer.println(`Mesero: ${data.mesero}`);

  // Fecha y hora en Colombia sin segundos
  const fechaCol = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  printer.setTextSize(0, 1);
  printer.bold(true);
  printer.println(`Hora: ${fechaCol}`);
  printer.setTextSize(0, 0);
  printer.bold(false);
  printer.drawLine();

  // ── Detalles del pedido ───────────────────────────────────────────────────
  data.detalles.forEach((d, i) => {
    printer.bold(true);
    printer.setTextSize(1, 1);

    // 👇 Línea bien alineada, cantidad siempre a la derecha
    const linea = lineaProductoCantidad(i + 1, d.producto, d.cantidad);
    printer.println(linea);

    printer.setTextNormal();
    printer.bold(false);

    if (d.nota && d.nota.trim() !== "") {
      printer.alignCenter();
      printer.setTextSize(1, 0);
      const lineasNota = d.nota.split("\n");
      lineasNota.forEach((linea) => {
        printer.println(linea); 
      });
      printer.setTextSize(0, 0);
      printer.alignLeft();
    }

    printer.drawLine();
  });

  printer.setTextSize(0, 0);
  printer.bold(false);

  // ── Mesa al final ─────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(2, 2);
  printer.println(`MESA #${data.mesa}`);
  printer.setTextNormal();
  printer.bold(false);

  printer.cut();

  await printer.execute();
}