from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Medicine(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    name = models.CharField(max_length=100, unique=True)
    manufacturer = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )

    stock_quantity = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medicine"
        ordering = ["name"]
        verbose_name = "Medicine"
        verbose_name_plural = "Medicines"

    def clean(self):
        errors = {}

        # -----------------------------
        # name
        # -----------------------------
        self.name = (self.name or "").strip()

        if not self.name:
            errors["name"] = "Medicine name is required."
        elif len(self.name) < 2:
            errors["name"] = "Medicine name must be at least 2 characters long."
        elif len(self.name) > 100:
            errors["name"] = "Medicine name must not exceed 100 characters."

        # Case-insensitive uniqueness protection
        if self.name:
            qs = Medicine.objects.filter(name__iexact=self.name)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                errors["name"] = "A medicine with this name already exists."

        # -----------------------------
        # manufacturer
        # -----------------------------
        if self.manufacturer is not None:
            self.manufacturer = self.manufacturer.strip()

            if self.manufacturer == "":
                self.manufacturer = None
            elif len(self.manufacturer) > 150:
                errors["manufacturer"] = "Manufacturer must not exceed 150 characters."

        # -----------------------------
        # description
        # -----------------------------
        if self.description is not None:
            self.description = self.description.strip()

            if self.description == "":
                self.description = None
            elif len(self.description) > 5000:
                errors["description"] = "Description must not exceed 5000 characters."

        # -----------------------------
        # unit_price
        # -----------------------------
        if self.unit_price in (None, ""):
            errors["unit_price"] = "Unit price is required."
        else:
            try:
                if not isinstance(self.unit_price, Decimal):
                    self.unit_price = Decimal(str(self.unit_price))

                if self.unit_price < Decimal("0.00"):
                    errors["unit_price"] = "Unit price cannot be negative."

                if self.unit_price > Decimal("99999999.99"):
                    errors["unit_price"] = "Unit price exceeds the allowed maximum value."

            except (InvalidOperation, TypeError, ValueError):
                errors["unit_price"] = "Unit price must be a valid decimal number."

        # -----------------------------
        # stock_quantity
        # -----------------------------
        if self.stock_quantity in (None, ""):
            errors["stock_quantity"] = "Stock quantity is required."
        elif not isinstance(self.stock_quantity, int):
            errors["stock_quantity"] = "Stock quantity must be a valid integer."
        elif self.stock_quantity < 0:
            errors["stock_quantity"] = "Stock quantity cannot be negative."

        # -----------------------------
        # status
        # -----------------------------
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

    @property
    def is_active(self):
        return self.status == "active"

    def __str__(self):
        return self.name