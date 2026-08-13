@echo off
REM ========================================================
REM  Taxel - เริ่ม local web server ด้วย Python
REM  ดับเบิลคลิกไฟล์นี้ แล้วเปิดเบราว์เซอร์ไปที่ URL ที่แสดง
REM ========================================================
cd /d "%~dp0"
echo.
echo   Taxel dev server กำลังรัน...
echo   เปิดเบราว์เซอร์ไปที่:  http://localhost:8000
echo.
echo   กด Ctrl+C เพื่อหยุด server
echo.
python -m http.server 8000
pause
