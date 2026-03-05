#!/usr/bin/env pwsh

# Detener procesos Node anteriores
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Cambiar al directorio del proyecto
Set-Location "C:\Users\ramir\Documents\7mo Semestre\Ing de software III\servlyFrontend"

# Mostrar información
Write-Host "Compilando Servly Frontend..." -ForegroundColor Cyan
Write-Host "Directorio: $(Get-Location)" -ForegroundColor Gray

# Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
npm install 2>&1

# Iniciar servidor
Write-Host "Iniciando servidor en puerto 4200..." -ForegroundColor Green
npm start 2>&1

