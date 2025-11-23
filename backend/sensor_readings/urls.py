from django.urls import path
from . import views

urlpatterns = [
    path('', views.SensorReadingListCreateView.as_view(), name='sensor_readings'),
]

