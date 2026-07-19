from django.urls import path
from .views import ResourceListCreateView, ResourceDeleteView

urlpatterns = [
    path('', ResourceListCreateView.as_view(), name='resource-list-create'),
    path('<int:pk>/', ResourceDeleteView.as_view(), name='resource-delete'),
]
