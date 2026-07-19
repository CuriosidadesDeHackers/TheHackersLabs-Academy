from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Event, EventAttendee
from .serializers import EventSerializer
from apps.community.permissions import IsAdminUser


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event_type']

    def get_queryset(self):
        return Event.objects.select_related('created_by').prefetch_related('attendees')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    queryset = Event.objects.select_related('created_by').prefetch_related('attendees')

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_serializer_context(self):
        return {'request': self.request}


class EventAttendToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        attendee, created = EventAttendee.objects.get_or_create(event=event, user=request.user)
        if not created:
            attendee.delete()
            return Response({'attending': False})
        return Response({'attending': True})


class EventNotifyAllView(APIView):
    """POST /events/<pk>/notify/ — send in-app notification to all active users."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from django.contrib.auth import get_user_model
        from apps.notifications.models import Notification

        User = get_user_model()
        users = User.objects.filter(is_active=True).exclude(pk=request.user.pk)

        start = event.start_datetime.strftime('%d/%m/%Y a las %H:%M') if event.start_datetime else ''
        notifications = [
            Notification(
                recipient=u,
                sender=request.user,
                notification_type='event',
                title=f'📅 Evento: {event.title}',
                message=f'{start} — {event.description[:120]}' if event.description else start,
                link='/calendar',
            )
            for u in users
        ]
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        return Response({'notified': len(notifications)})
