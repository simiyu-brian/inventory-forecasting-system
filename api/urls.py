from django.urls import path
from .views import forecast_product

urlpatterns = [
    path("forecast/<str:product_line>/", forecast_product),
]