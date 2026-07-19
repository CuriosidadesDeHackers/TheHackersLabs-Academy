from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.accounts.serializers import UserPublicSerializer

User = get_user_model()


class LeaderboardEntrySerializer(serializers.Serializer):
    user = UserPublicSerializer()
    points = serializers.IntegerField()
    rank = serializers.IntegerField()
