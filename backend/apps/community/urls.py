from django.urls import path
from .views import (
    CategoryListCreateView, CategoryDetailView,
    PostListCreateView, PostDetailView,
    PinPostView, CommentListCreateView, CommentDetailView, LikeToggleView,
    PostAttachmentListCreateView, PostAttachmentDeleteView,
)

urlpatterns = [
    path('categories/', CategoryListCreateView.as_view(), name='category_list'),
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='category_detail'),
    path('posts/', PostListCreateView.as_view(), name='post_list'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('posts/<int:pk>/pin/', PinPostView.as_view(), name='post_pin'),
    path('posts/<int:post_pk>/comments/', CommentListCreateView.as_view(), name='comment_list'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
    path('posts/<int:post_pk>/like/', LikeToggleView.as_view(), name='post_like'),
    path('posts/<int:post_pk>/attachments/', PostAttachmentListCreateView.as_view(), name='post_attachment_list'),
    path('attachments/<int:pk>/', PostAttachmentDeleteView.as_view(), name='post_attachment_delete'),
]
