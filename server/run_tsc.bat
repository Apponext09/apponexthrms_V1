@echo off
cd /d "d:\KOSQU TECHNOLAB\HRMS\apponexthrms\server"
call npx tsc --noEmit > typescript_errors.txt 2>&1
echo Done!
