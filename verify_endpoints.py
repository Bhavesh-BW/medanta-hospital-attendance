import urllib.request
import json
import time

time.sleep(2)
base = 'http://127.0.0.1:8198'
for ep in ['/api/kpis', '/api/department-attendance', '/api/cameras']:
    try:
        req = urllib.request.Request(base + ep)
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            print(f"{ep} -> STATUS {res.status}")
            if ep == '/api/department-attendance':
                for d in data:
                    print(f"  {d['department']}: {d['present']} / {d['total']} ({d['percentage']}%)")
            elif ep == '/api/kpis':
                print(f"  FPS: {data.get('fps')}, RTSP Connected: {data.get('is_rtsp_connected')}, Present Today: {data.get('staff_present_today')}")
            elif ep == '/api/cameras':
                for c in data:
                    print(f"  Camera {c.get('id')}: {c.get('name')} -> {c.get('rtsp')}")
    except Exception as e:
        print(f"{ep} -> ERROR: {e}")
