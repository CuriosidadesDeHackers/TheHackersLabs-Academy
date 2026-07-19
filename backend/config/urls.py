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
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
