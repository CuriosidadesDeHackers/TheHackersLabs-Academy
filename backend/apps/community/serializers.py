from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from .models import Post, Comment, Like, Category, PostAttachment


class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'icon', 'color', 'order', 'post_count')

    def get_post_count(self, obj):
        return obj.posts.count()


class CommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(queryset=Comment.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Comment
        fields = ('id', 'post', 'author', 'parent', 'content', 'image', 'created_at', 'updated_at')
        read_only_fields = ('id', 'post', 'author', 'created_at', 'updated_at')

    def validate(self, attrs):
        content = (attrs.get('content') or '').strip()
        image = attrs.get('image') or (self.instance.image if self.instance else None)
        if not content and not image:
            raise serializers.ValidationError('El comentario necesita texto o una imagen.')
        return attrs


class PostAttachmentSerializer(serializers.ModelSerializer):
    file_url          = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model  = PostAttachment
        fields = ('id', 'name', 'file_url', 'file_size_display', 'created_at')
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file_url

    def get_file_size_display(self, obj):
        return obj.file_size_display


class PostSerializer(serializers.ModelSerializer):
    author         = UserPublicSerializer(read_only=True)
    category       = CategorySerializer(read_only=True)
    category_id    = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    likes_count    = serializers.ReadOnlyField()
    comments_count = serializers.ReadOnlyField()
    is_liked       = serializers.SerializerMethodField()
    comments       = CommentSerializer(many=True, read_only=True)
    attachments    = PostAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = (
            'id', 'author', 'category', 'category_id', 'title', 'content',
            'image', 'is_pinned', 'likes_count', 'comments_count',
            'is_liked', 'comments', 'attachments', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'author', 'is_pinned', 'created_at', 'updated_at')

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False
