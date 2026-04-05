from django.contrib import admin
from .models import Patient, Appointment, Bill


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "gender",
        "blood_group",
        "phone",
        "registration_fee",
        "registration_fee_paid",
        "is_active",
        "created_at",
    )
    list_filter = (
        "gender",
        "blood_group",
        "registration_fee_paid",
        "is_active",
        "created_at",
    )
    search_fields = ("name", "phone", "address")
    list_per_page = 25
    readonly_fields = ("created_at", "updated_at", "age")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient",
        "doctor_name",
        "appointment_date",
        "slot_time",
        "appointment_fee",
        "fee_paid",
        "status",
    )
    list_filter = ("status", "fee_paid", "appointment_date")
    search_fields = (
        "patient__name",
        "doctor_name",
    )
    list_per_page = 25
    readonly_fields = ("created_at", "updated_at")


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "appointment",
        "patient_name",
        "registration_fee",
        "appointment_fee",
        "total_amount",
        "created_at",
    )
    search_fields = (
        "appointment__patient__name",
        "appointment__doctor_name",
    )
    list_per_page = 25
    readonly_fields = (
        "patient_name",
        "registration_fee",
        "appointment_fee",
        "total_amount",
        "created_at",
    )