from django.urls import path
from . import views

urlpatterns = [
    path('', views.create_sensor_reading, name='create_sensor_reading'),
]

