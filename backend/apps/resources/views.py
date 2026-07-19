import os
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from apps.accounts.permissions import IsAdminRole
from apps.memberships.permissions import HasActiveMembership
from .models import Resource
from .serializers import ResourceSerializer


class ResourceListCreateView(generics.ListCreateAPIView):
    """GET /api/resources/ — any active member. POST /api/resources/ — admin only."""
    serializer_class = ResourceSerializer
    queryset = Resource.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated(), HasActiveMembership()]
        return [IsAdminRole()]

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        name = self.request.data.get('name', '') or (file.name if file else '')
        serializer.save(file=file, name=name, uploaded_by=self.request.user)


class ResourceDeleteView(generics.DestroyAPIView):
    """DELETE /api/resources/<id>/ — admin only."""
    permission_classes = [IsAdminRole]
    queryset = Resource.objects.all()
    lookup_url_kwarg = 'pk'

    def perform_destroy(self, instance):
        if instance.file and os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
        instance.delete()
