from django.urls import path
from . import views

urlpatterns = [
    path('api/sensors/', views.create_sensor_reading, name='create_sensor_reading'),
]

