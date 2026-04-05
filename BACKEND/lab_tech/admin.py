from django.contrib import admin
from .models import LabTest, LabReport, LabBilling


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ("test_name", "price", "status", "created_at", "updated_at")
    list_filter = ("status", "created_at")
    search_fields = ("test_name", "description")
    list_editable = ("price", "status")
    list_per_page = 25
    ordering = ("test_name",)


@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    list_display = (
        "test",
        "lab_prescription",
        "patient_name",
        "doctor_name",
        "result_value",
        "is_abnormal",
        "status",
        "created_at",
    )
    list_filter = ("status", "is_abnormal", "created_at", "test")
    search_fields = (
        "test__test_name",
        "remarks",
        "lab_prescription__consultation__appointment__patient__name",
        "lab_prescription__consultation__appointment__doctor_name",
    )
    list_per_page = 25
    date_hierarchy = "created_at"
    autocomplete_fields = ("test", "lab_prescription")
    readonly_fields = ("is_abnormal", "created_at", "updated_at")

    def patient_name(self, obj):
        try:
            return obj.lab_prescription.consultation.appointment.patient.name
        except AttributeError:
            return "-"
    patient_name.short_description = "Patient"

    def doctor_name(self, obj):
        try:
            return obj.lab_prescription.consultation.appointment.doctor_name
        except AttributeError:
            return "-"
    doctor_name.short_description = "Doctor"


@admin.register(LabBilling)
class LabBillingAdmin(admin.ModelAdmin):
    list_display = (
        "consultation",
        "patient_name",
        "doctor_name",
        "total_amount",
        "payment_status",
        "created_at",
    )
    list_filter = ("payment_status", "created_at")
    list_editable = ("payment_status",)
    search_fields = (
        "consultation__id",
        "consultation__appointment__patient__name",
        "consultation__appointment__doctor_name",
    )
    list_per_page = 25
    radio_fields = {"payment_status": admin.HORIZONTAL}
    readonly_fields = ("total_amount", "created_at", "updated_at")

    def patient_name(self, obj):
        try:
            return obj.consultation.appointment.patient.name
        except AttributeError:
            return "-"
    patient_name.short_description = "Patient"

    def doctor_name(self, obj):
        try:
            return obj.consultation.appointment.doctor_name
        except AttributeError:
            return "-"
    doctor_name.short_description = "Doctor"