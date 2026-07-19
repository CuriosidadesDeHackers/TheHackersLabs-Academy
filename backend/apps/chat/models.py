from django.db import models
from django.conf import settings


class Conversation(models.Model):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'conversación'
        verbose_name_plural = 'conversaciones'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversación #{self.pk}"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()


class DirectMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'mensaje directo'
        verbose_name_plural = 'mensajes directos'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:40]}"
