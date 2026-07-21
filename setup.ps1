# ApponextHRMS Complete Setup Script
# This script sets up the entire project: DB, env, migrations, seeds, and starts the application

Write-Host "================================"
Write-Host "ApponextHRMS Setup Script"
Write-Host "================================`n"

# Set environment variables
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "Aqil@123"
$env:DB_NAME = "apponexthrms"
$env:NODE_ENV = "development"

Write-Host "1. ✓ Environment variables set`n"

# Try running migrations
Write-Host "2. Running database migrations..."
Write-Host "   (This may take a few minutes on first run)`n"

cd C:\Projects\ApponextHRMS
npm run db:migrate 2>&1 | ForEach-Object {
  if ($_ -match "Batch|migrations|error|success") {
    Write-Host "   $_"
  }
}

Write-Host "`n3. Running database seeds..."
npm run db:seed 2>&1 | Select-Object -Last 20

Write-Host "`n4. Project setup complete!`n"
Write-Host "================================"
Write-Host "Next steps:"
Write-Host "================================"
Write-Host ""
Write-Host "Run the application:"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Test the API:"
Write-Host '  curl http://localhost:5000/api/v1/health'
Write-Host ""
Write-Host "Login with test credentials:"
Write-Host "  Email: admin@apponexthrms.local"
Write-Host "  Password: Admin@2024!"
Write-Host ""
