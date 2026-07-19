from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Plan, Membership, SiteConfig, Affiliate

User = get_user_model()


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ('id', 'name', 'interval', 'price', 'description', 'is_active')


class PlanAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ('id', 'name', 'interval', 'price', 'description', 'is_active', 'stripe_price_id')


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ('stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret', 'notification_email')


class MembershipSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Membership
        fields = ('id', 'plan', 'status', 'start_date', 'end_date', 'cancel_at_period_end', 'is_active', 'created_at')
        read_only_fields = fields


# ── Admin serializers ────────────────────────────────────────────────────────

class AdminMembershipUserSerializer(serializers.ModelSerializer):
    """Minimal user info nested in membership."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class AdminMembershipSerializer(serializers.ModelSerializer):
    user = AdminMembershipUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False,
    )
    plan_detail = PlanSerializer(source='plan', read_only=True)
    plan = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.all(),
        required=False,
        allow_null=True,
    )
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Membership
        fields = (
            'id', 'user', 'user_id', 'plan', 'plan_detail',
            'status', 'start_date', 'end_date', 'cancel_at_period_end', 'is_active',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'is_active')


# ── Affiliates ────────────────────────────────────────────────────────────────

class AffiliateSerializer(serializers.ModelSerializer):
    referred_count = serializers.SerializerMethodField()
    active_count = serializers.SerializerMethodField()
    commission_estimate = serializers.SerializerMethodField()

    class Meta:
        model = Affiliate
        fields = (
            'id', 'code', 'label', 'commission_pct', 'notes', 'is_active', 'created_at',
            'referred_count', 'active_count', 'commission_estimate',
        )
        read_only_fields = ('id', 'created_at', 'referred_count', 'active_count', 'commission_estimate')

    def get_referred_count(self, obj):
        return obj.referred_users.count()

    def _active_memberships(self, obj):
        memberships = Membership.objects.filter(user__referred_by=obj).select_related('plan')
        return [m for m in memberships if m.is_active and m.plan]

    def get_active_count(self, obj):
        return len(self._active_memberships(obj))

    def get_commission_estimate(self, obj):
        total = sum(m.plan.price * obj.commission_pct / 100 for m in self._active_memberships(obj))
        return round(float(total), 2)
