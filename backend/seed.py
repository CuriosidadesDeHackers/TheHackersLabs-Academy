"""
Script de seed para poblar la base de datos con datos de ejemplo.
Ejecutar con: python manage.py shell < seed.py
"""
import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.contrib.auth import get_user_model
from apps.community.models import Category, Post, Comment, Like
from apps.classroom.models import Course, Module, Lesson, LessonProgress
from apps.events.models import Event, EventAttendee
from apps.memberships.models import Plan, Membership
from apps.chat.models import Conversation, DirectMessage
from apps.notifications.models import Notification
from apps.leaderboards.models import LeaderboardPoint

User = get_user_model()

print("🌱 Iniciando seed...")

# ─── USUARIOS ────────────────────────────────────────────────────────────────
users_data = [
    {"email": "carlos@thehackerslabs.com",   "username": "carlos_dev",   "role": "instructor", "bio": "Desarrollador fullstack con 10 años de experiencia en Python y React.", "location": "Madrid", "points": 3200},
    {"email": "ana@thehackerslabs.com",      "username": "ana_infosec",  "role": "instructor", "bio": "Experta en ciberseguridad ofensiva y defensiva. OSCP certificada.", "location": "Barcelona", "points": 2800},
    {"email": "luis@thehackerslabs.com",     "username": "luis_hacker",  "role": "member",     "bio": "Apasionado del hacking ético y los CTFs.", "location": "Valencia", "points": 1500},
    {"email": "maria@thehackerslabs.com",    "username": "maria_code",   "role": "member",     "bio": "Estudiante de ingeniería informática. Me encanta aprender programación.", "location": "Sevilla", "points": 900},
    {"email": "pedro@thehackerslabs.com",    "username": "pedro_net",    "role": "member",     "bio": "Administrador de sistemas y entusiasta de las redes.", "location": "Bilbao", "points": 1200},
    {"email": "sofia@thehackerslabs.com",    "username": "sofia_ml",     "role": "member",     "bio": "Data scientist y fan del machine learning aplicado a la seguridad.", "location": "Zaragoza", "points": 650},
    {"email": "miguel@thehackerslabs.com",   "username": "miguel_ops",   "role": "member",     "bio": "DevOps engineer. Docker, K8s y pipelines son mi día a día.", "location": "Málaga", "points": 2100},
    {"email": "laura@thehackerslabs.com",    "username": "laura_re",     "role": "member",     "bio": "Reverse engineering y análisis de malware.", "location": "Granada", "points": 1800},
]

users = []
for ud in users_data:
    u, created = User.objects.get_or_create(
        email=ud["email"],
        defaults={
            "username": ud["username"],
            "role": ud["role"],
            "bio": ud["bio"],
            "location": ud["location"],
            "points": ud["points"],
            "is_active": True,
        }
    )
    if created:
        u.set_password("password123")
        u.save()
    users.append(u)

instructors = [u for u in users if u.role == "instructor"]
members = [u for u in users if u.role == "member"]
admin = User.objects.filter(email="admin@admin.es").first()
all_users = users + ([admin] if admin else [])

print(f"  ✓ {len(users)} usuarios creados/existentes")

# ─── PLANES ───────────────────────────────────────────────────────────────────
plans_data = [
    {"name": "Básico",    "interval": "monthly",   "price": 9.99,   "description": "Acceso a cursos gratuitos y comunidad."},
    {"name": "Pro",       "interval": "monthly",   "price": 29.99,  "description": "Acceso completo a todos los cursos y eventos."},
    {"name": "Pro Anual", "interval": "annual",    "price": 249.99, "description": "Acceso completo anual con descuento."},
    {"name": "Lifetime",  "interval": "lifetime",  "price": 499.99, "description": "Acceso de por vida a todo el contenido."},
]
plans = []
for pd in plans_data:
    p, _ = Plan.objects.get_or_create(name=pd["name"], defaults=pd)
    plans.append(p)

print(f"  ✓ {len(plans)} planes creados")

# ─── MEMBRESÍAS ───────────────────────────────────────────────────────────────
membership_users = random.sample(all_users, min(6, len(all_users)))
for i, u in enumerate(membership_users):
    if not hasattr(u, 'membership') or not Membership.objects.filter(user=u).exists():
        plan = plans[i % len(plans)]
        Membership.objects.create(
            user=u,
            plan=plan,
            status="active" if plan.interval != "lifetime" else "lifetime",
            start_date=timezone.now() - timedelta(days=random.randint(1, 180)),
            end_date=timezone.now() + timedelta(days=30) if plan.interval == "monthly" else None,
        )

print("  ✓ Membresías creadas")

# ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
categories_data = [
    {"name": "General",          "icon": "💬", "color": "#60a5fa", "description": "Conversaciones generales de la comunidad."},
    {"name": "Hacking Ético",    "icon": "🔐", "color": "#f87171", "description": "Técnicas, herramientas y recursos de hacking ético."},
    {"name": "Programación",     "icon": "💻", "color": "#34d399", "description": "Python, JavaScript, Bash y más lenguajes."},
    {"name": "CTF & Retos",      "icon": "🏴", "color": "#a78bfa", "description": "Write-ups y discusiones sobre CTFs."},
    {"name": "Noticias",         "icon": "📰", "color": "#fbbf24", "description": "Últimas noticias del mundo de la ciberseguridad."},
    {"name": "Recursos",         "icon": "📚", "color": "#fb923c", "description": "Herramientas, libros y recursos recomendados."},
    {"name": "Empleo & Carrera", "icon": "💼", "color": "#38bdf8", "description": "Ofertas de trabajo y consejos de carrera."},
]
categories = []
for i, cd in enumerate(categories_data):
    cat, _ = Category.objects.get_or_create(name=cd["name"], defaults={**cd, "order": i})
    categories.append(cat)

print(f"  ✓ {len(categories)} categorías creadas")

# ─── POSTS Y COMENTARIOS ──────────────────────────────────────────────────────
posts_data = [
    {"title": "¡Bienvenidos a la comunidad The Hackers Labs! 🎉", "content": "Hola a todos! Estoy muy emocionado de arrancar esta comunidad de ciberseguridad en español. Aquí podremos compartir conocimiento, resolver dudas y crecer juntos. ¡Presentaos en los comentarios!", "category": "General", "pinned": True},
    {"title": "Write-up: HackTheBox - Monteverde", "content": "Acabo de completar Monteverde en HTB. Es una máquina Windows centrada en Azure AD. El vector inicial es enum de SMB sin credenciales, luego escalada de privilegios abusando de Azure AD Connect. Podéis ver el write-up completo abajo. ¿Alguien más la ha hecho?", "category": "CTF & Retos", "pinned": False},
    {"title": "Recurso: Awesome Hacking - lista curada de herramientas", "content": "Os comparto esta increíble lista de recursos y herramientas de hacking ético. Cubre desde reconocimiento hasta post-explotación. Completísima para aprender y repasar. https://github.com/Hack-with-Github/Awesome-Hacking", "category": "Recursos", "pinned": False},
    {"title": "¿Python o Bash para automatizar pentesting?", "content": "Estoy pensando en mejorar mis scripts de automatización y me surge la duda: ¿preferís Python o Bash para vuestros scripts de pentesting? Yo llevo usando Bash mucho tiempo pero Python parece más potente para cosas complejas.", "category": "Programación", "pinned": False},
    {"title": "CVE-2024-3400: Crítica en PAN-OS de Palo Alto", "content": "Ayer se publicó una vulnerabilidad crítica (CVSS 10) en PAN-OS. Permite ejecución remota de código sin autenticación a través del GlobalProtect Gateway. Si tenéis Palo Alto en vuestra infraestructura, actualizad YA. Detalles técnicos en el artículo.", "category": "Noticias", "pinned": False},
    {"title": "Mi experiencia con la certificación OSCP", "content": "Después de 6 meses de preparación, ¡aprobé el OSCP! Quiero compartir mi experiencia, los recursos que usé y los consejos que me hubieran gustado saber al principio. El laboratorio de PWK es brutal pero muy formativo.", "category": "Empleo & Carrera", "pinned": False},
    {"title": "Script en Python para escaneo de subdominios", "content": "He escrito un script en Python que combina subfinder, amass y httpx para hacer un reconocimiento completo de subdominios. Incluye resolución DNS, detección de servicios web y exportación a JSON. ¿Qué otras herramientas usáis vosotros?", "category": "Programación", "pinned": False},
    {"title": "Reto semanal #12: SQL Injection avanzado", "content": "Esta semana el reto es explotar una inyección SQL ciega (blind SQLi) en un entorno vulnerable que he montado. Tenéis hasta el domingo. El primero en resolverlo y subir el write-up se lleva 500 puntos extra.", "category": "CTF & Retos", "pinned": True},
    {"title": "Introducción al análisis de malware con Ghidra", "content": "Ghidra es la herramienta gratuita de la NSA para ingeniería inversa. En este post explico cómo configurarlo, los plugins esenciales y cómo empezar a analizar un sample de ransomware real (en entorno controlado).", "category": "Hacking Ético", "pinned": False},
    {"title": "Oferta de trabajo: Pentest Junior en Madrid", "content": "Empresa de consultoría busca pentester junior en Madrid. Requisitos: conocimientos de redes, OWASP, herramientas básicas (Nmap, Burp, Metasploit). Se valora OSCP o eJPT. Contrato indefinido. Salario según convenio. ¿Alguien interesado?", "category": "Empleo & Carrera", "pinned": False},
    {"title": "¿Qué VPN usáis para vuestros labs?", "content": "Estoy montando un lab de hacking en casa y busco recomendaciones de VPN para aislar el tráfico. Actualmente uso WireGuard pero estoy pensando en cambiar. ¿Alguna recomendación?", "category": "General", "pinned": False},
    {"title": "Libro recomendado: 'The Web Application Hacker's Handbook'", "content": "Si os dedicáis al pentesting web, este libro es una biblia. Cubre desde la metodología hasta técnicas avanzadas de explotación. Aunque es de 2011, los fundamentos siguen siendo completamente válidos.", "category": "Recursos", "pinned": False},
]

cat_map = {c.name: c for c in categories}
created_posts = []
for i, pd in enumerate(posts_data):
    author = all_users[i % len(all_users)]
    cat = cat_map.get(pd["category"])
    post, created = Post.objects.get_or_create(
        title=pd["title"],
        defaults={
            "author": author,
            "category": cat,
            "content": pd["content"],
            "is_pinned": pd["pinned"],
        }
    )
    created_posts.append(post)

print(f"  ✓ {len(created_posts)} posts creados")

# Comentarios
comments_texts = [
    "Excelente aportación, muchas gracias por compartirlo con la comunidad!",
    "Lo he probado y funciona perfectamente. Muy bien explicado.",
    "¿Tienes algún recurso adicional sobre este tema? Me gustaría profundizar más.",
    "Justo lo que estaba buscando. Llevaba semanas dando vueltas a este problema.",
    "Muy buen post! Yo añadiría también revisar los permisos de directorio después del paso 3.",
    "Totalmente de acuerdo. Lo básico bien aprendido es la mejor base.",
    "Acabo de intentarlo y me da un error en el paso 2. ¿Alguien más tiene el mismo problema?",
    "Genial, lo comparto con mi equipo. Nos viene muy bien para el proyecto actual.",
    "¡Gran trabajo! Sería interesante ver una segunda parte con casos más avanzados.",
    "He tardado 2 semanas en entender esto y tú lo explicas en 5 párrafos. Chapeau.",
    "Muy interesante. ¿Lo has probado también en entornos Windows?",
    "Perfecto para principiantes. Lo recomendaré en el próximo meetup.",
]

for post in created_posts:
    num_comments = random.randint(2, 5)
    commenters = random.sample(all_users, min(num_comments, len(all_users)))
    for u in commenters:
        if u != post.author:
            Comment.objects.get_or_create(
                post=post,
                author=u,
                defaults={"content": random.choice(comments_texts)}
            )

print("  ✓ Comentarios creados")

# Likes
for post in created_posts:
    likers = random.sample(all_users, random.randint(1, min(6, len(all_users))))
    for u in likers:
        Like.objects.get_or_create(post=post, user=u)

print("  ✓ Likes creados")

# ─── CURSOS ───────────────────────────────────────────────────────────────────
courses_data = [
    {
        "title": "Hacking Ético desde Cero",
        "slug": "hacking-etico-desde-cero",
        "description": "Aprende los fundamentos del hacking ético y el pentesting desde cero. Cubriremos reconocimiento, escaneo, explotación y post-explotación con herramientas reales en laboratorios prácticos.",
        "short_description": "Curso completo de pentesting para principiantes.",
        "instructor": instructors[0] if instructors else admin,
        "is_published": True,
        "is_premium": False,
        "modules": [
            {"title": "Introducción y Conceptos Básicos", "lessons": [
                {"title": "¿Qué es el hacking ético?", "type": "video", "duration": 12},
                {"title": "Terminología y conceptos clave", "type": "text", "duration": 8},
                {"title": "Entorno de laboratorio con VirtualBox", "type": "video", "duration": 25},
            ]},
            {"title": "Reconocimiento y OSINT", "lessons": [
                {"title": "Google Dorks avanzados", "type": "video", "duration": 18},
                {"title": "Recon-ng y theHarvester", "type": "video", "duration": 22},
                {"title": "Shodan: el buscador de hackers", "type": "video", "duration": 15},
                {"title": "Práctica: OSINT de un objetivo real", "type": "text", "duration": 30},
            ]},
            {"title": "Escaneo y Enumeración", "lessons": [
                {"title": "Nmap desde principiante a avanzado", "type": "video", "duration": 35},
                {"title": "Enumeración de servicios web", "type": "video", "duration": 20},
                {"title": "Nikto y dirbusting", "type": "video", "duration": 18},
            ]},
            {"title": "Explotación", "lessons": [
                {"title": "Introducción a Metasploit", "type": "video", "duration": 28},
                {"title": "Explotación manual vs automatizada", "type": "text", "duration": 15},
                {"title": "Lab: Explotación de Metasploitable", "type": "video", "duration": 45},
            ]},
        ]
    },
    {
        "title": "Python para Ciberseguridad",
        "slug": "python-ciberseguridad",
        "description": "Domina Python aplicado a la seguridad informática. Aprende a escribir tus propios exploits, herramientas de reconocimiento, scripts de automatización y parsers de datos.",
        "short_description": "Programa herramientas de seguridad con Python.",
        "instructor": instructors[0] if instructors else admin,
        "is_published": True,
        "is_premium": True,
        "modules": [
            {"title": "Fundamentos de Python para Seguridad", "lessons": [
                {"title": "Entorno Python y librerías esenciales", "type": "video", "duration": 20},
                {"title": "Manejo de sockets y redes", "type": "video", "duration": 30},
                {"title": "Scripting con Scapy", "type": "video", "duration": 35},
            ]},
            {"title": "Herramientas de Reconocimiento", "lessons": [
                {"title": "Port scanner en Python", "type": "video", "duration": 25},
                {"title": "Web scraper para OSINT", "type": "video", "duration": 28},
                {"title": "Automatización con requests y BeautifulSoup", "type": "video", "duration": 22},
            ]},
            {"title": "Explotación y Post-explotación", "lessons": [
                {"title": "Buffer overflow básico en Python", "type": "video", "duration": 40},
                {"title": "Reverse shell en Python", "type": "video", "duration": 30},
                {"title": "Keylogger y RAT básico", "type": "video", "duration": 35},
            ]},
        ]
    },
    {
        "title": "Seguridad Web: OWASP Top 10",
        "slug": "seguridad-web-owasp",
        "description": "Aprende a identificar y explotar las 10 vulnerabilidades web más comunes según OWASP. Desde SQL Injection hasta SSRF, con laboratorios prácticos usando DVWA y WebGoat.",
        "short_description": "Domina las vulnerabilidades OWASP Top 10.",
        "instructor": instructors[1] if len(instructors) > 1 else instructors[0] if instructors else admin,
        "is_published": True,
        "is_premium": True,
        "modules": [
            {"title": "Introducción a OWASP", "lessons": [
                {"title": "¿Qué es OWASP y por qué importa?", "type": "text", "duration": 10},
                {"title": "Configuración de DVWA y BurpSuite", "type": "video", "duration": 20},
            ]},
            {"title": "Inyecciones", "lessons": [
                {"title": "SQL Injection: teoría y práctica", "type": "video", "duration": 45},
                {"title": "SQLMap: automatizando SQLi", "type": "video", "duration": 25},
                {"title": "Command Injection y SSTI", "type": "video", "duration": 30},
            ]},
            {"title": "XSS y CSRF", "lessons": [
                {"title": "Cross-Site Scripting (XSS) completo", "type": "video", "duration": 35},
                {"title": "CSRF: ataques y defensas", "type": "video", "duration": 22},
                {"title": "Bypass de WAF", "type": "video", "duration": 28},
            ]},
            {"title": "Vulnerabilidades Avanzadas", "lessons": [
                {"title": "SSRF y XXE", "type": "video", "duration": 32},
                {"title": "Broken Access Control", "type": "video", "duration": 25},
                {"title": "Insecure Deserialization", "type": "video", "duration": 30},
            ]},
        ]
    },
    {
        "title": "Análisis de Malware con Ghidra",
        "slug": "analisis-malware-ghidra",
        "description": "Introduce te al mundo del reverse engineering y el análisis de malware usando Ghidra, la herramienta gratuita de la NSA. Analizaremos muestras reales en entornos controlados.",
        "short_description": "Reverse engineering y malware analysis con Ghidra.",
        "instructor": instructors[1] if len(instructors) > 1 else instructors[0] if instructors else admin,
        "is_published": True,
        "is_premium": True,
        "modules": [
            {"title": "Introducción al Reverse Engineering", "lessons": [
                {"title": "¿Qué es el RE y para qué sirve?", "type": "text", "duration": 8},
                {"title": "Instalación y configuración de Ghidra", "type": "video", "duration": 15},
                {"title": "La interfaz de Ghidra explicada", "type": "video", "duration": 20},
            ]},
            {"title": "Análisis Estático", "lessons": [
                {"title": "Análisis de binarios PE y ELF", "type": "video", "duration": 30},
                {"title": "Identificación de strings y imports", "type": "video", "duration": 25},
                {"title": "Decompilación y análisis de funciones", "type": "video", "duration": 35},
            ]},
            {"title": "Análisis de Malware Real", "lessons": [
                {"title": "Análisis de un troyano simple", "type": "video", "duration": 45},
                {"title": "Análisis de ransomware", "type": "video", "duration": 50},
                {"title": "Escribir firmas YARA", "type": "video", "duration": 28},
            ]},
        ]
    },
    {
        "title": "Redes y Protocolos para Hackers",
        "slug": "redes-protocolos-hackers",
        "description": "Entiende TCP/IP, DNS, HTTP, ARP y otros protocolos desde la perspectiva del atacante. Aprende ataques de red como MITM, ARP spoofing, sniffing y más.",
        "short_description": "Protocolos de red explicados para hackers.",
        "instructor": instructors[0] if instructors else admin,
        "is_published": False,
        "is_premium": True,
        "modules": [
            {"title": "Fundamentos de Redes", "lessons": [
                {"title": "Modelo OSI y TCP/IP", "type": "text", "duration": 15},
                {"title": "Wireshark: captura y análisis de tráfico", "type": "video", "duration": 30},
            ]},
            {"title": "Ataques de Red", "lessons": [
                {"title": "ARP Spoofing y MITM", "type": "video", "duration": 35},
                {"title": "DNS Poisoning", "type": "video", "duration": 25},
                {"title": "Sniffing de credenciales", "type": "video", "duration": 20},
            ]},
        ]
    },
]

created_courses = []
for cd in courses_data:
    modules_data = cd.pop("modules")
    course, _ = Course.objects.get_or_create(slug=cd["slug"], defaults=cd)
    created_courses.append(course)
    for mi, md in enumerate(modules_data):
        lessons_data = md.pop("lessons")
        module, _ = Module.objects.get_or_create(course=course, title=md["title"], defaults={"order": mi})
        for li, ld in enumerate(lessons_data):
            Lesson.objects.get_or_create(
                module=module,
                title=ld["title"],
                defaults={
                    "content_type": ld["type"],
                    "duration_minutes": ld["duration"],
                    "order": li,
                    "is_free_preview": li == 0,
                    "content": f"Contenido de la lección: {ld['title']}",
                }
            )

print(f"  ✓ {len(created_courses)} cursos creados con módulos y lecciones")

# Progreso de lecciones
all_lessons = list(Lesson.objects.all())
for user in members[:5]:
    completed = random.sample(all_lessons, min(random.randint(3, 12), len(all_lessons)))
    for lesson in completed:
        LessonProgress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={"completed": True, "completed_at": timezone.now() - timedelta(days=random.randint(1, 60))}
        )

print("  ✓ Progreso de lecciones creado")

# ─── EVENTOS ──────────────────────────────────────────────────────────────────
now = timezone.now()
events_data = [
    {"title": "Webinar: Introducción al Bug Bounty", "description": "Aprende cómo empezar en el mundo del Bug Bounty. Hablaremos de plataformas (HackerOne, Bugcrowd), metodología, cómo escribir reportes y cuánto se puede ganar.", "event_type": "webinar", "delta_days": 7},
    {"title": "Workshop: CTF para principiantes", "description": "Sesión práctica de 3 horas donde resolveremos retos de CTF juntos. Categorías: web, crypto, pwn y forensics. Se proporcionará un entorno preconfigurado.", "event_type": "workshop", "delta_days": 14},
    {"title": "CTF Mensual The Hackers Labs - Junio 2025", "description": "El CTF mensual de la comunidad The Hackers Labs. 48 horas de competición, +20 retos de todas las categorías. Premios para el top 3.", "event_type": "ctf", "delta_days": 21},
    {"title": "Meetup Presencial Madrid - Ciberseguridad", "description": "Quedamos en Madrid para hablar de ciberseguridad, networking y compartir experiencias. Aforo limitado a 30 personas. Confirma tu asistencia.", "event_type": "meetup", "delta_days": 30},
    {"title": "Webinar: Active Directory Attacks", "description": "Técnicas avanzadas de ataque contra Active Directory: Kerberoasting, Pass-the-Hash, DCSync, BloodHound y más. Nivel intermedio-avanzado.", "event_type": "webinar", "delta_days": -3},
    {"title": "Workshop: Burp Suite Avanzado", "description": "Taller práctico de Burp Suite: extensiones, macros, Turbo Intruder y técnicas avanzadas de testing web.", "event_type": "workshop", "delta_days": -10},
    {"title": "Charla: Ciberseguridad en la empresa española", "description": "Análisis del estado de la ciberseguridad en las empresas españolas. Casos reales, estadísticas y cómo mejorar la postura de seguridad.", "event_type": "other", "delta_days": 45},
]

created_events = []
creator = admin or (all_users[0] if all_users else None)
for ed in events_data:
    delta = ed.pop("delta_days")
    start = now + timedelta(days=delta)
    event, _ = Event.objects.get_or_create(
        title=ed["title"],
        defaults={
            **ed,
            "start_datetime": start,
            "end_datetime": start + timedelta(hours=2),
            "created_by": creator,
            "link": "https://meet.google.com/fake-link",
        }
    )
    created_events.append(event)

for event in created_events:
    attendees = random.sample(all_users, random.randint(2, min(6, len(all_users))))
    for u in attendees:
        EventAttendee.objects.get_or_create(event=event, user=u)

print(f"  ✓ {len(created_events)} eventos creados")

# ─── CHAT ─────────────────────────────────────────────────────────────────────
chat_pairs = [
    (all_users[0], all_users[1]),
    (all_users[0], all_users[2]),
    (all_users[1], all_users[3]),
    (all_users[2], all_users[4]),
] if len(all_users) >= 5 else []

messages_pool = [
    ("Hola! Acabo de unirme a la comunidad, encantado!", "Bienvenido! Espero que aprendas mucho aquí."),
    ("¿Has visto el último CTF mensual? Está muy chulo.", "Sí! Me quedé atascado en el reto de crypto. ¿Tú lo resolviste?"),
    ("Oye, ¿me puedes recomendar recursos para empezar con el OSCP?", "Claro! Empieza con el curso de Hacking Ético de aquí, luego TryHackMe y finalmente los labs de PWK."),
    ("Muchas gracias por tu post sobre Ghidra, me ha ayudado muchísimo.", "Me alegra que te sirviera! Si tienes dudas con el análisis estático, pregúntame."),
]

for i, (u1, u2) in enumerate(chat_pairs):
    existing = Conversation.objects.filter(participants=u1).filter(participants=u2).first()
    if not existing:
        conv = Conversation.objects.create()
        conv.participants.add(u1, u2)
        msgs = messages_pool[i % len(messages_pool)]
        DirectMessage.objects.create(conversation=conv, sender=u1, content=msgs[0])
        DirectMessage.objects.create(conversation=conv, sender=u2, content=msgs[1], is_read=True)

print("  ✓ Conversaciones y mensajes creados")

# ─── NOTIFICACIONES ───────────────────────────────────────────────────────────
notif_data = [
    {"type": "system",  "title": "Bienvenido a The Hackers Labs", "message": "Tu cuenta ha sido creada. ¡Explora los cursos y únete a la comunidad!"},
    {"type": "event",   "title": "Nuevo evento: Webinar Bug Bounty", "message": "Se ha publicado un nuevo webinar sobre Bug Bounty. ¡Inscríbete antes de que se llene!"},
    {"type": "like",    "title": "A alguien le gustó tu post", "message": "Tu post ha recibido nuevos likes."},
    {"type": "comment", "title": "Nuevo comentario en tu post", "message": "Alguien ha comentado en uno de tus posts."},
    {"type": "system",  "title": "Nuevo curso disponible", "message": "Se ha publicado un nuevo curso: 'Análisis de Malware con Ghidra'. ¡No te lo pierdas!"},
]

sender = admin or all_users[0]
for u in all_users[:6]:
    for nd in random.sample(notif_data, 3):
        Notification.objects.create(
            recipient=u,
            sender=sender if nd["type"] != "system" else None,
            notification_type=nd["type"],
            title=nd["title"],
            message=nd["message"],
            is_read=random.choice([True, False]),
        )

print("  ✓ Notificaciones creadas")

# ─── PUNTOS DEL LEADERBOARD ───────────────────────────────────────────────────
for u in all_users:
    if not u.point_events.exists():
        for _ in range(random.randint(2, 8)):
            action = random.choice(['post_created', 'comment_created', 'lesson_completed', 'like_received'])
            LeaderboardPoint.objects.create(user=u, action=action)

print("  ✓ Puntos del leaderboard creados")

print()
print("✅ Seed completado con éxito!")
print(f"   Usuarios:      {User.objects.count()}")
print(f"   Cursos:        {Course.objects.count()}")
print(f"   Lecciones:     {Lesson.objects.count()}")
print(f"   Categorías:    {Category.objects.count()}")
print(f"   Posts:         {Post.objects.count()}")
print(f"   Comentarios:   {Comment.objects.count()}")
print(f"   Likes:         {Like.objects.count()}")
print(f"   Eventos:       {Event.objects.count()}")
print(f"   Membresías:    {Membership.objects.count()}")
print(f"   Planes:        {Plan.objects.count()}")
print(f"   Notificaciones:{Notification.objects.count()}")
