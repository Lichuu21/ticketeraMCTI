@echo off
title Configurar AutoLogon - Windows Server 2025
cls
echo =========================================================
echo      CONFIGURACION DE AUTOLOGON (INICIO AUTOMATICO)
echo =========================================================
echo.
echo Abriendo la ventana de Autologon de Microsoft...
echo (Si Windows te pide confirmacion de Administrador, haz clic en "Si")
echo.

powershell -Command "Start-Process '%~dp0Autologon.exe' -Verb RunAs"

echo.
echo =========================================================
echo  INSTRUCCIONES PARA LA VENTANA QUE SE ACABA DE ABRIR:
echo =========================================================
echo.
echo  1. Veras una ventana con 3 campos:
echo       - Username:  lnuccitelli
echo       - Domain:    MCTI
echo       - Password:  [ AQUI ESCRIBES TU CONTRASENA ]
echo.
echo  2. Escribe tu contrasena de Windows en el campo "Password".
echo  3. Haz clic en el boton "Enable".
echo.
echo  Te aparecera un mensaje que dice:
echo  "Autologon successfully configured."
echo =========================================================
echo.
pause
