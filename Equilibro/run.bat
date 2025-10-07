@echo off
cd /d "C:\Users\Admin\Documents\GitHub\general\Equilibro"
call .\venv\Scripts\activate
pip list
python -m Backend.App
pause

