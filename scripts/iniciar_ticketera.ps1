# Script para iniciar automáticamente Docker Desktop y Ticketera MCTI al arrancar Windows
param(
    $BloquearPantalla = $true
)

if ($BloquearPantalla -is [string]) {
    $BloquearPantalla = ($BloquearPantalla -eq "true" -or $BloquearPantalla -eq "1" -or $BloquearPantalla -eq '$true')
}

$ErrorActionPreference = "Continue"
$ProjectDir = "c:\Users\lnuccitelli\Documents\ticketeraMCTI"
$LogFile = "$ProjectDir\logs\iniciar_ticketera.log"
$DockerExe = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"

function Escribir-Log {
    param([string]$Mensaje)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Linea = "[$Timestamp] $Mensaje"
    Write-Output $Linea
    Add-Content -Path $LogFile -Value $Linea -Encoding UTF8
}

Escribir-Log "=== INICIANDO SECUENCIA DE ARRANQUE AUTOMATICO TICKETERA MCTI ==="

# 1. Bloquear pantalla si está solicitado (por seguridad en reinicios automáticos tras cortes de luz)
if ($BloquearPantalla) {
    Escribir-Log "Bloqueando estación de trabajo por seguridad..."
    try {
        rundll32.exe user32.dll,LockWorkStation
    } catch {
        Escribir-Log "No se pudo bloquear la estación: $_"
    }
}

# 2. Verificar si Docker Desktop está corriendo
$dockerProc = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProc) {
    Escribir-Log "Docker Desktop no está en ejecución. Iniciando..."
    if (Test-Path $DockerExe) {
        Start-Process -FilePath $DockerExe -WindowStyle Minimized
        Escribir-Log "Proceso Docker Desktop iniciado."
    } else {
        Escribir-Log "ADVERTENCIA: No se encontró Docker Desktop en $DockerExe"
    }
} else {
    Escribir-Log "Docker Desktop ya se encuentra en ejecución."
}

# 3. Esperar a que el daemon de Docker esté listo
Escribir-Log "Esperando que el daemon de Docker responda..."
$maxIntentos = 40
$intento = 0
$dockerListo = $false

while ($intento -lt $maxIntentos) {
    $intento++
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerListo = $true
            Escribir-Log "Daemon de Docker listo tras $intento intentos."
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
}

if (-not $dockerListo) {
    Escribir-Log "ERROR: El daemon de Docker no respondió después de $($maxIntentos * 3) segundos."
    exit 1
}

# 4. Levantar los contenedores de producción de ticketera
Escribir-Log "Iniciando contenedores de Docker Compose (Producción)..."
Set-Location $ProjectDir
$composeFile = "$ProjectDir\docker-compose.prod.yml"

try {
    $output = docker compose -f $composeFile up -d 2>&1
    Escribir-Log "Resultado docker compose up:`n$($output -join "`n")"
} catch {
    Escribir-Log "ERROR al ejecutar docker compose: $_"
}

# 5. Verificar estado de los contenedores
Escribir-Log "Verificando contenedores activos..."
$psOutput = docker compose -f $composeFile ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>&1
Escribir-Log "Estado actual:`n$($psOutput -join "`n")"

Escribir-Log "=== SECUENCIA DE ARRANQUE COMPLETADA CON ÉXITO ==="
