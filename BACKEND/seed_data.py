"""
Seed script — run from BACKEND folder:
    python seed_data.py
"""

import os
import django
from datetime import date, time, timedelta
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cms.settings")
django.setup()

from django.contrib.auth.models import User, Group
from django.db import transaction

from manager.models import Staff, Doctor, DoctorSchedule, HospitalSettings, SpecializationChoices
from receptionist.models import Patient
from pharmacist.models import Medicine
from lab_tech.models import LabTest


def run():
    print("=" * 50)
    print("Starting seed...")
    print("=" * 50)

    # ─────────────────────────────
    # 1. GROUPS
    # Must match frontend exactly:
    #   Admin, Doctor, Receptionist, LabTechnician, Pharmacist
    # ─────────────────────────────
    roles = {}
    for name in ["Admin", "Doctor", "Receptionist", "LabTechnician", "Pharmacist"]:
        group, created = Group.objects.get_or_create(name=name)
        roles[name] = group
        print(f"  Role '{name}' {'created' if created else 'already exists'}")

    # ─────────────────────────────
    # 2. SUPERUSER
    # ─────────────────────────────
    try:
        admin_user = User.objects.get(username="admin")
        admin_user.set_password("Admin@123")
        admin_user.save()
        admin_user.groups.clear()
        admin_user.groups.add(roles["Admin"])
        print("\n  admin → password reset to Admin@123, assigned to Admin group")
    except User.DoesNotExist:
        admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@hospital.com",
            password="Admin@123",
        )
        admin_user.groups.add(roles["Admin"])
        print("\n  admin created with password Admin@123")

    # ─────────────────────────────
    # 3. HOSPITAL SETTINGS
    # ─────────────────────────────
    if not HospitalSettings.objects.exists():
        HospitalSettings.objects.create(registration_fee=Decimal("200.00"))
        print("  HospitalSettings created")
    else:
        print("  HospitalSettings already exists")

    # ─────────────────────────────
    # 4. DOCTORS
    # Staff fields: phone, gender, dob, qualification, address, salary
    # Doctor fields: specialization, consultation_fee, available_from/to, slot, joining
    # ─────────────────────────────
    print("\n--- Creating Doctors ---")

    doctors_data = [
        {
            # Staff fields
            "username":      "dr.rajesh",
            "first_name":    "Rajesh",
            "last_name":     "Kumar",
            "email":         "rajesh.kumar@hospital.com",
            "password":      "Doctor@1234",
            "phone":         "9845601001",
            "gender":        "M",
            "dob":           date(1980, 5, 15),
            "qualification": "Bachelor of Medicine and Surgery",
            "address":       "MG Road, Ernakulam, Kochi, Kerala",
            "salary":        Decimal("75000.00"),
            # Doctor fields
            "specialization":     SpecializationChoices.CARDIOLOGY,
            "consultation_fee":   Decimal("500.00"),
            "available_from":     time(9, 0),
            "available_to":       time(17, 0),
            "slot_duration":      15,
            "date_of_joining":    date(2015, 3, 1),
        },
        {
            "username":      "dr.priya",
            "first_name":    "Priya",
            "last_name":     "Sharma",
            "email":         "priya.sharma@hospital.com",
            "password":      "Doctor@1234",
            "phone":         "9845601002",
            "gender":        "F",
            "dob":           date(1985, 8, 22),
            "qualification": "Master of Surgery",
            "address":       "Pattom Junction, Thiruvananthapuram, Kerala",
            "salary":        Decimal("80000.00"),
            "specialization":     SpecializationChoices.GYNECOLOGY,
            "consultation_fee":   Decimal("600.00"),
            "available_from":     time(10, 0),
            "available_to":       time(18, 0),
            "slot_duration":      20,
            "date_of_joining":    date(2018, 6, 15),
        },
        {
            "username":      "dr.arun",
            "first_name":    "Arun",
            "last_name":     "Nair",
            "email":         "arun.nair@hospital.com",
            "password":      "Doctor@1234",
            "phone":         "9845601003",
            "gender":        "M",
            "dob":           date(1978, 11, 3),
            "qualification": "Master of Surgery",
            "address":       "Palayam, Kozhikode, Kerala",
            "salary":        Decimal("72000.00"),
            "specialization":     SpecializationChoices.ORTHOPEDICS,
            "consultation_fee":   Decimal("450.00"),
            "available_from":     time(8, 0),
            "available_to":       time(14, 0),
            "slot_duration":      15,
            "date_of_joining":    date(2012, 1, 10),
        },
        {
            "username":      "dr.meena",
            "first_name":    "Meena",
            "last_name":     "Pillai",
            "email":         "meena.pillai@hospital.com",
            "password":      "Doctor@1234",
            "phone":         "9845601004",
            "gender":        "F",
            "dob":           date(1990, 2, 14),
            "qualification": "Doctor of Medicine",
            "address":       "Kowdiar, Thiruvananthapuram, Kerala",
            "salary":        Decimal("70000.00"),
            "specialization":     SpecializationChoices.PEDIATRICS,
            "consultation_fee":   Decimal("400.00"),
            "available_from":     time(9, 0),
            "available_to":       time(15, 0),
            "slot_duration":      15,
            "date_of_joining":    date(2020, 7, 1),
        },
    ]

    for d in doctors_data:
        with transaction.atomic():
            if User.objects.filter(username=d["username"]).exists():
                print(f"  {d['username']} already exists, skipping")
                continue

            user = User.objects.create_user(
                username=d["username"],
                first_name=d["first_name"],
                last_name=d["last_name"],
                email=d["email"],
                password=d["password"],
            )
            user.groups.add(roles["Doctor"])

            # Staff record — has qualification, address, salary
            staff = Staff(
                user=user,
                phone=d["phone"],
                gender=d["gender"],
                date_of_birth=d["dob"],
                qualification=d["qualification"],
                address=d["address"],
                salary=d["salary"],
                role=roles["Doctor"],
                is_active=True,
            )
            staff.save()

            # Doctor record — has specialization and schedule info
            doctor = Doctor(
                staff=staff,
                specialization=d["specialization"],
                consultation_fee=d["consultation_fee"],
                available_from=d["available_from"],
                available_to=d["available_to"],
                slot_duration=d["slot_duration"],
                date_of_joining=d["date_of_joining"],
            )
            doctor.save()

            print(f"  Created: Dr. {d['first_name']} {d['last_name']} | {d['specialization']} | {d['qualification']}")

    # ─────────────────────────────
    # 5. DOCTOR SCHEDULES
    # ─────────────────────────────
    print("\n--- Creating Doctor Schedules ---")
    today = date.today()
    for doctor in Doctor.objects.all():
        count = 0
        for i in range(1, 6):
            sched_date = today + timedelta(days=i)
            if not DoctorSchedule.objects.filter(doctor=doctor, date=sched_date).exists():
                DoctorSchedule(doctor=doctor, date=sched_date, is_available=True).save()
                count += 1
        print(f"  Dr. {doctor.full_name}: {count} schedules created")

    # ─────────────────────────────
    # 6. OTHER STAFF
    # Receptionists, Lab Technicians, Pharmacist
    # Note: qualification is optional for non-doctors
    # ─────────────────────────────
    print("\n--- Creating Other Staff ---")

    other_staff = [
        {
            "username":      "receptionist.ana",
            "first_name":    "Ana",
            "last_name":     "George",
            "email":         "ana.george@hospital.com",
            "password":      "Staff@1234",
            "phone":         "9845602001",
            "gender":        "F",
            "dob":           date(1995, 4, 10),
            "qualification": None,
            "address":       "Thrissur Road, Palakkad, Kerala",
            "salary":        Decimal("30000.00"),
            "role":          "Receptionist",
        },
        {
            "username":      "receptionist.ravi",
            "first_name":    "Ravi",
            "last_name":     "Menon",
            "email":         "ravi.menon@hospital.com",
            "password":      "Staff@1234",
            "phone":         "9845602002",
            "gender":        "M",
            "dob":           date(1993, 9, 25),
            "qualification": None,
            "address":       "Sasthamangalam, Thiruvananthapuram, Kerala",
            "salary":        Decimal("30000.00"),
            "role":          "Receptionist",
        },
        {
            "username":      "labtech.suja",
            "first_name":    "Suja",
            "last_name":     "Thomas",
            "email":         "suja.thomas@hospital.com",
            "password":      "Staff@1234",
            "phone":         "9845603001",
            "gender":        "F",
            "dob":           date(1992, 7, 18),
            "qualification": "Diploma in Medical Laboratory Technology",
            "address":       "Kaloor, Kochi, Kerala",
            "salary":        Decimal("35000.00"),
            "role":          "LabTechnician",
        },
        {
            "username":      "labtech.binu",
            "first_name":    "Binu",
            "last_name":     "Varghese",
            "email":         "binu.varghese@hospital.com",
            "password":      "Staff@1234",
            "phone":         "9845603002",
            "gender":        "M",
            "dob":           date(1991, 3, 5),
            "qualification": "Diploma in Medical Laboratory Technology",
            "address":       "Edapally, Kochi, Kerala",
            "salary":        Decimal("35000.00"),
            "role":          "LabTechnician",
        },
        {
            "username":      "pharma.deepa",
            "first_name":    "Deepa",
            "last_name":     "Krishnan",
            "email":         "deepa.krishnan@hospital.com",
            "password":      "Staff@1234",
            "phone":         "9845604001",
            "gender":        "F",
            "dob":           date(1994, 12, 30),
            "qualification": "Bachelor of Pharmacy",
            "address":       "Manacaud, Thiruvananthapuram, Kerala",
            "salary":        Decimal("38000.00"),
            "role":          "Pharmacist",
        },
    ]

    for s in other_staff:
        with transaction.atomic():
            if User.objects.filter(username=s["username"]).exists():
                print(f"  {s['username']} already exists, skipping")
                continue

            user = User.objects.create_user(
                username=s["username"],
                first_name=s["first_name"],
                last_name=s["last_name"],
                email=s["email"],
                password=s["password"],
            )
            user.groups.add(roles[s["role"]])

            staff = Staff(
                user=user,
                phone=s["phone"],
                gender=s["gender"],
                date_of_birth=s["dob"],
                qualification=s["qualification"],
                address=s["address"],
                salary=s["salary"],
                role=roles[s["role"]],
                is_active=True,
            )
            staff.save()
            print(f"  Created: {s['first_name']} {s['last_name']} | {s['role']} | qual: {s['qualification'] or 'N/A'}")

    # ─────────────────────────────
    # 7. PATIENTS
    # ─────────────────────────────
    print("\n--- Creating Patients ---")

    patients_data = [
        ("Arjun Nambiar",   date(1990, 3, 12),  "O+",  "Male",   "9447101001", "MG Road, Kochi, Kerala"),
        ("Lakshmi Devi",    date(1975, 7, 28),  "A+",  "Female", "9447101002", "Pattom, Thiruvananthapuram, Kerala"),
        ("Suresh Babu",     date(1985, 11, 5),  "B+",  "Male",   "9447101003", "Palayam, Kozhikode, Kerala"),
        ("Anjali Menon",    date(2000, 1, 19),  "AB+", "Female", "9447101004", "Thrissur Road, Palakkad, Kerala"),
        ("Mohammed Rashid", date(1968, 6, 3),   "O-",  "Male",   "9447101005", "Beach Road, Kozhikode, Kerala"),
        ("Sindhu Rajesh",   date(1998, 9, 14),  "A-",  "Female", "9447101006", "Kowdiar, Thiruvananthapuram, Kerala"),
        ("Vijayan Pillai",  date(1955, 4, 22),  "B-",  "Male",   "9447101007", "Sasthamangalam, Thiruvananthapuram, Kerala"),
        ("Rekha Chandran",  date(1982, 2, 8),   "AB-", "Female", "9447101008", "Kaloor, Ernakulam, Kochi, Kerala"),
        ("Abishek Mohan",   date(2005, 8, 30),  "O+",  "Male",   "9447101009", "Edapally, Ernakulam, Kochi, Kerala"),
        ("Geetha Suresh",   date(1972, 12, 17), "A+",  "Female", "9447101010", "Manacaud, Thiruvananthapuram, Kerala"),
    ]

    for name, dob, bg, gender, phone, address in patients_data:
        if not Patient.objects.filter(phone=phone).exists():
            Patient(
                name=name, dob=dob, blood_group=bg, gender=gender,
                phone=phone, address=address,
                registration_fee=Decimal("200.00"),
                registration_fee_paid=True,
                is_active=True,
            ).save()
            print(f"  Created: {name}")
        else:
            print(f"  {name} already exists, skipping")

    # ─────────────────────────────
    # 8. MEDICINES
    # ─────────────────────────────
    print("\n--- Creating Medicines ---")

    medicines_data = [
        ("Paracetamol 500mg",  "Sun Pharma",     "Fever and pain relief",                 Decimal("2.50"),  500),
        ("Amoxicillin 250mg",  "Cipla",          "Antibiotic for bacterial infections",   Decimal("8.00"),  200),
        ("Metformin 500mg",    "Mankind Pharma", "Used for type two diabetes management", Decimal("5.00"),  300),
        ("Atorvastatin 10mg",  "Lupin",          "Cholesterol management in patients",    Decimal("12.00"), 150),
        ("Omeprazole 20mg",    "Dr. Reddys",     "Acid reflux and stomach ulcer relief",  Decimal("6.50"),  400),
        ("Cetirizine 10mg",    "Alkem Labs",     "Antihistamine used for allergies",      Decimal("3.00"),  350),
        ("Azithromycin 500mg", "Pfizer",         "Antibiotic for respiratory infections", Decimal("45.00"), 100),
        ("Ibuprofen 400mg",    "Abbott",         "Anti-inflammatory and pain relief",     Decimal("4.50"),  250),
        ("Amlodipine 5mg",     "Torrent Pharma", "Used for blood pressure management",   Decimal("9.00"),  180),
        ("Pantoprazole 40mg",  "Zydus Cadila",   "Reduces gastric acid in stomach",       Decimal("11.00"), 220),
    ]

    for name, mfr, desc, price, stock in medicines_data:
        if not Medicine.objects.filter(name=name).exists():
            Medicine(
                name=name, manufacturer=mfr, description=desc,
                unit_price=price, stock_quantity=stock, status="active",
            ).save()
            print(f"  Created: {name}")
        else:
            print(f"  {name} already exists, skipping")

    # ─────────────────────────────
    # 9. LAB TESTS
    # ─────────────────────────────
    print("\n--- Creating Lab Tests ---")

    lab_tests_data = [
        ("Complete Blood Count",        "Measures all blood cell types including RBC and WBC",       Decimal("4.0"),  Decimal("11.0"),  Decimal("250.00")),
        ("Blood Glucose Fasting",       "Measures blood sugar levels after an overnight fast",       Decimal("70.0"), Decimal("100.0"), Decimal("80.00")),
        ("Lipid Profile",               "Measures cholesterol and triglyceride levels in blood",     Decimal("0.0"),  Decimal("200.0"), Decimal("350.00")),
        ("Thyroid Stimulating Hormone", "Evaluates thyroid gland function and hormone levels",       Decimal("0.4"),  Decimal("4.0"),   Decimal("400.00")),
        ("Liver Function Test",         "Checks liver condition using enzyme and protein markers",   Decimal("7.0"),  Decimal("56.0"),  Decimal("500.00")),
        ("Kidney Function Test",        "Evaluates kidney health via creatinine and urea levels",   Decimal("0.6"),  Decimal("1.2"),   Decimal("450.00")),
        ("Urine Routine Analysis",      "Screens urine for signs of infection and kidney disease",  Decimal("0.0"),  Decimal("8.0"),   Decimal("100.00")),
        ("HbA1c",                       "Measures average blood sugar level over three months",     Decimal("4.0"),  Decimal("5.6"),   Decimal("300.00")),
        ("Chest X-Ray",                 "Imaging of lungs and chest cavity for diagnosis",          Decimal("0.0"),  Decimal("1.0"),   Decimal("200.00")),
        ("ECG",                         "Records the electrical activity of the heart muscle",      Decimal("60.0"), Decimal("100.0"), Decimal("150.00")),
    ]

    for name, desc, min_r, max_r, price in lab_tests_data:
        if not LabTest.objects.filter(test_name=name).exists():
            LabTest(
                test_name=name, description=desc,
                min_range=min_r, max_range=max_r,
                price=price, status="active",
            ).save()
            print(f"  Created: {name}")
        else:
            print(f"  {name} already exists, skipping")

    # ─────────────────────────────
    # SUMMARY
    # ─────────────────────────────
    print("\n" + "=" * 50)
    print("Seed complete!")
    print("=" * 50)
    print("\nLogin credentials:")
    print("  Admin      : admin             / Admin@123")
    print("  Doctor     : dr.rajesh         / Doctor@1234")
    print("               dr.priya          / Doctor@1234")
    print("               dr.arun           / Doctor@1234")
    print("               dr.meena          / Doctor@1234")
    print("  Reception  : receptionist.ana  / Staff@1234")
    print("               receptionist.ravi / Staff@1234")
    print("  Lab Tech   : labtech.suja      / Staff@1234")
    print("               labtech.binu      / Staff@1234")
    print("  Pharmacist : pharma.deepa      / Staff@1234")
    print("=" * 50)


run()