from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.community.models import Category, Post, Comment
from apps.classroom.models import Course, Module, Lesson
from apps.events.models import Event
from apps.memberships.models import Plan, Membership
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        # Admin user
        admin, _ = User.objects.get_or_create(
            email='admin@thehackerslabs.com',
            defaults={'username': 'admin', 'role': 'admin', 'is_staff': True, 'is_superuser': True,
                      'first_name': 'Admin', 'last_name': 'TheHackersLabs', 'bio': 'Administrador de la academia.', 'points': 999}
        )
        admin.set_password('admin1234')
        admin.save()

        # Instructor
        instructor, _ = User.objects.get_or_create(
            email='instructor@thehackerslabs.com',
            defaults={'username': 'instructor1', 'role': 'instructor',
                      'first_name': 'Carlos', 'last_name': 'Hack', 'bio': 'Experto en ciberseguridad.', 'points': 500}
        )
        instructor.set_password('instructor1234')
        instructor.save()

        # Members
        members = []
        member_data = [
            ('m.rodriguez@test.com', 'mrodriguez', 'María', 'Rodríguez', 'Madrid, España', 250),
            ('j.garcia@test.com', 'jgarcia', 'Jorge', 'García', 'Barcelona, España', 150),
            ('a.lopez@test.com', 'alopez', 'Ana', 'López', 'Valencia, España', 80),
        ]
        for email, username, first, last, loc, pts in member_data:
            u, _ = User.objects.get_or_create(email=email, defaults={
                'username': username, 'first_name': first, 'last_name': last,
                'location': loc, 'points': pts, 'bio': f'Miembro de The Hackers Labs Academy. Apasionado de la ciberseguridad.'
            })
            u.set_password('member1234')
            u.save()
            members.append(u)

        # Plans
        plan_data = [
            ('Mensual', 'monthly', 19.99),
            ('Trimestral', 'quarterly', 49.99),
            ('Anual', 'annual', 149.99),
        ]
        plans = []
        for name, interval, price in plan_data:
            p, _ = Plan.objects.get_or_create(interval=interval, defaults={'name': name, 'price': price})
            plans.append(p)

        # Memberships for members
        for u in members + [instructor]:
            Membership.objects.get_or_create(user=u, defaults={
                'plan': plans[0], 'status': 'active',
                'end_date': timezone.now() + timedelta(days=30)
            })

        # Categories
        cat_data = [
            ('General', '💬', '#60a5fa', 0),
            ('Dudas', '❓', '#f59e0b', 1),
            ('Noticias', '📰', '#34d399', 2),
            ('Recursos', '📚', '#a78bfa', 3),
            ('CTF', '🚩', '#f5a623', 4),
        ]
        for name, icon, color, order in cat_data:
            Category.objects.get_or_create(name=name, defaults={'icon': icon, 'color': color, 'order': order})

        cat_general = Category.objects.get(name='General')
        cat_dudas = Category.objects.get(name='Dudas')

        # Posts
        post_data = [
            (admin, cat_general, '¡Bienvenidos a The Hackers Labs Academy!', 'Esta es vuestra comunidad de ciberseguridad. Aquí encontraréis recursos, cursos y una comunidad increíble. ¡Adelante!', True),
            (instructor, cat_general, 'Nuevo curso: Hacking Web', 'Acabo de publicar el módulo de SQL Injection en el curso de Hacking Web. ¡A por ello!', False),
            (members[0], cat_dudas, 'Duda sobre el eJPT', '¿Alguien tiene recomendaciones para preparar el examen eJPT? Llevo dos semanas practicando en TryHackMe.', False),
            (members[1], cat_general, 'Mi primer CTF', 'Acabo de participar en mi primer CTF y aunque no gané aprendí un montón. ¡Os animo a todos a participar!', False),
        ]
        posts = []
        for author, cat, title, content, pinned in post_data:
            p, _ = Post.objects.get_or_create(author=author, title=title, defaults={
                'category': cat, 'content': content, 'is_pinned': pinned
            })
            posts.append(p)

        # Comments
        Comment.objects.get_or_create(post=posts[2], author=instructor, defaults={
            'content': 'Para el eJPT te recomiendo el curso de TCM Security y practicar en TryHackMe. ¡Mucho ánimo!'
        })
        Comment.objects.get_or_create(post=posts[2], author=members[1], defaults={
            'content': 'Yo lo saqué el mes pasado. Lo clave es la práctica constante. ¡Tú puedes!'
        })

        # Courses
        course_data = [
            ('Iniciación al Bug Bounty', 'bug-bounty-intro', 'Aprende los fundamentos del Bug Bounty hunting desde cero.', True),
            ('Preparación eJPT', 'ejpt-prep', 'Todo lo necesario para superar la certificación eJPT de INE Security.', True),
            ('Hacking Web', 'hacking-web', 'Técnicas avanzadas de hacking web: XSS, SQLi, CSRF, SSRF y más.', True),
            ('LinkedIn para Profesionales', 'linkedin-profesionales', 'Optimiza tu perfil de LinkedIn y consigue trabajo en ciberseguridad.', False),
            ('Vibe Coding', 'vibe-coding', 'Aprende a programar con IA. Python, scripting y automatización.', False),
            ('Fundamentos de Azure', 'fundamentos-azure', 'Introducción a la nube de Microsoft Azure para profesionales de seguridad.', True),
        ]
        for title, slug, desc, premium in course_data:
            c, _ = Course.objects.get_or_create(slug=slug, defaults={
                'title': title, 'description': desc,
                'short_description': desc[:100],
                'instructor': instructor,
                'is_published': True,
                'is_premium': premium,
            })
            mod, _ = Module.objects.get_or_create(course=c, order=1, defaults={'title': 'Módulo 1: Introducción'})
            for i, lesson_title in enumerate(['Bienvenida al curso', 'Conceptos básicos', 'Herramientas esenciales'], 1):
                Lesson.objects.get_or_create(module=mod, order=i, defaults={
                    'title': lesson_title,
                    'content_type': 'video',
                    'video_url': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    'duration_minutes': random.randint(5, 30),
                    'is_free_preview': i == 1,
                })

        # Events
        event_data = [
            ('Webinar: Bug Bounty desde cero', 'Sesión introductoria al Bug Bounty con preguntas en directo.', 'webinar', timezone.now() + timedelta(days=7)),
            ('CTF Mensual de The Hackers Labs', 'Competición mensual de CTF para todos los miembros.', 'ctf', timezone.now() + timedelta(days=14)),
            ('Workshop: Burp Suite avanzado', 'Aprende a usar Burp Suite a nivel avanzado.', 'workshop', timezone.now() + timedelta(days=21)),
        ]
        for title, desc, etype, start in event_data:
            Event.objects.get_or_create(title=title, defaults={
                'description': desc, 'event_type': etype,
                'start_datetime': start,
                'end_datetime': start + timedelta(hours=2),
                'created_by': admin,
            })

        self.stdout.write(self.style.SUCCESS('OK Seed data created successfully!'))
        self.stdout.write('Admin: admin@thehackerslabs.com / admin1234')
        self.stdout.write('Instructor: instructor@thehackerslabs.com / instructor1234')
        self.stdout.write('Members: m.rodriguez@test.com, j.garcia@test.com, a.lopez@test.com / member1234')
