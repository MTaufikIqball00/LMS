$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "LMS Portal.lnk"

$TargetPath = "C:\Users\taufi\Documents\Projects\LMS\start-lms.bat"
$WorkingDirectory = "C:\Users\taufi\Documents\Projects\LMS"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.Description = "Launcher Aplikasi Learning Management System (LMS)"
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14" # Folder/Globe icon
$Shortcut.Save()

Write-Host " [OK] Pintasan desktop berhasil dibuat di: $ShortcutPath" -ForegroundColor Green
