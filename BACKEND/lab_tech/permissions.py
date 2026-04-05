from rest_framework import permissions


class BaseGroupPermission(permissions.BasePermission):
    """
    Shared defensive helpers for group-based permissions.
    Keeps logic centralized and avoids repetitive fragile checks.
    """

    ADMIN_GROUP = "Admin"
    LAB_TECHNICIAN_GROUP = "LabTechnician"

    @staticmethod
    def _is_authenticated_user(request):
        """
        Safely verify request.user exists and is authenticated.
        """
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False))

    @classmethod
    def _has_group(cls, request, group_name):
        """
        Safely check whether authenticated user belongs to a group.
        """
        if not cls._is_authenticated_user(request):
            return False

        user = getattr(request, "user", None)
        groups = getattr(user, "groups", None)
        if groups is None:
            return False

        try:
            return groups.filter(name=group_name).exists()
        except Exception:
            return False

    @staticmethod
    def _is_safe_method(request):
        """
        Safely check request method against DRF safe methods.
        """
        method = getattr(request, "method", None)
        return method in permissions.SAFE_METHODS


class IsLabTechnician(BaseGroupPermission):
    """
    Allows access only to LabTechnician group.
    Full access (GET, POST, PUT, PATCH, DELETE).
    """

    message = "Only lab technician users are allowed to access this resource."

    def has_permission(self, request, view):
        return self._has_group(request, self.LAB_TECHNICIAN_GROUP)


class IsLabTechnicianOrAdminReadOnly(BaseGroupPermission):
    """
    LabTechnician → Full access
    Admin → Read-only (GET, HEAD, OPTIONS)
    """

    message = "Lab technicians have full access. Admin users have read-only access."

    def has_permission(self, request, view):
        if not self._is_authenticated_user(request):
            return False

        if self._has_group(request, self.LAB_TECHNICIAN_GROUP):
            return True

        if self._has_group(request, self.ADMIN_GROUP):
            return self._is_safe_method(request)

        return False


class IsAdminOrLabTechnician(BaseGroupPermission):
    """
    Admin → Full access
    LabTechnician → Full access
    """

    message = "Only admin or lab technician users are allowed to access this resource."

    def has_permission(self, request, view):
        if not self._is_authenticated_user(request):
            return False

        return (
            self._has_group(request, self.ADMIN_GROUP)
            or self._has_group(request, self.LAB_TECHNICIAN_GROUP)
        )