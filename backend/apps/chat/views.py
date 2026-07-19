from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Conversation, DirectMessage
from .serializers import ConversationSerializer, DirectMessageSerializer

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).prefetch_related('participants', 'messages')

    def get_serializer_context(self):
        return {'request': self.request}


class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}


class StartOrGetConversationView(APIView):
    """Get or create a conversation with another user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        other_id = request.data.get('user_id')
        try:
            other = User.objects.get(pk=other_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        if other == request.user:
            return Response({'detail': 'No puedes chatear contigo mismo.'}, status=400)

        # Find existing conversation between both users
        conversation = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=other
        ).first()

        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, other)

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response({'id': conversation.id, **serializer.data})


class MessageListView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv = self._get_conversation()
        # Mark messages as read
        conv.messages.filter(is_read=False).exclude(sender=self.request.user).update(is_read=True)
        return conv.messages.select_related('sender')

    def _get_conversation(self):
        conv_id = self.kwargs['conv_id']
        return Conversation.objects.filter(participants=self.request.user).get(pk=conv_id)

    def perform_create(self, serializer):
        conv = self._get_conversation()
        serializer.save(sender=self.request.user, conversation=conv)
        # Update conversation timestamp
        conv.save()

    def get_serializer_context(self):
        return {'request': self.request}


class UnreadMessagesCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = DirectMessage.objects.filter(
            conversation__participants=request.user,
            is_read=False
        ).exclude(sender=request.user).count()
        return Response({'unread': count})
