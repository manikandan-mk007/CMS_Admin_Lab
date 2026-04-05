from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Patient(models.Model):
    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"), ("A-", "A-"),
        ("B+", "B+"), ("B-", "B-"),
        ("O+", "O+"), ("O-", "O-"),
        ("AB+", "AB+"), ("AB-", "AB-"),
    ]

    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    ]

    name = models.CharField(max_length=100)
    dob = models.DateField()
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    is_active = models.BooleanField(default=True)

    registration_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("200.00"))
    registration_fee_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient"
        ordering = ["name"]

    def clean(self):
        errors = {}

        # -----------------------------
        # name
        # -----------------------------
        self.name = (self.name or "").strip()
        if not self.name:
            errors["name"] = "Patient name is required."
        elif len(self.name) < 2:
            errors["name"] = "Patient name must be at least 2 characters long."
        elif len(self.name) > 100:
            errors["name"] = "Patient name must not exceed 100 characters."

        # -----------------------------
        # dob
        # -----------------------------
        today = timezone.now().date()
        if not self.dob:
            errors["dob"] = "Date of birth is required."
        else:
            if self.dob >= today:
                errors["dob"] = "Date of birth must be in the past."
            else:
                age = today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))
                if age > 130:
                    errors["dob"] = "Please enter a valid date of birth."

        # -----------------------------
        # blood_group
        # -----------------------------
        valid_blood_groups = {choice[0] for choice in self.BLOOD_GROUP_CHOICES}
        if not self.blood_group:
            errors["blood_group"] = "Blood group is required."
        elif self.blood_group not in valid_blood_groups:
            errors["blood_group"] = "Invalid blood group selected."

        # -----------------------------
        # gender
        # -----------------------------
        valid_genders = {choice[0] for choice in self.GENDER_CHOICES}
        if not self.gender:
            errors["gender"] = "Gender is required."
        elif self.gender not in valid_genders:
            errors["gender"] = "Invalid gender selected."

        # -----------------------------
        # phone
        # -----------------------------
        self.phone = (self.phone or "").strip()
        if not self.phone:
            errors["phone"] = "Phone number is required."
        elif not self.phone.isdigit():
            errors["phone"] = "Phone number must contain only digits."
        elif len(self.phone) != 10:
            errors["phone"] = "Phone number must be exactly 10 digits."
        elif len(set(self.phone)) == 1:
            errors["phone"] = "Invalid phone number."

        # -----------------------------
        # address
        # -----------------------------
        self.address = (self.address or "").strip()
        if not self.address:
            errors["address"] = "Address is required."
        elif len(self.address) < 5:
            errors["address"] = "Address must be at least 5 characters long."
        elif len(self.address) > 1000:
            errors["address"] = "Address must not exceed 1000 characters."

        # -----------------------------
        # is_active
        # -----------------------------
        if not isinstance(self.is_active, bool):
            errors["is_active"] = "Active status must be true or false."

        # -----------------------------
        # registration_fee
        # -----------------------------
        if self.registration_fee in (None, ""):
            errors["registration_fee"] = "Registration fee is required."
        else:
            try:
                if not isinstance(self.registration_fee, Decimal):
                    self.registration_fee = Decimal(str(self.registration_fee))

                if self.registration_fee < Decimal("0.00"):
                    errors["registration_fee"] = "Registration fee cannot be negative."
                elif self.registration_fee > Decimal("99999999.99"):
                    errors["registration_fee"] = "Registration fee exceeds the allowed maximum value."
            except (InvalidOperation, TypeError, ValueError):
                errors["registration_fee"] = "Registration fee must be a valid decimal number."

        # -----------------------------
        # registration_fee_paid
        # -----------------------------
        if not isinstance(self.registration_fee_paid, bool):
            errors["registration_fee_paid"] = "Registration fee paid status must be true or false."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def age(self):
        today = timezone.now().date()
        return today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))

    def __str__(self):
        return f"{self.id} - {self.name}"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    doctor_id = models.IntegerField()
    doctor_name = models.CharField(max_length=100)

    appointment_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    fee_paid = models.BooleanField(default=False)

    appointment_date = models.DateField()
    slot_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointment"
        unique_together = ("doctor_id", "appointment_date", "slot_time")
        ordering = ["-appointment_date", "slot_time"]

    def clean(self):
        errors = {}

        # -----------------------------
        # patient
        # -----------------------------
        if not self.patient_id:
            errors["patient"] = "Patient is required."
        else:
            if not getattr(self.patient, "is_active", False):
                errors["patient"] = "Appointments can only be created for active patients."

        # -----------------------------
        # doctor_id
        # -----------------------------
        if self.doctor_id in (None, ""):
            errors["doctor_id"] = "Doctor ID is required."
        elif not isinstance(self.doctor_id, int):
            errors["doctor_id"] = "Doctor ID must be a valid integer."
        elif self.doctor_id <= 0:
            errors["doctor_id"] = "Doctor ID must be greater than 0."

        # -----------------------------
        # doctor_name
        # -----------------------------
        self.doctor_name = (self.doctor_name or "").strip()
        if not self.doctor_name:
            errors["doctor_name"] = "Doctor name is required."
        elif len(self.doctor_name) < 2:
            errors["doctor_name"] = "Doctor name must be at least 2 characters long."
        elif len(self.doctor_name) > 100:
            errors["doctor_name"] = "Doctor name must not exceed 100 characters."

        # -----------------------------
        # appointment_fee
        # -----------------------------
        if self.appointment_fee in (None, ""):
            errors["appointment_fee"] = "Appointment fee is required."
        else:
            try:
                if not isinstance(self.appointment_fee, Decimal):
                    self.appointment_fee = Decimal(str(self.appointment_fee))

                if self.appointment_fee < Decimal("0.00"):
                    errors["appointment_fee"] = "Appointment fee cannot be negative."
                elif self.appointment_fee > Decimal("99999999.99"):
                    errors["appointment_fee"] = "Appointment fee exceeds the allowed maximum value."
            except (InvalidOperation, TypeError, ValueError):
                errors["appointment_fee"] = "Appointment fee must be a valid decimal number."

        # -----------------------------
        # fee_paid
        # -----------------------------
        if not isinstance(self.fee_paid, bool):
            errors["fee_paid"] = "Fee paid status must be true or false."

        # -----------------------------
        # appointment_date
        # -----------------------------
        today = timezone.now().date()
        if not self.appointment_date:
            errors["appointment_date"] = "Appointment date is required."
        else:
            if self.appointment_date < today:
                errors["appointment_date"] = "Appointment date cannot be in the past."
            elif self.appointment_date > today + timezone.timedelta(days=365):
                errors["appointment_date"] = "Appointment date is too far in the future."

        # -----------------------------
        # slot_time
        # -----------------------------
        if not self.slot_time:
            errors["slot_time"] = "Slot time is required."
        else:
            if hasattr(self.slot_time, "second") and self.slot_time.second != 0:
                errors["slot_time"] = "Slot time must not include seconds."

        # -----------------------------
        # status
        # -----------------------------
        valid_statuses = {choice[0] for choice in self.STATUS_CHOICES}
        if not self.status:
            errors["status"] = "Status is required."
        elif self.status not in valid_statuses:
            errors["status"] = "Invalid appointment status selected."

        # -----------------------------
        # unique slot validation
        # -----------------------------
        if self.doctor_id and self.appointment_date and self.slot_time:
            qs = Appointment.objects.filter(
                doctor_id=self.doctor_id,
                appointment_date=self.appointment_date,
                slot_time=self.slot_time,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["slot_time"] = "This doctor already has an appointment at the selected date and time."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        patient_name = getattr(self.patient, "name", "Unknown Patient")
        return f"{self.id} - {patient_name} - {self.appointment_date} {self.slot_time}"


class Bill(models.Model):
    """
    Bill is only a slip.
    All fees are already paid before bill is generated.
    """

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="bill"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bill"
        ordering = ["-created_at"]

    def clean(self):
        errors = {}

        # -----------------------------
        # appointment
        # -----------------------------
        if not self.appointment_id:
            errors["appointment"] = "Appointment is required."
        else:
            appointment = self.appointment

            if hasattr(appointment, "patient") and not getattr(appointment.patient, "registration_fee_paid", False):
                errors["appointment"] = "Bill can only be generated after patient registration fee is paid."

            if not getattr(appointment, "fee_paid", False):
                errors["appointment"] = "Bill can only be generated after appointment fee is paid."

            qs = Bill.objects.filter(appointment=appointment)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["appointment"] = "A bill already exists for this appointment."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def patient_name(self):
        return self.appointment.patient.name

    @property
    def registration_fee(self):
        return self.appointment.patient.registration_fee

    @property
    def appointment_fee(self):
        return self.appointment.appointment_fee

    @property
    def total_amount(self):
        return self.registration_fee + self.appointment_fee

    def __str__(self):
        patient_name = getattr(self.appointment.patient, "name", "Unknown Patient")
        return f"Bill {self.id} - {patient_name} - Total: {self.total_amount}"