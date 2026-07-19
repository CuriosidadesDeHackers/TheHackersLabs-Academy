from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from .models import Event, EventAttendee


class EventSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    attendees_count = serializers.SerializerMethodField()
    is_attending = serializers.SerializerMethodField()
    banner_image = serializers.ImageField(required=False, allow_null=True, use_url=True)

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'description', 'event_type', 'start_datetime',
            'end_datetime', 'link', 'banner_image', 'is_recurring', 'recurrence_rule',
            'created_by', 'attendees_count', 'is_attending', 'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at')

    def get_attendees_count(self, obj):
        return obj.attendees.count()

    def get_is_attending(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return EventAttendee.objects.filter(event=obj, user=request.user).exists()
        return False
