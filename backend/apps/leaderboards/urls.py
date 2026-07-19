from django.urls import path
from .views import LeaderboardView, LevelDistributionView

urlpatterns = [
    path('', LeaderboardView.as_view(), name='leaderboard'),
    path('levels/', LevelDistributionView.as_view(), name='level_distribution'),
]
