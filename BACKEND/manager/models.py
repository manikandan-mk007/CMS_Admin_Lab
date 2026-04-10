from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import re

from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models
from django.utils import timezone


NAME_REGEX = re.compile(r"^[A-Za-z][A-Za-z\s.'-]*[A-Za-z]$")
USERNAME_REGEX = re.compile(r"^[A-Za-z0-9._@+-]+$")
QUALIFICATION_REGEX = re.compile(r"^[A-Za-z0-9.,()\-\/\s]+$")
TEST_NAME_REGEX = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s().,+/%-]*[A-Za-z0-9)]$")


def normalize_text(value):
    if value is None:
        return None
    return value.strip()


def _letters_only(value: str) -> str:
    return re.sub(r"[^A-Za-z]", "", value or "").lower()


def is_gibberish_text(value: str) -> bool:
    if not value:
        return True

    cleaned = _letters_only(value)
    if not cleaned:
        return True

    blocked_words = {
        "test", "testing", "demo", "dummy", "fake", "unknown",
        "na", "none", "null", "sample", "admin", "user",
        "asdf", "asdfgh", "qwerty", "qwertyui", "zxcv",
        "abc", "xyz", "xxxxx", "yyyyy"
    }
    if cleaned in blocked_words:
        return True

    if len(set(cleaned)) == 1:
        return True

    if re.search(r"(.)\1{3,}", cleaned):
        return True

    vowels = set("aeiou")
    vowel_count = sum(1 for ch in cleaned if ch in vowels)

    if len(cleaned) >= 6 and vowel_count == 0:
        return True

    if re.search(r"[bcdfghjklmnpqrstvwxyz]{6,}", cleaned):
        return True

    if len(cleaned) >= 8 and len(set(cleaned)) <= 3:
        return True

    for pattern in ("asdf", "qwer", "zxcv", "poiuy", "lkjh", "mnbv"):
        if pattern in cleaned:
            return True

    if len(cleaned) >= 12:
        vowel_ratio = vowel_count / len(cleaned)
        if vowel_ratio < 0.20 or vowel_ratio > 0.85:
            return True

    return False


def validate_money_value(value, *, field_label: str, min_value: Decimal, max_value: Decimal):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be a valid decimal number."})

    if value < min_value:
        comparator = "greater than or equal to" if min_value == Decimal("0.00") else "greater than"
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be {comparator} {min_value}."})
    if value > max_value:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must not exceed {max_value}."})
    if value.as_tuple().exponent < -2:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} cannot have more than 2 decimal places."})

    return value


class GenderChoices(models.TextChoices):
    MALE = "M", "Male"
    FEMALE = "F", "Female"
    OTHER = "O", "Other"


# =====================================================
# SPECIALIZATION CHOICES
# Hardcoded list — prevents free-text typos like
# "Cardiology" vs "cardiologi". Add new entries here
# when needed; they auto-appear in the frontend dropdown.
# =====================================================

class SpecializationChoices(models.TextChoices):
    CARDIOLOGY        = "Cardiology",        "Cardiology"
    DERMATOLOGY       = "Dermatology",       "Dermatology"
    NEUROLOGY         = "Neurology",         "Neurology"
    ORTHOPEDICS       = "Orthopedics",       "Orthopedics"
    PEDIATRICS        = "Pediatrics",        "Pediatrics"
    PSYCHIATRY        = "Psychiatry",        "Psychiatry"
    RADIOLOGY         = "Radiology",         "Radiology"
    GENERAL_MEDICINE  = "General Medicine",  "General Medicine"
    ENT               = "ENT",               "ENT"
    OPHTHALMOLOGY     = "Ophthalmology",     "Ophthalmology"
    GYNECOLOGY        = "Gynecology",        "Gynecology"
    UROLOGY           = "Urology",           "Urology"
    ONCOLOGY          = "Oncology",          "Oncology"
    ANESTHESIOLOGY    = "Anesthesiology",    "Anesthesiology"
    NEPHROLOGY        = "Nephrology",        "Nephrology"
    PULMONOLOGY       = "Pulmonology",       "Pulmonology"
    GASTROENTEROLOGY  = "Gastroenterology",  "Gastroenterology"
    ENDOCRINOLOGY     = "Endocrinology",     "Endocrinology"
    RHEUMATOLOGY      = "Rheumatology",      "Rheumatology"
    GENERAL_SURGERY   = "General Surgery",   "General Surgery"


class Staff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15)
    is_active = models.BooleanField(default=True)
    created_on = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey(Group, on_delete=models.PROTECT)
    gender = models.CharField(max_length=1, choices=GenderChoices.choices)
    date_of_birth = models.DateField(null=True, blank=True)

    qualification = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "staff"

    def clean(self):
        errors = {}

        if not self.user_id and not getattr(self, "user", None):
            errors["user"] = "User is required."
        else:
            user = self.user

            username = normalize_text(getattr(user, "username", ""))
            first_name = normalize_text(getattr(user, "first_name", ""))
            last_name = normalize_text(getattr(user, "last_name", ""))
            email = normalize_text(getattr(user, "email", ""))

            if not username:
                errors["user"] = "Username is required."
            elif len(username) < 3:
                errors["user"] = "Username must be at least 3 characters long."
            elif len(username) > 150:
                errors["user"] = "Username must not exceed 150 characters."
            elif not USERNAME_REGEX.fullmatch(username):
                errors["user"] = "Username contains invalid characters."
            elif username.lower() in {"admin", "administrator", "test", "demo", "dummy", "user"}:
                errors["user"] = "Enter a valid username."
            elif ".." in username or "__" in username or "--" in username:
                errors["user"] = "Username format is invalid."
            else:
                username_qs = User.objects.filter(username__iexact=username)
                if user.pk:
                    username_qs = username_qs.exclude(pk=user.pk)
                if username_qs.exists():
                    errors["user"] = "A user with this username already exists."

            if not first_name:
                errors["user"] = "First name is required."
            elif len(first_name) < 2:
                errors["user"] = "First name must be at least 2 characters long."
            elif len(first_name) > 150:
                errors["user"] = "First name must not exceed 150 characters."
            elif not NAME_REGEX.fullmatch(first_name):
                errors["user"] = "First name contains invalid characters."
            elif is_gibberish_text(first_name):
                errors["user"] = "Enter a valid real first name."

            if not last_name:
                errors["user"] = "Last name is required."
            elif len(last_name) < 2:
                errors["user"] = "Last name must be at least 2 characters long."
            elif len(last_name) > 150:
                errors["user"] = "Last name must not exceed 150 characters."
            elif not NAME_REGEX.fullmatch(last_name):
                errors["user"] = "Last name contains invalid characters."
            elif is_gibberish_text(last_name):
                errors["user"] = "Enter a valid real last name."
            elif first_name and last_name and first_name.lower() == last_name.lower():
                errors["user"] = "First name and last name cannot be the same."

            if not email:
                errors["user"] = "Email is required."
            elif len(email) > 254:
                errors["user"] = "Email must not exceed 254 characters."
            elif ".." in email or email.startswith(".") or email.endswith("."):
                errors["user"] = "Enter a valid email address."
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["user"] = "Enter a valid email address."
                else:
                    local_part = email.split("@")[0].lower()
                    domain = email.split("@")[-1].lower()

                    if local_part in {"test", "demo", "dummy", "fake", "admin", "user", "sample"}:
                        errors["user"] = "Enter a real email address."
                    elif domain in {"test.com", "fake.com", "dummy.com", "example", "example.com"}:
                        errors["user"] = "Enter a real email address."
                    else:
                        email_qs = User.objects.filter(email__iexact=email)
                        if user.pk:
                            email_qs = email_qs.exclude(pk=user.pk)
                        if email_qs.exists():
                            errors["user"] = "A user with this email already exists."

        self.phone = normalize_text(self.phone) or ""
        if not self.phone:
            errors["phone"] = "Phone number is required."
        elif not self.phone.isdigit():
            errors["phone"] = "Phone number must contain only digits."
        elif len(self.phone) != 10:
            errors["phone"] = "Phone number must be exactly 10 digits."
        elif self.phone[0] not in {"6", "7", "8", "9"}:
            errors["phone"] = "Phone number must start with 6, 7, 8, or 9."
        elif len(set(self.phone)) == 1:
            errors["phone"] = "Invalid phone number."
        elif self.phone in {"1234567890", "0123456789", "9876543210"}:
            errors["phone"] = "Enter a valid phone number."
        else:
            phone_qs = Staff.objects.filter(phone=self.phone)
            if self.pk:
                phone_qs = phone_qs.exclude(pk=self.pk)
            if phone_qs.exists():
                errors["phone"] = "This phone number is already in use."

        if not isinstance(self.is_active, bool):
            errors["is_active"] = "Active status must be true or false."

        if not self.role_id:
            errors["role"] = "Role is required."
        else:
            role_name = normalize_text(getattr(self.role, "name", ""))
            if not role_name:
                errors["role"] = "Role is invalid."
            elif len(role_name) < 2:
                errors["role"] = "Role is invalid."
            elif role_name.lower() in {"test", "dummy", "fake"}:
                errors["role"] = "Role is invalid."

        valid_genders = {choice[0] for choice in GenderChoices.choices}
        if not self.gender:
            errors["gender"] = "Gender is required."
        elif self.gender not in valid_genders:
            errors["gender"] = "Invalid gender selected."

        if self.date_of_birth:
            today = date.today()
            dob = self.date_of_birth

            if dob >= today:
                errors["date_of_birth"] = "Date of birth must be in the past."
            else:
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                if age < 18:
                    errors["date_of_birth"] = "Staff must be at least 18 years old."
                elif age > 100:
                    errors["date_of_birth"] = "Please enter a valid date of birth."

        if self.qualification is not None:
            self.qualification = normalize_text(self.qualification)
            if self.qualification == "":
                self.qualification = None
            elif len(self.qualification) < 2:
                errors["qualification"] = "Qualification must be at least 2 characters long."
            elif len(self.qualification) > 255:
                errors["qualification"] = "Qualification must not exceed 255 characters."
            elif not QUALIFICATION_REGEX.fullmatch(self.qualification):
                errors["qualification"] = "Qualification contains invalid characters."
            elif is_gibberish_text(self.qualification):
                errors["qualification"] = "Enter a valid qualification."

        if self.address is not None:
            self.address = normalize_text(self.address)
            if self.address == "":
                self.address = None
            elif len(self.address) < 5:
                errors["address"] = "Address must be at least 5 characters long."
            elif len(self.address) > 500:
                errors["address"] = "Address must not exceed 500 characters."
            elif is_gibberish_text(self.address):
                errors["address"] = "Enter a valid address."

        if self.salary is not None:
            try:
                if not isinstance(self.salary, Decimal):
                    self.salary = Decimal(str(self.salary))
                if self.salary < Decimal("0.00"):
                    errors["salary"] = "Salary cannot be negative."
                elif self.salary > Decimal("400000.00"):
                    errors["salary"] = "Salary must not exceed 400000.00."
                elif self.salary.as_tuple().exponent < -2:
                    errors["salary"] = "Salary cannot have more than 2 decimal places."
            except (InvalidOperation, TypeError, ValueError):
                errors["salary"] = "Salary must be a valid decimal number."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def __str__(self):
        return self.user.username


class Doctor(models.Model):
    staff = models.OneToOneField(Staff, on_delete=models.CASCADE)
    specialization = models.CharField(
        max_length=100,
        choices=SpecializationChoices.choices,
    )
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)

    available_from = models.TimeField()
    available_to = models.TimeField()

    slot_duration = models.PositiveIntegerField(default=15)
    date_of_joining = models.DateField()
    max_tokens = models.PositiveIntegerField(editable=False, default=0)

    class Meta:
        db_table = "doctor"

    def clean(self):
        errors = {}

        if not self.staff_id:
            errors["staff"] = "Staff is required."
        else:
            if not self.staff.is_active:
                errors["staff"] = "Only active staff can be assigned as doctor."
            elif not self.staff.role_id:
                errors["staff"] = "Assigned staff must have a valid role."
            elif self.staff.role.name.lower() != "doctor":
                errors["staff"] = "Assigned staff must have Doctor role."

            existing_qs = Doctor.objects.filter(staff=self.staff)
            if self.pk:
                existing_qs = existing_qs.exclude(pk=self.pk)
            if existing_qs.exists():
                errors["staff"] = "This staff is already assigned as a doctor."

        valid_specializations = {choice[0] for choice in SpecializationChoices.choices}
        if not self.specialization:
            errors["specialization"] = "Specialization is required."
        elif self.specialization not in valid_specializations:
            errors["specialization"] = "Invalid specialization selected."

        if self.consultation_fee in (None, ""):
            errors["consultation_fee"] = "Consultation fee is required."
        else:
            try:
                if not isinstance(self.consultation_fee, Decimal):
                    self.consultation_fee = Decimal(str(self.consultation_fee))
                if self.consultation_fee < Decimal("0.00"):
                    errors["consultation_fee"] = "Consultation fee cannot be negative."
                elif self.consultation_fee > Decimal("9999.99"):
                    errors["consultation_fee"] = "Consultation fee must not exceed 9999.99."
                elif self.consultation_fee.as_tuple().exponent < -2:
                    errors["consultation_fee"] = "Consultation fee cannot have more than 2 decimal places."
            except (InvalidOperation, TypeError, ValueError):
                errors["consultation_fee"] = "Consultation fee must be a valid decimal number."

        if not self.available_from:
            errors["available_from"] = "Available from time is required."
        if not self.available_to:
            errors["available_to"] = "Available to time is required."

        if self.available_from and self.available_to:
            if self.available_from >= self.available_to:
                errors["available_from"] = "Available from must be before available to."
            else:
                start = datetime.combine(datetime.today(), self.available_from)
                end = datetime.combine(datetime.today(), self.available_to)
                total_minutes = (end - start).total_seconds() / 60

                if total_minutes < 15:
                    errors["available_to"] = "Availability window is too short."
                elif total_minutes > 1440:
                    errors["available_to"] = "Availability window is invalid."

        if self.slot_duration in (None, ""):
            errors["slot_duration"] = "Slot duration is required."
        elif not isinstance(self.slot_duration, int):
            errors["slot_duration"] = "Slot duration must be a valid integer."
        elif self.slot_duration <= 0:
            errors["slot_duration"] = "Slot duration must be greater than zero."
        elif self.slot_duration > 240:
            errors["slot_duration"] = "Slot duration is too large."

        if not self.date_of_joining:
            errors["date_of_joining"] = "Date of joining is required."
        else:
            today = timezone.now().date()
            if self.date_of_joining > today:
                errors["date_of_joining"] = "Date of joining cannot be in future."
            elif self.date_of_joining < date(1950, 1, 1):
                errors["date_of_joining"] = "Date of joining is unrealistically old."
            elif self.staff_id and self.staff.date_of_birth and self.date_of_joining <= self.staff.date_of_birth:
                errors["date_of_joining"] = "Date of joining must be after date of birth."

        if (
            self.available_from
            and self.available_to
            and isinstance(self.slot_duration, int)
            and self.slot_duration > 0
        ):
            start = datetime.combine(datetime.today(), self.available_from)
            end = datetime.combine(datetime.today(), self.available_to)
            total_minutes = (end - start).total_seconds() / 60

            if total_minutes < self.slot_duration:
                errors["slot_duration"] = "Available time must allow at least one appointment slot."

        if errors:
            raise ValidationError(errors)

    def cal_tokens(self):
        start = datetime.combine(datetime.today(), self.available_from)
        end = datetime.combine(datetime.today(), self.available_to)
        total_minutes = (end - start).total_seconds() / 60
        return int(total_minutes // self.slot_duration)

    def save(self, *args, **kwargs):
        self.full_clean()
        self.max_tokens = self.cal_tokens()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return self.staff.user.get_full_name()

    def __str__(self):
        return f"{self.staff.user.username} - {self.specialization}"


class DoctorSchedule(models.Model):
    doctor = models.ForeignKey("Doctor", on_delete=models.CASCADE, related_name="schedules")
    date = models.DateField()
    available_from = models.TimeField(blank=True, null=True)
    available_to = models.TimeField(blank=True, null=True)
    max_tokens = models.PositiveIntegerField(editable=False, default=0)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "doctor_schedule"
        constraints = [
            models.UniqueConstraint(fields=["doctor", "date"], name="unique_doctor_schedule")
        ]

    def clean(self):
        errors = {}
        today = timezone.now().date()

        if not self.doctor_id:
            errors["doctor"] = "Doctor is required."
        else:
            if not self.doctor.staff.is_active:
                errors["doctor"] = "Schedule can only be created for active doctor staff."

        if not self.date:
            errors["date"] = "Date is required."
        elif self.date < today:
            errors["date"] = "Cannot create schedule for a past date."
        elif self.date > today + timedelta(days=365):
            errors["date"] = "Schedule date is too far in the future."

        if not isinstance(self.is_available, bool):
            errors["is_available"] = "Availability status must be true or false."

        if errors:
            raise ValidationError(errors)

        if not self.is_available:
            self.available_from = None
            self.available_to = None
            return

        start_time = self.available_from or self.doctor.available_from
        end_time = self.available_to or self.doctor.available_to

        if not start_time:
            raise ValidationError({"available_from": "Start time is required."})
        if not end_time:
            raise ValidationError({"available_to": "End time is required."})
        if start_time >= end_time:
            raise ValidationError({"available_from": "Start time must be before end time."})

        start = datetime.combine(self.date, start_time)
        end = datetime.combine(self.date, end_time)
        total_minutes = (end - start).total_seconds() / 60

        if total_minutes < self.doctor.slot_duration:
            raise ValidationError({"available_to": "Not enough time for even one appointment slot."})
        if total_minutes > 1440:
            raise ValidationError({"available_to": "Schedule timing is invalid."})

        qs = DoctorSchedule.objects.filter(doctor=self.doctor, date=self.date)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.exists():
            raise ValidationError({"date": "A schedule already exists for this doctor on this date."})

    def cal_tokens(self):
        if not self.is_available:
            return 0

        start_time = self.available_from or self.doctor.available_from
        end_time = self.available_to or self.doctor.available_to

        if not start_time or not end_time:
            return 0

        start = datetime.combine(self.date, start_time)
        end = datetime.combine(self.date, end_time)
        total_minutes = (end - start).total_seconds() / 60
        return int(total_minutes // self.doctor.slot_duration)

    def save(self, *args, **kwargs):
        self.full_clean()
        self.max_tokens = self.cal_tokens()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.doctor} - {self.date}"


class HospitalSettings(models.Model):
    registration_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("200.00")
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "hospital_settings"
        verbose_name = "Hospital Settings"
        verbose_name_plural = "Hospital Settings"

    def clean(self):
        errors = {}

        if not self.pk and HospitalSettings.objects.exists():
            errors["non_field_errors"] = ["Only one HospitalSettings instance allowed."]

        if self.registration_fee in (None, ""):
            errors["registration_fee"] = "Registration fee is required."
        else:
            try:
                if not isinstance(self.registration_fee, Decimal):
                    self.registration_fee = Decimal(str(self.registration_fee))
                if self.registration_fee <= Decimal("0.00"):
                    errors["registration_fee"] = "Registration fee must be greater than zero."
                elif self.registration_fee > Decimal("9999.99"):
                    errors["registration_fee"] = "Registration fee must not exceed 9999.99."
                elif self.registration_fee.as_tuple().exponent < -2:
                    errors["registration_fee"] = "Registration fee cannot have more than 2 decimal places."
            except (InvalidOperation, TypeError, ValueError):
                errors["registration_fee"] = "Registration fee must be a valid decimal number."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Registration Fee: Rs.{self.registration_fee}"