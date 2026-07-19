from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    ref = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password2', 'first_name', 'last_name', 'ref')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data):
        from apps.memberships.models import Affiliate
        validated_data.pop('password2')
        ref_code = validated_data.pop('ref', '').strip()
        user = User.objects.create_user(**validated_data)
        if ref_code:
            affiliate = Affiliate.objects.filter(code__iexact=ref_code, is_active=True).first()
            if affiliate:
                user.referred_by = affiliate
                user.save(update_fields=['referred_by'])
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    level = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()
    is_online = serializers.ReadOnlyField()
    membership_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name',
            'role', 'avatar_url', 'bio', 'location', 'website',
            'twitter', 'linkedin', 'github', 'points', 'level',
            'is_banned', 'date_joined', 'membership_status', 'is_online',
        )
        read_only_fields = ('id', 'role', 'points', 'level', 'date_joined', 'is_banned', 'is_online')

    def get_membership_status(self, obj):
        try:
            return obj.membership.status
        except Exception:
            return None


class UserPrivateSerializer(UserPublicSerializer):
    class Meta(UserPublicSerializer.Meta):
        fields = UserPublicSerializer.Meta.fields + ('email', 'is_active', 'avatar')
        read_only_fields = UserPublicSerializer.Meta.read_only_fields + ('email',)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


# ── Admin serializers ────────────────────────────────────────────────────────

class AdminUserSerializer(serializers.ModelSerializer):
    """Full-access serializer for admin user management."""
    level = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()
    membership_status = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'avatar_url', 'bio', 'location', 'website',
            'twitter', 'linkedin', 'github', 'points', 'level',
            'is_banned', 'ban_reason', 'is_active', 'date_joined',
            'membership_status', 'password',
        )
        read_only_fields = ('id', 'level', 'date_joined')

    def get_membership_status(self, obj):
        try:
            return obj.membership.status
        except Exception:
            return None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('password', None)
        return super().update(instance, validated_data)


class AdminSetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, validators=[validate_password])
