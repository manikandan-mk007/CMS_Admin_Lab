import logging

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import LabReport, LabBilling

logger = logging.getLogger(__name__)


def _safe_str(value, default="N/A"):
    if value is None:
        return default
    try:
        text = str(value).strip()
        return text if text else default
    except Exception:
        return default


def _is_valid_email(value):
    if not value:
        return False
    try:
        value = str(value).strip()
    except Exception:
        return False
    return "@" in value and "." in value and " " not in value and len(value) <= 254


def _get_consultation_from_report(instance):
    try:
        return instance.lab_prescription.consultation
    except (AttributeError, ObjectDoesNotExist):
        return None


def _get_appointment_from_report(instance):
    consultation = _get_consultation_from_report(instance)
    if not consultation:
        return None
    try:
        return consultation.appointment
    except (AttributeError, ObjectDoesNotExist):
        return None


def _get_patient_from_report(instance):
    appointment = _get_appointment_from_report(instance)
    if not appointment:
        return None
    try:
        return appointment.patient
    except (AttributeError, ObjectDoesNotExist):
        return None


@receiver(pre_save, sender=LabReport)
def cache_previous_lab_report_state(sender, instance, **kwargs):
    """
    Cache previous status and abnormal flag before save.
    Logic unchanged, but now more defensive.
    """
    instance._previous_status = None
    instance._previous_is_abnormal = None

    if not getattr(instance, "pk", None):
        return

    try:
        previous = sender.objects.only("status", "is_abnormal").get(pk=instance.pk)
        instance._previous_status = previous.status
        instance._previous_is_abnormal = previous.is_abnormal
    except sender.DoesNotExist:
        pass
    except Exception as exc:
        logger.exception("Failed to cache previous LabReport state for %s: %s", getattr(instance, "pk", None), exc)


@receiver(post_save, sender=LabReport)
def alert_doctor_for_abnormal_results(sender, instance, created, **kwargs):
    """
    Alert only when an abnormal report becomes newly complete
    or changes from normal to abnormal.

    Logic preserved, hardened with validation-safe guards.
    """
    try:
        if not instance:
            return

        current_status = getattr(instance, "status", None)
        current_abnormal = getattr(instance, "is_abnormal", None)

        should_alert = False

        if current_status == "complete" and current_abnormal is True:
            if created:
                should_alert = True
            elif (
                getattr(instance, "_previous_status", None) != "complete"
                or getattr(instance, "_previous_is_abnormal", None) is False
            ):
                should_alert = True

        if not should_alert:
            return

        consultation = _get_consultation_from_report(instance)
        appointment = _get_appointment_from_report(instance)
        patient = _get_patient_from_report(instance)

        if not consultation or not appointment or not patient:
            logger.warning(
                "Skipping abnormal alert because related consultation/appointment/patient is missing for LabReport %s",
                getattr(instance, "pk", None),
            )
            return

        test_name = _safe_str(getattr(getattr(instance, "test", None), "test_name", None))
        patient_name = _safe_str(getattr(patient, "name", None))
        doctor_name = _safe_str(getattr(appointment, "doctor_name", None))
        result_value = _safe_str(getattr(instance, "result_value", None), default="-")
        min_range = _safe_str(getattr(getattr(instance, "test", None), "min_range", None), default="-")
        max_range = _safe_str(getattr(getattr(instance, "test", None), "max_range", None), default="-")
        remarks = _safe_str(getattr(instance, "remarks", None), default="None")

        logger.warning(
            "ABNORMAL RESULT ALERT: Test '%s' for patient %s - Value: %s (Normal: %s-%s) - Doctor: %s",
            test_name,
            patient_name,
            result_value,
            min_range,
            max_range,
            doctor_name,
        )

        doctor_email = getattr(appointment, "doctor_email", None)

        if getattr(settings, "DEFAULT_FROM_EMAIL", None) and _is_valid_email(doctor_email):
            send_mail(
                subject=f"ABNORMAL Lab Result - {patient_name}",
                message=(
                    f"Patient: {patient_name}\n"
                    f"Doctor: {doctor_name}\n"
                    f"Test: {test_name}\n"
                    f"Result: {result_value}\n"
                    f"Normal Range: {min_range} - {max_range}\n"
                    f"Remarks: {remarks}\n\n"
                    f"Please review immediately."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[doctor_email],
                fail_silently=True,
            )

    except Exception as exc:
        logger.exception("Failed to send abnormal result alert: %s", exc)


@receiver(post_save, sender=LabReport)
def ensure_billing_exists_and_refresh(sender, instance, created, **kwargs):
    """
    When a lab report is complete, ensure billing exists and refresh total.
    Logic unchanged, but wrapped safely.
    """
    try:
        if not instance:
            return

        if getattr(instance, "status", None) != "complete":
            return

        consultation = _get_consultation_from_report(instance)
        if not consultation:
            logger.warning(
                "Skipping billing refresh because consultation is missing for LabReport %s",
                getattr(instance, "pk", None),
            )
            return

        with transaction.atomic():
            billing, billing_created = LabBilling.objects.get_or_create(
                consultation=consultation,
                defaults={"payment_status": "unpaid"},
            )

            billing.refresh_total(save=True)

            if billing_created:
                logger.info(
                    "LabBilling auto-created for consultation %s from LabReport %s",
                    getattr(consultation, "pk", None),
                    getattr(instance, "pk", None),
                )

    except Exception as exc:
        logger.exception("Billing error: %s", exc)


@receiver(post_delete, sender=LabReport)
def refresh_billing_after_report_delete(sender, instance, **kwargs):
    """
    Refresh billing after report delete.
    Logic unchanged, but more defensive.
    """
    try:
        if not instance:
            return

        consultation = _get_consultation_from_report(instance)
        if not consultation:
            return

        billing = LabBilling.objects.filter(consultation=consultation).first()
        if billing:
            billing.refresh_total(save=True)

    except Exception as exc:
        logger.exception("Failed to refresh billing after report deletion: %s", exc)


@receiver(post_save, sender=LabBilling)
def track_financial_save_events(sender, instance, created, **kwargs):
    """
    Track LabBilling create/update events.
    Logic unchanged, but safer against missing relations.
    """
    try:
        if not instance:
            return

        action = "CREATED" if created else "UPDATED"
        consultation_id = getattr(getattr(instance, "consultation", None), "id", None)

        logger.info(
            "FINANCIAL EVENT: LabBilling %s %s - Amount: %s - Status: %s - Consultation: #%s",
            getattr(instance, "id", None),
            action,
            _safe_str(getattr(instance, "total_amount", None), default="0.00"),
            _safe_str(getattr(instance, "payment_status", None)),
            consultation_id if consultation_id is not None else "-",
        )
    except Exception as exc:
        logger.exception("Failed to track LabBilling save event: %s", exc)


@receiver(post_delete, sender=LabBilling)
def track_financial_delete_events(sender, instance, **kwargs):
    """
    Track LabBilling delete events.
    Logic unchanged, but safer against missing relations.
    """
    try:
        if not instance:
            return

        consultation_id = getattr(getattr(instance, "consultation", None), "id", None)

        logger.info(
            "FINANCIAL EVENT: LabBilling %s DELETED - Amount: %s - Status: %s - Consultation: #%s",
            getattr(instance, "id", None),
            _safe_str(getattr(instance, "total_amount", None), default="0.00"),
            _safe_str(getattr(instance, "payment_status", None)),
            consultation_id if consultation_id is not None else "-",
        )
    except Exception as exc:
        logger.exception("Failed to track LabBilling delete event: %s", exc)