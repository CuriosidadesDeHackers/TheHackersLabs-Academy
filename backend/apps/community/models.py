from django.db import models
from django.conf import settings
from apps.classroom.models import validate_file_extension


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True, default='💬')
    color = models.CharField(max_length=20, blank=True, default='#60a5fa')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'categoría'
        verbose_name_plural = 'categorías'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    image = models.ImageField(upload_to='posts/', blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'publicación'
        verbose_name_plural = 'publicaciones'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.author.username}: {self.content[:50]}"

    @property
    def likes_count(self):
        return self.likes.count()

    @property
    def comments_count(self):
        return self.comments.count()


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='comments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'comentario'
        verbose_name_plural = 'comentarios'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author.username} on {self.post.id}"


class PostAttachment(models.Model):
    post        = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='attachments')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file        = models.FileField(upload_to='post_attachments/', validators=[validate_file_extension])
    name        = models.CharField(max_length=255, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.post_id})"

    @property
    def file_url(self):
        if self.file:
            return self.file.url
        return None

    @property
    def file_size_display(self):
        try:
            size = self.file.size
            if size < 1024:         return f"{size} B"
            if size < 1024 ** 2:   return f"{size / 1024:.1f} KB"
            return f"{size / 1024 ** 2:.1f} MB"
        except Exception:
            return ''


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'me gusta'
        verbose_name_plural = 'me gustas'
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} → {self.post_id}"
