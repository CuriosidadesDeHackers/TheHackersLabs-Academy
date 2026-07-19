from django.urls import path
from .views import (
    PlanListView, MyMembershipView,
    CreateCheckoutSessionView, StripeWebhookView, SimulateSubscribeView,
    CancelMembershipView, ChangePlanView,
    StripeConfigView,
    AdminPlanListView, AdminPlanDetailView,
    AdminMembershipListCreateView, AdminMembershipDetailView,
    AdminAffiliateListCreateView, AdminAffiliateDetailView,
)

urlpatterns = [
    path('plans/', PlanListView.as_view(), name='plan_list'),
    path('my/', MyMembershipView.as_view(), name='my_membership'),
    path('subscribe/', SimulateSubscribeView.as_view(), name='subscribe'),
    path('cancel/', CancelMembershipView.as_view(), name='cancel_membership'),
    path('change-plan/', ChangePlanView.as_view(), name='change_plan'),
    path('checkout/', CreateCheckoutSessionView.as_view(), name='checkout'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe_webhook'),
    # Admin — config & plans
    path('admin/stripe-config/', StripeConfigView.as_view(), name='stripe_config'),
    path('admin/plans/', AdminPlanListView.as_view(), name='admin_plan_list'),
    path('admin/plans/<int:pk>/', AdminPlanDetailView.as_view(), name='admin_plan_detail'),
    # Admin — memberships
    path('admin/memberships/', AdminMembershipListCreateView.as_view(), name='admin_membership_list'),
    path('admin/memberships/<int:pk>/', AdminMembershipDetailView.as_view(), name='admin_membership_detail'),
    # Admin — affiliates
    path('admin/affiliates/', AdminAffiliateListCreateView.as_view(), name='admin_affiliate_list'),
    path('admin/affiliates/<int:pk>/', AdminAffiliateDetailView.as_view(), name='admin_affiliate_detail'),
]
