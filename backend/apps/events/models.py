from django.db import models
from django.conf import settings


class Event(models.Model):
    WEBINAR = 'webinar'
    WORKSHOP = 'workshop'
    CTF = 'ctf'
    MEETUP = 'meetup'
    OTHER = 'other'
    TYPE_CHOICES = [
        (WEBINAR, 'Webinar'),
        (WORKSHOP, 'Workshop'),
        (CTF, 'CTF'),
        (MEETUP, 'Meetup'),
        (OTHER, 'Otro'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    event_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=OTHER)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(null=True, blank=True)
    banner_image = models.ImageField(upload_to='events/', blank=True, null=True)
    link = models.URLField(blank=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='events_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'evento'
        verbose_name_plural = 'eventos'
        ordering = ['start_datetime']

    def __str__(self):
        return self.title


class EventAttendee(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendees')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_signups')
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'asistente'
        verbose_name_plural = 'asistentes'
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user} → {self.event}"
