from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class ActiveUserJWTAuthentication(JWTAuthentication):
    """Como JWTAuthentication, pero además rechaza usuarios con is_banned=True.

    SimpleJWT solo comprueba is_active al resolver el usuario del token; un
    campo custom como is_banned no tiene ningún punto de aplicación propio,
    así que un usuario baneado seguía autenticándose con normalidad en cada
    petición mientras su access token no expirase.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user.is_banned:
            raise AuthenticationFailed('Tu cuenta ha sido suspendida.', code='user_banned')
        return user
