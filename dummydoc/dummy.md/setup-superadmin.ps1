# PowerShell Script: Setup Superadmin Account
# Usage: .\setup-superadmin.ps1

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║     ApponextHRMS - Superadmin Setup Script               ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "server\package.json")) {
    Write-Host "❌ Error: Must be run from project root directory" -ForegroundColor Red
    Write-Host "   Run from: /path/to/ApponextHRMS/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Navigate to server directory
Set-Location server

Write-Host "📦 Installing dependencies if needed..."
Write-Host ""

# Create superadmin
Write-Host "🚀 Creating superadmin account..." -ForegroundColor Cyan
Write-Host ""

try {
    # Run the seed script
    npm run seed:superadmin

    Write-Host ""
    Write-Host "✅ Superadmin account created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "🎉 SETUP COMPLETE!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Start the backend server:" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. In a new terminal, start the frontend:" -ForegroundColor White
    Write-Host "   cd ../client" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Open browser and navigate to:" -ForegroundColor White
    Write-Host "   http://localhost:3000/login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Login with:" -ForegroundColor White
    Write-Host "   Email:    superadmin@apponext.com" -ForegroundColor Green
    Write-Host "   Password: SuperAdmin@2026!Secure" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change your password immediately after login!" -ForegroundColor Yellow
    Write-Host ""

}
catch {
    Write-Host "❌ Error creating superadmin: $_" -ForegroundColor Red
    exit 1
}

Set-Location ..
