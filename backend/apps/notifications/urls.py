from django.urls import path
from .views import NotificationListView, MarkNotificationReadView, UnreadCountView, NotificationDeleteView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),
    path('unread/', UnreadCountView.as_view(), name='unread_count'),
    path('read/', MarkNotificationReadView.as_view(), name='mark_all_read'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='mark_read'),
    path('<int:pk>/', NotificationDeleteView.as_view(), name='notification_delete'),
]
