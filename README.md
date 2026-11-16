# Medanta Hospital - Staff Attendance Tracking System

> Multi-camera biometric facial recognition and automated hospital staff attendance platform. Provides automated employee identification (`EMP-XX`), cross-camera journey tracking, entry/exit timestamping, verified check-out detection, and 30-day attendance statistics with duty time analytics.

---

## 🚀 Key Features
- **Employee Identification**: 
  - Automatically identifies registered staff members by their enrolled name and department (e.g. `Dr. Naresh Trehan`, `Sister Sunita Sharma`).
  - Automatically assigns standard employee identifiers (`EMP-01`, `EMP-02`, etc.) to newly detected, unenrolled individuals.
  - Ensures each person retains the exact same employee ID across all connected hospital cameras.
- **Cross-Camera Person Tracking**:
  - Re-identifies the same staff member as they transit between entry porches, reception lobbies, OPD clinics, and exit checkpoints.
  - Maintains complete multi-camera passage trajectories without creating duplicate employee records.
- **Staff Attendance Tracking**:
  - Automatically logs employee check-in timestamps upon detection at entry cameras (`role: 'entry'`).
  - Monitors intermediate department and corridor transits (`role: 'internal'`).
  - When an employee is detected at the check-out camera (`role: 'exit'`), that timestamp is officially recorded as their final attendance time for the day (`is_checkout_verified: true`, `status: 'checked_out'`).
- **30-Day Attendance Statistics**:
  - Comprehensive 30-day attendance metrics: total days present, total hospital duty hours, and average daily presence time.
  - Daily attendance shift records showing check-in time, check-out time, shift duration, verified checkout status, and cameras visited.
- **Staff Management & Dashboard**:
  - Interactive Staff Attendance & Biometric Directory.
  - One-click Staff Enrollment Form to assign names, departments, and designations to auto-assigned IDs.
  - Shift flow analytics and multi-camera recognition feeds.

---

## 🧠 Pre-Installed Neural Models
The repository includes all required pre-trained weights and ONNX model files:
- `backend/models/face_detection_yunet_2023mar.onnx`: OpenCV YuNet face detector
- `backend/models/face_recognition_sface_2021dec.onnx`: SFace 128-d deep embedding extractor
- `backend/models/genderage.onnx`: Demographic age and gender classification model

---

## 🛠️ Quick Start Guide

### 1. Prerequisites
- **Python**: Version `3.9`, `3.10`, or `3.11` recommended.
- **Hardware**: Standard CPU compatible. A CUDA-capable GPU is supported for high-FPS multi-stream processing.
- **Node.js**: *(Optional)* The production UI is **pre-compiled** inside `backend/dist` and served automatically by the Python backend.

---

### 2. Installation

1. **Activate your environment**:
   - **Windows**:
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

### 3. Running the Service

#### Option A: One-Click Launch Script
- **Windows**: Double-click `start.bat` (or run `start.bat` in CMD)
- **Linux / macOS**: Run `./start.sh`

#### Option B: Direct Python Execution
```bash
cd backend
python face_tracker.py
```

---

### 4. Accessing the Dashboard

Once started, open your web browser and navigate to:
```
http://localhost:8198
```

---

## 📹 Configured Camera Checkpoints

| Camera ID | Checkpoint Name | RTSP Stream URL | Role |
| :--- | :--- | :--- | :--- |
| `staff` | Staff Inbound Entry | `rtsp://124.123.89.162:31554/live/staff` | **Entry** (Attendance Check-In) |
| `staff_exit` | Staff Check-Out Exit | `rtsp://124.123.89.162:31554/live/staff_exit` | **Exit** (Attendance Check-Out Verified) |
| `main` | Main Porch Entry — Inbound | `rtsp://124.123.89.162:31554/live/main` | **Entry** (Visitor / Staff Check-In) |
| `cam_cd9e9a` | Main Porch Exit | `rtsp://124.123.89.162:31554/live/main_exit` | **Exit** (Check-Out Verified) |
| `recep1` | Main Reception & OPD Lobby | `rtsp://124.123.89.162:31554/live/recep1` | **Internal** (Department Transit) |
| `outside` | Hospital Outside Perimeter / Gates | `rtsp://124.123.89.162:31554/live/outside` | **Perimeter** (Outer Gate) |

---

## ⚙️ REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/kpis?period=30d` | GET | Staff attendance KPIs (total present today, currently in hospital, checked out, 30-day avg daily time) |
| `/api/employees` | GET | List of all employees with today's status, check-in/out times, and 30-day attendance metrics |
| `/api/employees/journey?visitor_id=EMP-01` | GET | Full multi-camera journey timeline and checkpoints for an employee |
| `/api/employees/attendance-history?employee_id=EMP-01` | GET | Detailed 30-day daily attendance records and average daily duty time |
| `/api/employees/enroll` | POST | Enroll or update staff member name, department, designation, and biometric portrait |
| `/api/traffic-trend?range=30d` | GET | Shift flow, hourly arrivals, departures, and 30-day attendance statistics |
| `/api/stream?camera=<cam_id>` | GET | Live MJPEG video stream with bounding-box HUD and employee recognition overlay |

---

## 📁 Repository Structure
```
├── backend/
│   ├── face_tracker.py      # Attendance tracking engine and HTTP server
│   ├── dist/                 # Pre-built production web dashboard
│   ├── models/               # Neural network weights & ONNX models
│   └── requirements.txt      # Python dependencies
├── ui/                       # Frontend source code (React / Vite / Tailwind)
│   ├── src/                  # Components, hooks, and views
│   └── package.json          # Node.js dependencies (for UI development)
├── start.bat                 # Windows one-click launcher
├── start.sh                  # Linux / macOS one-click launcher
├── .gitignore                # Excludes node_modules, temp files & databases
└── README.md                 # Project documentation
```
