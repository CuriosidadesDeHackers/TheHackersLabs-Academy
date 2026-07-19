from django.db import models
from django.conf import settings


class Notification(models.Model):
    COMMENT = 'comment'
    LIKE = 'like'
    EVENT = 'event'
    SYSTEM = 'system'
    POST = 'post'
    COURSE = 'course'
    LESSON = 'lesson'
    TYPE_CHOICES = [
        (COMMENT, 'Comentario'),
        (LIKE, 'Like'),
        (EVENT, 'Evento'),
        (SYSTEM, 'Sistema'),
        (POST, 'Publicación'),
        (COURSE, 'Curso'),
        (LESSON, 'Lección'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sent_notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'notificación'
        verbose_name_plural = 'notificaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"
