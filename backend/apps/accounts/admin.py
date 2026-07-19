from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'points', 'is_banned', 'date_joined')
    list_filter = ('role', 'is_banned', 'is_active', 'is_staff')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = UserAdmin.fieldsets + (
        ('Perfil', {'fields': ('role', 'avatar', 'bio', 'location', 'website', 'twitter', 'linkedin', 'github')}),
        ('Estado', {'fields': ('is_banned', 'ban_reason', 'points')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Info adicional', {'fields': ('email', 'role')}),
    )
