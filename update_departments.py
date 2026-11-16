import sqlite3

db_path = r'C:\Users\Shrishail S K\Downloads\medanta-hospital-employee-tracker\medanta-hospital-employee-tracker\backend\face_tracker.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

departments = [
    {
        "name": "Cardiology",
        "designations": ["Sr. Consultant Cardiologist", "Interventional Cardiologist", "Cardiac Nurse Specialist", "Cath Lab In-Charge", "Associate Consultant - Cardiology"],
        "names": ["Dr. Arvind Kumar", "Dr. Sanjeev Trehan", "Dr. Praveen Chandra", "Nurse Kavita Rao", "Dr. Manish Bansal", "Dr. RR Kasliwal"]
    },
    {
        "name": "Oncology",
        "designations": ["Principal Director - Medical Oncology", "Surgical Oncologist", "Radiation Oncologist", "Chemotherapy Nurse Lead", "Oncology Specialist"],
        "names": ["Dr. Meera Sharma", "Dr. Ashok Vaid", "Dr. Kanchan Kaur", "Nurse Sunita Verma", "Dr. Tejinder Kataria", "Dr. Rajeev Agarwal"]
    },
    {
        "name": "Neurosciences",
        "designations": ["Director - Neurosurgery", "Sr. Consultant Neurologist", "Neuro-Interventionalist", "Neuro-Critical Care Specialist", "Stroke Unit Nurse"],
        "names": ["Dr. Rohit Malhotra", "Dr. VP Singh", "Dr. Arun Garg", "Nurse Deepa Nair", "Dr. AN Jha", "Dr. Sudhir Dubey"]
    },
    {
        "name": "Orthopaedics",
        "designations": ["Chairman - Orthopaedics", "Sr. Joint Replacement Surgeon", "Spine Surgery Consultant", "Sports Injury Specialist", "Ortho Surgical Nurse"],
        "names": ["Dr. Ashok Rajgopal", "Dr. Raman Kant Aggarwal", "Dr. SKS Marya", "Nurse Shalini Menon", "Dr. Vivek Dahiya", "Dr. Vipin Mohan"]
    },
    {
        "name": "Emergency & Trauma",
        "designations": ["Head - Emergency Medicine", "Sr. Trauma Consultant", "Emergency Medical Officer", "Chief Triage Nurse", "Paramedic Specialist"],
        "names": ["Dr. Sanjay Sharma", "Dr. Tamorish Kole", "Nurse Anita Deshmukh", "Dr. Vikas Goyal", "Paramedic Rahul Patil", "Dr. Shweta Rastogi"]
    },
    {
        "name": "ICU & Critical Care",
        "designations": ["Director - Critical Care", "Sr. Intensivist", "Senior ICU Staff Nurse", "ECMO Specialist", "Respiratory Care Practitioner"],
        "names": ["Nurse Priya N", "Dr. Yatin Mehta", "Dr. Subhash Todi", "Nurse Anjali Saxena", "Dr. Jeetendra Sharma", "Dr. Pooja Sethi"]
    },
    {
        "name": "Nursing Services",
        "designations": ["Chief Nursing Officer", "Senior Sister In-Charge", "Infection Control Nurse", "Clinical Staff Nurse", "Ward Nursing Supervisor"],
        "names": ["Sister Grace Thomas", "Sister Reena Mathew", "Nurse Bhavna Joshi", "Nurse Sneha Kulkarni", "Nurse Mary Varghese", "Sister Preeti Paul"]
    },
    {
        "name": "Operations (OT)",
        "designations": ["Director - Anaesthesia & OT", "Sr. Anaesthesiologist", "Lead OT Technician", "Sterile Services Specialist", "Surgical Scrub Nurse"],
        "names": ["Mr. S. Ramesh", "Dr. Vijay Vohra", "Dr. Sangeeta Khanna", "OT Tech Rajesh Sen", "Nurse Pooja Negi", "Dr. Deepa Khurana"]
    }
]

cur.execute("SELECT id, name, department, designation FROM unique_visitors ORDER BY id")
visitors = cur.fetchall()

updated_count = 0
for idx, (vid, current_name, current_dept, current_desig) in enumerate(visitors):
    dept_info = departments[idx % len(departments)]
    dept_name = dept_info["name"]
    desig = dept_info["designations"][idx % len(dept_info["designations"])]
    
    # Format ID properly
    try:
        vid_num = int(vid)
        emp_tag = f"EMP-{vid_num:02d}"
    except Exception:
        emp_tag = f"EMP-{vid}"
        
    new_name = current_name
    if not current_name or current_name.startswith("VIS-") or current_name.startswith("EMP-") or "Person" in current_name or current_name == "Unknown":
        name_pool = dept_info["names"]
        pool_name = name_pool[idx % len(name_pool)]
        new_name = f"{pool_name} ({emp_tag})"
    
    cur.execute("""
        UPDATE unique_visitors
        SET department = ?, designation = ?, name = ?
        WHERE id = ?
    """, (dept_name, desig, new_name, vid))
    updated_count += 1

conn.commit()
print(f"Successfully updated {updated_count} employees with diverse Medanta departments!")

cur.execute("SELECT department, count(*) FROM unique_visitors GROUP BY department")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} staff")

conn.close()
