import os
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


def validate_file_size(value):
    limit = 50 * 1024 * 1024  # 50 MB
    if value.size > limit:
        raise ValidationError('El archivo no puede superar los 50 MB.')


ALLOWED_ATTACHMENT_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.zip', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3', '.wav',
}


def validate_file_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise ValidationError(f'Tipo de archivo no permitido: "{ext}".')


class Course(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    banner = models.ImageField(upload_to='courses/', blank=True, null=True)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='courses_taught'
    )
    is_published = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'curso'
        verbose_name_plural = 'cursos'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title

    @property
    def total_lessons(self):
        return Lesson.objects.filter(module__course=self).count()


class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'módulo'
        verbose_name_plural = 'módulos'
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(models.Model):
    VIDEO = 'video'
    TEXT = 'text'
    EMBED = 'embed'
    TYPE_CHOICES = [
        (VIDEO, 'Video'),
        (TEXT, 'Texto'),
        (EMBED, 'Embed'),
    ]

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=VIDEO)
    video_url = models.URLField(blank=True)
    embed_code = models.TextField(blank=True)
    content = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_free_preview = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'lección'
        verbose_name_plural = 'lecciones'
        ordering = ['order']

    def __str__(self):
        return self.title


class LessonProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress')
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'progreso de lección'
        verbose_name_plural = 'progresos de lección'
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"


class Certificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    cert_id = models.CharField(max_length=20, unique=True)
    image = models.ImageField(upload_to='certificates/', blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'certificado'
        verbose_name_plural = 'certificados'
        unique_together = ('user', 'course')
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.cert_id} — {self.user.username} — {self.course.title}"


class LessonAttachment(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='attachments')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to='attachments/lessons/%Y/%m/', validators=[validate_file_size, validate_file_extension])
    name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)  # bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'adjunto de lección'
        verbose_name_plural = 'adjuntos de lección'
        ordering = ['uploaded_at']

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = os.path.basename(self.file.name)
        if self.file and hasattr(self.file, 'size'):
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lesson.title} — {self.name}"
