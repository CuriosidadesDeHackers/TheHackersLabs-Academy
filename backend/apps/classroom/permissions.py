from rest_framework.permissions import BasePermission
from apps.accounts.permissions import IsAdminRole, IsAdminOrInstructor
from apps.memberships.permissions import HasActiveMembership


class IsAdminOrOwnerInstructor(BasePermission):
    """
    Object-level permission.
    - admin: always allowed
    - instructor: allowed only if they own the course
    For Module/Lesson the course is accessed via obj.course or obj.module.course.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) in ('admin', 'instructor')
        )

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'role', None) == 'admin':
            return True
        # Resolve the course from different model types
        course = getattr(obj, 'course', None) or getattr(getattr(obj, 'module', None), 'course', None) or obj
        return course.instructor == request.user


__all__ = ['HasActiveMembership', 'IsAdminRole', 'IsAdminOrInstructor', 'IsAdminOrOwnerInstructor']
