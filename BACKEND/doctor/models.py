from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Consultation(models.Model):
    """
    Represents a medical consultation linked to an appointment.
    Stores doctor's notes and related prescriptions.
    Once finalized, the record becomes immutable.
    """

    appointment = models.OneToOneField(
        "receptionist.Appointment",
        on_delete=models.PROTECT,
        related_name="consultation"
    )
    subjective = models.TextField(help_text="Patient complaints")
    diagnosis = models.TextField(help_text="Doctor's diagnosis")
    medicines = models.ManyToManyField("pharmacist.Medicine", through="PrescribeMed")
    lab_tests = models.ManyToManyField("lab_tech.LabTest", through="PrescribeLab")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    finalized = models.BooleanField(
        default=False,
        help_text="True if consultation is locked for further changes."
    )

    class Meta:
        db_table = "consultation"
        ordering = ["-created_at"]
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"

    def clean(self):
        errors = {}

        if not self.appointment_id:
            errors["appointment"] = "Appointment is required."

        if not self.created_by_id:
            errors["created_by"] = "Created by user is required."

        subjective = (self.subjective or "").strip()
        diagnosis = (self.diagnosis or "").strip()

        if not subjective:
            errors["subjective"] = "Subjective notes are required."
        elif len(subjective) < 3:
            errors["subjective"] = "Subjective notes must be at least 3 characters long."
        elif len(subjective) > 5000:
            errors["subjective"] = "Subjective notes must not exceed 5000 characters."

        if not diagnosis:
            errors["diagnosis"] = "Diagnosis is required."
        elif len(diagnosis) < 3:
            errors["diagnosis"] = "Diagnosis must be at least 3 characters long."
        elif len(diagnosis) > 5000:
            errors["diagnosis"] = "Diagnosis must not exceed 5000 characters."

        if self.created_by_id:
            user = self.created_by
            if not getattr(user, "is_active", False):
                errors["created_by"] = "Only an active user can create a consultation."

        if self.appointment_id:
            appointment = self.appointment

            if hasattr(appointment, "status"):
                appointment_status = str(getattr(appointment, "status", "")).strip().lower()
                if appointment_status and appointment_status not in {"confirmed", "completed", "checked_in", "in_progress"}:
                    errors["appointment"] = "Consultation can only be created for a valid active appointment."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        is_create = self.pk is None

        self.subjective = (self.subjective or "").strip()
        self.diagnosis = (self.diagnosis or "").strip()

        self.full_clean()

        if is_create:
            return super().save(*args, **kwargs)

        existing = Consultation.objects.get(pk=self.pk)

        # Allow only finalized to change from False -> True
        if self.finalized and not existing.finalized:
            disallowed_changes = []

            tracked_fields = [
                "appointment_id",
                "subjective",
                "diagnosis",
                "created_by_id",
            ]

            for field in tracked_fields:
                if getattr(self, field) != getattr(existing, field):
                    disallowed_changes.append(field)

            if disallowed_changes:
                raise ValidationError({
                    "non_field_errors": [
                        "Consultation record cannot be modified. Only finalization is allowed."
                    ]
                })

            return super().save(*args, update_fields=["finalized"], **kwargs)

        raise ValidationError({
            "non_field_errors": ["Consultation record cannot be changed after creation."]
        })

    def delete(self, *args, **kwargs):
        raise ValidationError({
            "non_field_errors": ["Consultation records cannot be deleted."]
        })

    def __str__(self):
        patient_name = getattr(getattr(self.appointment, "patient", None), "name", "Unknown Patient")
        doctor_name = getattr(self.appointment, "doctor_name", "Unknown Doctor")
        consultation_date = self.created_at.date() if self.created_at else "Unknown Date"

        return f"Consultation #{self.pk} for {patient_name} by Dr. {doctor_name} on {consultation_date}"


class PrescribeMed(models.Model):
    """
    Through model for Consultation and Medicine.
    Immutable after creation.
    """

    FREQUENCY_CHOICES = [
        ("1-1-1", "1-1-1"),
        ("0-1-1", "0-1-1"),
        ("1-0-1", "1-0-1"),
        ("1-1-0", "1-1-0"),
        ("0-0-1", "0-0-1"),
        ("0-1-0", "0-1-0"),
        ("1-0-0", "1-0-0"),
    ]

    consultation = models.ForeignKey(
        "Consultation",
        on_delete=models.PROTECT,
        related_name="medicine_prescriptions"
    )
    medicine = models.ForeignKey("pharmacist.Medicine", on_delete=models.PROTECT)
    duration = models.PositiveIntegerField()
    frequency = models.CharField(max_length=7, choices=FREQUENCY_CHOICES)
    dosage = models.PositiveIntegerField()
    unit = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "prescribe_medicine"
        unique_together = ("consultation", "medicine")

    def clean(self):
        errors = {}

        if not self.consultation_id:
            errors["consultation"] = "Consultation is required."

        if not self.medicine_id:
            errors["medicine"] = "Medicine is required."

        if self.duration in (None, ""):
            errors["duration"] = "Duration is required."
        elif not isinstance(self.duration, int):
            errors["duration"] = "Duration must be a valid integer."
        elif self.duration <= 0:
            errors["duration"] = "Duration must be greater than 0."
        elif self.duration > 365:
            errors["duration"] = "Duration must not exceed 365 days."

        if self.dosage in (None, ""):
            errors["dosage"] = "Dosage is required."
        elif not isinstance(self.dosage, int):
            errors["dosage"] = "Dosage must be a valid integer."
        elif self.dosage <= 0:
            errors["dosage"] = "Dosage must be greater than 0."
        elif self.dosage > 100:
            errors["dosage"] = "Dosage must not exceed 100."

        frequency_values = {choice[0] for choice in self.FREQUENCY_CHOICES}
        if not self.frequency:
            errors["frequency"] = "Frequency is required."
        elif self.frequency not in frequency_values:
            errors["frequency"] = "Invalid frequency selected."

        self.unit = (self.unit or "").strip()
        if self.unit and len(self.unit) > 20:
            errors["unit"] = "Unit must not exceed 20 characters."

        if self.consultation_id:
            consultation = self.consultation

            if consultation.finalized:
                errors["consultation"] = "Cannot add medicine to a finalized consultation."

        if self.medicine_id:
            medicine = self.medicine

            if hasattr(medicine, "is_active") and not medicine.is_active:
                errors["medicine"] = "Only active medicines can be prescribed."

        if self.consultation_id and self.medicine_id:
            qs = PrescribeMed.objects.filter(
                consultation=self.consultation,
                medicine=self.medicine,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["medicine"] = "This medicine is already prescribed for this consultation."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.unit = (self.unit or "").strip()
        self.full_clean()

        if self.pk:
            raise ValidationError({
                "non_field_errors": ["This prescription cannot be updated after creation."]
            })

        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError({
            "non_field_errors": ["Medicine prescriptions cannot be deleted."]
        })

    def __str__(self):
        patient_name = getattr(getattr(self.consultation.appointment, "patient", None), "name", "Unknown Patient")
        medicine_name = getattr(self.medicine, "name", "Unknown Medicine")
        return f"{medicine_name} for {patient_name}"


class PrescribeLab(models.Model):
    """
    Through model for Consultation and LabTest.
    Immutable after creation.
    """

    consultation = models.ForeignKey(
        "Consultation",
        on_delete=models.PROTECT,
        related_name="lab_prescriptions"
    )
    lab_test = models.ForeignKey("lab_tech.LabTest", on_delete=models.PROTECT)

    class Meta:
        db_table = "prescribe_lab"
        unique_together = ("consultation", "lab_test")

    def clean(self):
        errors = {}

        if not self.consultation_id:
            errors["consultation"] = "Consultation is required."

        if not self.lab_test_id:
            errors["lab_test"] = "Lab test is required."

        if self.consultation_id:
            consultation = self.consultation

            if consultation.finalized:
                errors["consultation"] = "Cannot add lab test to a finalized consultation."

        if self.lab_test_id:
            lab_test = self.lab_test

            if hasattr(lab_test, "status"):
                if str(lab_test.status).lower() != "active":
                    errors["lab_test"] = "Only active lab tests can be prescribed."
            else:
                errors["lab_test"] = "Lab test must define an active status before it can be prescribed."

        if self.consultation_id and self.lab_test_id:
            qs = PrescribeLab.objects.filter(
                consultation=self.consultation,
                lab_test=self.lab_test,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["lab_test"] = "This lab test is already prescribed for this consultation."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.pk:
            raise ValidationError({
                "non_field_errors": ["This lab prescription cannot be updated after creation."]
            })

        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError({
            "non_field_errors": ["Lab prescriptions cannot be deleted."]
        })

    def __str__(self):
        patient_name = getattr(getattr(self.consultation.appointment, "patient", None), "name", "Unknown Patient")
        lab_test_name = getattr(self.lab_test, "test_name", "Unknown Lab Test")
        return f"{lab_test_name} for {patient_name}"