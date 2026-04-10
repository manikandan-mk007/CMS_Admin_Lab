from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import (
    Staff,
    Doctor,
    DoctorSchedule,
    HospitalSettings,
)


# ================================
# Base Safe Admin
# ================================

class SafeAdmin(admin.ModelAdmin):
    """
    Enforces full_clean() on save to ensure model-level validations always run.
    Prevents invalid data from being saved via admin panel.
    """

    def save_model(self, request, obj, form, change):
        try:
            with transaction.atomic():
                obj.full_clean()
                super().save_model(request, obj, form, change)
        except ValidationError as e:
            self.message_user(request, e, level=messages.ERROR)
            raise

    def save_related(self, request, form, formsets, change):
        try:
            with transaction.atomic():
                super().save_related(request, form, formsets, change)
        except ValidationError as e:
            self.message_user(request, e, level=messages.ERROR)
            raise


# ================================
# STAFF ADMIN
# ================================

@admin.register(Staff)
class StaffAdmin(SafeAdmin):
    list_display = ("id", "user", "phone", "role", "is_active", "created_on")
    list_filter = ("is_active", "role", "gender")
    search_fields = ("user__username", "user__first_name", "user__last_name", "phone")
    ordering = ("-created_on",)

    readonly_fields = ("created_on",)

    def has_delete_permission(self, request, obj=None):
        return False


# ================================
# DOCTOR ADMIN
# ================================

@admin.register(Doctor)
class DoctorAdmin(SafeAdmin):
    list_display = (
        "id",
        "staff",
        "specialization",
        "consultation_fee",
        "available_from",
        "available_to",
        "slot_duration",
        "max_tokens",
    )
    list_filter = ("specialization",)
    search_fields = ("staff__user__username", "staff__user__first_name", "staff__user__last_name")
    ordering = ("id",)

    readonly_fields = ("max_tokens",)

    def has_delete_permission(self, request, obj=None):
        return False


# ================================
# DOCTOR SCHEDULE ADMIN
# ================================

@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(SafeAdmin):
    list_display = (
        "id",
        "doctor",
        "date",
        "available_from",
        "available_to",
        "max_tokens",
        "is_available",
    )
    list_filter = ("is_available", "date")
    search_fields = ("doctor__staff__user__username",)
    ordering = ("-date",)

    readonly_fields = ("max_tokens",)

    def has_delete_permission(self, request, obj=None):
        return False


# ================================
# HOSPITAL SETTINGS ADMIN
# ================================

@admin.register(HospitalSettings)
class HospitalSettingsAdmin(SafeAdmin):
    list_display = ("id", "registration_fee", "updated_at")
    ordering = ("-updated_at",)

    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        if HospitalSettings.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False