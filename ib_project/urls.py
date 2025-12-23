# ib_project/urls.py
import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .health import health_check


def api_root(request):
    """Simple API root endpoint"""
    return JsonResponse({
        'message': 'Mentara API',
        'endpoints': {
            'admin': '/admin/',
            'auth': {
                'login': '/api/auth/login/',
                'register': '/api/auth/register/',
                'logout': '/api/auth/logout/',
                'token_refresh': '/api/auth/token/refresh/',
            },
            'exams': '/api/exams/',
            'topics': '/api/topics/',
            'questions': '/api/questions/',
            'attempts': '/api/attempts/',
        },
        'frontend': 'React app should run on port 3000/3002',
        'note': 'Backend is API-only. Use Django Admin for data management.',
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # API root
    path('', api_root, name='api_root'),
    path('api/', api_root, name='api_root_explicit'),

    # Health
    path('api/health/', health_check, name='health_check'),

    # API routes
    path('api/', include('exams.urls')),
    path('api/', include('accounts.urls')),  # Includes all accounts API routes
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Legacy Django template routes (kept for backward compatibility, but not used)
    # These will be replaced by React frontend
    path('dashboard/', include(('dashboard.urls', 'dashboard'), namespace='dashboard')),
    path('quizzes/', include(('quizzes.urls', 'quizzes'), namespace='quizzes')),
    path('questionpapers/', include(('questionpapers.urls', 'questionpapers'), namespace='questionpapers')),
]

# Serve media files.
# In production this is not ideal for high-traffic deployments, but it unblocks
# showing uploaded question images/PDFs on Render when not using S3.
serve_media = os.getenv('SERVE_MEDIA', 'True') == 'True'
use_s3 = bool(getattr(settings, 'USE_S3', False))
if not use_s3 and (settings.DEBUG or serve_media):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
