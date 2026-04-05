import re
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from doctor.models import PrescribeLab
from .models import LabTest, LabReport, LabBilling


TEST_NAME_REGEX = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s().,+/%-]*[A-Za-z0-9)]$")
TEXT_REGEX = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s().,+/%\-:;'/]*[A-Za-z0-9.)]$")


def normalize_text(value):
    if value is None:
        return None
    return value.strip()


def letters_only(value: str) -> str:
    return re.sub(r"[^A-Za-z]", "", value or "").lower()


def is_gibberish_text(value: str) -> bool:
    if not value:
        return True

    cleaned = letters_only(value)
    if not cleaned:
        return True

    blocked_words = {
        "test", "testing", "demo", "dummy", "fake", "unknown",
        "na", "none", "null", "sample", "admin", "user",
        "asdf", "asdfgh", "qwerty", "qwertyui", "zxcv",
        "abc", "xyz", "xxxxx", "yyyyy",
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


def validate_description_text(value, field_label="Description", min_length=5, max_length=500, allow_blank=True):
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

    if not TEXT_REGEX.fullmatch(value):
        raise serializers.ValidationError(f"{field_label} contains invalid characters.")

    if is_gibberish_text(value):
        raise serializers.ValidationError(f"Enter a valid {field_label.lower()}.")

    return value


def validate_money_value(value, field_label="Amount", max_value=Decimal("9999.99"), allow_zero=True):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError(f"{field_label} must be a valid decimal number.")

    if allow_zero:
        if value < Decimal("0.00"):
            raise serializers.ValidationError(f"{field_label} cannot be negative.")
    else:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(f"{field_label} must be greater than zero.")

    if value > max_value:
        raise serializers.ValidationError(f"{field_label} must not exceed {max_value}.")

    if value.as_tuple().exponent < -2:
        raise serializers.ValidationError(f"{field_label} cannot have more than 2 decimal places.")

    return value


def validate_four_digit_range(value, field_label="Range"):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError(f"{field_label} must be a valid decimal number.")

    if value < Decimal("0.00"):
        raise serializers.ValidationError(f"{field_label} cannot be negative.")

    if value > Decimal("9999.00"):
        raise serializers.ValidationError(f"{field_label} must be within 4 digits only.")

    if value.as_tuple().exponent < -2:
        raise serializers.ValidationError(f"{field_label} cannot have more than 2 decimal places.")

    return value


# =====================================================
# LAB TEST SERIALIZERS
# Keep all existing features
# =====================================================

class LabTestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    range_display = serializers.SerializerMethodField(read_only=True)

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
            "status_display",
            "range_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_range_display(self, obj):
        return f"{obj.min_range} - {obj.max_range}"

    def validate_test_name(self, value):
        value = normalize_text(value) or ""

        if not value:
            raise serializers.ValidationError("Test name is required.")
        if len(value) < 2:
            raise serializers.ValidationError("Test name must be at least 2 characters long.")
        if len(value) > 200:
            raise serializers.ValidationError("Test name must not exceed 200 characters.")
        if not TEST_NAME_REGEX.fullmatch(value):
            raise serializers.ValidationError("Test name contains invalid characters.")
        if is_gibberish_text(value):
            raise serializers.ValidationError("Enter a valid real test name.")

        qs = LabTest.objects.filter(test_name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("A lab test with this name already exists.")

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
        return validate_four_digit_range(value, "Minimum range")

    def validate_max_range(self, value):
        return validate_four_digit_range(value, "Maximum range")

    def validate_price(self, value):
        return validate_money_value(
            value,
            field_label="Price",
            max_value=Decimal("9999.99"),
            allow_zero=False,
        )

    def validate_status(self, value):
        value = normalize_text(value) or ""
        valid_statuses = {"active", "inactive"}

        if not value:
            raise serializers.ValidationError("Status is required.")
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid status selected.")

        return value

    def validate(self, data):
        min_range = data.get("min_range", getattr(self.instance, "min_range", None))
        max_range = data.get("max_range", getattr(self.instance, "max_range", None))

        errors = {}

        if min_range is not None and max_range is not None and min_range >= max_range:
            errors["min_range"] = ["Minimum range must be less than maximum range."]
            errors["max_range"] = ["Maximum range must be greater than minimum range."]

        if errors:
            raise serializers.ValidationError(errors)

        return data


class LabTestListSerializer(serializers.ModelSerializer):
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
        ]


class LabTestDetailSerializer(serializers.ModelSerializer):
    reports_count = serializers.IntegerField(source="lab_reports.count", read_only=True)

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
            "reports_count",
            "created_at",
            "updated_at",
        ]


# =====================================================
# LAB REPORT SERIALIZERS
# Keep all existing features
# =====================================================

class LabReportSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    abnormal_display = serializers.SerializerMethodField(read_only=True)
    test_name = serializers.CharField(source="test.test_name", read_only=True)
    patient_name = serializers.CharField(read_only=True)
    doctor_name = serializers.CharField(read_only=True)

    class Meta:
        model = LabReport
        fields = [
            "id",
            "lab_prescription",
            "test",
            "test_name",
            "patient_name",
            "doctor_name",
            "result_value",
            "is_abnormal",
            "abnormal_display",
            "remarks",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["is_abnormal", "created_at", "updated_at"]
        validators = []

    def get_abnormal_display(self, obj):
        if obj.result_value is None:
            return "No Result"
        return "Abnormal" if obj.is_abnormal else "Normal"

    def validate_result_value(self, value):
        if value is None:
            return value
        return validate_four_digit_range(value, "Result value")

    def validate_remarks(self, value):
        return validate_description_text(
            value,
            field_label="Remarks",
            min_length=3,
            max_length=300,
            allow_blank=True,
        )

    def validate_status(self, value):
        value = normalize_text(value) or ""
        valid_statuses = {"pending", "complete"}

        if not value:
            raise serializers.ValidationError("Status is required.")
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid status selected.")

        return value

    def validate(self, data):
        test = data.get("test", getattr(self.instance, "test", None))
        lab_prescription = data.get(
            "lab_prescription",
            getattr(self.instance, "lab_prescription", None),
        )
        result_value = data.get(
            "result_value",
            getattr(self.instance, "result_value", None),
        )
        remarks = data.get(
            "remarks",
            getattr(self.instance, "remarks", None),
        )
        report_status = data.get(
            "status",
            getattr(self.instance, "status", "pending"),
        )

        errors = {}

        if not lab_prescription:
            errors["lab_prescription"] = ["Prescription is required."]

        if not test:
            errors["test"] = ["Test is required."]

        if not remarks or not str(remarks).strip():
            errors["remarks"] = ["Remarks are required."]

        if test and lab_prescription and lab_prescription.lab_test_id != test.id:
            errors["test"] = ["Selected test must match the prescribed lab test."]

        if test and test.status != "active":
            errors["test"] = ["Cannot create or update a report for an inactive lab test."]

        if lab_prescription and getattr(lab_prescription, "lab_test", None):
            if lab_prescription.lab_test.status != "active":
                errors["lab_prescription"] = [
                    "Cannot generate a report because the prescribed lab test is inactive."
                ]

        if report_status == "complete" and result_value is None:
            errors["result_value"] = ["Completed reports must have a result value."]

        if test and lab_prescription:
            duplicate_qs = LabReport.objects.filter(
                lab_prescription=lab_prescription,
                test=test,
            )
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)

            if duplicate_qs.exists():
                errors["non_field_errors"] = [
                    "A report already exists for this prescription and test."
                ]

        if errors:
            raise serializers.ValidationError(errors)

        return data


class LabReportCreateSerializer(LabReportSerializer):
    class Meta(LabReportSerializer.Meta):
        fields = ["lab_prescription", "test", "result_value", "remarks", "status"]
        validators = []


class LabReportDetailSerializer(serializers.ModelSerializer):
    test_details = LabTestSerializer(source="test", read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    consultation_id = serializers.IntegerField(
        source="lab_prescription.consultation.id",
        read_only=True,
    )
    appointment_id = serializers.IntegerField(
        source="lab_prescription.consultation.appointment.id",
        read_only=True,
    )

    class Meta:
        model = LabReport
        fields = [
            "id",
            "lab_prescription",
            "consultation_id",
            "appointment_id",
            "test_details",
            "result_value",
            "is_abnormal",
            "remarks",
            "status",
            "patient_name",
            "doctor_name",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        try:
            return obj.lab_prescription.consultation.appointment.patient.name
        except AttributeError:
            return None

    def get_doctor_name(self, obj):
        try:
            return obj.lab_prescription.consultation.appointment.doctor_name
        except AttributeError:
            return None


# =====================================================
# LAB BILLING SERIALIZERS
# Keep all existing features
# =====================================================

class LabBillingSerializer(serializers.ModelSerializer):
    payment_status_display = serializers.CharField(
        source="get_payment_status_display",
        read_only=True,
    )
    consultation_details = serializers.SerializerMethodField()

    class Meta:
        model = LabBilling
        fields = [
            "id",
            "consultation",
            "consultation_details",
            "total_amount",
            "payment_status",
            "payment_status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["total_amount", "created_at", "updated_at"]

    def get_consultation_details(self, obj):
        try:
            consultation = obj.consultation
            appointment = consultation.appointment
            return {
                "id": consultation.id,
                "appointment_id": appointment.id,
                "patient": appointment.patient.name,
                "doctor": appointment.doctor_name,
                "date": consultation.created_at,
                "finalized": consultation.finalized,
            }
        except AttributeError:
            return None


class LabBillingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabBilling
        fields = ["consultation", "payment_status"]

    def validate_consultation(self, consultation):
        if LabBilling.objects.filter(consultation=consultation).exists():
            raise serializers.ValidationError(
                "Billing already exists for this consultation."
            )

        if not consultation.lab_prescriptions.exists():
            raise serializers.ValidationError(
                "Cannot create billing because this consultation has no lab prescriptions."
            )

        return consultation

    def validate_payment_status(self, value):
        value = normalize_text(value) or ""
        valid_statuses = {"paid", "unpaid", "partial"}

        if not value:
            raise serializers.ValidationError("Payment status is required.")
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid payment status selected.")

        return value

    def create(self, validated_data):
        billing = LabBilling.objects.create(**validated_data)
        billing.refresh_total(save=True)
        return billing


class LabBillingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabBilling
        fields = ["payment_status"]

    def validate_payment_status(self, value):
        value = normalize_text(value) or ""
        valid_statuses = {"paid", "unpaid", "partial"}

        if not value:
            raise serializers.ValidationError("Payment status is required.")
        if value not in valid_statuses:
            raise serializers.ValidationError("Invalid payment status selected.")

        return value


class LabBillingDetailSerializer(serializers.ModelSerializer):
    payment_status_display = serializers.CharField(
        source="get_payment_status_display",
        read_only=True,
    )
    consultation = serializers.SerializerMethodField()
    lab_tests = serializers.SerializerMethodField()

    class Meta:
        model = LabBilling
        fields = [
            "id",
            "consultation",
            "lab_tests",
            "total_amount",
            "payment_status",
            "payment_status_display",
            "created_at",
            "updated_at",
        ]

    def get_consultation(self, obj):
        try:
            consultation = obj.consultation
            appointment = consultation.appointment
            return {
                "id": consultation.id,
                "appointment": {
                    "id": appointment.id,
                },
                "patient": {
                    "id": appointment.patient.id,
                    "name": appointment.patient.name,
                },
                "doctor": {
                    "id": appointment.doctor_id,
                    "name": appointment.doctor_name,
                },
                "date": consultation.created_at,
            }
        except AttributeError:
            return None

    def get_lab_tests(self, obj):
        try:
            reports = (
                LabReport.objects.filter(lab_prescription__consultation=obj.consultation)
                .select_related("test", "lab_prescription")
                .order_by("-created_at")
            )

            return [
                {
                    "test_name": report.test.test_name,
                    "result": report.result_value,
                    "price": float(report.test.price),
                    "status": report.status,
                    "is_abnormal": report.is_abnormal,
                }
                for report in reports
            ]
        except (AttributeError, ValueError):
            return []


# =====================================================
# SUMMARY / BULK SERIALIZERS
# Keep existing features
# =====================================================

class ConsultationLabSummarySerializer(serializers.Serializer):
    consultation_id = serializers.IntegerField()
    patient_name = serializers.CharField()
    doctor_name = serializers.CharField()
    total_tests = serializers.IntegerField()
    completed_tests = serializers.IntegerField()
    pending_tests = serializers.IntegerField()
    abnormal_results = serializers.IntegerField()
    total_bill = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_status = serializers.CharField()


class BulkLabReportUpdateSerializer(serializers.Serializer):
    report_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    status = serializers.ChoiceField(choices=LabReport.STATUS_CHOICES)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_report_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate report IDs are not allowed.")

        existing_ids = set(
            LabReport.objects.filter(id__in=value).values_list("id", flat=True)
        )
        if len(existing_ids) != len(value):
            invalid_ids = set(value) - existing_ids
            raise serializers.ValidationError(f"Invalid report IDs: {sorted(invalid_ids)}")
        return value

    def validate_remarks(self, value):
        return validate_description_text(
            value,
            field_label="Remarks",
            min_length=3,
            max_length=300,
            allow_blank=True,
        )

    def validate(self, attrs):
        new_status = attrs.get("status")
        if new_status == "complete":
            missing_result_ids = list(
                LabReport.objects.filter(
                    id__in=attrs["report_ids"],
                    result_value__isnull=True,
                ).values_list("id", flat=True)
            )
            if missing_result_ids:
                raise serializers.ValidationError({
                    "report_ids": (
                        "Cannot mark reports as complete without result_value. "
                        f"Problem IDs: {missing_result_ids}"
                    )
                })
        return attrs


# =====================================================
# LAB PRESCRIPTION SERIALIZER
# Very important for your scenario
# Keep feature exactly
# =====================================================

class LabPrescriptionSerializer(serializers.ModelSerializer):
    consultation_id = serializers.IntegerField(
        source="consultation.id", read_only=True
    )
    lab_test_name = serializers.CharField(
        source="lab_test.test_name", read_only=True
    )
    lab_test_status = serializers.CharField(
        source="lab_test.status", read_only=True
    )
    can_generate_report = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = PrescribeLab
        fields = [
            "id",
            "consultation_id",
            "lab_test",
            "lab_test_name",
            "lab_test_status",
            "can_generate_report",
            "patient_name",
            "doctor_name",
        ]

    def get_patient_name(self, obj):
        try:
            return obj.consultation.appointment.patient.name
        except AttributeError:
            return None

    def get_doctor_name(self, obj):
        try:
            return obj.consultation.appointment.doctor_name
        except AttributeError:
            return None

    def get_can_generate_report(self, obj):
        try:
            return obj.lab_test.status == "active"
        except AttributeError:
            return False