from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level check that the requesting user owns the object.

    This is defense-in-depth: the queryset in the view is already scoped to
    request.user, so a cross-user object should never reach this check in
    practice. Keeping it means a future bug in queryset filtering (e.g. a
    forgotten .filter(owner=...) on a new action) still can't leak or let
    someone edit another user's data.
    """

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
