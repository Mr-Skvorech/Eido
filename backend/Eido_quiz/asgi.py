"""
ASGI config for Eido_quiz project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
 
# ВАЖНО: настройки Django и django.setup() должны выполниться
# ДО импорта core.sockets — иначе любой импорт моделей Django внутри
# sockets.py упадёт с AppRegistryNotReady
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Eido_quiz.settings')
 
import django
django.setup()
 
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()
 
import socketio
from core.sockets import sio  # теперь можно безопасно использовать ORM внутри sockets.py
 
application = socketio.ASGIApp(sio, django_asgi_app)