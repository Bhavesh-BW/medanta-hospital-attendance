@echo off
title Medanta Hospital - Staff Attendance Tracking System
echo ======================================================================
echo   Medanta Hospital - Staff Attendance Tracking System
echo   Opening at: http://localhost:8198
echo ======================================================================
cd /d "%~dp0backend"
python face_tracker.py
pause
