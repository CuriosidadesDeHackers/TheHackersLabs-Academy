from django.db import models
from django.conf import settings
from django.utils import timezone


class SiteConfig(models.Model):
    stripe_public_key = models.CharField(max_length=200, blank=True, default='')
    stripe_secret_key = models.CharField(max_length=200, blank=True, default='')
    stripe_webhook_secret = models.CharField(max_length=200, blank=True, default='')
    notification_email = models.EmailField(blank=True, default='')

    class Meta:
        verbose_name = 'Configuración del sitio'

    def __str__(self):
        return 'Configuración del sitio'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Affiliate(models.Model):
    code = models.CharField(max_length=20, unique=True)
    label = models.CharField(max_length=100, blank=True)
    commission_pct = models.PositiveIntegerField(default=20)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'afiliado'
        verbose_name_plural = 'afiliados'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.label or self.code} ({self.code})"


class Plan(models.Model):
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    ANNUAL = 'annual'
    LIFETIME = 'lifetime'
    INTERVAL_CHOICES = [
        (MONTHLY, 'Mensual'),
        (QUARTERLY, 'Trimestral'),
        (ANNUAL, 'Anual'),
        (LIFETIME, 'Lifetime'),
    ]

    name = models.CharField(max_length=100)
    interval = models.CharField(max_length=20, choices=INTERVAL_CHOICES)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'plan'
        verbose_name_plural = 'planes'

    def __str__(self):
        return f"{self.name} ({self.interval})"


class Membership(models.Model):
    ACTIVE = 'active'
    CANCELLED = 'cancelled'
    EXPIRED = 'expired'
    LIFETIME = 'lifetime'
    STATUS_CHOICES = [
        (ACTIVE, 'Activa'),
        (CANCELLED, 'Cancelada'),
        (EXPIRED, 'Expirada'),
        (LIFETIME, 'Lifetime'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='membership')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ACTIVE)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'membresía'
        verbose_name_plural = 'membresías'

    def __str__(self):
        return f"{self.user.email} - {self.status}"

    @property
    def is_active(self):
        if self.status == self.LIFETIME:
            return True
        if self.status == self.ACTIVE:
            if self.end_date is None or self.end_date > timezone.now():
                return True
        return False
