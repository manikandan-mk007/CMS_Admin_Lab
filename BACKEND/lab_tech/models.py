from decimal import Decimal, InvalidOperation
import re

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


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


def validate_money_value(value, field_label="Amount", max_value=Decimal("9999.99"), allow_zero=True):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be a valid decimal number."})

    if allow_zero:
        if value < Decimal("0.00"):
            raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} cannot be negative."})
    else:
        if value <= Decimal("0.00"):
            raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be greater than zero."})

    if value > max_value:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must not exceed {max_value}."})

    if value.as_tuple().exponent < -2:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} cannot have more than 2 decimal places."})

    return value


def validate_four_digit_range(value, field_label="Range"):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be a valid decimal number."})

    if value < Decimal("0.00"):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} cannot be negative."})

    if value > Decimal("9999.00"):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be within 4 digits only."})

    if value.as_tuple().exponent < -2:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} cannot have more than 2 decimal places."})

    return value


def validate_description_text(value, field_label="Description", min_length=5, max_length=500, allow_blank=True):
    if value is None:
        return value

    value = normalize_text(value)

    if value == "":
        if allow_blank:
            return None
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} is required."})

    if len(value) < min_length:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must be at least {min_length} characters long."})

    if len(value) > max_length:
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} must not exceed {max_length} characters."})

    if not TEXT_REGEX.fullmatch(value):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"{field_label} contains invalid characters."})

    if is_gibberish_text(value):
        raise ValidationError({field_label.lower().replace(" ", "_"): f"Enter a valid {field_label.lower()}."})

    return value


class LabTest(models.Model):
    """
    Model to store all available lab tests in the clinic.
    """

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    test_name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Name of the lab test",
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed description of the test",
    )
    min_range = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Minimum normal range value",
    )
    max_range = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Maximum normal range value",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Cost of the test",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text="Availability status of the test",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_test"
        ordering = ["test_name"]
        verbose_name = "Lab Test"
        verbose_name_plural = "Lab Tests"

    def __str__(self):
        return f"{self.test_name} - {self.price}"

    def clean(self):
        errors = {}

        # test_name
        self.test_name = normalize_text(self.test_name) or ""
        if not self.test_name:
            errors["test_name"] = "Test name is required."
        elif len(self.test_name) < 2:
            errors["test_name"] = "Test name must be at least 2 characters long."
        elif len(self.test_name) > 200:
            errors["test_name"] = "Test name must not exceed 200 characters."
        elif not TEST_NAME_REGEX.fullmatch(self.test_name):
            errors["test_name"] = "Test name contains invalid characters."
        elif is_gibberish_text(self.test_name):
            errors["test_name"] = "Enter a valid real test name."
        else:
            qs = LabTest.objects.filter(test_name__iexact=self.test_name)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["test_name"] = "A lab test with this name already exists."

        # description
        try:
            self.description = validate_description_text(
                self.description,
                field_label="Description",
                min_length=5,
                max_length=500,
                allow_blank=True,
            )
        except ValidationError as exc:
            if hasattr(exc, "message_dict") and "description" in exc.message_dict:
                errors["description"] = exc.message_dict["description"][0]
            else:
                errors["description"] = "Enter a valid description."

        # min_range
        if self.min_range in (None, ""):
            errors["min_range"] = "Minimum range is required."
        else:
            try:
                self.min_range = validate_four_digit_range(self.min_range, "Minimum range")
            except ValidationError as exc:
                if hasattr(exc, "message_dict") and "minimum_range" in exc.message_dict:
                    errors["min_range"] = exc.message_dict["minimum_range"][0]
                else:
                    errors["min_range"] = "Minimum range is invalid."

        # max_range
        if self.max_range in (None, ""):
            errors["max_range"] = "Maximum range is required."
        else:
            try:
                self.max_range = validate_four_digit_range(self.max_range, "Maximum range")
            except ValidationError as exc:
                if hasattr(exc, "message_dict") and "maximum_range" in exc.message_dict:
                    errors["max_range"] = exc.message_dict["maximum_range"][0]
                else:
                    errors["max_range"] = "Maximum range is invalid."

        # min < max
        if self.min_range is not None and self.max_range is not None:
            try:
                if Decimal(str(self.min_range)) >= Decimal(str(self.max_range)):
                    errors["max_range"] = "Maximum range must be greater than minimum range."
            except (InvalidOperation, TypeError, ValueError):
                pass

        # price
        if self.price in (None, ""):
            errors["price"] = "Price is required."
        else:
            try:
                self.price = validate_money_value(
                    self.price,
                    field_label="Price",
                    max_value=Decimal("9999.99"),
                    allow_zero=True,
                )
            except ValidationError as exc:
                if hasattr(exc, "message_dict") and "price" in exc.message_dict:
                    errors["price"] = exc.message_dict["price"][0]
                else:
                    errors["price"] = "Price is invalid."

        # status
        valid_statuses = {choice[0] for choice in self.STATUS_CHOICES}
        if not self.status:
            errors["status"] = "Status is required."
        elif self.status not in valid_statuses:
            errors["status"] = "Invalid status selected."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class LabReport(models.Model):
    """
    Model to store individual lab test results for prescriptions.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("complete", "Complete"),
    ]

    lab_prescription = models.ForeignKey(
        "doctor.PrescribeLab",
        on_delete=models.CASCADE,
        related_name="lab_reports",
        help_text="Reference to the lab prescription from doctor",
    )
    test = models.ForeignKey(
        LabTest,
        on_delete=models.PROTECT,
        related_name="lab_reports",
        help_text="The lab test being performed",
    )
    result_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Actual test result value",
    )
    is_abnormal = models.BooleanField(
        default=False,
        help_text="Flag indicating if result is outside normal range",
    )
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes or comments about the test result",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Status of the lab report",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_report"
        ordering = ["-created_at"]
        verbose_name = "Lab Report"
        verbose_name_plural = "Lab Reports"
        constraints = [
            models.UniqueConstraint(
                fields=["lab_prescription", "test"],
                name="unique_lab_report_per_prescription_test",
            )
        ]

    def __str__(self):
        return f"Report for {self.test.test_name} - Prescription #{self.lab_prescription.id}"

    def clean(self):
        errors = {}

        # lab_prescription
        if not self.lab_prescription_id:
            errors["lab_prescription"] = "Lab prescription is required."

        # test
        if not self.test_id:
            errors["test"] = "Lab test is required."
        elif hasattr(self.test, "status") and self.test.status != "active":
            errors["test"] = "Only active lab tests can be used in lab reports."

        # status
        valid_statuses = {choice[0] for choice in self.STATUS_CHOICES}
        if not self.status:
            errors["status"] = "Status is required."
        elif self.status not in valid_statuses:
            errors["status"] = "Invalid status selected."

        # result_value
        if self.result_value is not None:
            try:
                self.result_value = validate_four_digit_range(self.result_value, "Result value")
            except ValidationError as exc:
                if hasattr(exc, "message_dict") and "result_value" in exc.message_dict:
                    errors["result_value"] = exc.message_dict["result_value"][0]
                else:
                    errors["result_value"] = "Result value is invalid."

        if self.status == "complete" and self.result_value is None:
            errors["result_value"] = "Completed reports must have a result value."

        if self.status == "pending" and self.result_value is not None:
            # Keeping logic safe but realistic
            pass

        # remarks
        try:
            self.remarks = validate_description_text(
                self.remarks,
                field_label="Remarks",
                min_length=3,
                max_length=300,
                allow_blank=True,
            )
        except ValidationError as exc:
            if hasattr(exc, "message_dict") and "remarks" in exc.message_dict:
                errors["remarks"] = exc.message_dict["remarks"][0]
            else:
                errors["remarks"] = "Enter valid remarks."

        # prescribed test match
        if self.lab_prescription_id and self.test_id:
            if self.lab_prescription.lab_test_id != self.test_id:
                errors["test"] = "Selected test must match the prescribed lab test."

            duplicate_qs = LabReport.objects.filter(
                lab_prescription=self.lab_prescription,
                test=self.test,
            )
            if self.pk:
                duplicate_qs = duplicate_qs.exclude(pk=self.pk)
            if duplicate_qs.exists():
                errors["test"] = "A lab report for this prescription and test already exists."

        # is_abnormal boolean
        if not isinstance(self.is_abnormal, bool):
            errors["is_abnormal"] = "Abnormal flag must be true or false."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.result_value is None:
            self.is_abnormal = False
        else:
            self.is_abnormal = (
                self.result_value < self.test.min_range
                or self.result_value > self.test.max_range
            )

        self.full_clean()
        return super().save(*args, **kwargs)

    @property
    def patient_name(self):
        try:
            return self.lab_prescription.consultation.appointment.patient.name
        except AttributeError:
            return "N/A"

    @property
    def doctor_name(self):
        try:
            return self.lab_prescription.consultation.appointment.doctor_name
        except AttributeError:
            return "N/A"


class LabBilling(models.Model):
    """
    Model to handle billing for lab tests.
    """

    PAYMENT_STATUS_CHOICES = [
        ("paid", "Paid"),
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
    ]

    consultation = models.OneToOneField(
        "doctor.Consultation",
        on_delete=models.CASCADE,
        related_name="lab_billing",
        help_text="Reference to the consultation that generated these lab tests",
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
        help_text="Total amount for all lab tests",
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid",
        help_text="Current payment status",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_billing"
        ordering = ["-created_at"]
        verbose_name = "Lab Billing"
        verbose_name_plural = "Lab Billings"

    def __str__(self):
        return f"Lab Billing #{self.id} - Consultation #{self.consultation.id} - {self.payment_status}"

    def clean(self):
        errors = {}

        # consultation
        if not self.consultation_id:
            errors["consultation"] = "Consultation is required."

        # total_amount
        if self.total_amount in (None, ""):
            errors["total_amount"] = "Total amount is required."
        else:
            try:
                self.total_amount = validate_money_value(
                    self.total_amount,
                    field_label="Total amount",
                    max_value=Decimal("99999.99"),
                    allow_zero=True,
                )
            except ValidationError as exc:
                if hasattr(exc, "message_dict") and "total_amount" in exc.message_dict:
                    errors["total_amount"] = exc.message_dict["total_amount"][0]
                else:
                    errors["total_amount"] = "Total amount is invalid."

        # payment_status
        valid_statuses = {choice[0] for choice in self.PAYMENT_STATUS_CHOICES}
        if not self.payment_status:
            errors["payment_status"] = "Payment status is required."
        elif self.payment_status not in valid_statuses:
            errors["payment_status"] = "Invalid payment status selected."

        # duplicate billing protection
        if self.consultation_id:
            qs = LabBilling.objects.filter(consultation=self.consultation)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["consultation"] = "Lab billing already exists for this consultation."

        if errors:
            raise ValidationError(errors)

    def calculate_total(self):
        total = Decimal("0.00")

        lab_prescriptions = self.consultation.lab_prescriptions.select_related("lab_test").all()

        for prescription in lab_prescriptions:
            latest_report = prescription.lab_reports.order_by("-created_at").first()
            if latest_report and latest_report.status == "complete":
                total += latest_report.test.price
            else:
                total += prescription.lab_test.price

        return total

    def refresh_total(self, save=True):
        self.total_amount = self.calculate_total()
        if save:
            self.save(update_fields=["total_amount", "updated_at"])
        return self.total_amount