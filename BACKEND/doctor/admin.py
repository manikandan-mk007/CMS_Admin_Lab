from django.contrib import admin
from .models import Consultation, PrescribeMed, PrescribeLab


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "appointment",
        "created_by",
        "finalized",
        "created_at",
    )
    list_filter = ("finalized", "created_at")
    search_fields = (
        "appointment__patient__name",
        "appointment__doctor_name",
        "diagnosis",
        "subjective",
    )
    list_per_page = 25
    readonly_fields = ("created_at",)


@admin.register(PrescribeMed)
class PrescribeMedAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "consultation",
        "medicine",
        "duration",
        "frequency",
        "dosage",
        "unit",
    )
    list_filter = ("frequency",)
    search_fields = (
        "consultation__appointment__patient__name",
        "consultation__appointment__doctor_name",
        "medicine__name",
    )
    list_per_page = 25


@admin.register(PrescribeLab)
class PrescribeLabAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "consultation",
        "lab_test",
    )
    search_fields = (
        "consultation__appointment__patient__name",
        "consultation__appointment__doctor_name",
        "lab_test__test_name",
    )
    list_per_page = 25