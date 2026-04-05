import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.db.models import Q, Count, Sum
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError as DRFValidationError

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm

from doctor.models import PrescribeLab
from .models import LabTest, LabReport, LabBilling
from .serializers import (
    LabTestSerializer,
    LabTestListSerializer,
    LabTestDetailSerializer,
    LabReportSerializer,
    LabReportCreateSerializer,
    LabReportDetailSerializer,
    LabBillingSerializer,
    LabBillingCreateSerializer,
    LabBillingUpdateSerializer,
    LabBillingDetailSerializer,
    BulkLabReportUpdateSerializer,
    ConsultationLabSummarySerializer,
    LabPrescriptionSerializer,
)

from authentication.permissions import (
    IsAdmin,
    IsAdminOrLabTechnicianReadOnly,
    IsLabTechnician,
    IsAdminOrLabTechnician,
)

logger = logging.getLogger(__name__)


def parse_bool(value):
    if value is None:
        return None
    value = str(value).strip().lower()
    if value in {"true", "1", "yes"}:
        return True
    if value in {"false", "0", "no"}:
        return False
    return None


def parse_positive_int(value, field_name):
    if value in (None, ""):
        return None
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError):
        raise DRFValidationError({field_name: [f"{field_name.replace('_', ' ').capitalize()} must be a valid integer."]})
    if parsed <= 0:
        raise DRFValidationError({field_name: [f"{field_name.replace('_', ' ').capitalize()} must be greater than 0."]})
    return parsed


def parse_decimal_filter(value, field_name, max_value=Decimal("9999.99")):
    if value in (None, ""):
        return None
    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, TypeError, ValueError):
        raise DRFValidationError({field_name: [f"{field_name.replace('_', ' ').capitalize()} must be a valid decimal number."]})
    if parsed < Decimal("0.00"):
        raise DRFValidationError({field_name: [f"{field_name.replace('_', ' ').capitalize()} cannot be negative."]})
    if parsed > max_value:
        raise DRFValidationError({field_name: [f"{field_name.replace('_', ' ').capitalize()} must not exceed {max_value}."]})
    return parsed


def parse_date_string(value, field_name):
    if value in (None, ""):
        return None
    value = str(value).strip()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise DRFValidationError({field_name: ["Invalid date format. Use YYYY-MM-DD."]})


def normalize_search(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def handle_validation_error(exc):
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "detail"):
        return exc.detail
    if hasattr(exc, "messages"):
        return {"non_field_errors": exc.messages}
    return {"non_field_errors": [str(exc)]}


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


# =====================================================
# LAB TEST VIEWS
# Keep existing functionality
# Admin manages lab tests
# =====================================================

class LabTestListCreateView(generics.ListCreateAPIView):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsAdminOrLabTechnicianReadOnly]

    def get_serializer_class(self):
        return LabTestListSerializer if self.request.method == "GET" else LabTestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        test_status = normalize_search(self.request.query_params.get("status"))
        search = normalize_search(self.request.query_params.get("search"))
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if test_status:
            if test_status not in {"active", "inactive"}:
                raise DRFValidationError({"status": ["Invalid status selected."]})
            queryset = queryset.filter(status=test_status)

        if search:
            if len(search) < 2:
                raise DRFValidationError({"search": ["Search must be at least 2 characters long."]})
            if len(search) > 100:
                raise DRFValidationError({"search": ["Search must not exceed 100 characters."]})
            queryset = queryset.filter(
                Q(test_name__icontains=search) | Q(description__icontains=search)
            )

        parsed_min_price = parse_decimal_filter(min_price, "min_price") if min_price not in (None, "") else None
        parsed_max_price = parse_decimal_filter(max_price, "max_price") if max_price not in (None, "") else None

        if parsed_min_price is not None:
            queryset = queryset.filter(price__gte=parsed_min_price)

        if parsed_max_price is not None:
            queryset = queryset.filter(price__lte=parsed_max_price)

        if parsed_min_price is not None and parsed_max_price is not None and parsed_min_price > parsed_max_price:
            raise DRFValidationError({"max_price": ["Maximum price must be greater than or equal to minimum price."]})

        return queryset

    def perform_create(self, serializer):
        try:
            lab_test = serializer.save()
            logger.info("LabTest created: %s", lab_test.test_name)
        except (DjangoValidationError, DRFValidationError) as exc:
            raise DRFValidationError(handle_validation_error(exc))


class LabTestRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LabTest.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrLabTechnicianReadOnly]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return LabTestDetailSerializer
        return LabTestSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.status = "inactive"
            instance.full_clean()
            instance.save(update_fields=["status", "updated_at"])

            return Response(
                {
                    "detail": "Test deactivated successfully.",
                    "action": "marked_inactive",
                    "id": instance.id,
                },
                status=status.HTTP_200_OK,
            )
        except (DjangoValidationError, DRFValidationError) as exc:
            return Response(handle_validation_error(exc), status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# LAB REPORT VIEWS
# Keep all existing features
# LabTechnician handles reports
# =====================================================

class LabReportListCreateView(generics.ListCreateAPIView):
    queryset = LabReport.objects.select_related(
        "test",
        "lab_prescription",
        "lab_prescription__lab_test",
        "lab_prescription__consultation",
        "lab_prescription__consultation__appointment",
        "lab_prescription__consultation__appointment__patient",
    ).all()
    serializer_class = LabReportSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LabReportCreateSerializer
        if self.request.method == "GET" and self.request.query_params.get("detailed") == "true":
            return LabReportDetailSerializer
        return LabReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        report_status = normalize_search(self.request.query_params.get("status"))
        is_abnormal = self.request.query_params.get("is_abnormal")
        test_id = self.request.query_params.get("test")
        prescription_id = self.request.query_params.get("prescription")
        consultation_id = self.request.query_params.get("consultation")
        appointment_id = self.request.query_params.get("appointment")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if report_status:
            if report_status not in {"pending", "complete"}:
                raise DRFValidationError({"status": ["Invalid status selected."]})
            queryset = queryset.filter(status=report_status)

        parsed_abnormal = parse_bool(is_abnormal)
        if is_abnormal is not None:
            if parsed_abnormal is None:
                raise DRFValidationError({"is_abnormal": ["Invalid boolean value. Use true or false."]})
            queryset = queryset.filter(is_abnormal=parsed_abnormal)

        parsed_test_id = parse_positive_int(test_id, "test") if test_id not in (None, "") else None
        parsed_prescription_id = parse_positive_int(prescription_id, "prescription") if prescription_id not in (None, "") else None
        parsed_consultation_id = parse_positive_int(consultation_id, "consultation") if consultation_id not in (None, "") else None
        parsed_appointment_id = parse_positive_int(appointment_id, "appointment") if appointment_id not in (None, "") else None

        if parsed_test_id is not None:
            queryset = queryset.filter(test_id=parsed_test_id)

        if parsed_prescription_id is not None:
            queryset = queryset.filter(lab_prescription_id=parsed_prescription_id)

        if parsed_consultation_id is not None:
            queryset = queryset.filter(lab_prescription__consultation_id=parsed_consultation_id)

        if parsed_appointment_id is not None:
            queryset = queryset.filter(
                lab_prescription__consultation__appointment_id=parsed_appointment_id
            )

        parsed_date_from = parse_date_string(date_from, "date_from") if date_from not in (None, "") else None
        parsed_date_to = parse_date_string(date_to, "date_to") if date_to not in (None, "") else None

        if parsed_date_from:
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if parsed_date_to:
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        if parsed_date_from and parsed_date_to and parsed_date_from > parsed_date_to:
            raise DRFValidationError({"date_to": ["date_to must be greater than or equal to date_from."]})

        return queryset

    def perform_create(self, serializer):
        try:
            report = serializer.save()
            logger.info("LabReport created: %s for test %s", report.id, report.test.test_name)
        except (DjangoValidationError, DRFValidationError) as exc:
            raise DRFValidationError(handle_validation_error(exc))


class LabReportRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LabReport.objects.select_related(
        "test",
        "lab_prescription",
        "lab_prescription__lab_test",
        "lab_prescription__consultation",
        "lab_prescription__consultation__appointment",
        "lab_prescription__consultation__appointment__patient",
    ).all()
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return LabReportDetailSerializer
        return LabReportSerializer

    def perform_update(self, serializer):
        try:
            old_status = serializer.instance.status
            report = serializer.save()
            new_status = report.status

            if old_status != new_status:
                logger.info(
                    "LabReport %s status changed: %s -> %s",
                    report.id,
                    old_status,
                    new_status,
                )
        except (DjangoValidationError, DRFValidationError) as exc:
            raise DRFValidationError(handle_validation_error(exc))
        
class LabReportValidateFieldView(generics.GenericAPIView):
    serializer_class = LabReportSerializer
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def post(self, request, *args, **kwargs):
        field = request.data.get("field")
        value = request.data.get("value")
        form = request.data.get("form", {}) or {}

        if field not in {"result_value", "remarks", "status"}:
            return Response(
                {"message": "Invalid field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer_input = {
            "lab_prescription": form.get("lab_prescription"),
            "test": form.get("test"),
            "result_value": form.get("result_value"),
            "remarks": form.get("remarks"),
            "status": form.get("status", "pending"),
        }

        serializer_input[field] = value

        serializer = self.get_serializer(data=serializer_input, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
            return Response({"ok": True}, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as exc:
            return Response(
                handle_validation_error(exc),
                status=status.HTTP_400_BAD_REQUEST,
            )


# =====================================================
# LAB BILLING VIEWS
# Keep all existing features
# LabTechnician handles billing
# =====================================================

class LabBillingListCreateView(generics.ListCreateAPIView):
    queryset = LabBilling.objects.select_related(
        "consultation",
        "consultation__appointment",
        "consultation__appointment__patient",
    ).all()
    serializer_class = LabBillingSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LabBillingCreateSerializer
        return LabBillingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        payment_status = normalize_search(self.request.query_params.get("payment_status"))
        consultation_id = self.request.query_params.get("consultation")
        appointment_id = self.request.query_params.get("appointment")
        patient_id = self.request.query_params.get("patient")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if payment_status:
            if payment_status not in {"paid", "unpaid", "partial"}:
                raise DRFValidationError({"payment_status": ["Invalid payment status selected."]})
            queryset = queryset.filter(payment_status=payment_status)

        parsed_consultation_id = parse_positive_int(consultation_id, "consultation") if consultation_id not in (None, "") else None
        parsed_appointment_id = parse_positive_int(appointment_id, "appointment") if appointment_id not in (None, "") else None
        parsed_patient_id = parse_positive_int(patient_id, "patient") if patient_id not in (None, "") else None

        if parsed_consultation_id is not None:
            queryset = queryset.filter(consultation_id=parsed_consultation_id)

        if parsed_appointment_id is not None:
            queryset = queryset.filter(consultation__appointment_id=parsed_appointment_id)

        if parsed_patient_id is not None:
            queryset = queryset.filter(consultation__appointment__patient_id=parsed_patient_id)

        parsed_date_from = parse_date_string(date_from, "date_from") if date_from not in (None, "") else None
        parsed_date_to = parse_date_string(date_to, "date_to") if date_to not in (None, "") else None

        if parsed_date_from:
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if parsed_date_to:
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        if parsed_date_from and parsed_date_to and parsed_date_from > parsed_date_to:
            raise DRFValidationError({"date_to": ["date_to must be greater than or equal to date_from."]})

        return queryset

    def perform_create(self, serializer):
        try:
            billing = serializer.save()
            logger.info(
                "LabBilling created: %s for consultation %s",
                billing.id,
                billing.consultation.id,
            )
        except (DjangoValidationError, DRFValidationError) as exc:
            raise DRFValidationError(handle_validation_error(exc))


class LabBillingRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LabBilling.objects.select_related(
        "consultation",
        "consultation__appointment",
        "consultation__appointment__patient",
    ).all()
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def get_serializer_class(self):
        if self.request.method == "GET" and self.request.query_params.get("detailed") == "true":
            return LabBillingDetailSerializer
        if self.request.method in ["PATCH", "PUT"]:
            return LabBillingUpdateSerializer
        return LabBillingSerializer


# =====================================================
# BULK UPDATE
# Keep existing functionality
# =====================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def bulk_update_lab_reports(request):
    serializer = BulkLabReportUpdateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    report_ids = serializer.validated_data["report_ids"]
    new_status = serializer.validated_data["status"]
    remarks = serializer.validated_data.get("remarks", "")

    reports = LabReport.objects.filter(id__in=report_ids)
    updated_count = 0

    try:
        for report in reports:
            report.status = new_status
            if "remarks" in serializer.validated_data:
                report.remarks = remarks
            report.full_clean()
            report.save()
            updated_count += 1

        logger.info("Bulk updated %s lab reports to status: %s", updated_count, new_status)

        return Response(
            {
                "message": f"Successfully updated {updated_count} reports",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )
    except (DjangoValidationError, DRFValidationError) as exc:
        return Response(handle_validation_error(exc), status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# REPORT STATUS ACTIONS
# Keep existing functionality
# =====================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def mark_report_complete(request, pk):
    report = get_object_or_404(LabReport, pk=pk)

    if report.result_value is None:
        return Response(
            {"result_value": ["Cannot mark report complete without a result value."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        report.status = "complete"
        if "remarks" in request.data:
            report.remarks = request.data.get("remarks")
        report.full_clean()
        report.save()

        return Response(
            {"message": f"Lab report {report.id} marked as complete."},
            status=status.HTTP_200_OK,
        )
    except (DjangoValidationError, DRFValidationError) as exc:
        return Response(handle_validation_error(exc), status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def mark_bill_paid(request, pk):
    billing = get_object_or_404(LabBilling, pk=pk)

    try:
        billing.payment_status = "paid"
        billing.full_clean()
        billing.save(update_fields=["payment_status", "updated_at"])

        return Response(
            {"message": f"Lab billing {billing.id} marked as paid."},
            status=status.HTTP_200_OK,
        )
    except (DjangoValidationError, DRFValidationError) as exc:
        return Response(handle_validation_error(exc), status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# SUMMARY / DASHBOARD
# Keep existing functionality
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def consultation_lab_summary(request, consultation_id):
    try:
        consultation_id = int(consultation_id)
        if consultation_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {"consultation_id": ["Consultation ID must be a valid positive integer."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    lab_reports = LabReport.objects.filter(
        lab_prescription__consultation_id=consultation_id
    ).select_related(
        "test",
        "lab_prescription__consultation",
        "lab_prescription__consultation__appointment",
        "lab_prescription__consultation__appointment__patient",
    )

    if not lab_reports.exists():
        return Response(
            {"message": "No lab reports found for this consultation"},
            status=status.HTTP_404_NOT_FOUND,
        )

    first_report = lab_reports.first()
    consultation = first_report.lab_prescription.consultation
    appointment = consultation.appointment
    billing = LabBilling.objects.filter(consultation_id=consultation_id).first()

    summary_data = {
        "consultation_id": consultation.id,
        "patient_name": appointment.patient.name,
        "doctor_name": appointment.doctor_name,
        "total_tests": lab_reports.count(),
        "completed_tests": lab_reports.filter(status="complete").count(),
        "pending_tests": lab_reports.filter(status="pending").count(),
        "abnormal_results": lab_reports.filter(is_abnormal=True).count(),
        "total_bill": billing.total_amount if billing else Decimal("0.00"),
        "payment_status": billing.payment_status if billing else "unpaid",
    }

    serializer = ConsultationLabSummarySerializer(summary_data)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def dashboard_stats(request):
    total_tests = LabTest.objects.count()
    active_tests = LabTest.objects.filter(status="active").count()
    total_reports = LabReport.objects.count()
    completed_reports = LabReport.objects.filter(status="complete").count()
    pending_reports = LabReport.objects.filter(status="pending").count()
    abnormal_reports = LabReport.objects.filter(is_abnormal=True).count()
    total_billings = LabBilling.objects.count()
    paid_billings = LabBilling.objects.filter(payment_status="paid").count()
    unpaid_billings = LabBilling.objects.filter(payment_status="unpaid").count()
    total_revenue = (
        LabBilling.objects.filter(payment_status="paid").aggregate(total=Sum("total_amount"))["total"]
        or Decimal("0.00")
    )

    top_tests = list(
        LabTest.objects.annotate(report_count=Count("lab_reports"))
        .order_by("-report_count", "test_name")
        .values("id", "test_name", "report_count")[:5]
    )

    return Response(
        {
            "tests": {
                "total": total_tests,
                "active": active_tests,
            },
            "reports": {
                "total": total_reports,
                "completed": completed_reports,
                "pending": pending_reports,
                "abnormal": abnormal_reports,
            },
            "billing": {
                "total": total_billings,
                "paid": paid_billings,
                "unpaid": unpaid_billings,
                "revenue": total_revenue,
            },
            "top_tests": top_tests,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# LAB PRESCRIPTIONS
# VERY IMPORTANT FOR YOUR SCENARIO
# Keep feature, only protect it
# =====================================================

class LabPrescriptionListView(generics.ListAPIView):
    queryset = PrescribeLab.objects.select_related(
        "consultation",
        "consultation__appointment",
        "consultation__appointment__patient",
        "lab_test",
    ).all()
    serializer_class = LabPrescriptionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsLabTechnician]

    def get_queryset(self):
        queryset = super().get_queryset()

        consultation_id = self.request.query_params.get("consultation")
        test_id = self.request.query_params.get("test")

        parsed_consultation_id = parse_positive_int(consultation_id, "consultation") if consultation_id not in (None, "") else None
        parsed_test_id = parse_positive_int(test_id, "test") if test_id not in (None, "") else None

        if parsed_consultation_id is not None:
            queryset = queryset.filter(consultation_id=parsed_consultation_id)

        if parsed_test_id is not None:
            queryset = queryset.filter(lab_test_id=parsed_test_id)

        return queryset.order_by("-id")


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsLabTechnician])
def abnormal_report_alerts(request):
    reports = (
        LabReport.objects.filter(is_abnormal=True, status="complete")
        .select_related(
            "test",
            "lab_prescription",
            "lab_prescription__consultation",
            "lab_prescription__consultation__appointment",
            "lab_prescription__consultation__appointment__patient",
        )
        .order_by("-updated_at")[:20]
    )

    data = []
    for report in reports:
        consultation = report.lab_prescription.consultation
        appointment = consultation.appointment

        data.append(
            {
                "id": report.id,
                "patient_name": getattr(appointment.patient, "name", "N/A"),
                "doctor_name": getattr(appointment, "doctor_name", "N/A"),
                "test_name": report.test.test_name,
                "result_value": str(report.result_value) if report.result_value is not None else None,
                "normal_range": f"{report.test.min_range} - {report.test.max_range}",
                "updated_at": report.updated_at,
            }
        )

    return Response(data, status=status.HTTP_200_OK)


# =====================================================
# PDF DOWNLOADS
# Keep full feature
# Allow Admin and LabTechnician
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminOrLabTechnician])
def download_lab_report_pdf(request, pk):

    def format_display_id(prefix, value):
        if value is None:
            return "-"
        return f"{prefix}{int(value):03d}"

    def draw_text(c, x, y, text, size=10, font="Helvetica", color="#0F172A"):
        c.setFillColor(colors.HexColor(color))
        c.setFont(font, size)
        c.drawString(x, y, str(text))

    def draw_right_text(c, x, y, text, size=10, font="Helvetica", color="#0F172A"):
        c.setFillColor(colors.HexColor(color))
        c.setFont(font, size)
        c.drawRightString(x, y, str(text))

    def draw_box(c, x, y, w, h, fill="#FFFFFF", stroke="#D9E2EC", radius=10):
        c.setFillColor(colors.HexColor(fill))
        c.setStrokeColor(colors.HexColor(stroke))
        c.setLineWidth(1)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)

    report = get_object_or_404(
        LabReport.objects.select_related(
            "test",
            "lab_prescription",
            "lab_prescription__consultation",
            "lab_prescription__consultation__appointment",
            "lab_prescription__consultation__appointment__patient",
        ),
        pk=pk,
    )

    consultation = report.lab_prescription.consultation
    appointment = consultation.appointment
    patient_name = getattr(appointment.patient, "name", "N/A")
    doctor_name = getattr(appointment, "doctor_name", "N/A")
    test_name = getattr(report.test, "test_name", "N/A")
    result_value = report.result_value if report.result_value is not None else "-"
    normal_range = (
        f"{report.test.min_range} - {report.test.max_range}"
        if report.test.min_range is not None and report.test.max_range is not None
        else "-"
    )
    abnormal = "Yes" if report.is_abnormal else "No"
    remarks = report.remarks or "No remarks"

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    margin_x = 12 * mm
    top_y = height - 14 * mm
    content_width = width - (2 * margin_x)

    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    draw_text(pdf, margin_x, top_y, "LABORATORY REPORT", size=11, font="Helvetica-Bold", color="#2563EB")
    draw_text(pdf, margin_x, top_y - 34, "Lab Report", size=28, font="Helvetica-Bold", color="#0F172A")
    draw_text(pdf, margin_x, top_y - 62, f"Report ID: {format_display_id('RP', report.id)}", size=12, color="#64748B")

    draw_right_text(pdf, width - margin_x, top_y - 12, "Status", size=11, color="#64748B")
    draw_right_text(pdf, width - margin_x, top_y - 40, str(report.status).capitalize(), size=18, font="Helvetica-Bold", color="#0F172A")

    divider_y = top_y - 86
    pdf.setStrokeColor(colors.HexColor("#D9E2EC"))
    pdf.setLineWidth(1)
    pdf.line(0, divider_y, width, divider_y)

    current_y = divider_y - 14 * mm
    gap = 8 * mm
    card_w = (content_width - gap) / 2
    card_h = 48 * mm

    left_x = margin_x
    right_x = margin_x + card_w + gap

    draw_box(pdf, left_x, current_y - card_h, card_w, card_h, fill="#FFFFFF", stroke="#D9E2EC")
    draw_box(pdf, right_x, current_y - card_h, card_w, card_h, fill="#FFFFFF", stroke="#D9E2EC")

    draw_text(pdf, left_x + 12, current_y - 18, "VISIT DETAILS", size=11, font="Helvetica-Bold", color="#64748B")

    row1_y = current_y - 46
    row2_y = current_y - 78
    row3_y = current_y - 110

    draw_text(pdf, left_x + 12, row1_y, "Consultation ID", size=11, color="#64748B")
    draw_right_text(pdf, left_x + card_w - 12, row1_y, format_display_id("CT", consultation.id), size=11, font="Helvetica-Bold")

    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.line(left_x + 12, row1_y - 10, left_x + card_w - 12, row1_y - 10)

    draw_text(pdf, left_x + 12, row2_y, "Appointment ID", size=11, color="#64748B")
    draw_right_text(pdf, left_x + card_w - 12, row2_y, format_display_id("AP", appointment.id), size=11, font="Helvetica-Bold")

    pdf.line(left_x + 12, row2_y - 10, left_x + card_w - 12, row2_y - 10)

    draw_text(pdf, left_x + 12, row3_y, "Created At", size=11, color="#64748B")
    draw_right_text(
        pdf,
        left_x + card_w - 12,
        row3_y,
        report.created_at.strftime("%d %b %Y, %I:%M %p").replace("AM", "am").replace("PM", "pm"),
        size=11,
        font="Helvetica-Bold",
    )

    draw_text(pdf, right_x + 12, current_y - 18, "PATIENT & DOCTOR", size=11, font="Helvetica-Bold", color="#64748B")

    draw_text(pdf, right_x + 12, row1_y, "Patient", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row1_y, patient_name, size=11, font="Helvetica-Bold")

    pdf.line(right_x + 12, row1_y - 10, right_x + card_w - 12, row1_y - 10)

    draw_text(pdf, right_x + 12, row2_y, "Doctor", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row2_y, doctor_name, size=11, font="Helvetica-Bold")

    pdf.line(right_x + 12, row2_y - 10, right_x + card_w - 12, row2_y - 10)

    draw_text(pdf, right_x + 12, row3_y, "Abnormal", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row3_y, abnormal, size=11, font="Helvetica-Bold")

    current_y -= card_h + 16 * mm

    draw_text(pdf, margin_x, current_y, "Test Details", size=19, font="Helvetica-Bold")
    current_y -= 10 * mm

    table_x = margin_x
    table_w = content_width
    header_h = 13 * mm
    row_h = 12 * mm

    c1 = table_x
    c2 = table_x + table_w * 0.34
    c3 = table_x + table_w * 0.60
    c4 = table_x + table_w * 0.78

    pdf.setFillColor(colors.HexColor("#F8FAFC"))
    pdf.setStrokeColor(colors.HexColor("#D9E2EC"))
    pdf.rect(table_x, current_y - header_h, table_w, header_h, fill=1, stroke=1)

    draw_text(pdf, c1 + 10, current_y - 22, "Test Name", size=11, font="Helvetica-Bold", color="#334155")
    draw_text(pdf, c2 + 10, current_y - 22, "Normal Range", size=11, font="Helvetica-Bold", color="#334155")
    draw_text(pdf, c3 + 10, current_y - 22, "Result", size=11, font="Helvetica-Bold", color="#334155")
    draw_text(pdf, c4 + 10, current_y - 22, "Status", size=11, font="Helvetica-Bold", color="#334155")

    current_y -= header_h

    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.line(table_x, current_y, table_x + table_w, current_y)

    draw_text(pdf, c1 + 10, current_y - 21, test_name, size=11, font="Helvetica-Bold", color="#1F2937")
    draw_text(pdf, c2 + 10, current_y - 21, normal_range, size=11, color="#334155")
    draw_text(pdf, c3 + 10, current_y - 21, result_value, size=11, color="#334155")
    draw_text(pdf, c4 + 10, current_y - 21, str(report.status).capitalize(), size=11, color="#334155")

    current_y -= row_h + 16 * mm

    draw_text(pdf, margin_x, current_y, "Remarks", size=19, font="Helvetica-Bold")
    current_y -= 8 * mm

    remarks_h = 32 * mm
    draw_box(pdf, margin_x, current_y - remarks_h, content_width, remarks_h, fill="#FFFFFF", stroke="#D9E2EC")

    text_obj = pdf.beginText()
    text_obj.setTextOrigin(margin_x + 12, current_y - 18)
    text_obj.setFont("Helvetica", 11)
    text_obj.setFillColor(colors.HexColor("#334155"))

    max_chars = 110
    words = str(remarks).split()
    line = ""

    for word in words:
        test_line = f"{line} {word}".strip()
        if len(test_line) <= max_chars:
            line = test_line
        else:
            text_obj.textLine(line)
            line = word
    if line:
        text_obj.textLine(line)

    pdf.drawText(text_obj)

    current_y -= remarks_h + 14 * mm

    draw_text(
        pdf,
        margin_x,
        current_y,
        "This is a system-generated laboratory report.",
        size=9,
        color="#64748B",
    )

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"lab_report_{report.id}.pdf",
        content_type="application/pdf",
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminOrLabTechnician])
def download_lab_billing_pdf(request, pk):

    def format_display_id(prefix, value):
        if value is None:
            return "-"
        return f"{prefix}{int(value):03d}"

    def format_money(amount):
        if amount is None:
            return "Rs. 0.00"
        try:
            return f"Rs. {float(amount):,.0f}" if float(amount).is_integer() else f"Rs. {float(amount):,.2f}"
        except Exception:
            return f"Rs. {amount}"

    def draw_text(c, x, y, text, size=10, font="Helvetica", color="#0F172A"):
        c.setFillColor(colors.HexColor(color))
        c.setFont(font, size)
        c.drawString(x, y, str(text))

    def draw_right_text(c, x, y, text, size=10, font="Helvetica", color="#0F172A"):
        c.setFillColor(colors.HexColor(color))
        c.setFont(font, size)
        c.drawRightString(x, y, str(text))

    def draw_box(c, x, y, w, h, fill="#FFFFFF", stroke="#D9E2EC", radius=10):
        c.setFillColor(colors.HexColor(fill))
        c.setStrokeColor(colors.HexColor(stroke))
        c.setLineWidth(1)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)

    billing = get_object_or_404(
        LabBilling.objects.select_related(
            "consultation",
            "consultation__appointment",
            "consultation__appointment__patient",
        ),
        pk=pk,
    )

    consultation = billing.consultation
    appointment = consultation.appointment
    patient = appointment.patient

    reports = (
        LabReport.objects.filter(lab_prescription__consultation=consultation)
        .select_related("test")
        .order_by("id")
    )

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    margin_x = 12 * mm
    top_y = height - 14 * mm
    content_width = width - (2 * margin_x)

    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    draw_text(pdf, margin_x, top_y, "LABORATORY RECEIPT", size=11, font="Helvetica-Bold", color="#2563EB")
    draw_text(pdf, margin_x, top_y - 34, "Lab Billing Receipt", size=28, font="Helvetica-Bold", color="#0F172A")
    draw_text(pdf, margin_x, top_y - 62, f"Billing ID: {format_display_id('BL', billing.id)}", size=12, color="#64748B")

    draw_right_text(pdf, width - margin_x, top_y - 12, "Payment Status", size=11, color="#64748B")
    draw_right_text(pdf, width - margin_x, top_y - 40, str(billing.payment_status).capitalize(), size=18, font="Helvetica-Bold", color="#0F172A")

    divider_y = top_y - 86
    pdf.setStrokeColor(colors.HexColor("#D9E2EC"))
    pdf.setLineWidth(1)
    pdf.line(0, divider_y, width, divider_y)

    current_y = divider_y - 14 * mm
    gap = 8 * mm
    card_w = (content_width - gap) / 2
    card_h = 48 * mm

    left_x = margin_x
    right_x = margin_x + card_w + gap

    draw_box(pdf, left_x, current_y - card_h, card_w, card_h, fill="#FFFFFF", stroke="#D9E2EC")
    draw_box(pdf, right_x, current_y - card_h, card_w, card_h, fill="#FFFFFF", stroke="#D9E2EC")

    draw_text(pdf, left_x + 12, current_y - 18, "VISIT DETAILS", size=11, font="Helvetica-Bold", color="#64748B")

    row1_y = current_y - 46
    row2_y = current_y - 78
    row3_y = current_y - 110

    draw_text(pdf, left_x + 12, row1_y, "Consultation ID", size=11, color="#64748B")
    draw_right_text(pdf, left_x + card_w - 12, row1_y, format_display_id("CT", consultation.id), size=11, font="Helvetica-Bold")

    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.line(left_x + 12, row1_y - 10, left_x + card_w - 12, row1_y - 10)

    draw_text(pdf, left_x + 12, row2_y, "Appointment ID", size=11, color="#64748B")
    draw_right_text(pdf, left_x + card_w - 12, row2_y, format_display_id("AP", appointment.id), size=11, font="Helvetica-Bold")

    pdf.line(left_x + 12, row2_y - 10, left_x + card_w - 12, row2_y - 10)

    draw_text(pdf, left_x + 12, row3_y, "Created At", size=11, color="#64748B")
    draw_right_text(
        pdf,
        left_x + card_w - 12,
        row3_y,
        billing.created_at.strftime("%d %b %Y, %I:%M %p").replace("AM", "am").replace("PM", "pm"),
        size=11,
        font="Helvetica-Bold",
    )

    draw_text(pdf, right_x + 12, current_y - 18, "PATIENT & DOCTOR", size=11, font="Helvetica-Bold", color="#64748B")

    draw_text(pdf, right_x + 12, row1_y, "Patient", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row1_y, patient.name or "-", size=11, font="Helvetica-Bold")

    pdf.line(right_x + 12, row1_y - 10, right_x + card_w - 12, row1_y - 10)

    draw_text(pdf, right_x + 12, row2_y, "Doctor", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row2_y, appointment.doctor_name or "-", size=11, font="Helvetica-Bold")

    pdf.line(right_x + 12, row2_y - 10, right_x + card_w - 12, row2_y - 10)

    draw_text(pdf, right_x + 12, row3_y, "Payment Status", size=11, color="#64748B")
    draw_right_text(pdf, right_x + card_w - 12, row3_y, str(billing.payment_status).lower(), size=11, font="Helvetica-Bold")

    current_y -= card_h + 16 * mm

    draw_text(pdf, margin_x, current_y, "Lab Test Items", size=19, font="Helvetica-Bold")
    current_y -= 10 * mm

    table_x = margin_x
    table_w = content_width
    header_h = 13 * mm
    row_h = 12 * mm

    c1 = table_x
    c2 = table_x + table_w * 0.32
    c3 = table_x + table_w * 0.52
    c5 = table_x + table_w

    pdf.setFillColor(colors.HexColor("#F8FAFC"))
    pdf.setStrokeColor(colors.HexColor("#D9E2EC"))
    pdf.rect(table_x, current_y - header_h, table_w, header_h, fill=1, stroke=1)

    draw_text(pdf, c1 + 10, current_y - 22, "Test", size=11, font="Helvetica-Bold", color="#334155")
    draw_text(pdf, c2 + 10, current_y - 22, "Result", size=11, font="Helvetica-Bold", color="#334155")
    draw_text(pdf, c3 + 10, current_y - 22, "Status", size=11, font="Helvetica-Bold", color="#334155")
    draw_right_text(pdf, c5 - 10, current_y - 22, "Price", size=11, font="Helvetica-Bold", color="#334155")

    current_y -= header_h

    if reports.exists():
        for report in reports:
            pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
            pdf.line(table_x, current_y, table_x + table_w, current_y)

            draw_text(pdf, c1 + 10, current_y - 21, report.test.test_name or "-", size=11, font="Helvetica-Bold", color="#1F2937")
            draw_text(
                pdf,
                c2 + 10,
                current_y - 21,
                report.result_value if report.result_value is not None else "-",
                size=11,
                color="#334155",
            )
            draw_text(
                pdf,
                c3 + 10,
                current_y - 21,
                str(report.status).capitalize(),
                size=11,
                color="#334155",
            )
            draw_right_text(
                pdf,
                c5 - 10,
                current_y - 21,
                format_money(report.test.price),
                size=11,
                font="Helvetica-Bold",
                color="#1F2937",
            )

            current_y -= row_h
    else:
        pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
        pdf.line(table_x, current_y, table_x + table_w, current_y)
        draw_text(pdf, c1 + 10, current_y - 21, "No lab test items found.", size=11, color="#64748B")
        current_y -= row_h

    total_h = 12 * mm
    pdf.setFillColor(colors.HexColor("#F8FAFC"))
    pdf.setStrokeColor(colors.HexColor("#D9E2EC"))
    pdf.rect(table_x, current_y - total_h, table_w, total_h, fill=1, stroke=1)

    draw_right_text(pdf, c5 - 90, current_y - 21, "Total Amount", size=11, font="Helvetica-Bold", color="#334155")
    draw_right_text(pdf, c5 - 10, current_y - 21, format_money(billing.total_amount), size=11, font="Helvetica-Bold", color="#111827")

    current_y -= total_h + 16 * mm

    draw_text(
        pdf,
        margin_x,
        current_y,
        "This is a system-generated billing receipt for laboratory services.",
        size=9,
        color="#64748B",
    )

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"lab_billing_{billing.id}.pdf",
        content_type="application/pdf",
    )