from django.urls import path
from .views import (
    CourseListView, CourseCreateView, CourseDetailView, CourseUpdateView, CourseDeleteView,
    ModuleCreateView, ModuleUpdateView, ModuleDeleteView,
    LessonDetailView, LessonCreateView, LessonUpdateView, LessonDeleteView,
    MarkLessonCompleteView,
    LessonAttachmentListCreateView, LessonAttachmentDeleteView, LessonAttachmentDownloadView, StorageInfoView,
    AdminUserProgressListView, AdminUserProgressDetailView,
    CertificateListView, CertificateVerifyView,
)

urlpatterns = [
    # Courses
    path('courses/', CourseListView.as_view(), name='course_list'),
    path('courses/create/', CourseCreateView.as_view(), name='course_create'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course_detail'),
    path('courses/<int:pk>/edit/', CourseUpdateView.as_view(), name='course_update'),
    path('courses/<int:pk>/delete/', CourseDeleteView.as_view(), name='course_delete'),

    # Modules (nested under course)
    path('courses/<int:course_id>/modules/', ModuleCreateView.as_view(), name='module_create'),
    path('modules/<int:pk>/', ModuleUpdateView.as_view(), name='module_update'),
    path('modules/<int:pk>/delete/', ModuleDeleteView.as_view(), name='module_delete'),

    # Lessons (nested under module)
    path('modules/<int:module_id>/lessons/', LessonCreateView.as_view(), name='lesson_create'),
    path('lessons/<int:pk>/', LessonDetailView.as_view(), name='lesson_detail'),
    path('lessons/<int:pk>/edit/', LessonUpdateView.as_view(), name='lesson_update'),
    path('lessons/<int:pk>/delete/', LessonDeleteView.as_view(), name='lesson_delete'),
    path('lessons/<int:lesson_pk>/complete/', MarkLessonCompleteView.as_view(), name='lesson_complete'),

    # Attachments
    path('lessons/<int:lesson_id>/attachments/', LessonAttachmentListCreateView.as_view(), name='lesson_attachments'),
    path('attachments/<int:pk>/', LessonAttachmentDeleteView.as_view(), name='attachment_delete'),
    path('attachments/<int:pk>/download/', LessonAttachmentDownloadView.as_view(), name='attachment_download'),

    # Certificates
    path('certificates/', CertificateListView.as_view(), name='certificate_list'),
    path('certificates/verify/<str:cert_id>/', CertificateVerifyView.as_view(), name='certificate_verify'),

    # Storage info (admin only)
    path('storage/', StorageInfoView.as_view(), name='storage_info'),

    # Admin — user progress
    path('admin/user-progress/', AdminUserProgressListView.as_view(), name='admin_user_progress_list'),
    path('admin/user-progress/<int:user_id>/', AdminUserProgressDetailView.as_view(), name='admin_user_progress_detail'),
]
