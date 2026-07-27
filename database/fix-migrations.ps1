# Script to add hasTable guards to all migration files that use createTable without one
$migrationsDir = ".\migrations"
$files = Get-ChildItem "$migrationsDir\*.ts"
$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Skip files that already have hasTable guard
    if ($content -match 'hasTable') { continue }
    
    # Skip files that don't use createTable
    if ($content -notmatch 'createTable') { continue }
    
    # Find all createTable calls and extract table names
    # Pattern: knex.schema.createTable('table_name', ...
    $pattern = "(await knex\.schema\.createTable\('([^']+)')"
    
    if ($content -match $pattern) {
        $tableName = $matches[2]
        $createTableCall = $matches[1]
        
        # Replace the createTable call with a guarded version
        $guard = "const exists = await knex.schema.hasTable('$tableName');`r`n  if (exists) return;`r`n`r`n  $createTableCall"
        $newContent = $content -replace [regex]::Escape($createTableCall), $guard
        
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Output "Fixed: $($file.Name) (table: $tableName)"
        $fixedCount++
    }
}

Write-Output "`nTotal files fixed: $fixedCount"
