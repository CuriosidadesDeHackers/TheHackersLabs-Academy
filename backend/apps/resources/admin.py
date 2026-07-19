from django.contrib import admin
from .models import Resource


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'file_size', 'uploaded_by', 'uploaded_at')
    search_fields = ('name',)
