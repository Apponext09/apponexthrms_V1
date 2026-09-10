param(
  [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $serviceRoot ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

& $Python -m venv $venvPath
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $serviceRoot "requirements-runtime.txt")
& $venvPython -m pip install dlib-bin==20.0.1 face-recognition-models==0.3.0
& $venvPython -m pip install face-recognition==1.3.0 --no-deps

Write-Host "Biometric runtime installed. Start it with: npm run dev:biometric:native"

