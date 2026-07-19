import random
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.community.models import Category, Post, Comment, Like
from apps.classroom.models import Lesson, LessonProgress
from apps.events.models import Event, EventAttendee
from apps.memberships.models import Plan, Membership
from apps.notifications.models import Notification
from apps.leaderboards.models import LeaderboardPoint

User = get_user_model()
print("Iniciando seed masivo...")

NOMBRES = [
    ("alejandro", "Alejandro", "Garcia",   "Madrid"),
    ("beatriz",   "Beatriz",   "Lopez",    "Barcelona"),
    ("cesar",     "Cesar",     "Martin",   "Valencia"),
    ("diana",     "Diana",     "Perez",    "Sevilla"),
    ("enrique",   "Enrique",   "Sanchez",  "Bilbao"),
    ("fatima",    "Fatima",    "Romero",   "Malaga"),
    ("gonzalo",   "Gonzalo",   "Torres",   "Zaragoza"),
    ("helena",    "Helena",    "Diaz",     "Murcia"),
    ("ivan",      "Ivan",      "Ruiz",     "Palma"),
    ("julia",     "Julia",     "Molina",   "Las Palmas"),
    ("kevin",     "Kevin",     "Moreno",   "Alicante"),
    ("lucia",     "Lucia",     "Alvarez",  "Cordoba"),
    ("marcos",    "Marcos",    "Gil",      "Valladolid"),
    ("nerea",     "Nerea",     "Iglesias", "Vigo"),
    ("omar",      "Omar",      "Vega",     "Gijon"),
    ("patricia",  "Patricia",  "Ramos",    "Granada"),
    ("quique",    "Enrique",   "Castro",   "Oviedo"),
    ("raquel",    "Raquel",    "Ortiz",    "Salamanca"),
    ("sergio",    "Sergio",    "Rubio",    "Pamplona"),
    ("tamara",    "Tamara",    "Pena",     "Santander"),
    ("uriel",     "Uriel",     "Santos",   "Burgos"),
    ("vanesa",    "Vanesa",    "Herrero",  "Tarragona"),
    ("william",   "William",   "Vargas",   "Badajoz"),
    ("xenia",     "Xenia",     "Munoz",    "Toledo"),
    ("yeray",     "Yeray",     "Leon",     "Huelva"),
    ("zoe",       "Zoe",       "Cano",     "Lleida"),
    ("adrian",    "Adrian",    "Prieto",   "Ciudad Real"),
    ("blanca",    "Blanca",    "Fuentes",  "Albacete"),
    ("cristian",  "Cristian",  "Herrera",  "Lugo"),
    ("dario",     "Dario",     "Medina",   "Cadiz"),
    ("elena",     "Elena",     "Campos",   "Jaen"),
    ("felix",     "Felix",     "Reyes",    "Almeria"),
    ("gema",      "Gema",      "Navarro",  "Burgos"),
    ("hector",    "Hector",    "Bravo",    "Logrono"),
    ("irene",     "Irene",     "Vera",     "Merida"),
    ("javier",    "Javier",    "Palomo",   "Cuenca"),
    ("kiko",      "Francisco", "Delgado",  "Elche"),
    ("lara",      "Lara",      "Ibanez",   "Sabadell"),
    ("marioc",    "Mario",     "Cruz",     "Badalona"),
    ("natalia",   "Natalia",   "Ferrer",   "Hospitalet"),
    ("oscar",     "Oscar",     "Lorenzo",  "Zaragoza"),
    ("pilar",     "Pilar",     "Pascual",  "Madrid"),
    ("roberto",   "Roberto",   "Montes",   "Barcelona"),
    ("sandra",    "Sandra",    "Calvo",    "Sevilla"),
    ("tomas",     "Tomas",     "Molero",   "Valencia"),
    ("ulises",    "Ulises",    "Serrano",  "Malaga"),
    ("veronica",  "Veronica",  "Vidal",    "Bilbao"),
    ("xavier",    "Xavier",    "Moya",     "Girona"),
    ("yolanda",   "Yolanda",   "Ponce",    "Tarragona"),
    ("zeus",      "Zeus",      "Soria",    "Salamanca"),
]

BIOS = [
    "Apasionado de la ciberseguridad y los CTFs. Siempre aprendiendo.",
    "Desarrollador web que quiere entrar al mundo del hacking etico.",
    "Estudiante de ingenieria informatica. Me encantan los retos de seguridad.",
    "SysAdmin de dia, hacker de noche. Fanatico de GNU/Linux.",
    "Recien llegado al mundo de la ciberseguridad. Todo me fascina.",
    "Pentester junior buscando mejorar mis habilidades.",
    "Bug hunter amateur. Algun dia sere profesional.",
    "Amante de Python, Bash y todo lo que automatice trabajo repetitivo.",
    "CTF player. Mi sueno es trabajar en Red Team.",
    "Informatico con experiencia en redes que quiere pasarse al blueteam.",
    "Aprendiz de reverse engineering. Ghidra es mi nuevo mejor amigo.",
    "Estudiante de CFGS de Ciberseguridad buscando comunidad.",
    "DevOps que se ha dado cuenta de que la seguridad importa.",
    "Leyendo RTFM desde 2020. La practica hace al maestro.",
    "Curioso empedernido. Desmontar cosas para ver como funcionan.",
]

ROLES_DIST = ["member"] * 44 + ["instructor"] * 6

new_users = []
for i, (slug, first, last, city) in enumerate(NOMBRES):
    email = f"{slug}{i+10}@thehackerslabs.com"
    role  = ROLES_DIST[i]
    pts   = random.randint(50, 4500)
    u, created = User.objects.get_or_create(email=email, defaults={
        "username":   f"{slug}_{i+10}",
        "first_name": first,
        "last_name":  last,
        "role":       role,
        "bio":        random.choice(BIOS),
        "location":   city,
        "points":     pts,
        "is_active":  True,
    })
    if created:
        u.set_password("test123")
        u.save()
    new_users.append(u)

print(f"  Usuarios nuevos: {len(new_users)}")

all_db_users = list(User.objects.all())

# ── MEMBRESIAS ────────────────────────────────────────────────────────────────
plans = list(Plan.objects.all())
if plans:
    already_has = set(Membership.objects.values_list("user_id", flat=True))
    eligible = [u for u in new_users if u.id not in already_has]
    for u in eligible:
        plan  = random.choice(plans)
        start = timezone.now() - timedelta(days=random.randint(1, 365))
        Membership.objects.create(
            user=u, plan=plan,
            status="active" if plan.interval != "lifetime" else "lifetime",
            start_date=start,
            end_date=(start + timedelta(days=365)) if plan.interval == "annual"
                     else (start + timedelta(days=30)) if plan.interval == "monthly"
                     else None,
        )
    print(f"  Membresias nuevas: {len(eligible)}")

# ── POSTS MASIVOS ─────────────────────────────────────────────────────────────
categories = list(Category.objects.all())
cat_map = {c.name: c for c in categories}

POSTS_EXTRA = [
    ("General",        "Presentacion: nuevo miembro de la comunidad",
     "Hola a todos! Acabo de unirme y estoy encantado de encontrar un sitio en espanol dedicado a la ciberseguridad. Llevo varios meses estudiando por mi cuenta y espero aprender mucho aqui. Me presento brevemente: soy estudiante de informatica, me apasionan los CTFs y el hacking etico. Animadme con recomendaciones para empezar!"),
    ("Hacking Etico",  "Duda sobre Nmap: cuando usar -sS vs -sT",
     "Llevo tiempo usando Nmap y tengo una duda: cuando es mejor usar el escaneo SYN (-sS) frente al TCP Connect (-sT)? Entiendo que -sS es mas sigiloso al no completar el handshake, pero hay casos donde -sT sea preferible? Por ejemplo en entornos con firewalls estrictos o cuando no tenemos privilegios de root."),
    ("Programacion",   "Script Python para deteccion de subdominios activos",
     "Comparto un script Python que combina resolucion DNS asincrona con asyncio y aiohttp para detectar subdominios activos de forma masiva. Paso de 200 req/s en modo secuencial a mas de 2000 con la version asincrona. Muy util para la fase de reconocimiento en bug bounty."),
    ("CTF & Retos",    "Write-up: PicoCTF 2024 - Buffer Overflow basico",
     "Resuelvo el reto de buffer overflow de PicoCTF 2024. El binario no tiene canary ni PIE, asi que es relativamente directo: calculamos el offset con cyclic, encontramos la direccion de win() con GDB y sobreescribimos el return address. Todo paso a paso con pwntools. Perfecto para empezar con pwn."),
    ("Noticias",       "Brecha en popular plataforma: credenciales expuestas",
     "Se ha confirmado una brecha de seguridad que ha expuesto datos de cientos de miles de cuentas. Los datos filtrados incluyen emails, usernames y contrasenas hasheadas. Si reutilizais contrasenas (no deberieis), cambiadlas ya. Usad un gestor de contrasenas como Bitwarden o KeePassXC."),
    ("Recursos",       "Recopilacion: los mejores cheatsheets de pentesting",
     "Llevo meses recopilando cheatsheets utiles para pentesting y he decidido organizarlos todos. Cubre: Nmap, SQLMap, BurpSuite, Metasploit, comandos Linux y Windows post-explotacion, escalada de privilegios en Linux y Windows, Active Directory, y mas. Todo en un repositorio de GitHub bien organizado."),
    ("Empleo & Carrera", "Cuanto gana un pentester en Espana en 2025",
     "He estado investigando salarios y os comparto los datos de Glassdoor, InfoJobs y LinkedIn. Junior 0-2 anos: 22-30k. Semi-senior 2-5 anos: 32-45k. Senior 5+: 50-70k. CISO y roles de direccion: 70-120k. Las certificaciones como OSCP, CEH y CISSP tienen un impacto real en el salario. Os cuadra con vuestra experiencia?"),
    ("Hacking Etico",  "Vale la pena la certificacion eJPT para empezar",
     "Estoy entre la eJPT de eLearnSecurity y la CompTIA Security+ como primera certificacion. La eJPT parece mas practica y barata, pero la Security+ es mas reconocida por empresas. Que elegisteis para empezar? Notasteis diferencia en entrevistas? Estoy en un punto donde necesito algo que me abra puertas rapidamente."),
    ("CTF & Retos",    "Mejores plataformas CTF para principiantes en 2025",
     "Para los que estais empezando, estas son las plataformas que mas me han ayudado ordenadas de menor a mayor dificultad: 1) PicoCTF ideal para empezar con retos bien explicados. 2) TryHackMe con rutas guiadas muy bueno para aprender metodologia. 3) Hack The Box mas dificil para cuando ya tienes base. Hay alguna que me haya dejado?"),
    ("Programacion",   "FastAPI vs Django REST: cual elegir para una API en produccion",
     "Llevo semanas dando vueltas a esto para un proyecto nuevo. FastAPI es mas moderno, async nativo y con documentacion automatica generada. Pero el ecosistema de Django ORM admin autenticacion es imbatible en productividad. Que usais vosotros para APIs en produccion? Hay casos claros donde uno gana al otro?"),
    ("General",        "Como compatibilizais trabajo y estudio de ciberseguridad",
     "Tengo trabajo de jornada completa y quiero prepararme el OSCP, pero el tiempo libre es muy limitado. Como lo gestionais los que habeis estado en esta situacion? Actualmente le saco 1-2 horas entre semana y 4-5 los fines de semana. Es suficiente para progresar de forma significativa en un ano?"),
    ("Noticias",       "Nueva version de Kali Linux: novedades que debes conocer",
     "Acaba de salir una nueva version de Kali Linux con varias novedades interesantes: nuevas herramientas incluida una para analisis de firmware IoT, actualizacion del kernel, mejoras en Kali Purple para blue team y nueva imagen para Raspberry Pi 5. Os dejo el resumen de lo mas importante para el dia a dia."),
    ("Recursos",       "El mejor libro gratuito para aprender la linea de comandos Linux",
     "Si quereis dominar la linea de comandos de Linux que es esencial para cualquier pentester, The Linux Command Line de William Shotts es de lo mejor que hay y esta disponible gratis en la web oficial. Lo he releido tres veces y cada vez aprendo algo nuevo. Muy recomendable tanto para principiantes como para los que ya tienen experiencia."),
    ("Hacking Etico",  "Mi metodologia de pentesting web paso a paso",
     "Despues de dos anos haciendo web pentesting he documentado mi metodologia completa. Empezando por reconocimiento pasivo con Shodan y Censys, pasando por el activo con Nmap y Feroxbuster hasta la explotacion con Burp Suite. Tambien incluyo la parte de reporting que muchos olvidan y que es tan importante como el hacking en si."),
    ("CTF & Retos",    "Reto de criptografia clasica: adivina el cifrado",
     "Os propongo un pequeno reto: el texto cifrado es KHROD D WRGRV y corresponde a Hola a todos cifrado con un metodo clasico. El primero que responda correctamente que cifrado es y como lo ha resuelto se lleva el reconocimiento de la comunidad. Pista: es uno de los mas simples de la historia de la criptografia."),
    ("Empleo & Carrera", "Portfolio de seguridad: que proyectos incluir para buscar trabajo",
     "Estoy montando mi portfolio de ciberseguridad para buscar trabajo y me surge la duda de que proyectos son mas valorados por los recruiters. Write-ups de CTF? Herramientas propias en GitHub? Bug bounty reports? Un blog tecnico? Experiencia practica con laboratorios? Que os ha funcionado mejor en las entrevistas?"),
    ("General",        "Encuesta: que sistema operativo usais para pentesting",
     "Cual es vuestra distro principal para hacer pentesting? Kali Linux es la mas popular pero Parrot OS ha ganado muchos seguidores. Hay gente que prefiere montar su propio entorno en BlackArch o Ubuntu. Yo personalmente uso Kali en VM para trabajar y Parrot OS como sistema principal. Y vosotros?"),
    ("Programacion",   "Automatizando el reporting de pentesting con Python y Jinja2",
     "Una parte que nadie menciona del pentesting profesional es el reporting. He automatizado la generacion de informes con Python Jinja2 y WeasyPrint. El script toma un YAML con los hallazgos y genera un PDF con portada sumario ejecutivo y detalles tecnicos. Alguien mas lo ha automatizado de forma similar?"),
    ("Hacking Etico",  "Mi laboratorio de hacking en casa con Proxmox y 400 euros",
     "Os enseño mi lab de hacking en casa. Tengo un NUC con Proxmox donde corro: Kali Linux, Windows Server 2022 con Active Directory, una red de maquinas vulnerables Metasploitable DVWA y varias de VulnHub, y Graylog para monitorizar todo. Coste total unos 400 euros. Cual es vuestro setup en casa?"),
    ("Noticias",       "CISA alerta de vulnerabilidades criticas activamente explotadas",
     "La CISA ha anadido nuevas vulnerabilidades criticas a su catalogo de CVEs activamente explotados esta semana. Entre ellas destacan una en Fortinet FortiOS, una en Cisco IOS XE y un zero-day en un navegador popular. Si teneis estos sistemas en produccion parchad ya. No espereis a los ciclos normales de parchado."),
    ("Recursos",       "Canal de YouTube imprescindible: walkthroughs de HackTheBox",
     "Para los que aprendeis mejor con video el canal de IppSec en YouTube es imprescindible. Hace walkthroughs detallados de maquinas retiradas de HackTheBox explicando el razonamiento detras de cada paso no solo los comandos. Llevo meses viendolo y he aprendido muchisimo sobre metodologia. Que otros canales recomendais?"),
    ("CTF & Retos",    "Solucion al reto de XSS stored de la semana pasada",
     "Aqui va la solucion del reto de XSS stored. El truco estaba en que el filtro bloqueaba las etiquetas script pero no los event handlers de HTML. Con un simple img src onerror=alert(document.cookie) conseguiamos ejecutar JavaScript y robar cookies. Cuantos lo consiguieron sin mirar pistas?"),
    ("Empleo & Carrera", "Entrevista tecnica de ciberseguridad: que esperan realmente",
     "He pasado 8 entrevistas tecnicas en los ultimos 3 meses para puestos de seguridad en empresas espanolas. Os comparto las preguntas mas frecuentes y lo que buscan con cada una. Spoiler: mas que respuestas exactas buscan que demuestres como piensas ante un problema de seguridad desconocido. La metodologia importa mas que el conocimiento exacto."),
    ("Hacking Etico",  "OSINT: como investigar una empresa antes del pentest",
     "Antes de tocar un solo sistema el OSINT pasivo puede darte informacion valiosisima. En este post cubro: busqueda en Shodan y Censys, analisis de registros DNS que MX SPF y DMARC dicen mucho sobre la infraestructura, scraping etico de LinkedIn, analisis de codigo en GitHub, y busqueda de credenciales en Have I Been Pwned."),
    ("Programacion",   "Introduccion a Scapy: forja tus propios paquetes de red",
     "Scapy es una libreria Python brutal para manipulacion de paquetes de red. Con 5 lineas de codigo puedes forjar un TCP SYN hacer ARP spoofing o crear tu propio scanner personalizado. En este post muestro los casos de uso mas utiles para pentesting de red con ejemplos de codigo comentados y listos para usar."),
]

created_posts = 0
existing_titles = set(Post.objects.values_list("title", flat=True))

for cat_name, title, content in POSTS_EXTRA:
    if title in existing_titles:
        continue
    cat    = cat_map.get(cat_name) or (categories[0] if categories else None)
    author = random.choice(all_db_users)
    Post.objects.create(
        title=title, content=content, author=author, category=cat,
        is_pinned=False,
        created_at=timezone.now() - timedelta(days=random.randint(1, 180)),
    )
    created_posts += 1

print(f"  Posts nuevos: {created_posts}")

# ── COMENTARIOS MASIVOS ───────────────────────────────────────────────────────
COMMENTS = [
    "Muy buen post, justo lo que necesitaba leer hoy.",
    "Gracias por compartir esto con la comunidad!",
    "Tienes algun recurso adicional sobre este tema?",
    "Lo he probado y funciona perfectamente.",
    "Totalmente de acuerdo con tu enfoque.",
    "Excelente explicacion! Muy clara y directa al punto.",
    "Llevo tiempo buscando algo asi. Muchas gracias.",
    "Interesante perspectiva. Yo lo habia enfocado de otra manera.",
    "Y en Windows tambien funciona de la misma forma?",
    "Me ha abierto los ojos sobre este tema. 10/10.",
    "Justo estaba peleando con esto ayer. Muy oportuno.",
    "Voy a probarlo esta tarde y te cuento que tal.",
    "Este es el tipo de contenido que hace grande a esta comunidad.",
    "Muy detallado y bien explicado, se nota la experiencia.",
    "Hay alguna diferencia si lo hago con Python 3.10 vs 3.12?",
    "Compartido en mi grupo de Telegram de ciberseguridad.",
    "Esperando la segunda parte con los casos avanzados.",
    "Yo tuve el mismo problema y lo resolvi con un enfoque diferente.",
    "Fundamental para cualquier pentester. Guardado.",
    "Muy buena aportacion. Esto es lo que diferencia a esta comunidad.",
    "Lo aplique en un CTF y funciono a la perfeccion. Gracias!",
    "Que herramienta recomendarias para complementar esto?",
    "Llevo semanas atascado en este punto y por fin lo entiendo.",
    "Anadido a mis favoritos. Recurso imprescindible.",
    "Has pensado en hacer un video sobre esto? Se explicaria muy bien.",
]

all_posts_db = list(Post.objects.all())
new_comments = 0
for post in all_posts_db:
    n = random.randint(2, 10)
    commenters = random.sample(all_db_users, min(n, len(all_db_users)))
    for u in commenters:
        if u != post.author:
            _, created = Comment.objects.get_or_create(
                post=post, author=u,
                defaults={"content": random.choice(COMMENTS)}
            )
            if created:
                new_comments += 1

print(f"  Comentarios nuevos: {new_comments}")

# ── LIKES MASIVOS ─────────────────────────────────────────────────────────────
new_likes = 0
for post in all_posts_db:
    n = random.randint(3, min(25, len(all_db_users)))
    for u in random.sample(all_db_users, n):
        _, created = Like.objects.get_or_create(post=post, user=u)
        if created:
            new_likes += 1

print(f"  Likes nuevos: {new_likes}")

# ── PROGRESO EN CURSOS ────────────────────────────────────────────────────────
all_lessons_db = list(Lesson.objects.all())
new_progress = 0
for u in new_users:
    if all_lessons_db:
        completed = random.sample(all_lessons_db, random.randint(0, min(15, len(all_lessons_db))))
        for lesson in completed:
            _, created = LessonProgress.objects.get_or_create(
                user=u, lesson=lesson,
                defaults={
                    "completed": True,
                    "completed_at": timezone.now() - timedelta(days=random.randint(1, 90))
                }
            )
            if created:
                new_progress += 1

print(f"  Progreso de lecciones: {new_progress}")

# ── ASISTENCIA A EVENTOS ──────────────────────────────────────────────────────
all_events_db = list(Event.objects.all())
for u in new_users:
    evs = random.sample(all_events_db, random.randint(0, min(3, len(all_events_db))))
    for ev in evs:
        EventAttendee.objects.get_or_create(event=ev, user=u)

print("  Asistencia a eventos actualizada")

# ── PUNTOS LEADERBOARD ────────────────────────────────────────────────────────
ACTIONS = ["post_created", "comment_created", "lesson_completed",
           "like_received", "event_attended", "login_streak"]
new_points = 0
for u in new_users:
    for _ in range(random.randint(5, 30)):
        LeaderboardPoint.objects.create(
            user=u,
            action=random.choice(ACTIONS),
            created_at=timezone.now() - timedelta(days=random.randint(0, 180))
        )
        new_points += 1

print(f"  Puntos leaderboard: {new_points}")

# ── NOTIFICACIONES ────────────────────────────────────────────────────────────
NOTIFS = [
    ("system",  "Bienvenido a Bunker",            "Tu cuenta ha sido creada. Explora los cursos y unite a la comunidad."),
    ("like",    "Alguien dio like a tu post",      "Un miembro de la comunidad ha dado like a tu publicacion."),
    ("comment", "Nuevo comentario en tu post",     "Alguien ha comentado en tu publicacion."),
    ("event",   "Nuevo evento disponible",         "Se ha publicado un nuevo evento. No te lo pierdas!"),
    ("system",  "Nuevo curso publicado",           "Se ha publicado un nuevo curso en la plataforma."),
]
admin_user = User.objects.filter(role="admin").first() or all_db_users[0]
for u in new_users:
    for ntype, ntitle, nmsg in random.sample(NOTIFS, random.randint(2, 4)):
        Notification.objects.create(
            recipient=u,
            sender=admin_user if ntype != "system" else None,
            notification_type=ntype,
            title=ntitle,
            message=nmsg,
            is_read=random.choice([True, True, False]),
        )

print("  Notificaciones creadas")

print()
print("Seed masivo completado!")
print(f"  Usuarios totales:    {User.objects.count()}")
print(f"  Posts totales:       {Post.objects.count()}")
print(f"  Comentarios totales: {Comment.objects.count()}")
print(f"  Likes totales:       {Like.objects.count()}")
print(f"  Membresias totales:  {Membership.objects.count()}")
print(f"  Puntos leaderboard:  {LeaderboardPoint.objects.count()}")
print(f"  Notificaciones:      {Notification.objects.count()}")
