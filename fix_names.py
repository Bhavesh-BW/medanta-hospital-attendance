import sqlite3

db = r'C:\Users\Shrishail S K\Downloads\medanta-hospital-employee-tracker\medanta-hospital-employee-tracker\backend\face_tracker.db'
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute("UPDATE unique_visitors SET name = REPLACE(name, 'EMP-EMP-', 'EMP-') WHERE name LIKE '%EMP-EMP-%'")
conn.commit()
print(f"Cleaned up double EMP tags. Affected rows: {c.rowcount}")

c.execute("SELECT id, name, department, designation FROM unique_visitors LIMIT 5")
for row in c.fetchall():
    print(row)
conn.close()
