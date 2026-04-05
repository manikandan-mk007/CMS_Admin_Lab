from django.apps import AppConfig


class LabtechnicianConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lab_tech"

    def ready(self):
        import lab_tech.signals