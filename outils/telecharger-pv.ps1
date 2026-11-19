# Récupère les PV du District et les pousse sur GitHub pour la veille du jeudi.
# Le site du District bloque les téléchargements automatiques : on récupère donc les PDF
# téléchargés depuis le navigateur (dossier Téléchargements) ou déposés à la main dans pv-pdf\.
# Lancé chaque jeudi par le Planificateur de tâches Windows (voir installer-veille.ps1).
$ErrorActionPreference = "Stop"
$depot = Split-Path -Parent $PSScriptRoot
$dossier = Join-Path $depot "pv-pdf"
New-Item -ItemType Directory -Force -Path $dossier | Out-Null
Set-Location $depot
git pull --quiet

# 1. PDF du District présents dans Téléchargements (nom = 32 caractères hexadécimaux, comme sur le site)
$telechargements = (New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path
$deplaces = 0
if ($telechargements -and (Test-Path $telechargements)) {
  Get-ChildItem -Path $telechargements -Filter *.pdf | Where-Object { $_.BaseName -match '^[0-9a-f]{32}$' } | ForEach-Object {
    $cible = Join-Path $dossier $_.Name
    if (Test-Path $cible) { Remove-Item $_.FullName } else { Move-Item $_.FullName $cible; $deplaces++ }
  }
}
Write-Host "$deplaces PDF récupérés dans Téléchargements"

# 2. Envoi sur GitHub de tout nouveau PDF de pv-pdf\
git add pv-pdf
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "PDF des PV du District" --quiet
  git push --quiet
  Write-Host "PDF envoyés sur GitHub"
} else {
  Write-Host "Rien de nouveau à envoyer"
}
