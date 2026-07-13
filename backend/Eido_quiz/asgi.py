"""
ASGI config for Eido_quiz project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
import socketio

# Импортируем sio из твоего приложения core
from core.sockets import sio 

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Eido_quiz.settings')

django_asgi_app = get_asgi_application()

application = socketio.ASGIApp(sio, django_asgi_app)