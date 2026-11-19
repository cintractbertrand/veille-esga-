# Télécharge les PV du District de Lyon et du Rhône dans pv-pdf/ et les pousse sur GitHub.
# Lancé chaque jeudi par le Planificateur de tâches Windows (voir installer-veille.ps1).
$ErrorActionPreference = "Stop"
$depot = Split-Path -Parent $PSScriptRoot
$dossier = Join-Path $depot "pv-pdf"
New-Item -ItemType Directory -Force -Path $dossier | Out-Null
Set-Location $depot
git pull --quiet

$listes = @(
  "https://lyon-rhone.fff.fr/documents/?cid=39&sid=13&scid=510&sscid=-1&pid=0",
  "https://lyon-rhone.fff.fr/documents?cid=39"
)
$liens = @()
foreach ($l in $listes) {
  try {
    $html = (Invoke-WebRequest -Uri $l -UseBasicParsing -TimeoutSec 60).Content
    $liens += [regex]::Matches($html, 'https?://lyon-rhone\.fff\.fr/wp-content/uploads/sites/105/bsk-pdf-manager/[0-9a-f]+\.pdf') | ForEach-Object { $_.Value }
  } catch { Write-Warning "Liste inaccessible : $l" }
}
$liens = $liens | Select-Object -Unique
$nouveaux = 0
foreach ($u in $liens) {
  $f = Join-Path $dossier ([IO.Path]::GetFileName($u))
  if (-not (Test-Path $f)) {
    try { Invoke-WebRequest -Uri $u -OutFile $f -UseBasicParsing -TimeoutSec 120; $nouveaux++ }
    catch { Write-Warning "Échec : $u" }
  }
}
Write-Host "$($liens.Count) PDF listés, $nouveaux nouveaux"
if ($nouveaux -gt 0) {
  git add pv-pdf
  git commit -m "PDF des PV du District ($nouveaux nouveaux)" --quiet
  git push --quiet
}
