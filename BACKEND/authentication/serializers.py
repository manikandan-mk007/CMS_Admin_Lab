import re

from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=150,
        error_messages={
            "required": "Username is required.",
            "blank": "Username is required.",
            "max_length": "Username must not exceed 150 characters.",
            "invalid": "Enter a valid username.",
        },
    )
    password = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=False,
        write_only=True,
        style={"input_type": "password"},
        error_messages={
            "required": "Password is required.",
            "blank": "Password is required.",
            "invalid": "Enter a valid password.",
        },
    )

    def validate_username(self, value):
        if not isinstance(value, str):
            raise serializers.ValidationError("Username must be a valid string.")

        value = value.strip()

        if not value:
            raise serializers.ValidationError("Username is required.")

        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")

        if len(value) > 150:
            raise serializers.ValidationError("Username must not exceed 150 characters.")

        if not re.fullmatch(r"^[A-Za-z0-9._@+-]+$", value):
            raise serializers.ValidationError(
                "Username may contain only letters, numbers, and ./_/@/+/- characters."
            )

        user = User.objects.filter(username__iexact=value).first()
        if not user:
            raise serializers.ValidationError("User not found.")

        self.context["auth_user_obj"] = user
        return value

    def validate_password(self, value):
        if not isinstance(value, str):
            raise serializers.ValidationError("Password must be a valid string.")

        if value == "":
            raise serializers.ValidationError("Password is required.")

        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")

        if len(value) > 128:
            raise serializers.ValidationError("Password must not exceed 128 characters.")

        return value

    def validate(self, attrs):
        username = attrs.get("username", "").strip()
        password = attrs.get("password")

        user = self.context.get("auth_user_obj")

        # Defensive fallback in case field validator is bypassed for any reason
        if user is None:
            user = User.objects.filter(username__iexact=username).first()
            if not user:
                raise serializers.ValidationError({
                    "username": ["User not found."]
                })

        authenticated_user = authenticate(username=user.username, password=password)

        if authenticated_user is None:
            raise serializers.ValidationError({
                "password": ["Incorrect password."]
            })

        if not authenticated_user.is_active:
            raise serializers.ValidationError({
                "username": ["User account is inactive."]
            })

        attrs["user"] = authenticated_user
        return attrs