import os
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


def validate_file_size(value):
    limit = 50 * 1024 * 1024  # 50 MB
    if value.size > limit:
        raise ValidationError('El archivo no puede superar los 50 MB.')


class Resource(models.Model):
    name = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='resources/%Y/%m/', validators=[validate_file_size])
    file_size = models.PositiveIntegerField(default=0)  # bytes
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='resources_uploaded'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'recurso'
        verbose_name_plural = 'recursos'
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = os.path.basename(self.file.name)
        if self.file and hasattr(self.file, 'size'):
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
