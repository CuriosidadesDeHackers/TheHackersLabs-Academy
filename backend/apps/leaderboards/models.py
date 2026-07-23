from django.db import models
from django.conf import settings


class LeaderboardPoint(models.Model):
    POST_CREATED = 'post_created'
    COMMENT_CREATED = 'comment_created'
    LESSON_COMPLETED = 'lesson_completed'
    LIKE_RECEIVED = 'like_received'
    ACTION_CHOICES = [
        (POST_CREATED, 'Post creado'),
        (COMMENT_CREATED, 'Comentario creado'),
        (LESSON_COMPLETED, 'Lección completada'),
        (LIKE_RECEIVED, 'Like recibido'),
    ]
    ACTION_POINTS = {
        POST_CREATED: 10,
        COMMENT_CREATED: 5,
        LESSON_COMPLETED: 20,
        LIKE_RECEIVED: 2,
    }

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='point_events')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    points = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    reference_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = 'punto de clasificación'
        verbose_name_plural = 'puntos de clasificación'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'action', 'reference_id'],
                name='unique_point_per_user_action_reference',
            ),
        ]

    def __str__(self):
        return f"{self.user} +{self.points} ({self.action})"

    def save(self, *args, **kwargs):
        if not self.pk:
            self.points = self.ACTION_POINTS.get(self.action, 0)
        super().save(*args, **kwargs)
        LeaderboardPoint.recalculate(self.user)

    @staticmethod
    def recalculate(user):
        """Recalcula user.points desde cero a partir de los eventos vigentes.
        Debe llamarse también tras borrar un LeaderboardPoint (p.ej. al
        revertir un like o una lección completada), ya que el delete() de un
        queryset no invoca save()."""
        user.points = LeaderboardPoint.objects.filter(user=user).aggregate(
            total=models.Sum('points')
        )['total'] or 0
        user.save(update_fields=['points'])
