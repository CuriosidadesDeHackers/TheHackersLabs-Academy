from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from apps.leaderboards.models import LeaderboardPoint
from apps.accounts.models import User
from apps.notifications.models import Notification
from .models import Course, Module, Lesson, LessonProgress, Certificate
from .serializers import (
    CourseSerializer, CourseWriteSerializer,
    ModuleSerializer, ModuleWriteSerializer,
    LessonSerializer, LessonWriteSerializer,
    LessonProgressSerializer,
    LessonAttachmentSerializer,
    CertificateSerializer,
)
from .permissions import IsAdminRole, IsAdminOrInstructor, IsAdminOrOwnerInstructor, HasActiveMembership


def _notify_users_of_new_course(course):
    users = User.objects.filter(is_active=True).exclude(pk=course.instructor_id)
    notifications = [
        Notification(
            recipient=u,
            sender=course.instructor,
            notification_type=Notification.COURSE,
            title=f'🎓 Nuevo curso: {course.title}',
            message=(course.short_description or course.description or '')[:120],
            link=f'/classroom/{course.id}',
        )
        for u in users
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)


def _notify_users_of_new_lesson(lesson):
    course = lesson.module.course
    if not course.is_published:
        return
    users = User.objects.filter(is_active=True).exclude(pk=course.instructor_id)
    notifications = [
        Notification(
            recipient=u,
            sender=course.instructor,
            notification_type=Notification.LESSON,
            title=f'📚 Nueva lección en {course.title}: {lesson.title}',
            message=lesson.title,
            link=f'/classroom/{course.id}/lesson/{lesson.id}',
        )
        for u in users
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)


def _visible_lessons(user, qs=None):
    """Lecciones visibles para `user`: admin ve todo, instructor ve las suyas
    + las de cursos publicados, el resto solo las de cursos publicados.
    Mismo criterio que CourseListView/CourseDetailView aplican a Course."""
    if qs is None:
        qs = Lesson.objects.select_related('module__course')
    role = getattr(user, 'role', 'member')
    if role == 'admin':
        return qs
    if role == 'instructor':
        return qs.filter(module__course__instructor=user) | qs.filter(module__course__is_published=True)
    return qs.filter(module__course__is_published=True)


# ─── Course views ──────────────────────────────────────────────────────────────

class CourseListView(generics.ListAPIView):
    """
    GET  /api/classroom/courses/  — list courses
    Admin/instructor see all; members see only published.
    """
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'member')
        qs = Course.objects.prefetch_related('modules__lessons')
        if role == 'admin':
            return qs
        if role == 'instructor':
            return qs.filter(instructor=user) | qs.filter(is_published=True)
        return qs.filter(is_published=True)

    def get_serializer_context(self):
        return {'request': self.request}


class CourseCreateView(generics.CreateAPIView):
    """POST /api/classroom/courses/create/ — only admin"""
    serializer_class = CourseWriteSerializer
    permission_classes = [IsAdminRole]

    def perform_create(self, serializer):
        # If no instructor specified, assign the requesting user
        if not serializer.validated_data.get('instructor'):
            course = serializer.save(instructor=self.request.user)
        else:
            course = serializer.save()
        if course.is_published:
            _notify_users_of_new_course(course)


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/classroom/courses/<id>/"""
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'member')
        qs = Course.objects.prefetch_related('modules__lessons')
        if role == 'admin':
            return qs
        if role == 'instructor':
            return qs.filter(instructor=user) | qs.filter(is_published=True)
        return qs.filter(is_published=True)

    def get_serializer_context(self):
        return {'request': self.request}


class CourseUpdateView(generics.UpdateAPIView):
    """PUT/PATCH /api/classroom/courses/<id>/edit/ — admin or owner instructor"""
    serializer_class = CourseWriteSerializer
    permission_classes = [IsAdminOrOwnerInstructor]
    queryset = Course.objects.all()

    def perform_update(self, serializer):
        was_published = serializer.instance.is_published
        course = serializer.save()
        if course.is_published and not was_published:
            _notify_users_of_new_course(course)


class CourseDeleteView(generics.DestroyAPIView):
    """DELETE /api/classroom/courses/<id>/delete/ — only admin"""
    permission_classes = [IsAdminRole]
    queryset = Course.objects.all()


# ─── Module views ──────────────────────────────────────────────────────────────

class ModuleCreateView(generics.CreateAPIView):
    """POST /api/classroom/courses/<course_id>/modules/ — admin or owner instructor"""
    serializer_class = ModuleWriteSerializer
    permission_classes = [IsAdminOrOwnerInstructor]

    def perform_create(self, serializer):
        course = get_object_or_404(Course, pk=self.kwargs['course_id'])
        self.check_object_permissions(self.request, course)
        serializer.save(course=course)


class ModuleUpdateView(generics.UpdateAPIView):
    """PUT/PATCH /api/classroom/modules/<id>/ — admin or owner instructor"""
    serializer_class = ModuleWriteSerializer
    permission_classes = [IsAdminOrOwnerInstructor]
    queryset = Module.objects.select_related('course')

    def get_object(self):
        obj = get_object_or_404(Module, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class ModuleDeleteView(generics.DestroyAPIView):
    """DELETE /api/classroom/modules/<id>/ — admin or owner instructor"""
    permission_classes = [IsAdminOrOwnerInstructor]
    queryset = Module.objects.select_related('course')

    def get_object(self):
        obj = get_object_or_404(Module, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


# ─── Lesson views ──────────────────────────────────────────────────────────────

class LessonDetailView(generics.RetrieveAPIView):
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]

    def get_queryset(self):
        return _visible_lessons(self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}


class LessonCreateView(generics.CreateAPIView):
    """POST /api/classroom/modules/<module_id>/lessons/ — admin or owner instructor"""
    serializer_class = LessonWriteSerializer
    permission_classes = [IsAdminOrOwnerInstructor]

    def perform_create(self, serializer):
        module = get_object_or_404(Module, pk=self.kwargs['module_id'])
        self.check_object_permissions(self.request, module)
        lesson = serializer.save(module=module)
        _notify_users_of_new_lesson(lesson)


class LessonUpdateView(generics.UpdateAPIView):
    """PUT/PATCH /api/classroom/lessons/<id>/ — admin or owner instructor"""
    serializer_class = LessonWriteSerializer
    permission_classes = [IsAdminOrOwnerInstructor]
    queryset = Lesson.objects.select_related('module__course')

    def get_object(self):
        obj = get_object_or_404(Lesson, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class LessonDeleteView(generics.DestroyAPIView):
    """DELETE /api/classroom/lessons/<id>/ — admin or owner instructor"""
    permission_classes = [IsAdminOrOwnerInstructor]
    queryset = Lesson.objects.select_related('module__course')

    def get_object(self):
        obj = get_object_or_404(Lesson, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


# ─── Progress ──────────────────────────────────────────────────────────────────

class MarkLessonCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]

    def post(self, request, lesson_pk):
        lesson = _visible_lessons(request.user).filter(pk=lesson_pk).first()
        if lesson is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        progress, created = LessonProgress.objects.get_or_create(user=request.user, lesson=lesson)
        certificate = None
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save()
            LeaderboardPoint.objects.create(
                user=request.user,
                action=LeaderboardPoint.LESSON_COMPLETED,
                reference_id=lesson.id
            )
            certificate = self._maybe_issue_certificate(request.user, lesson.module.course)

        data = {'completed': True, 'created': created, 'certificate_issued': certificate is not None}
        if certificate is not None:
            data['certificate'] = CertificateSerializer(certificate, context={'request': request}).data
        return Response(data)

    def delete(self, request, lesson_pk):
        LessonProgress.objects.filter(user=request.user, lesson_id=lesson_pk).update(completed=False, completed_at=None)
        return Response({'completed': False})

    def _maybe_issue_certificate(self, user, course):
        """Si el usuario ha completado todas las lecciones del curso, emite su certificado."""
        import logging
        logger = logging.getLogger(__name__)

        total = Lesson.objects.filter(module__course=course).count()
        if total == 0:
            return None
        done = LessonProgress.objects.filter(
            user=user, lesson__module__course=course, completed=True
        ).count()
        if done < total:
            return None

        existing = Certificate.objects.filter(user=user, course=course).first()
        if existing and existing.image:
            return None  # ya emitido correctamente

        from .certificate_gen import new_cert_id, build_for
        certificate = existing or Certificate(user=user, course=course, cert_id=new_cert_id(user, course))
        try:
            if not certificate.pk:
                certificate.save()  # needed first so issued_at (auto_now_add) is populated
            build_for(certificate)
            certificate.save()
            return certificate
        except Exception:
            logger.exception('Error generando certificado para user=%s course=%s', user.id, course.id)
            return None


# ─── Certificates ──────────────────────────────────────────────────────────────

class CertificateListView(generics.ListAPIView):
    """GET /api/classroom/certificates/ — certificados del usuario autenticado"""
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Certificate.objects.filter(user=self.request.user).select_related('course')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def get_serializer_context(self):
        return {'request': self.request}


class CertificateVerifyView(APIView):
    """GET /api/classroom/certificates/verify/<cert_id>/ — público, valida un certificado"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, cert_id):
        certificate = Certificate.objects.select_related('user', 'course').filter(cert_id=cert_id).first()
        if not certificate:
            return Response({'valid': False}, status=status.HTTP_404_NOT_FOUND)

        user = certificate.user
        student_name = (f"{user.first_name} {user.last_name}".strip()) or user.username
        return Response({
            'valid': True,
            'cert_id': certificate.cert_id,
            'student_name': student_name,
            'course_title': certificate.course.title,
            'issued_at': certificate.issued_at,
        })


# ─── Attachments ───────────────────────────────────────────────────────────────

class LessonAttachmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/classroom/lessons/<lesson_id>/attachments/"""
    serializer_class = LessonAttachmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated(), HasActiveMembership()]
        return [IsAdminOrOwnerInstructor()]

    def get_queryset(self):
        lesson = get_object_or_404(_visible_lessons(self.request.user), pk=self.kwargs['lesson_id'])
        return lesson.attachments.all()

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        from apps.classroom.models import validate_file_extension
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from django.core.exceptions import ValidationError as DjangoValidationError
        lesson = get_object_or_404(Lesson, pk=self.kwargs['lesson_id'])
        self.check_object_permissions(self.request, lesson)
        file = self.request.FILES.get('file')
        if file:
            try:
                validate_file_extension(file)
            except DjangoValidationError as e:
                raise DRFValidationError({'file': e.messages})
        name = self.request.data.get('name', '') or (file.name if file else '')
        serializer.save(lesson=lesson, uploaded_by=self.request.user, file=file, name=name)


class LessonAttachmentDownloadView(APIView):
    """GET /api/classroom/attachments/<pk>/download/ — el fichero no se sirve
    bajo /media/ público; solo se entrega aquí, comprobando membresía activa
    y que el usuario puede ver la lección (misma regla que LessonDetailView)."""
    permission_classes = [permissions.IsAuthenticated, HasActiveMembership]

    def get(self, request, pk):
        import os
        from django.http import FileResponse, Http404
        from apps.classroom.models import LessonAttachment

        attachment = get_object_or_404(
            LessonAttachment.objects.select_related('lesson__module__course'), pk=pk
        )
        if not _visible_lessons(request.user).filter(pk=attachment.lesson_id).exists():
            raise Http404
        if not attachment.file or not os.path.isfile(attachment.file.path):
            raise Http404
        return FileResponse(
            open(attachment.file.path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(attachment.file.name),
        )


class LessonAttachmentDeleteView(generics.DestroyAPIView):
    """DELETE /api/classroom/attachments/<pk>/"""
    permission_classes = [IsAdminOrOwnerInstructor]

    def get_queryset(self):
        from apps.classroom.models import LessonAttachment
        return LessonAttachment.objects.select_related('lesson__module__course')

    def get_object(self):
        from apps.classroom.models import LessonAttachment
        obj = get_object_or_404(LessonAttachment, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj.lesson)
        return obj

    def perform_destroy(self, instance):
        import os
        if instance.file:
            if os.path.isfile(instance.file.path):
                os.remove(instance.file.path)
        instance.delete()


class AdminUserProgressListView(APIView):
    """GET /classroom/admin/user-progress/ — all users with progress summary"""
    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        total_lessons = Lesson.objects.count()
        users = User.objects.all().prefetch_related('lesson_progress')
        result = []
        for u in users:
            completed = u.lesson_progress.filter(completed=True).count()
            last = (
                u.lesson_progress.filter(completed=True)
                .order_by('-completed_at')
                .values_list('completed_at', flat=True)
                .first()
            )
            result.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': u.role,
                'completed_lessons': completed,
                'total_lessons': total_lessons,
                'percent': round(completed / total_lessons * 100) if total_lessons else 0,
                'last_activity': last,
            })
        result.sort(key=lambda x: x['completed_lessons'], reverse=True)
        return Response(result)


class AdminUserProgressDetailView(APIView):
    """GET /classroom/admin/user-progress/<user_id>/ — full course/module/lesson breakdown"""
    permission_classes = [IsAdminRole]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        from django.shortcuts import get_object_or_404
        User = get_user_model()
        user = get_object_or_404(User, pk=user_id)

        completed_ids = set(
            LessonProgress.objects.filter(user=user, completed=True)
            .values_list('lesson_id', flat=True)
        )
        completed_at_map = dict(
            LessonProgress.objects.filter(user=user, completed=True)
            .values_list('lesson_id', 'completed_at')
        )

        courses = Course.objects.prefetch_related('modules__lessons').order_by('order', 'title')
        result = []
        for course in courses:
            modules_data = []
            course_done = 0
            course_total = 0
            for module in course.modules.all():
                lessons_data = []
                for lesson in module.lessons.all():
                    done = lesson.id in completed_ids
                    lessons_data.append({
                        'id': lesson.id,
                        'title': lesson.title,
                        'completed': done,
                        'completed_at': completed_at_map.get(lesson.id),
                    })
                    course_total += 1
                    if done:
                        course_done += 1
                modules_data.append({
                    'id': module.id,
                    'title': module.title,
                    'lessons': lessons_data,
                    'completed': sum(1 for l in lessons_data if l['completed']),
                    'total': len(lessons_data),
                })
            if course_total == 0:
                continue
            result.append({
                'id': course.id,
                'title': course.title,
                'modules': modules_data,
                'completed': course_done,
                'total': course_total,
                'percent': round(course_done / course_total * 100) if course_total else 0,
            })

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'courses': result,
        })


class StorageInfoView(APIView):
    """GET /api/classroom/storage/ — disk usage info for admin"""
    permission_classes = [IsAdminRole]

    def get(self, request):
        import shutil, os
        from django.conf import settings as django_settings

        disk = shutil.disk_usage('/')
        media_root = str(django_settings.MEDIA_ROOT)

        media_size = 0
        if os.path.exists(media_root):
            for dirpath, _, filenames in os.walk(media_root):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    try:
                        media_size += os.path.getsize(fp)
                    except OSError:
                        pass

        def fmt(b):
            if b < 1024:
                return f"{b} B"
            elif b < 1024**2:
                return f"{b/1024:.1f} KB"
            elif b < 1024**3:
                return f"{b/1024**2:.1f} MB"
            return f"{b/1024**3:.2f} GB"

        return Response({
            'disk_total': disk.total,
            'disk_used': disk.used,
            'disk_free': disk.free,
            'disk_total_display': fmt(disk.total),
            'disk_used_display': fmt(disk.used),
            'disk_free_display': fmt(disk.free),
            'disk_used_pct': round(disk.used / disk.total * 100, 1),
            'media_size': media_size,
            'media_size_display': fmt(media_size),
            'media_root': media_root,
        })
