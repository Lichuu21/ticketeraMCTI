Set WshShell = CreateObject("WScript.Shell")
' Ejecuta el script de PowerShell de forma completamente invisible (0 = oculto, False = no esperar)
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""c:\Users\lnuccitelli\Documents\ticketeraMCTI\scripts\iniciar_ticketera.ps1""", 0, False
