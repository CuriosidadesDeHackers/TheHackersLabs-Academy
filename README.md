<div align="center">
  <img src="https://thehackerslabs.com/static/images/Logo.png" alt="The Hackers Labs Logo" width="120" height="120">

  <h1>The Hackers Labs Academy</h1>

  <p><b>La academia oficial de The Hackers Labs</b> — comunidad y formación práctica en ciberseguridad y hacking ético.</p>

  <p>
    <img src="https://img.shields.io/badge/Django-5.1-092E20?logo=django&logoColor=white" alt="Django 5.1">
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
    <img src="https://img.shields.io/badge/DRF-REST%20Framework-A30000?logo=django&logoColor=white" alt="Django REST Framework">
    <img src="https://img.shields.io/badge/State-Zustand-443E38" alt="Zustand">
    <img src="https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens" alt="JWT">
    <img src="https://img.shields.io/badge/License-Privado-lightgrey" alt="Licencia privada">
  </p>
</div>

---

## Sobre The Hackers Labs

**The Hackers Labs** es una comunidad hispanohablante de ciberseguridad y hacking ético formada por varias plataformas complementarias: laboratorios prácticos, un buscador de retos, write-ups oficiales y esta academia. Cada una cubre una parte distinta del camino de aprendizaje: **aprender la teoría, practicar en entornos reales y compartir conocimiento con la comunidad.**

Este repositorio contiene el código de **Academy**, la plataforma de formación estructurada: cursos, comunidad, membresías, gamificación y todo lo necesario para llevar el aprendizaje de la teoría a la práctica.

## ✨ Funcionalidades

- 🧑‍🤝‍🧑 **Comunidad** — feed de posts con categorías, comentarios con respuestas y adjuntos, likes y posts fijados.
- 🎓 **Classroom** — cursos con módulos y lecciones, seguimiento de progreso, adjuntos por lección y certificados de finalización.
- 💳 **Membresías** — planes mensual, trimestral y anual, integración con Stripe y cancelación autogestionada.
- 🏆 **Gamificación** — puntos, niveles (1–10) y leaderboard en tiempo real.
- 📅 **Eventos** — calendario con asistencia/RSVP.
- 💬 **Chat privado** — conversaciones 1 a 1 entre miembros.
- 🔔 **Notificaciones** — in-app, con contador de no leídas.
- 🛠️ **Panel de administración** — gestión completa de usuarios, cursos, membresías, categorías y contenido del sitio.
- 🤝 **Afiliados** — tracking de referidos y comisiones.
- 🔐 **Roles** — Admin, Instructor y Member, con permisos diferenciados en API y frontend.

## 🏗️ Arquitectura

### Backend (`backend/`)

Django 5.1 + Django REST Framework, organizado en apps independientes (`models.py`, `serializers.py`, `views.py`, `urls.py`):

| App | Ruta de API | Responsabilidad |
|---|---|---|
| `accounts` | `/api/auth/` | Usuarios, JWT, roles, perfiles, admin de usuarios |
| `classroom` | `/api/classroom/` | Cursos, módulos, lecciones, progreso, adjuntos |
| `community` | `/api/community/` | Posts, comentarios, likes, categorías del feed |
| `events` | `/api/events/` | Eventos de calendario y asistencia |
| `memberships` | `/api/memberships/` | Planes, suscripciones, integración con Stripe |
| `leaderboards` | `/api/leaderboards/` | Ranking por puntos y niveles |
| `notifications` | `/api/notifications/` | Notificaciones in-app |
| `chat` | `/api/chat/` | Conversaciones privadas y mensajes |
| `resources` | — | Recursos y materiales descargables |

Autenticación **JWT** (`access` 60 min / `refresh` 7 días con rotación) vía `djangorestframework-simplejwt`, con refresco automático desde el frontend al recibir un 401.

### Frontend (`frontend/`)

```
frontend/src/
  pages/           # Una página por ruta (Community, Classroom, Profile, AdminPanel…)
  components/
    layout/        # Layout, Navbar
    ui/            # Componentes compartidos (Avatar, Card, Btn, Input, Badge…)
  store/           # Estado global con Zustand (auth, membership, sitio)
  api/             # Instancia de axios con interceptor JWT
  hooks/           # Hooks reutilizables
  index.css        # Design system (variables CSS, tema oscuro/claro)
```

React 18 con rutas protegidas por rol (`PrivateRoute`, `AdminRoute`, `GuestRoute`) y un design system propio con soporte de tema oscuro/claro persistente.

## 🚀 Empezar en local

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # completa tus propias credenciales
python manage.py migrate
python manage.py runserver  # http://localhost:8000

# Frontend
cd frontend
npm install
cp .env.example .env        # define REACT_APP_API_URL
npm start                   # http://localhost:3000
```

Datos de ejemplo: `python manage.py shell < seed.py` (re-ejecutable).

## 🧰 Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Django 5.1, Django REST Framework, SimpleJWT |
| Frontend | React 18, React Router, Zustand, Axios |
| Base de datos | SQLite (dev) / PostgreSQL (producción) |
| Pagos | Stripe (simulable en desarrollo) |
| Autenticación | JWT con rotación de refresh tokens |

---

## 🌐 Explora nuestros espacios oficiales

- 🧭 **Plataforma** — [labs.thehackerslabs.com](https://labs.thehackerslabs.com/) — Entra, practica en la plataforma con nuestros laboratorios, aprende técnicas y consulta los write-ups oficiales en el blog.
- 👩‍🎓 **Academia** — [academy.thehackerslabs.com](https://academy.thehackerslabs.com/)
- 🧩 **Vault** — [vault.thehackerslabs.com](https://vault.thehackerslabs.com/) — Si no sabes por qué laboratorio empezar o quieres encontrar un reto para practicar una técnica concreta (o te estás preparando para una certificación), utiliza el Vault: es la versión web y gráfica del Excel de laboratorios.
- 📊 **Excel de laboratorios (completo)** — [Ver hoja de cálculo](https://docs.google.com/spreadsheets/d/1lt81_6Uor1v6O7vvnafnYm8mciINVIspiLYiDbnDOD8/edit?gid=0) — Lista detallada y filtrable por certificación, dificultad, sistema y técnicas.
- 📰 **Blog / Write-Ups** — [blog.thehackerslabs.com](https://blog.thehackerslabs.com/) — Tutoriales, guías y write-ups oficiales para acompañar tu aprendizaje.

---

<div align="center">
  <sub>© The Hackers Labs. Todos los derechos reservados.</sub>
</div>
