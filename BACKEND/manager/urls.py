from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    StaffViewSet,
    SpecializationListView,
    DoctorViewSet,
    DoctorScheduleViewSet,
    HospitalSettingsViewSet,
    GroupListView,
    LabTestViewSet,
)


app_name = "manager"


router = DefaultRouter()
router.register(r"staff", StaffViewSet, basename="staff")
router.register(r"doctors", DoctorViewSet, basename="doctors")
router.register(r"doctor-schedules", DoctorScheduleViewSet, basename="doctor-schedules")
router.register(r"hospital-settings", HospitalSettingsViewSet, basename="hospital-settings")
router.register(r"lab-tests", LabTestViewSet, basename="lab-tests")


urlpatterns = [
    path("groups/", GroupListView.as_view(), name="groups"),
    # Specializations is now a simple read-only choices endpoint — not a ViewSet
    path("specializations/", SpecializationListView.as_view(), name="specializations"),
]

urlpatterns += router.urls