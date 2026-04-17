import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';
import { environment } from '../../../enviroments/enviroment';

export interface QRGenerationOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface GeneratedQR {
  tableNumber: number;
  url: string;
  dataUrl: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class QrGeneratorService {
  private readonly DEFAULT_OPTIONS: QRGenerationOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  };

  /**
   * Obtiene la URL base desde el entorno
   * En desarrollo: '' (usa proxy)
   * En producción: URL completa del servidor
   */
  private getBaseUrl(): string {
    if (environment.production) {
      // En producción, se debería tener una URL configurada
      return window.location.origin;
    }
    // En desarrollo, usa el protocolo y host actual
    return window.location.origin;
  }

  /**
   * Genera un código QR para una mesa específica
   * @param tableNumber Número de mesa (1-999)
   * @param options Opciones de generación personalizadas
   * @returns Promise con los datos del QR generado
   */
  async generateQR(
    tableNumber: number,
    options: QRGenerationOptions = {}
  ): Promise<GeneratedQR> {
    // Validar número de mesa
    if (!this.validateTableNumber(tableNumber)) {
      throw new Error(`Número de mesa inválido: ${tableNumber}. Debe estar entre 1 y 999`);
    }

    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const baseUrl = this.getBaseUrl();
    // Generar URL que redirige a cliente con número de mesa como parámetro
    const qrUrl = `${baseUrl}/client?table=${tableNumber}`;

    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel
      });

      return {
        tableNumber,
        url: qrUrl,
        dataUrl,
        filename: `mesa_${tableNumber}.png`
      };
    } catch (error) {
      throw new Error(`Error al generar QR para mesa ${tableNumber}: ${error}`);
    }
  }

  /**
   * Genera QRs en lote para un rango de mesas
   * @param startTable Mesa inicial
   * @param endTable Mesa final
   * @param options Opciones de generación personalizadas
   * @returns Promise con array de QRs generados
   */
  async generateQRBatch(
    startTable: number,
    endTable: number,
    options: QRGenerationOptions = {}
  ): Promise<GeneratedQR[]> {
    if (!this.validateTableNumber(startTable) || !this.validateTableNumber(endTable)) {
      throw new Error(`Rango inválido: ${startTable}-${endTable}. Deben estar entre 1 y 999`);
    }

    if (startTable > endTable) {
      throw new Error(`Mesa inicial (${startTable}) no puede ser mayor que mesa final (${endTable})`);
    }

    const qrPromises: Promise<GeneratedQR>[] = [];
    for (let i = startTable; i <= endTable; i++) {
      qrPromises.push(this.generateQR(i, options));
    }

    return Promise.all(qrPromises);
  }

  /**
   * Descarga un QR como imagen PNG
   * @param qr Datos del QR a descargar
   */
  downloadQR(qr: GeneratedQR): void {
    this.downloadDataUrl(qr.dataUrl, qr.filename);
  }

  /**
   * Descarga múltiples QRs como archivo ZIP
   * @param qrs Array de QRs a descargar
   */
  async downloadQRBatch(qrs: GeneratedQR[]): Promise<void> {
    // Para simplificar, descargaremos cada QR individualmente
    // En una versión más avanzada, se podría usar JSZip para crear un archivo ZIP
    for (const qr of qrs) {
      this.downloadDataUrl(qr.dataUrl, qr.filename);
      // Pequeña pausa entre descargas para evitar bloqueos del navegador
      await this.delay(200);
    }
  }

  /**
   * Imprime un QR en el navegador
   * @param qr Datos del QR a imprimir
   */
  printQR(qr: GeneratedQR): void {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresión');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir QR - Mesa ${qr.tableNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              background: white;
            }
            .print-container {
              text-align: center;
              page-break-after: always;
            }
            h1 {
              margin: 0 0 20px 0;
              font-size: 32px;
              color: #333;
            }
            .qr-wrapper {
              padding: 20px;
              border: 2px solid #333;
              display: inline-block;
              background: white;
            }
            .qr-wrapper img {
              max-width: 400px;
              height: auto;
              display: block;
            }
            .table-info {
              margin-top: 20px;
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            @media print {
              body {
                padding: 0;
              }
              .print-container {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>MESA ${qr.tableNumber}</h1>
            <div class="qr-wrapper">
              <img src="${qr.dataUrl}" alt="QR Mesa ${qr.tableNumber}">
            </div>
            <div class="table-info">Escanear para acceder</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Imprime múltiples QRs (uno por página)
   * @param qrs Array de QRs a imprimir
   */
  printQRBatch(qrs: GeneratedQR[]): void {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresión');
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir QRs de Mesas</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
            }
            .print-page {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              page-break-after: always;
              padding: 40px;
              box-sizing: border-box;
              text-align: center;
            }
            h1 {
              margin: 0 0 30px 0;
              font-size: 32px;
              color: #333;
            }
            .qr-wrapper {
              padding: 20px;
              border: 2px solid #333;
              display: inline-block;
              background: white;
              margin-bottom: 20px;
            }
            .qr-wrapper img {
              max-width: 350px;
              height: auto;
              display: block;
            }
            .table-info {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            @media print {
              body {
                padding: 0;
              }
              .print-page {
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
    `;

    qrs.forEach((qr) => {
      htmlContent += `
        <div class="print-page">
          <h1>MESA ${qr.tableNumber}</h1>
          <div class="qr-wrapper">
            <img src="${qr.dataUrl}" alt="QR Mesa ${qr.tableNumber}">
          </div>
          <div class="table-info">Escanear para acceder</div>
        </div>
      `;
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Valida que el número de mesa esté en el rango permitido
   * @param tableNumber Número de mesa a validar
   * @returns true si es válido, false en caso contrario
   */
  private validateTableNumber(tableNumber: number): boolean {
    return Number.isInteger(tableNumber) && tableNumber >= 1 && tableNumber <= 999;
  }

  /**
   * Descarga un archivo desde un data URL
   * @param dataUrl URL de datos a descargar
   * @param filename Nombre del archivo a descargar
   */
  private downloadDataUrl(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Utilidad para crear delays en async/await
   * @param ms Milisegundos a esperar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

