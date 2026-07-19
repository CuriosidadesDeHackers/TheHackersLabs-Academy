from django.contrib import admin
from .models import Plan, Membership


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'interval', 'price', 'is_active')
    list_filter = ('interval', 'is_active')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'start_date', 'end_date')
    list_filter = ('status',)
    search_fields = ('user__email', 'user__username')
