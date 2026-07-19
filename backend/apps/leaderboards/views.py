from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from apps.accounts.serializers import UserPublicSerializer
from .models import LeaderboardPoint

User = get_user_model()

LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]


def build_ranking(period_filter=None):
    qs = LeaderboardPoint.objects.all()
    if period_filter:
        qs = qs.filter(**period_filter)
    user_points = list(qs.values('user').annotate(total=Sum('points')).order_by('-total')[:50])
    top_ids = [entry['user'] for entry in user_points]
    points_map = {entry['user']: entry['total'] for entry in user_points}
    users_map = {u.pk: u for u in User.objects.filter(pk__in=top_ids)}
    result = []
    rank = 1
    for user_id in top_ids:
        if user_id in users_map:
            result.append({'rank': rank, 'user': users_map[user_id], 'points': points_map[user_id]})
            rank += 1
    return result


class LeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'all')
        now = timezone.now()
        period_filter = None
        if period == 'weekly':
            period_filter = {'created_at__gte': now - timedelta(days=7)}
        elif period == 'monthly':
            period_filter = {'created_at__gte': now - timedelta(days=30)}

        ranking = build_ranking(period_filter)
        data = []
        for entry in ranking:
            user_data = UserPublicSerializer(entry['user'], context={'request': request}).data
            data.append({'rank': entry['rank'], 'user': user_data, 'points': entry['points']})
        return Response(data)


class LevelDistributionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True)
        total = users.count()
        distribution = []
        for i in range(1, 10):
            low = LEVEL_THRESHOLDS[i - 1]
            high = LEVEL_THRESHOLDS[i] if i < 9 else 999999
            count = users.filter(points__gte=low, points__lt=high).count()
            distribution.append({
                'level': i,
                'count': count,
                'percentage': round((count / total * 100) if total else 0, 1),
            })
        return Response(distribution)
