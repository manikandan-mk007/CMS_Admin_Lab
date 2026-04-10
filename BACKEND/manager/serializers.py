import re
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Staff,
    Doctor,
    DoctorSchedule,
    HospitalSettings,
    SpecializationChoices,
)

from lab_tech.models import LabTest


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


def validate_real_name(value: str, field_label: str = "Name", max_length: int = 150) -> str:
    value = normalize_text(value) or ""

    if not value:
        raise serializers.ValidationError(f"{field_label} is required.")
    if len(value) < 2:
        raise serializers.ValidationError(f"{field_label} must be at least 2 characters long.")
    if len(value) > max_length:
        raise serializers.ValidationError(f"{field_label} must not exceed {max_length} characters.")
    if not NAME_REGEX.fullmatch(value):
        raise serializers.ValidationError(f"{field_label} contains invalid characters.")
    if is_gibberish_text(value):
        raise serializers.ValidationError(f"Enter a valid real {field_label.lower()}.")

    return value


def validate_description_text(
    value: str,
    field_label: str = "Description",
    min_length: int = 5,
    max_length: int = 500,
    allow_blank: bool = True,
):
    if value is None:
        return value

    value = normalize_text(value)

    if value == "":
        if allow_blank:
            return None
        raise serializers.ValidationError(f"{field_label} is required.")

    if len(value) < min_length:
        raise serializers.ValidationError(f"{field_label} must be at least {min_length} characters long.")
    if len(value) > max_length:
        raise serializers.ValidationError(f"{field_label} must not exceed {max_length} characters.")

    alpha_count = len(_letters_only(value))
    if alpha_count < 3:
        raise serializers.ValidationError(f"Enter a valid {field_label.lower()}.")

    if is_gibberish_text(value):
        raise serializers.ValidationError(f"Enter a valid {field_label.lower()}.")

    return value


def validate_money_value(
    value,
    *,
    field_label: str,
    min_value: Decimal = Decimal("0.00"),
    max_value: Decimal = Decimal("9999.99"),
):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError(f"{field_label} must be a valid decimal number.")

    if value < min_value:
        comparator = "greater than or equal to" if min_value == Decimal("0.00") else "greater than"
        raise serializers.ValidationError(f"{field_label} must be {comparator} {min_value}.")
    if value > max_value:
        raise serializers.ValidationError(f"{field_label} must not exceed {max_value}.")
    if value.as_tuple().exponent < -2:
        raise serializers.ValidationError(f"{field_label} cannot have more than 2 decimal places.")

    return value


def validate_four_digit_range(value, field_label: str):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError(f"{field_label} must be a valid decimal number.")

    if value < Decimal("0"):
        raise serializers.ValidationError(f"{field_label} cannot be negative.")
    if value > Decimal("9999"):
        raise serializers.ValidationError(f"{field_label} must be within 4 digits only.")
    if value.as_tuple().exponent < -2:
        raise serializers.ValidationError(f"{field_label} cannot have more than 2 decimal places.")

    return value


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        allow_blank=False,
        trim_whitespace=False,
        style={"input_type": "password"},
        error_messages={
            "required": "Password is required.",
            "blank": "Password is required.",
        },
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
        ]

    def _get_current_user_id(self):
        if self.instance:
            return self.instance.pk

        user_instance = self.context.get("user_instance")
        if user_instance:
            return user_instance.pk

        return self.context.get("user_id")

    def validate_username(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Username is required.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if len(value) > 150:
            raise serializers.ValidationError("Username must not exceed 150 characters.")
        if not USERNAME_REGEX.fullmatch(value):
            raise serializers.ValidationError(
                "Username may contain only letters, numbers, and ./_/@/+/- characters."
            )
        if value.lower() in {"admin", "administrator", "test", "demo", "dummy", "user"}:
            raise serializers.ValidationError("Enter a valid username.")
        if ".." in value or "__" in value or "--" in value:
            raise serializers.ValidationError("Username format is invalid.")

        qs = User.objects.filter(username__iexact=value)
        current_user_id = self._get_current_user_id()
        if current_user_id:
            qs = qs.exclude(pk=current_user_id)
        if qs.exists():
            raise serializers.ValidationError("A user with this username already exists.")

        return value

    def validate_first_name(self, value):
        return validate_real_name(value, "First name", 150)

    def validate_last_name(self, value):
        return validate_real_name(value, "Last name", 150)

    def validate_email(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Email is required.")
        if len(value) > 254:
            raise serializers.ValidationError("Email must not exceed 254 characters.")
        if ".." in value or value.startswith(".") or value.endswith("."):
            raise serializers.ValidationError("Enter a valid email address.")

        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Enter a valid email address.")

        local_part = value.split("@")[0].lower()
        domain = value.split("@")[-1].lower()

        if local_part in {"test", "demo", "dummy", "fake", "admin", "user", "sample"}:
            raise serializers.ValidationError("Enter a real email address.")
        if domain in {"test.com", "fake.com", "dummy.com", "example", "example.com"}:
            raise serializers.ValidationError("Enter a real email address.")

        qs = User.objects.filter(email__iexact=value)
        current_user_id = self._get_current_user_id()
        if current_user_id:
            qs = qs.exclude(pk=current_user_id)
        if qs.exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return value.lower()

    def validate_password(self, value):
        if not value:
            raise serializers.ValidationError("Password is required.")
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if len(value) > 128:
            raise serializers.ValidationError("Password must not exceed 128 characters.")
        if value.strip() != value:
            raise serializers.ValidationError("Password cannot start or end with spaces.")
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric.")
        if value.lower() in {"password", "admin123", "12345678", "qwerty123"}:
            raise serializers.ValidationError("Password is too weak.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r"[^\w\s]", value):
            raise serializers.ValidationError("Password must contain at least one special character.")

        return value

    def validate(self, attrs):
        errors = {}

        username = attrs.get("username", "")
        first_name = attrs.get("first_name", "")
        last_name = attrs.get("last_name", "")
        email = attrs.get("email", "")
        password = attrs.get("password", "")

        weak_related = {
            username.lower() if username else "",
            first_name.lower() if first_name else "",
            last_name.lower() if last_name else "",
        }
        if password and any(part and part in password.lower() for part in weak_related):
            errors["password"] = ["Password should not contain your personal name or username."]

        if first_name and last_name and first_name.strip().lower() == last_name.strip().lower():
            errors["last_name"] = ["First name and last name cannot be the same."]

        if email and first_name.lower() in {"test", "dummy", "fake"}:
            errors["first_name"] = ["Enter a real first name."]

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    role = serializers.SlugRelatedField(
        queryset=Group.objects.all(),
        slug_field="name"
    )
    age = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Staff
        fields = [
            "id",
            "user",
            "phone",
            "is_active",
            "created_on",
            "role",
            "gender",
            "date_of_birth",
            "qualification",
            "address",
            "salary",
            "age",
            "full_name",
        ]
        read_only_fields = ["created_on", "age", "full_name"]

    def _get_current_staff_id(self):
        if self.instance:
            return self.instance.pk

        staff_instance = self.context.get("staff_instance")
        if staff_instance:
            return staff_instance.pk

        return self.context.get("staff_id")

    def validate_phone(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Phone number is required.")
        if not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")
        if len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        if value[0] not in {"6", "7", "8", "9"}:
            raise serializers.ValidationError("Phone number must start with 6, 7, 8, or 9.")
        if len(set(value)) == 1:
            raise serializers.ValidationError("Invalid phone number.")
        if value in {"1234567890", "0123456789", "9876543210"}:
            raise serializers.ValidationError("Enter a valid phone number.")

        qs = Staff.objects.filter(phone=value)
        current_staff_id = self._get_current_staff_id()
        if current_staff_id:
            qs = qs.exclude(pk=current_staff_id)
        if qs.exists():
            raise serializers.ValidationError("This phone number is already in use.")

        return value

    def validate_is_active(self, value):
        if not isinstance(value, bool):
            raise serializers.ValidationError("Active status must be true or false.")
        return value

    def validate_role(self, value):
        role_name = (value.name or "").strip()

        if not role_name:
            raise serializers.ValidationError("Role is required.")
        if len(role_name) < 2:
            raise serializers.ValidationError("Role is invalid.")
        if role_name.lower() in {"test", "dummy", "fake"}:
            raise serializers.ValidationError("Role is invalid.")

        return value

    def validate_gender(self, value):
        valid_values = {"M", "F", "O"}

        if not value:
            raise serializers.ValidationError("Gender is required.")
        if value not in valid_values:
            raise serializers.ValidationError("Invalid gender selected.")

        return value

    def validate_date_of_birth(self, value):
        today = timezone.now().date()

        if value >= today:
            raise serializers.ValidationError("Date of birth must be in the past.")

        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("Staff must be at least 18 years old.")
        if age > 100:
            raise serializers.ValidationError("Please enter a valid date of birth.")

        return value

    def validate_qualification(self, value):
        if value is None:
            return value

        value = normalize_text(value)

        if value == "":
            return None
        if len(value) < 2:
            raise serializers.ValidationError("Qualification must be at least 2 characters long.")
        if len(value) > 255:
            raise serializers.ValidationError("Qualification must not exceed 255 characters.")
        if not QUALIFICATION_REGEX.fullmatch(value):
            raise serializers.ValidationError("Qualification contains invalid characters.")
        if is_gibberish_text(value):
            raise serializers.ValidationError("Enter a valid qualification.")

        return value

    def validate_address(self, value):
        return validate_description_text(
            value,
            field_label="Address",
            min_length=5,
            max_length=500,
            allow_blank=True,
        )

    def validate_salary(self, value):
        if value is None:
            return value
        return validate_money_value(
            value,
            field_label="Salary",
            min_value=Decimal("0.00"),
            max_value=Decimal("400000.00"),
        )

    def validate(self, attrs):
        errors = {}
        user_data = attrs.get("user", {})
        role = attrs.get("role")
        dob = attrs.get("date_of_birth")

        first_name = (user_data.get("first_name", "") or "").strip().lower()
        last_name = (user_data.get("last_name", "") or "").strip().lower()

        if first_name and last_name and first_name == last_name:
            errors["user"] = {"last_name": ["First name and last name cannot be the same."]}

        if role and role.name.lower() == "doctor" and not dob:
            errors["date_of_birth"] = ["Date of birth is required for doctor staff records."]

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        role = validated_data.pop("role")

        user = User.objects.create_user(
            username=user_data["username"],
            first_name=user_data.get("first_name", "").strip(),
            last_name=user_data.get("last_name", "").strip(),
            email=user_data.get("email", "").strip().lower(),
            password=user_data["password"],
        )

        user.groups.add(role)

        staff = Staff.objects.create(
            user=user,
            role=role,
            **validated_data
        )
        return staff

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        role = validated_data.pop("role", None)

        if user_data:
            user = instance.user
            for field in ["username", "first_name", "last_name", "email"]:
                if field in user_data:
                    value = user_data[field]
                    if isinstance(value, str):
                        value = value.strip()
                    if field == "email" and isinstance(value, str):
                        value = value.lower()
                    setattr(user, field, value)

            if "password" in user_data and user_data["password"]:
                user.set_password(user_data["password"])

            user.full_clean()
            user.save()

        if role is not None:
            instance.role = role
            instance.user.groups.clear()
            instance.user.groups.add(role)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_clean()
        instance.save()
        return instance


# =====================================================
# SPECIALIZATION CHOICES SERIALIZER
# Returns the hardcoded list for the frontend dropdown.
# No model, no DB table — just the choices from the model.
# =====================================================

class SpecializationChoiceSerializer(serializers.Serializer):
    """
    Read-only serializer that exposes SpecializationChoices
    as {value, label} pairs for the frontend dropdown.
    """
    value = serializers.CharField()
    label = serializers.CharField()


class DoctorSerializer(serializers.ModelSerializer):
    max_tokens = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Doctor
        fields = [
            "id",
            "staff",
            "specialization",
            "consultation_fee",
            "available_from",
            "available_to",
            "slot_duration",
            "date_of_joining",
            "max_tokens",
            "full_name",
        ]

    def _get_current_doctor(self):
        if self.instance:
            return self.instance

        doctor_instance = self.context.get("doctor_instance")
        if doctor_instance:
            return doctor_instance

        doctor_id = self.context.get("doctor_id")
        if doctor_id:
            try:
                return Doctor.objects.select_related("staff").get(pk=doctor_id)
            except Doctor.DoesNotExist:
                return None

        return None

    def validate_staff(self, value):
        if not value:
            raise serializers.ValidationError("Staff is required.")
        if value.role.name.lower() != "doctor":
            raise serializers.ValidationError("Selected staff is not a doctor.")
        if not value.is_active:
            raise serializers.ValidationError("Only active staff can be assigned as doctor.")

        current_doctor = self._get_current_doctor()
        if hasattr(value, "doctor") and getattr(value, "doctor", None):
            if not current_doctor or value.pk != current_doctor.staff_id:
                raise serializers.ValidationError("This staff is already assigned as a doctor.")
        return value

    def validate_specialization(self, value):
        valid_specializations = {choice[0] for choice in SpecializationChoices.choices}
        if not value:
            raise serializers.ValidationError("Specialization is required.")
        if value not in valid_specializations:
            raise serializers.ValidationError("Invalid specialization selected.")
        return value

    def validate_consultation_fee(self, value):
        return validate_money_value(
            value,
            field_label="Consultation fee",
            min_value=Decimal("0.00"),
            max_value=Decimal("9999.99"),
        )

    def validate_slot_duration(self, value):
        if value is None:
            raise serializers.ValidationError("Slot duration is required.")
        if not isinstance(value, int):
            raise serializers.ValidationError("Slot duration must be a valid integer.")
        if value <= 0:
            raise serializers.ValidationError("Slot duration must be greater than zero.")
        if value > 240:
            raise serializers.ValidationError("Slot duration is too large.")
        return value

    def validate_date_of_joining(self, value):
        today = timezone.now().date()

        if value > today:
            raise serializers.ValidationError("Date of joining cannot be in the future.")
        if value < timezone.datetime(1950, 1, 1).date():
            raise serializers.ValidationError("Date of joining is unrealistically old.")
        return value

    def validate(self, data):
        errors = {}

        start = data.get("available_from") or getattr(self.instance, "available_from", None)
        end = data.get("available_to") or getattr(self.instance, "available_to", None)
        slot = data.get("slot_duration", getattr(self.instance, "slot_duration", None))
        staff = data.get("staff") or getattr(self.instance, "staff", None)
        joining = data.get("date_of_joining", getattr(self.instance, "date_of_joining", None))

        if not start:
            errors["available_from"] = ["Available from time is required."]
        if not end:
            errors["available_to"] = ["Available to time is required."]

        if start and end:
            if start >= end:
                errors["available_from"] = ["Available from must be before available to."]
            else:
                start_dt = timezone.datetime.combine(timezone.now().date(), start)
                end_dt = timezone.datetime.combine(timezone.now().date(), end)
                total_minutes = (end_dt - start_dt).total_seconds() / 60

                if total_minutes < 15:
                    errors["available_to"] = ["Availability window is too short."]
                elif total_minutes > 1440:
                    errors["available_to"] = ["Availability window is invalid."]
                elif slot and total_minutes < slot:
                    errors["slot_duration"] = ["Available time must allow at least one appointment slot."]

        if staff and joining and staff.date_of_birth and joining <= staff.date_of_birth:
            errors["date_of_joining"] = ["Date of joining must be after date of birth."]

        if errors:
            raise serializers.ValidationError(errors)

        return data


class DoctorScheduleSerializer(serializers.ModelSerializer):
    max_tokens = serializers.ReadOnlyField()

    class Meta:
        model = DoctorSchedule
        fields = [
            "id",
            "doctor",
            "date",
            "available_from",
            "available_to",
            "is_available",
            "max_tokens",
        ]

    def _get_current_schedule_id(self):
        if self.instance:
            return self.instance.pk

        schedule_instance = self.context.get("schedule_instance")
        if schedule_instance:
            return schedule_instance.pk

        return self.context.get("schedule_id")

    def validate_doctor(self, value):
        if not value:
            raise serializers.ValidationError("Doctor is required.")
        if not value.staff.is_active:
            raise serializers.ValidationError("Schedule can only be created for active doctor staff.")
        return value

    def validate_date(self, value):
        now = timezone.localtime(timezone.now())
        today = now.date()

        if value < today:
            raise serializers.ValidationError("Cannot create schedule for past date.")
        if value > today + timedelta(days=365):
            raise serializers.ValidationError("Schedule date is too far in the future.")

        return value

    def validate_is_available(self, value):
        if not isinstance(value, bool):
            raise serializers.ValidationError("Availability status must be true or false.")
        return value

    def validate(self, data):
        errors = {}

        schedule_date = data.get("date", getattr(self.instance, "date", None))
        doctor = data.get("doctor", getattr(self.instance, "doctor", None))
        is_available = data.get("is_available", getattr(self.instance, "is_available", True))

        if not is_available:
            return data

        start = data.get("available_from", getattr(self.instance, "available_from", None))
        end = data.get("available_to", getattr(self.instance, "available_to", None))

        if doctor:
            start_time = start or doctor.available_from
            end_time = end or doctor.available_to
        else:
            start_time = start
            end_time = end

        if not start_time:
            errors["available_from"] = ["Start time is required."]
        if not end_time:
            errors["available_to"] = ["End time is required."]

        if start_time and end_time and schedule_date:
            now = timezone.localtime(timezone.now())
            today = now.date()
            current_time = now.time().replace(second=0, microsecond=0)

            if start_time >= end_time:
                errors["available_from"] = ["Start time must be before end time."]
            elif schedule_date == today and start_time < current_time:
                errors["available_from"] = ["Start time cannot be earlier than the current time for today."]
            else:
                start_dt = timezone.datetime.combine(schedule_date, start_time)
                end_dt = timezone.datetime.combine(schedule_date, end_time)
                total_minutes = (end_dt - start_dt).total_seconds() / 60

                if doctor and total_minutes < doctor.slot_duration:
                    errors["available_to"] = ["Not enough time for even one appointment slot."]
                elif total_minutes > 1440:
                    errors["available_to"] = ["Schedule timing is invalid."]

        if doctor and schedule_date:
            qs = DoctorSchedule.objects.filter(doctor=doctor, date=schedule_date)
            current_schedule_id = self._get_current_schedule_id()
            if current_schedule_id:
                qs = qs.exclude(pk=current_schedule_id)
            if qs.exists():
                errors["date"] = ["A schedule already exists for this doctor on this date."]

        if errors:
            raise serializers.ValidationError(errors)

        return data


class HospitalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalSettings
        fields = ["id", "registration_fee", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_registration_fee(self, value):
        return validate_money_value(
            value,
            field_label="Registration fee",
            min_value=Decimal("1.00"),
            max_value=Decimal("9999.99"),
        )


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = [
            "id",
            "test_name",
            "description",
            "min_range",
            "max_range",
            "price",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def _get_current_lab_test_id(self):
        if self.instance:
            return self.instance.pk

        lab_test_instance = self.context.get("lab_test_instance")
        if lab_test_instance:
            return lab_test_instance.pk

        return self.context.get("lab_test_id")

    def validate_test_name(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Test name is required.")
        if len(value) < 2:
            raise serializers.ValidationError("Test name must be at least 2 characters long.")
        if len(value) > 150:
            raise serializers.ValidationError("Test name must not exceed 150 characters.")
        if not TEST_NAME_REGEX.fullmatch(value):
            raise serializers.ValidationError("Test name contains invalid characters.")
        if is_gibberish_text(value):
            raise serializers.ValidationError("Enter a valid real test name.")

        qs = LabTest.objects.filter(test_name__iexact=value)
        current_lab_test_id = self._get_current_lab_test_id()
        if current_lab_test_id:
            qs = qs.exclude(pk=current_lab_test_id)
        if qs.exists():
            raise serializers.ValidationError("This test name already exists.")

        return value

    def validate_description(self, value):
        return validate_description_text(
            value,
            field_label="Description",
            min_length=5,
            max_length=500,
            allow_blank=True,
        )

    def validate_min_range(self, value):
        if value is None:
            return value
        return validate_four_digit_range(value, "Minimum range")

    def validate_max_range(self, value):
        if value is None:
            return value
        return validate_four_digit_range(value, "Maximum range")

    def validate_price(self, value):
        return validate_money_value(
            value,
            field_label="Price",
            min_value=Decimal("0.00"),
            max_value=Decimal("9999.99"),
        )

    def validate_status(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Status is required.")

        valid_statuses = {"active", "inactive", "Active", "Inactive"}
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid status selected.")

        return value

    def validate(self, data):
        errors = {}

        min_val = data.get("min_range", getattr(self.instance, "min_range", None))
        max_val = data.get("max_range", getattr(self.instance, "max_range", None))

        if min_val is not None and max_val is not None and min_val >= max_val:
            errors["max_range"] = ["Maximum range must be greater than minimum range."]

        if errors:
            raise serializers.ValidationError(errors)

        return data