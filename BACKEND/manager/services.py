from datetime import date

from .models import DoctorSchedule


def get_doctor_availability(doctor, selected_date):
    """
    Returns doctor availability for a given date.

    Logic preserved:
    1. Use DoctorSchedule for the selected date if it exists
    2. Otherwise fall back to Doctor default availability
    """

    # -----------------------------
    # Defensive validations
    # -----------------------------
    if doctor is None:
        raise ValueError("Doctor is required.")

    if selected_date is None:
        raise ValueError("Selected date is required.")

    if not isinstance(selected_date, date):
        raise ValueError("Selected date must be a valid date object.")

    if not hasattr(doctor, "available_from") or not hasattr(doctor, "available_to"):
        raise ValueError("Doctor availability fields are missing.")

    if not hasattr(doctor, "max_tokens"):
        raise ValueError("Doctor max_tokens field is missing.")

    if doctor.available_from is None:
        raise ValueError("Doctor available_from is required.")

    if doctor.available_to is None:
        raise ValueError("Doctor available_to is required.")

    if doctor.available_from >= doctor.available_to:
        raise ValueError("Doctor available_from must be earlier than available_to.")

    if doctor.max_tokens is None:
        raise ValueError("Doctor max_tokens is required.")

    if not isinstance(doctor.max_tokens, int):
        raise ValueError("Doctor max_tokens must be an integer.")

    if doctor.max_tokens < 0:
        raise ValueError("Doctor max_tokens cannot be negative.")

    # -----------------------------
    # Schedule lookup
    # -----------------------------
    try:
        schedule = DoctorSchedule.objects.get(
            doctor=doctor,
            date=selected_date
        )

        start_time = schedule.available_from or doctor.available_from
        end_time = schedule.available_to or doctor.available_to
        max_tokens = schedule.max_tokens
        is_available = schedule.is_available

        # -----------------------------
        # Schedule-level validations
        # -----------------------------
        if is_available not in (True, False):
            raise ValueError("Schedule availability flag must be boolean.")

        if is_available:
            if start_time is None:
                raise ValueError("Schedule start_time is required when doctor is available.")
            if end_time is None:
                raise ValueError("Schedule end_time is required when doctor is available.")
            if start_time >= end_time:
                raise ValueError("Schedule start_time must be earlier than end_time.")

        if max_tokens is None:
            raise ValueError("Schedule max_tokens is required.")
        if not isinstance(max_tokens, int):
            raise ValueError("Schedule max_tokens must be an integer.")
        if max_tokens < 0:
            raise ValueError("Schedule max_tokens cannot be negative.")

        return {
            "start_time": start_time,
            "end_time": end_time,
            "max_tokens": max_tokens,
            "is_available": is_available,
        }

    except DoctorSchedule.DoesNotExist:
        return {
            "start_time": doctor.available_from,
            "end_time": doctor.available_to,
            "max_tokens": doctor.max_tokens,
            "is_available": True,
        }