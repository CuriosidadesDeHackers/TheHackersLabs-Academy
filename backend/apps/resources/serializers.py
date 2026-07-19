import os
from rest_framework import serializers
from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = (
            'id', 'name', 'file', 'file_url', 'file_size', 'file_size_display',
            'extension', 'uploaded_by_name', 'uploaded_at',
        )
        read_only_fields = (
            'id', 'file_url', 'file_size', 'file_size_display',
            'extension', 'uploaded_by_name', 'uploaded_at',
        )
        extra_kwargs = {'file': {'write_only': True}}

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 ** 2:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / 1024 ** 2:.1f} MB"

    def get_extension(self, obj):
        if not obj.file:
            return ''
        return os.path.splitext(obj.file.name)[1].lstrip('.').lower()

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username if obj.uploaded_by else None
