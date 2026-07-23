from rest_framework import serializers
from django.urls import reverse
from django.utils.text import slugify
from apps.accounts.serializers import UserPublicSerializer
from .embed_sanitizer import sanitize_embed_code
from .models import Course, Module, Lesson, LessonProgress, LessonAttachment, Certificate


# ─── Read serializers (existing, unchanged) ───────────────────────────────────

class LessonSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = (
            'id', 'module', 'title', 'content_type', 'video_url', 'embed_code',
            'content', 'duration_minutes', 'order', 'is_free_preview', 'is_completed',
        )
        read_only_fields = ('id',)

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(lesson=obj, user=request.user, completed=True).exists()
        return False


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ('id', 'course', 'title', 'order', 'lessons')
        read_only_fields = ('id',)


class CourseSerializer(serializers.ModelSerializer):
    instructor = UserPublicSerializer(read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)
    total_lessons = serializers.ReadOnlyField()
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'slug', 'description', 'short_description',
            'banner', 'instructor', 'is_published',
            'order', 'modules', 'total_lessons', 'user_progress', 'created_at',
        )
        read_only_fields = ('id', 'slug', 'created_at')

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        total = Lesson.objects.filter(module__course=obj).count()
        if total == 0:
            return 0
        completed = LessonProgress.objects.filter(
            lesson__module__course=obj, user=request.user, completed=True
        ).count()
        return round((completed / total) * 100)


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ('id', 'lesson', 'completed', 'completed_at')
        read_only_fields = ('id', 'completed_at')


# ─── Write serializers (new) ──────────────────────────────────────────────────

class CourseWriteSerializer(serializers.ModelSerializer):
    """Used for POST/PUT/PATCH on courses."""

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'slug', 'description', 'short_description',
            'banner', 'instructor', 'is_published', 'order',
        )
        read_only_fields = ('id', 'slug')

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El título no puede estar vacío.")
        return value.strip()

    def _generate_unique_slug(self, title, instance=None):
        base = slugify(title)
        slug = base
        qs = Course.objects.all()
        if instance:
            qs = qs.exclude(pk=instance.pk)
        n = 1
        while qs.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        return slug

    def create(self, validated_data):
        validated_data['slug'] = self._generate_unique_slug(validated_data['title'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'title' in validated_data and validated_data['title'] != instance.title:
            validated_data['slug'] = self._generate_unique_slug(validated_data['title'], instance)
        return super().update(instance, validated_data)


class ModuleWriteSerializer(serializers.ModelSerializer):
    """Used for POST/PUT/PATCH on modules."""

    class Meta:
        model = Module
        fields = ('id', 'course', 'title', 'order')
        read_only_fields = ('id', 'course')


class LessonWriteSerializer(serializers.ModelSerializer):
    """Used for POST/PUT/PATCH on lessons."""

    class Meta:
        model = Lesson
        fields = (
            'id', 'module', 'title', 'content_type', 'video_url', 'embed_code',
            'content', 'duration_minutes', 'order', 'is_free_preview',
        )
        read_only_fields = ('id', 'module')

    def validate_embed_code(self, value):
        return sanitize_embed_code(value)


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    image_url = serializers.SerializerMethodField()
    verify_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ('id', 'cert_id', 'course', 'course_title', 'image_url', 'verify_url', 'issued_at')
        read_only_fields = fields

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_verify_url(self, obj):
        from django.conf import settings
        return f"{settings.FRONTEND_URL}/verify/{obj.cert_id}"


class LessonAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = LessonAttachment
        fields = ('id', 'name', 'file_url', 'file_size', 'file_size_display', 'uploaded_at')
        read_only_fields = ('id', 'file_url', 'file_size', 'file_size_display', 'uploaded_at')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(reverse('attachment_download', args=[obj.pk]))
        return None

    def get_file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 ** 2:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / 1024 ** 2:.1f} MB"
