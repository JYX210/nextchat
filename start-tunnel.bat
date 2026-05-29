@echo off
chcp 65001 >nul
title NextChat + Cloudflare 内网穿透

echo ================================
echo   NextChat 内网穿透启动脚本
echo   (Cloudflare Tunnel - 免费/无验证/零注册)
echo ================================
echo.

REM 设置 node 路径
set PATH=C:\Program Files\nodejs;%PATH%

echo [1/2] 启动 NextChat...
start "NextChat" cmd /c "cd /d %~dp0 && npm run dev"
echo NextChat 正在启动...

REM 等 NextChat 先启动
echo 等待 NextChat 就绪 (10秒)...
timeout /t 10 /nobreak >nul

echo [2/2] 启动 Cloudflare 隧道...
echo.
echo ================================
echo   公网地址会在下方显示：
echo   (看到 https://____.trycloudflare.com 就是成功了)
echo ================================
echo.
"%~dp0..\cloudflared.exe" tunnel --url http://localhost:3000 --protocol http2
pause
