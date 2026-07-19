from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .permissions import IsAdminRole
from .serializers import (
    RegisterSerializer, UserPublicSerializer, UserPrivateSerializer,
    ChangePasswordSerializer, AdminUserSerializer, AdminSetPasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)

User = get_user_model()


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Same as SimpleJWT's login view, with brute-force throttling."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserPrivateSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Client is responsible for deleting tokens locally
        return Response({'detail': 'Sesión cerrada correctamente.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserPrivateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Contraseña incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Contraseña actualizada.'})


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — send a reset link by email."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth_password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject='Restablece tu contraseña — The Hackers Labs Academy',
                message=(
                    f"Hola {user.first_name or user.username},\n\n"
                    f"Hemos recibido una solicitud para restablecer tu contraseña.\n"
                    f"Haz clic en el siguiente enlace para crear una nueva contraseña:\n\n"
                    f"{reset_link}\n\n"
                    f"Si no solicitaste este cambio, puedes ignorar este correo.\n"
                    f"Este enlace caduca pronto por seguridad."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        # Always return 200, regardless of whether the email exists (avoid user enumeration)
        return Response({'detail': 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.'})


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset/confirm/ — set a new password using the emailed token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({'detail': 'Enlace inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'detail': 'El enlace ha caducado o no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Contraseña restablecida correctamente.'})


class MemberListView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_banned', 'role']
    search_fields = ['username', 'first_name', 'last_name', 'bio', 'location']
    ordering_fields = ['date_joined', 'points', 'username']
    ordering = ['-points']

    def get_queryset(self):
        qs = User.objects.filter(is_active=True).select_related('membership__plan')
        status_filter = self.request.query_params.get('membership_status')
        if status_filter:
            qs = qs.filter(membership__status=status_filter)
        if self.request.query_params.get('online') == 'true':
            from django.utils import timezone
            from datetime import timedelta
            cutoff = timezone.now() - timedelta(minutes=5)
            qs = qs.filter(last_seen__gte=cutoff)
        return qs


class MemberDetailView(generics.RetrieveAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_active=True)


# ── Admin views ──────────────────────────────────────────────────────────────

class HeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        request.user.last_seen = timezone.now()
        request.user.save(update_fields=['last_seen'])
        return Response({'ok': True})


class AdminUserListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_banned']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'points', 'username', 'email']

    def get_queryset(self):
        qs = User.objects.all()
        membership_status = self.request.query_params.get('membership_status')
        if membership_status:
            qs = qs.filter(membership__status=membership_status)
        return qs


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class AdminUserSetPasswordView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Contraseña actualizada.'})


class AdminUserAssignCourseView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        from apps.classroom.models import Course
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'detail': 'course_id es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({'detail': 'Curso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        course.instructor = user
        course.save()
        return Response({'detail': f'Curso "{course.title}" asignado a {user.email}.'})


class AnalyticsView(APIView):
    """GET /api/auth/admin/analytics/ — admin only, platform-wide stats"""
    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from apps.community.models import Post, Comment
        from apps.classroom.models import Course, Lesson, LessonProgress
        from apps.memberships.models import Membership, Plan
        from apps.events.models import Event

        now = timezone.now()
        month_ago  = now - timedelta(days=30)
        week_ago   = now - timedelta(days=7)

        # Users
        total_users    = User.objects.count()
        new_this_month = User.objects.filter(date_joined__gte=month_ago).count()
        new_this_week  = User.objects.filter(date_joined__gte=week_ago).count()
        by_role = {
            'member':     User.objects.filter(role='member').count(),
            'instructor': User.objects.filter(role='instructor').count(),
            'admin':      User.objects.filter(role='admin').count(),
        }
        online_now = User.objects.filter(last_seen__gte=now - timedelta(minutes=5)).count()

        # Signups last 30 days — group by day
        from django.db.models.functions import TruncDate
        from django.db.models import Count
        signups_raw = (
            User.objects.filter(date_joined__gte=month_ago)
            .annotate(day=TruncDate('date_joined'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        signups_chart = [{'date': str(r['day']), 'count': r['count']} for r in signups_raw]

        # Content
        total_courses   = Course.objects.count()
        published_courses = Course.objects.filter(is_published=True).count()
        total_lessons   = Lesson.objects.count()
        total_posts     = Post.objects.count()
        posts_this_week = Post.objects.filter(created_at__gte=week_ago).count()
        total_comments  = Comment.objects.count()

        # Memberships
        active_mems    = Membership.objects.filter(status__in=['active', 'lifetime']).count()
        total_mems     = Membership.objects.count()
        by_plan = list(
            Membership.objects.filter(status__in=['active', 'lifetime'])
            .values('plan__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Revenue estimate (sum of plan prices × active memberships per plan)
        revenue_est = 0
        for entry in Membership.objects.filter(status='active').select_related('plan'):
            if entry.plan:
                revenue_est += float(entry.plan.price or 0)

        # Lessons completed
        completions_week = LessonProgress.objects.filter(
            completed=True, completed_at__gte=week_ago
        ).count()

        # Top posts by likes
        from apps.community.models import Like
        top_posts = list(
            Post.objects.annotate(lc=Count('likes'))
            .order_by('-lc')[:5]
            .values('id', 'title', 'lc', 'author__username')
        )

        # Recent signups
        recent_users = list(
            User.objects.order_by('-date_joined')[:10]
            .values('id', 'username', 'email', 'role', 'date_joined')
        )
        for u in recent_users:
            u['date_joined'] = u['date_joined'].isoformat()

        return Response({
            'users': {
                'total': total_users,
                'new_this_month': new_this_month,
                'new_this_week': new_this_week,
                'online_now': online_now,
                'by_role': by_role,
                'signups_chart': signups_chart,
                'recent': recent_users,
            },
            'content': {
                'courses': total_courses,
                'published_courses': published_courses,
                'lessons': total_lessons,
                'posts': total_posts,
                'posts_this_week': posts_this_week,
                'comments': total_comments,
                'completions_this_week': completions_week,
                'top_posts': top_posts,
            },
            'memberships': {
                'active': active_mems,
                'total': total_mems,
                'by_plan': by_plan,
                'revenue_estimate': round(revenue_est, 2),
            },
        })


class SiteSettingsView(APIView):
    """
    GET  /api/auth/site-settings/         — public, returns name + banner URL
    PATCH /api/auth/admin/site-settings/  — admin only, accepts multipart
    """

    def get_permissions(self):
        # The admin-prefixed path is only meant for PATCH; treat any access to it as admin-only,
        # otherwise it leaks the same data as the public endpoint while looking like an admin route.
        if self.request.resolver_match and self.request.resolver_match.url_name == 'site_settings_admin':
            return [IsAdminRole()]
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdminRole()]

    def get(self, request):
        from apps.accounts.models import SiteSettings
        s = SiteSettings.get()
        banner_url = None
        if s.banner_image:
            banner_url = request.build_absolute_uri(s.banner_image.url)
        return Response({
            'site_name': s.site_name,
            'banner_image': banner_url,
            'accent_color': s.accent_color or '#f5d42a',
            'presentation_url': s.presentation_url or '',
            'about_testimonials': s.about_testimonials or [],
            'about_courses': s.about_courses or [],
            'community_description': s.community_description or '',
        })

    def patch(self, request):
        from apps.accounts.models import SiteSettings
        import json
        s = SiteSettings.get()
        if 'site_name' in request.data:
            s.site_name = request.data['site_name']
        if 'accent_color' in request.data:
            color = request.data['accent_color']
            if color and color.startswith('#') and len(color) == 7:
                s.accent_color = color
        if 'presentation_url' in request.data:
            s.presentation_url = request.data['presentation_url']
        if 'banner_image' in request.FILES:
            s.banner_image = request.FILES['banner_image']
        elif request.data.get('banner_image') == '':
            s.banner_image = None
        if 'about_testimonials' in request.data:
            val = request.data['about_testimonials']
            s.about_testimonials = json.loads(val) if isinstance(val, str) else val
        if 'about_courses' in request.data:
            val = request.data['about_courses']
            s.about_courses = json.loads(val) if isinstance(val, str) else val
        if 'community_description' in request.data:
            s.community_description = request.data['community_description']
        s.save()
        banner_url = None
        if s.banner_image:
            banner_url = request.build_absolute_uri(s.banner_image.url)
        return Response({
            'site_name': s.site_name,
            'banner_image': banner_url,
            'accent_color': s.accent_color or '#f5d42a',
            'presentation_url': s.presentation_url or '',
            'about_testimonials': s.about_testimonials or [],
            'about_courses': s.about_courses or [],
            'community_description': s.community_description or '',
        })


class MediaUploadView(APIView):
    """POST /api/auth/admin/upload-media/ — admin only, saves file to media/uploads/ and returns URL."""
    permission_classes = [IsAdminRole]

    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3', '.wav', '.pdf'}

    def post(self, request):
        from django.core.files.storage import default_storage
        import os, uuid
        f = request.FILES.get('file')
        if not f:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response({'error': f'Tipo de archivo no permitido: "{ext}".'}, status=status.HTTP_400_BAD_REQUEST)
        filename = f'uploads/{uuid.uuid4().hex}{ext}'
        saved = default_storage.save(filename, f)
        url = request.build_absolute_uri(default_storage.url(saved))
        return Response({'url': url})
