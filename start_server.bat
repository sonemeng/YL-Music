@echo off
echo 正在启动音乐播放器服务器...
echo.
echo 服务器将运行在: http://localhost:8000
echo 按 Ctrl+C 可以停止服务器
echo.
cd /d "%~dp0"
D:\PHP\php-8.3.25-nts-Win32-vs16-x86\php.exe -S localhost:8000
pause