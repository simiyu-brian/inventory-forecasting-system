from django.urls import path
from . import views_dashboard

urlpatterns = [
    path("", views_dashboard.dashboard_home, name="dashboard_home"),

]