import os
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.views import APIView
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


class ResourceDownloadView(APIView):
    """GET /api/resources/<pk>/download/ — el fichero no se sirve bajo /media/
    público; solo se entrega aquí, tras comprobar membresía activa."""
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]

    def get(self, request, pk):
        resource = get_object_or_404(Resource, pk=pk)
        if not resource.file or not os.path.isfile(resource.file.path):
            raise Http404
        return FileResponse(
            open(resource.file.path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(resource.file.name),
        )


class ResourceDeleteView(generics.DestroyAPIView):
    """DELETE /api/resources/<id>/ — admin only."""
    permission_classes = [IsAdminRole]
    queryset = Resource.objects.all()
    lookup_url_kwarg = 'pk'

    def perform_destroy(self, instance):
        if instance.file and os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
        instance.delete()
