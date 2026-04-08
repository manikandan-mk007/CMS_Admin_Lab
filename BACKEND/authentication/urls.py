from django.urls import path
from .views import login_view, logout_view, refresh_token_view  # ✅ import new views

app_name = "accounts"

urlpatterns = [
    path(
        "login/",
        login_view,
        name="login",
    ),
    path(
        "logout/",
        logout_view,                    # ✅ added
        name="logout",
    ),
    path(
        "token/refresh/",
        refresh_token_view,             # ✅ replaced TokenRefreshView with custom one
        name="token_refresh",
    ),
]