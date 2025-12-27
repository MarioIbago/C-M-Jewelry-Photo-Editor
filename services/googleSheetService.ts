
/**
 * Service to communicate with Google Apps Script Web App
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTyKnyj-qRupySJq9D62rj9uweLqH8f7MAv8EoaHhmdE9rzBOzaOBU00EqFqoczJ2p/exec";

export interface SaleData {
  cliente: string;
  contacto: string;
  tipoCliente: string;
  producto: string;
  codigo: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  costoTotal: number;
  ganancia: number;
  metodoPago: string;
  observaciones: string;
  recibeVenta: string;
}

export const recordSaleInSheet = async (data: SaleData) => {
  try {
    // IMPORTANTE: Usamos mode: 'no-cors'
    // Esto es fundamental para enviar datos a Google Apps Script desde un navegador.
    // Garantiza que la petición salga aunque no podamos leer la respuesta JSON de vuelta 
    // (Google bloquea la lectura de la respuesta por seguridad CORS en redirecciones).
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "text/plain", // Usamos text/plain para evitar "preflight" OPTIONS requests que alentan el proceso
      },
      body: JSON.stringify(data),
    });

    // En modo no-cors, la respuesta es opaca y no podemos leer el JSON.
    // Si el fetch no tiró error, asumimos que se envió correctamente.
    return { result: "success" };
  } catch (error) {
    console.error("Error recording sale:", error);
    throw error;
  }
};
