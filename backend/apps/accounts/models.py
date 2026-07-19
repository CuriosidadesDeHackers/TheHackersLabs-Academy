from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_INSTRUCTOR = 'instructor'
    ROLE_MEMBER = 'member'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_INSTRUCTOR, 'Instructor'),
        (ROLE_MEMBER, 'Member'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    twitter = models.CharField(max_length=100, blank=True)
    linkedin = models.CharField(max_length=100, blank=True)
    github = models.CharField(max_length=100, blank=True)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True)
    points = models.IntegerField(default=0)
    last_seen = models.DateTimeField(null=True, blank=True)
    referred_by = models.ForeignKey(
        'memberships.Affiliate', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='referred_users',
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    @property
    def level(self):
        thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]
        for i in range(len(thresholds) - 1, -1, -1):
            if self.points >= thresholds[i]:
                return i + 1
        return 1

    @property
    def is_online(self):
        from django.utils import timezone
        from datetime import timedelta
        if not self.last_seen:
            return False
        return self.last_seen >= timezone.now() - timedelta(minutes=5)

    @property
    def avatar_url(self):
        if self.avatar:
            return self.avatar.url
        return None


class SiteSettings(models.Model):
    """Singleton — always pk=1."""
    site_name         = models.CharField(max_length=120, default='The Hackers Labs Academy')
    banner_image      = models.ImageField(upload_to='site/', blank=True, null=True)
    accent_color       = models.CharField(max_length=7, default='#f5d42a')
    presentation_url   = models.TextField(blank=True, default='')
    about_testimonials = models.JSONField(default=list, blank=True)
    about_courses      = models.JSONField(default=list, blank=True)
    community_description = models.CharField(
        max_length=300, blank=True,
        default='Aprende ciberseguridad con una comunidad activa. Cursos, retos CTF, eventos y networking.'
    )

    class Meta:
        verbose_name = 'Configuración del sitio'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'site_name': 'The Hackers Labs Academy'})
        return obj
