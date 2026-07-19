from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LogoutView, ProfileView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView,
    MemberListView, MemberDetailView, HeartbeatView,
    AdminUserListCreateView, AdminUserDetailView,
    AdminUserSetPasswordView, AdminUserAssignCourseView,
    AnalyticsView, SiteSettingsView, MediaUploadView,
    ThrottledTokenObtainPairView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', ThrottledTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('members/', MemberListView.as_view(), name='member_list'),
    path('members/<int:pk>/', MemberDetailView.as_view(), name='member_detail'),
    path('heartbeat/', HeartbeatView.as_view(), name='heartbeat'),
    # Admin endpoints
    path('admin/users/', AdminUserListCreateView.as_view(), name='admin_user_list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/users/<int:pk>/set-password/', AdminUserSetPasswordView.as_view(), name='admin_user_set_password'),
    path('admin/users/<int:pk>/assign-course/', AdminUserAssignCourseView.as_view(), name='admin_user_assign_course'),
    path('admin/analytics/', AnalyticsView.as_view(), name='analytics'),
    path('site-settings/',  SiteSettingsView.as_view(), name='site_settings_public'),
    path('admin/site-settings/', SiteSettingsView.as_view(), name='site_settings_admin'),
    path('admin/upload-media/', MediaUploadView.as_view(), name='upload_media'),
]
