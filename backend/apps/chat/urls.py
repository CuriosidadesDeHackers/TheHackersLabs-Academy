from django.urls import path
from .views import ConversationListView, StartOrGetConversationView, MessageListView, UnreadMessagesCountView

urlpatterns = [
    path('', ConversationListView.as_view(), name='conversations'),
    path('start/', StartOrGetConversationView.as_view(), name='start_conversation'),
    path('<int:conv_id>/messages/', MessageListView.as_view(), name='messages'),
    path('unread/', UnreadMessagesCountView.as_view(), name='chat_unread'),
]
