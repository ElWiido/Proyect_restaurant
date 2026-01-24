import ThermalPrinter from "node-thermal-printer";
import PrinterTypes from "node-thermal-printer";

interface TicketDetalle {
  producto: string;
  nota?: string;
}

export async function imprimirPedidoPOS(data: {
  mesa: string | number;
  mesero: string;
  pedidoId: number;
  detalles: TicketDetalle[];
}) {

  const printer = new ThermalPrinter.printer({
    type: PrinterTypes.types.EPSON,
    interface: "\\\\localhost\\POS-80C", // tu impresora compartida de Windows
    characterSet: "SLOVENIA" as any,
    removeSpecialCharacters: false,
  });

  // CENTRADO y título
  printer.beep(1,3);
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println("NUEVO PEDIDO");
  printer.setTextNormal();
  printer.bold(false);

  printer.drawLine();

  // Info superior
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
    year: "numeric"
  });
  printer.setTextSize(0,1);
  printer.bold(true);
  printer.println(`Hora: ${fechaCol}`);
  printer.setTextSize(0,0);
  printer.bold(false);
  printer.drawLine();

  // Detalles del pedido
  data.detalles.forEach((d, i) => {
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`${i + 1}. ${d.producto}`);

    printer.setTextNormal();
    printer.bold(false);
    printer.alignCenter();
    if (d.nota && d.nota.trim() !== "") {
      printer.setTextSize(1, 0);
      printer.println(`${d.nota}`);
    }
    printer.setTextSize(0,0);
    printer.drawLine();
    printer.alignLeft();
  });

  printer.setTextSize(0,0);
  printer.bold(false);
  printer.drawLine();

  // Mesa al final
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(2, 2);
  printer.println(`MESA #${data.mesa}`);
  printer.setTextNormal();
  printer.bold(false);

  printer.cut();

  await printer.execute();
}
