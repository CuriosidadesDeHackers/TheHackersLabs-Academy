from rest_framework.permissions import BasePermission


class HasActiveMembership(BasePermission):
    message = 'Se requiere una membresía activa para acceder a este contenido.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role in ('admin', 'instructor') or request.user.is_staff:
            return True
        try:
            return request.user.membership.is_active
        except Exception:
            return False
