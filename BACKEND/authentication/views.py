from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import LoginSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data["user"]
    refresh = RefreshToken.for_user(user)

    try:
        groups = list(user.groups.values_list("name", flat=True))
    except Exception:
        groups = []

    role = groups[0] if groups else None

    response = Response(
        {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role,
                "roles": groups,
            },
            "tokens": {
                "access": str(refresh.access_token),
                # ✅ No refresh token in response body anymore
            },
        },
        status=status.HTTP_200_OK,
    )

    # ✅ Refresh token goes into HttpOnly cookie only
    response.set_cookie(
        key="refresh",
        value=str(refresh),
        httponly=True,
        secure=False,           # Change to True in production
        samesite="Strict",
        max_age=7 * 24 * 60 * 60,
    )

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    refresh_token = request.COOKIES.get("refresh")  # ✅ Read from cookie

    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()                       # ✅ Blacklist on logout
        except TokenError:
            pass

    response = Response({"message": "Logged out"}, status=status.HTTP_200_OK)
    response.delete_cookie("refresh")              # ✅ Clear cookie
    return response

@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token_view(request):
    refresh_token = request.COOKIES.get("refresh")  # ✅ Read from cookie, not body

    if not refresh_token:
        return Response({"error": "No refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = str(refresh.access_token)

        response = Response({"access": new_access}, status=status.HTTP_200_OK)

        # ✅ Rotate refresh token cookie as well
        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=False,       # Change to True in production
            samesite="Strict",
            max_age=7 * 24 * 60 * 60,
        )
        return response

    except TokenError:
        return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_401_UNAUTHORIZED)