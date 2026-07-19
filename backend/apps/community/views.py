import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from apps.leaderboards.models import LeaderboardPoint
from apps.accounts.models import User
from apps.notifications.models import Notification
from .models import Post, Comment, Like, Category, PostAttachment
from .serializers import PostSerializer, CommentSerializer, CategorySerializer, PostAttachmentSerializer
from .permissions import IsAuthorOrAdminOrReadOnly, IsAdminUser


def _notify_users_in_app_of_post(post):
    """Crea una notificación in-app para todos los usuarios activos cuando se publica un post nuevo."""
    author_name = post.author.first_name or post.author.username
    users = User.objects.filter(is_active=True).exclude(pk=post.author_id)
    notifications = [
        Notification(
            recipient=u,
            sender=post.author,
            notification_type=Notification.POST,
            title=f'📢 Nueva publicación de {author_name}',
            message=(post.title or post.content or '')[:120],
            link='/community',
        )
        for u in users
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)


def _notify_users_of_admin_post(post):
    """Envía un email (HTML con estilo) a todos los usuarios registrados cuando un admin publica en la comunidad."""
    recipients = list(
        User.objects.filter(is_active=True)
        .exclude(pk=post.author_id)
        .values_list('email', flat=True)
    )
    if not recipients:
        return

    author_name = post.author.first_name or post.author.username
    avatar_url = post.author.avatar_url
    avatar_url = f"{settings.BACKEND_URL}{avatar_url}" if avatar_url else None
    post_url = f"{settings.FRONTEND_URL}/community"
    preview = (post.content or '')[:400]
    image_url = f"{settings.BACKEND_URL}{post.image.url}" if post.image else None

    subject = f"📢 Nueva publicación de {author_name} en la comunidad"

    text_body = (
        f"{post.title + chr(10) + chr(10) if post.title else ''}"
        f"{preview}\n\n"
        f"Ver publicación completa: {post_url}\n\n"
        f"— The Hackers Labs Academy"
    )

    avatar_html = (
        f'<img src="{escape(avatar_url)}" width="40" height="40" '
        f'style="border-radius:50%;display:block;" alt="{escape(author_name)}">'
        if avatar_url else
        f'<div style="width:40px;height:40px;border-radius:50%;background:#f5a623;'
        f'color:#1c1c1f;font-weight:700;font-size:16px;display:flex;align-items:center;'
        f'justify-content:center;">{escape(author_name[:1].upper())}</div>'
    )

    image_html = (
        f'''
        <tr>
          <td style="padding:0 28px 24px;">
            <img src="{escape(image_url)}" alt="" width="544"
                 style="width:100%;max-width:544px;border-radius:13px;display:block;">
          </td>
        </tr>
        ''' if image_url else ''
    )

    title_html = (
        f'<p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#eaeaec;">{escape(post.title)}</p>'
        if post.title else ''
    )

    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#1c1c1f;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="max-width:600px;background:#232326;border-radius:17px;overflow:hidden;border:1px solid #3a3a3e;">
            <tr>
              <td style="padding:24px 28px 0;">
                <span style="display:inline-block;background:rgba(245,166,35,0.12);color:#f5a623;
                             font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
                             padding:5px 10px;border-radius:9px;">📢 Nueva publicación</span>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;">{avatar_html}</td>
                    <td>
                      <p style="margin:0;font-size:15px;font-weight:600;color:#eaeaec;">{escape(author_name)}</p>
                      <p style="margin:0;font-size:12px;color:#68686f;">The Hackers Labs Academy</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0;">
                {title_html}
                <p style="margin:0;font-size:14px;line-height:1.6;color:#9d9da6;white-space:pre-line;">{escape(preview)}</p>
              </td>
            </tr>
            {image_html}
            <tr>
              <td style="padding:8px 28px 28px;">
                <a href="{escape(post_url)}"
                   style="display:inline-block;background:#f5a623;color:#1c1c1f;font-weight:700;
                          font-size:14px;text-decoration:none;padding:12px 22px;border-radius:9px;">
                  Ver publicación →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #3a3a3e;">
                <p style="margin:0;font-size:12px;color:#68686f;">
                  Recibes este correo porque estás registrado en The Hackers Labs Academy.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.DEFAULT_FROM_EMAIL],
        bcc=recipients,
    )
    email.attach_alternative(html_body, 'text/html')
    email.send(fail_silently=True)


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]


class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['title', 'content', 'author__username']
    ordering_fields = ['created_at', 'likes_count']

    def get_queryset(self):
        return Post.objects.select_related('author', 'category').prefetch_related('comments', 'likes')

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        LeaderboardPoint.objects.create(user=self.request.user, action=LeaderboardPoint.POST_CREATED, reference_id=post.id)
        _notify_users_in_app_of_post(post)
        if self.request.user.role == 'admin':
            threading.Thread(target=_notify_users_of_admin_post, args=(post,), daemon=True).start()

    def get_serializer_context(self):
        return {'request': self.request}


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthorOrAdminOrReadOnly]
    queryset = Post.objects.select_related('author', 'category').prefetch_related('comments', 'likes')

    def get_serializer_context(self):
        return {'request': self.request}


class PinPostView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        post.is_pinned = not post.is_pinned
        post.save()
        return Response({'is_pinned': post.is_pinned})


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['post_pk']).select_related('author')

    def perform_create(self, serializer):
        post = Post.objects.get(pk=self.kwargs['post_pk'])
        comment = serializer.save(author=self.request.user, post=post)
        LeaderboardPoint.objects.create(user=self.request.user, action=LeaderboardPoint.COMMENT_CREATED, reference_id=comment.id)

    def get_serializer_context(self):
        return {'request': self.request}


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthorOrAdminOrReadOnly]
    queryset = Comment.objects.select_related('author')

    def get_serializer_context(self):
        return {'request': self.request}


class PostAttachmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/community/posts/<post_pk>/attachments/"""
    serializer_class   = PostAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PostAttachment.objects.filter(post_id=self.kwargs['post_pk'])

    def perform_create(self, serializer):
        from apps.classroom.models import validate_file_extension
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from django.core.exceptions import ValidationError as DjangoValidationError
        post = Post.objects.get(pk=self.kwargs['post_pk'])
        file = self.request.FILES.get('file')
        if file:
            try:
                validate_file_extension(file)
            except DjangoValidationError as e:
                raise DRFValidationError({'file': e.messages})
        name = self.request.data.get('name', '') or (file.name if file else '')
        serializer.save(post=post, uploaded_by=self.request.user, file=file, name=name)

    def get_serializer_context(self):
        return {'request': self.request}


class PostAttachmentDeleteView(generics.DestroyAPIView):
    """DELETE /api/community/attachments/<pk>/"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PostAttachment.objects.filter(uploaded_by=self.request.user)

    def perform_destroy(self, instance):
        import os
        if instance.file and os.path.isfile(instance.file.path):
            os.remove(instance.file.path)
        instance.delete()


class LikeToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_pk):
        try:
            post = Post.objects.get(pk=post_pk)
        except Post.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': post.likes_count})
        LeaderboardPoint.objects.create(user=post.author, action=LeaderboardPoint.LIKE_RECEIVED, reference_id=post.id)
        return Response({'liked': True, 'likes_count': post.likes_count})
