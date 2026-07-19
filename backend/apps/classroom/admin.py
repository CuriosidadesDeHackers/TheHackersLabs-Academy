from django.contrib import admin
from .models import Course, Module, Lesson, LessonProgress, Certificate


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'instructor', 'is_published', 'is_premium', 'order')
    list_filter = ('is_published', 'is_premium')
    search_fields = ('title', 'instructor__username')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ModuleInline]


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'content_type', 'duration_minutes', 'is_free_preview', 'order')
    list_filter = ('content_type', 'is_free_preview')


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'completed', 'completed_at')
    list_filter = ('completed',)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('cert_id', 'user', 'course', 'issued_at')
    search_fields = ('cert_id', 'user__username', 'course__title')
