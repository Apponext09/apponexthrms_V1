# Script to patch database migrations to resolve signed/unsigned bigInteger foreign key compatibility in MySQL

$migrationsDir = Join-Path $PSScriptRoot "migrations"

$columns = @(
    "organization_id",
    "employee_id",
    "created_by",
    "updated_by",
    "user_id",
    "role_id",
    "permission_id",
    "goal_id",
    "goal_template_id",
    "appraisal_id",
    "competency_id",
    "framework_id",
    "position_id",
    "pip_id",
    "cycle_id",
    "recognized_by",
    "reviewer_id",
    "manager_id"
)

Write-Host "Patching migrations in: $migrationsDir" -ForegroundColor Cyan

Get-ChildItem -Path $migrationsDir -Filter "*.ts" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    $modified = $false

    foreach ($col in $columns) {
        # Match table.bigInteger('col_name') but NOT table.bigInteger('col_name').unsigned()
        # Regex uses negative lookahead
        $pattern = "table\.bigInteger\(['""]" + $col + "['""]\)(?!\.unsigned)"
        $replacement = "table.bigInteger('$col').unsigned()"

        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement
            $modified = $true
        }
    }

    if ($modified) {
        Set-Content -Path $file -Value $content
        Write-Host "Patched: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "Patching completed!" -ForegroundColor Cyan
