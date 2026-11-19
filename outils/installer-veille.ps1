# À lancer une seule fois sur le PC : clone le dépôt (si besoin), télécharge les PV et planifie le jeudi.
$ErrorActionPreference = "Stop"
$cible = Join-Path $env:USERPROFILE "Documents\veille-esga"
if (-not (Test-Path (Join-Path $cible ".git"))) {
  git clone https://github.com/cintractbertrand/veille-esga-.git $cible
}
$script = Join-Path $cible "outils\telecharger-pv.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $script

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$declencheurs = @(
  (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At "17:30"),
  (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At "19:00")
)
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Veille PV ESGA" -Action $action -Trigger $declencheurs -Settings $reglages -Force | Out-Null
Write-Host "Tâche « Veille PV ESGA » planifiée chaque jeudi à 17h30 et 19h."
