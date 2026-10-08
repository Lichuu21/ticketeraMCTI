@echo off
title Iniciar Ticketera MCTI
echo Iniciando Ticketera MCTI y Docker Desktop...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0iniciar_ticketera.ps1" -BloquearPantalla 0
pause
