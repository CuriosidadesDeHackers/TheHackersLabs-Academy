from django.urls import path
from .views import EventListCreateView, EventDetailView, EventAttendToggleView, EventNotifyAllView

urlpatterns = [
    path('', EventListCreateView.as_view(), name='event_list'),
    path('<int:pk>/', EventDetailView.as_view(), name='event_detail'),
    path('<int:pk>/attend/', EventAttendToggleView.as_view(), name='event_attend'),
    path('<int:pk>/notify/', EventNotifyAllView.as_view(), name='event_notify'),
]
