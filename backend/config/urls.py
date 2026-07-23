import os
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/auth/', include('apps.accounts.urls')),
    path('api/community/', include('apps.community.urls')),
    path('api/classroom/', include('apps.classroom.urls')),
    path('api/events/', include('apps.events.urls')),
    path('api/memberships/', include('apps.memberships.urls')),
    path('api/leaderboards/', include('apps.leaderboards.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/resources/', include('apps.resources.urls')),
]

# Solo se sirven públicamente bajo /media/ las subcarpetas de contenido no
# gateado (avatares, banners, imágenes de comunidad, certificados —
# CertificateVerifyView es público a propósito). El contenido premium
# ('resources/' y 'attachments/lessons/') NO se registra aquí: se sirve
# exclusivamente a través de vistas autenticadas (ResourceDownloadView,
# LessonAttachmentDownloadView) que exigen IsAuthenticated + HasActiveMembership.
_PUBLIC_MEDIA_SUBDIRS = ['avatars', 'site', 'courses', 'certificates', 'events', 'posts', 'comments', 'post_attachments']
for _subdir in _PUBLIC_MEDIA_SUBDIRS:
    urlpatterns += static(
        settings.MEDIA_URL + _subdir + '/',
        document_root=os.path.join(settings.MEDIA_ROOT, _subdir),
    )
