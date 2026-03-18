import ThermalPrinter from "node-thermal-printer";
import PrinterTypes from "node-thermal-printer";
import 'dotenv/config';

interface TicketDetalle {
  producto: string;
  nota?: string;
  cantidad: number;
}

const COLS = 24;

function wordWrap(txt: string, maxW: number, indent = ''): string[] {
  const words = txt.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxW) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      if (w.length > maxW) {
        for (let i = 0; i < w.length; i += maxW) lines.push(w.slice(i, i + maxW));
        cur = '';
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.map((l, i) => (i === 0 ? l : indent + l));
}

function lineaProductoCantidad(num: number, producto: string, cantidad: number): string {
  const sufijo  = `X${cantidad}`;
  const prefijo = `${num}. `;
  const maxNombre = COLS - prefijo.length - sufijo.length - 1;
  const nombre = producto.length > maxNombre
    ? producto.slice(0, maxNombre - 1) + '…'
    : producto;
  const espacios = COLS - prefijo.length - nombre.length - sufijo.length;
  return `${prefijo}${nombre}${' '.repeat(Math.max(1, espacios))}${sufijo}`;
}

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
    characterSet: 'SLOVENIA' as any,
    removeSpecialCharacters: false,
  });

  printer.beep(1, 2);

  // ── Encabezado ────────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println('NUEVO PEDIDO');
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  // ── Info ──────────────────────────────────────────────────────────────────
  printer.alignLeft();
  printer.setTextSize(1, 1);
  printer.println(`Mesero: ${data.mesero}`);
  printer.setTextSize(0, 1);
  printer.bold(true);
  printer.println(`Hora: ${new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', hour12: true,
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })}`);
  printer.setTextSize(0, 0);
  printer.bold(false);
  printer.drawLine();

  const normales  = data.detalles.filter(d => d.producto.toLowerCase() !== 'domicilio');
  const domicilio = data.detalles.find(d => d.producto.toLowerCase() === 'domicilio');

  // ── Productos ─────────────────────────────────────────────────────────────
  normales.forEach((d, i) => {
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(lineaProductoCantidad(i + 1, d.producto, d.cantidad));
    printer.setTextNormal();
    printer.bold(false);

    if (d.nota?.trim()) {
      // tamaño normal (0,0) → 24 chars exactos, "· " ocupa 2 → 22 disponibles
      printer.setTextSize(0, 0);
      d.nota.split('\n').forEach(seg => {
        if (!seg.trim()) return;
        wordWrap(seg.trim(), COLS - 2, '  ').forEach((l, idx) => {
          printer.println(idx === 0 ? `· ${l}` : `  ${l}`);
        });
      });
    }

    printer.drawLine();
  });

  // ── Domicilio ─────────────────────────────────────────────────────────────
  if (domicilio) {
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(2, 1);
    printer.println('DOMICILIO');
    printer.setTextNormal();
    printer.bold(false);

    if (domicilio.nota?.trim()) {
      printer.alignLeft();
      // tamaño normal (0,0) → 24 chars exactos
      printer.setTextSize(0, 0);
      printer.bold(true);
      domicilio.nota.split('\n').forEach(seg => {
        if (!seg.trim()) return;
        wordWrap(seg.trim(), COLS, '').forEach(l => printer.println(l));
      });
      printer.bold(false);
    }

    printer.alignLeft();
    printer.drawLine();
  }

  // ── Mesa ──────────────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(2, 2);
  printer.println(`MESA #${data.mesa}`);
  printer.setTextNormal();
  printer.bold(false);
  printer.cut();

  //await printer.execute();
  console.log(printer.getText());
}
  

