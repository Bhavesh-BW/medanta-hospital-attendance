import subprocess

urls = [
    ('main', 'rtsp://124.123.89.162:31554/live/main'),
    ('main_exit', 'rtsp://124.123.89.162:31554/live/main_exit'),
    ('staff', 'rtsp://124.123.89.162:31554/live/staff'),
    ('staff_exit', 'rtsp://124.123.89.162:31554/live/staff_exit')
]

for name, url in urls:
    cmd = ['ffmpeg', '-rtsp_transport', 'tcp', '-i', url, '-t', '2', '-f', 'null', '-']
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
        status = "LIVE" if res.returncode == 0 else f"FAILED (code {res.returncode})"
        print(f"{name}: {status}")
    except subprocess.TimeoutExpired:
        print(f"{name}: TIMEOUT")
