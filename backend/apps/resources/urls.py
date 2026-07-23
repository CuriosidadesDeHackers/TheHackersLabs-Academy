from django.urls import path
from .views import ResourceListCreateView, ResourceDeleteView, ResourceDownloadView

urlpatterns = [
    path('', ResourceListCreateView.as_view(), name='resource-list-create'),
    path('<int:pk>/', ResourceDeleteView.as_view(), name='resource-delete'),
    path('<int:pk>/download/', ResourceDownloadView.as_view(), name='resource-download'),
]
