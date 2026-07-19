from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.accounts.serializers import UserPublicSerializer
from .models import Conversation, DirectMessage

User = get_user_model()


class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)

    class Meta:
        model = DirectMessage
        fields = ('id', 'sender', 'content', 'is_read', 'created_at')
        read_only_fields = ('id', 'sender', 'is_read', 'created_at')


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'other_user', 'last_message', 'unread_count', 'updated_at')

    def get_other_user(self, obj):
        request = self.context.get('request')
        other = obj.participants.exclude(id=request.user.id).first()
        return UserPublicSerializer(other, context=self.context).data if other else None

    def get_last_message(self, obj):
        msg = obj.last_message
        if not msg:
            return None
        return {'content': msg.content, 'sender_id': msg.sender_id, 'created_at': msg.created_at}

    def get_unread_count(self, obj):
        request = self.context.get('request')
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
