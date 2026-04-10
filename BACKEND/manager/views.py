from datetime import datetime

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError as DRFValidationError

from .services import get_doctor_availability
from .models import (
    Staff,
    Doctor,
    DoctorSchedule,
    HospitalSettings,
    SpecializationChoices,
)
from .serializers import (
    StaffSerializer,
    SpecializationChoiceSerializer,
    DoctorSerializer,
    DoctorScheduleSerializer,
    HospitalSettingsSerializer,
    LabTestSerializer,
)

from lab_tech.models import LabTest

from authentication.permissions import (
    IsAdmin,
    IsAdminOrReceptionistReadOnly,
)


def normalize_bool_query(value):
    """
    Safely parse boolean query params.
    Returns True, False, or None if invalid/absent.
    """
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    value = str(value).strip().lower()

    if value in {"true", "1", "yes"}:
        return True
    if value in {"false", "0", "no"}:
        return False

    return None


def format_validation_error(error):
    """
    Convert Django/DRF validation errors into consistent API-safe shape.
    """
    if hasattr(error, "message_dict"):
        return error.message_dict
    if hasattr(error, "detail"):
        return error.detail
    if hasattr(error, "messages"):
        return {"non_field_errors": error.messages}
    return {"non_field_errors": [str(error)]}


# =====================================================
# STAFF VIEWSET
# =====================================================

class StaffViewSet(viewsets.ModelViewSet):
    """
    Only Admin can manage staff.
    """

    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = Staff.objects.select_related("user", "role")

        if self.action == "restore":
            return queryset

        is_active = self.request.query_params.get("is_active")
        parsed_is_active = normalize_bool_query(is_active)

        if is_active is not None and parsed_is_active is None:
            return queryset.none()

        if parsed_is_active is not None:
            return queryset.filter(is_active=parsed_is_active)

        return queryset.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        staff = self.get_object()

        try:
            with transaction.atomic():
                if not staff.is_active and not staff.user.is_active:
                    return Response(
                        {"message": "Staff is already inactive."},
                        status=status.HTTP_200_OK,
                    )

                staff.is_active = False
                staff.user.is_active = False

                # only save changed fields
                staff.user.save(update_fields=["is_active"])
                staff.save(update_fields=["is_active"])

            return Response(
                {"message": "Staff marked as inactive"},
                status=status.HTTP_200_OK
            )

        except IntegrityError:
            return Response(
                {"non_field_errors": ["Could not mark staff as inactive due to a database integrity issue."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"message": str(exc) or "Could not mark staff as inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["patch"])
    def restore(self, request, pk=None):
        staff = self.get_object()

        try:
            with transaction.atomic():
                if staff.is_active and staff.user.is_active:
                    return Response(
                        {"message": "Staff is already active."},
                        status=status.HTTP_200_OK,
                    )

                staff.is_active = True
                staff.user.is_active = True

                # only save changed fields
                staff.user.save(update_fields=["is_active"])
                staff.save(update_fields=["is_active"])

            return Response(
                {"message": "Staff restored"},
                status=status.HTTP_200_OK
            )

        except IntegrityError:
            return Response(
                {"non_field_errors": ["Could not restore staff due to a database integrity issue."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"message": str(exc) or "Could not restore staff."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# =====================================================
# SPECIALIZATION CHOICES VIEW
# Replaces the old SpecializationViewSet.
# Returns a hardcoded list — no DB reads, no writes.
# The frontend calls GET /manager/specializations/ and
# gets [{value, label}, ...] to populate the dropdown.
# =====================================================

class SpecializationListView(APIView):
    """
    GET /manager/specializations/
    Returns the hardcoded specialization choices.
    Admin and Receptionist can read. No create/update/delete.
    """
    permission_classes = [IsAuthenticated, IsAdminOrReceptionistReadOnly]

    def get(self, request):
        data = [
            {"value": value, "label": label}
            for value, label in SpecializationChoices.choices
        ]
        serializer = SpecializationChoiceSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================
# DOCTOR VIEWSET
# =====================================================

class DoctorViewSet(viewsets.ModelViewSet):
    """
    Admin → Full access
    Receptionist → Read only
    """

    queryset = Doctor.objects.select_related(
        "staff",
        "staff__user",
    )
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReceptionistReadOnly]

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        doctor = self.get_object()
        date_str = request.query_params.get("date")

        if date_str is None:
            return Response(
                {"date": ["Date query parameter is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        date_str = str(date_str).strip()

        if not date_str:
            return Response(
                {"date": ["Date query parameter is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"date": ["Invalid date format. Use YYYY-MM-DD."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = get_doctor_availability(doctor, selected_date)
            return Response(data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as exc:
            return Response(
                format_validation_error(exc),
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"non_field_errors": ["Could not fetch doctor availability."]},
                status=status.HTTP_400_BAD_REQUEST,
            )


# =====================================================
# DOCTOR SCHEDULE VIEWSET
# =====================================================

class DoctorScheduleViewSet(viewsets.ModelViewSet):
    """
    Admin → Full access
    Receptionist → Read only
    """

    queryset = DoctorSchedule.objects.select_related(
        "doctor",
        "doctor__staff",
        "doctor__staff__user"
    )
    serializer_class = DoctorScheduleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReceptionistReadOnly]


# =====================================================
# HOSPITAL SETTINGS VIEWSET
# =====================================================

class HospitalSettingsViewSet(viewsets.ModelViewSet):
    """
    Only one row allowed.

    Admin → Update fee
    Receptionist → View fee
    """

    queryset = HospitalSettings.objects.all()
    serializer_class = HospitalSettingsSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReceptionistReadOnly]

    def create(self, request, *args, **kwargs):
        if HospitalSettings.objects.exists():
            return Response(
                {"non_field_errors": ["Hospital settings already exist."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)


# =====================================================
# LAB TEST VIEWSET
# =====================================================

class LabTestViewSet(viewsets.ModelViewSet):
    """
    Admin → Full access to lab tests
    """

    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


# =====================================================
# GROUP LIST VIEW
# =====================================================

class GroupListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        groups = Group.objects.all()
        return Response(
            [g.name for g in groups if getattr(g, "name", None)],
            status=status.HTTP_200_OK
        )