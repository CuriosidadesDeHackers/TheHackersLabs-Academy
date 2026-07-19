from django.contrib import admin
from .models import Category, Post, Comment, Like


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'category', 'title', 'is_pinned', 'created_at')
    list_filter = ('category', 'is_pinned')
    search_fields = ('author__username', 'title', 'content')
    actions = ['pin_posts', 'unpin_posts']

    def pin_posts(self, request, queryset):
        queryset.update(is_pinned=True)
    pin_posts.short_description = 'Fijar posts seleccionados'

    def unpin_posts(self, request, queryset):
        queryset.update(is_pinned=False)
    unpin_posts.short_description = 'Desfijar posts seleccionados'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')
    search_fields = ('author__username', 'content')
