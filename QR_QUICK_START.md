# 🎯 GUÍA RÁPIDA - MÓDULO QR

## ¿Qué es?
Módulo Angular para generar códigos QR para mesas de restaurante de forma simple y rápida.

## ¿Dónde está?
- Dashboard → Botón "Generar QRs" (solo admin)
- O directamente: `/qr/single` o `/qr/batch`

## ¿Cómo usar?

### Opción 1: QR Individual
```
1. Ve a /qr/single (o desde Dashboard)
2. Ingresa número de mesa (ej: 5)
3. Haz clic en "Generar QR"
4. Descarga como PNG o imprime
```

### Opción 2: QRs en Lote
```
1. Ve a /qr/batch
2. Ingresa mesa inicial (ej: 1)
3. Ingresa mesa final (ej: 10)
4. Haz clic en "Generar Lote"
5. Ves todos los QRs en galería
6. Descarga todos o individualmente
```

## Características
✅ Generación rápida  
✅ Descarga automática en PNG  
✅ Impresión directa del navegador  
✅ Validación de números (1-999)  
✅ Galería con preview  
✅ Acciones en lote  
✅ Dark mode  
✅ Responsive (mobile, tablet, desktop)  

## QR URL Generada
```
http://localhost:4200/table?number=5
```
(En producción usa el dominio real)

## Límites
- Número de mesa: 1 a 999
- Máximo por lote: 100 QRs

## Permisos
Solo administradores (`ADMIN` role)

## Formato
PNG (256x256px) con error correction nivel H

## Errores Comunes
| Error | Solución |
|-------|----------|
| "Mesa debe estar entre 1-999" | Usa números en ese rango |
| No se descarga | Verifica pop-ups bloqueados |
| Se ve pequeño al imprimir | Usa zoom 100% en print |

## API Calls
- `/api/...` - No requiere backend (todo cliente)
- Solo usa la librería `qrcode`

## Archivos Clave
- `qr-generator.service.ts` → Lógica
- `qr-single.component.ts` → Individual
- `qr-batch.component.ts` → Lote

## Traducción
- Español: ✅ Completado
- English: ❌ TODO
- Português: ❌ TODO

---

**Última actualización:** 2026-04-11  
**Compilación:** ✅ Exitosa  
**Status:** 🟢 Funcional

