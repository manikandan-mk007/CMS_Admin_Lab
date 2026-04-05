from django.urls import path

from . import views


app_name = "lab_tech"


urlpatterns = [
    # Lab Tests
    path("lab-tests/", views.LabTestListCreateView.as_view(), name="lab-test-list"),
    path("lab-tests/<int:pk>/", views.LabTestRetrieveUpdateDeleteView.as_view(), name="lab-test-detail"),

    # Lab Prescriptions
    path("lab-prescriptions/", views.LabPrescriptionListView.as_view(), name="lab-prescription-list"),

    # Lab Reports
    path("lab-reports/", views.LabReportListCreateView.as_view(), name="lab-report-list"),
    path("lab-reports/<int:pk>/", views.LabReportRetrieveUpdateDeleteView.as_view(), name="lab-report-detail"),
    path("lab-reports/bulk-update/", views.bulk_update_lab_reports, name="lab-report-bulk-update"),
    path("lab-reports/<int:pk>/mark-complete/", views.mark_report_complete, name="lab-report-mark-complete"),
    path("lab-reports/<int:pk>/download-pdf/", views.download_lab_report_pdf, name="lab-report-download-pdf"),

    # Lab Billing
    path("lab-billings/", views.LabBillingListCreateView.as_view(), name="lab-billing-list"),
    path("lab-billings/<int:pk>/", views.LabBillingRetrieveUpdateDeleteView.as_view(), name="lab-billing-detail"),
    path("lab-billings/<int:pk>/mark-paid/", views.mark_bill_paid, name="lab-billing-mark-paid"),
    path("lab-billings/<int:pk>/download-pdf/", views.download_lab_billing_pdf, name="lab-billing-download-pdf"),

    # Dashboard / Alerts / Summary
    path("dashboard/stats/", views.dashboard_stats, name="dashboard-stats"),
    path("alerts/abnormal-reports/", views.abnormal_report_alerts, name="abnormal-report-alerts"),
    path(
        "consultations/<int:consultation_id>/lab-summary/",
        views.consultation_lab_summary,
        name="consultation-lab-summary",
    ),
    path(
        "lab-tech/lab-reports/validate-field/",
        views.LabReportValidateFieldView.as_view(),
        name="lab-report-validate-field",
    ),
]