from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings as django_settings
from .models import Plan, Membership, SiteConfig, Affiliate
from .serializers import (
    PlanSerializer, PlanAdminSerializer,
    MembershipSerializer, AdminMembershipSerializer,
    SiteConfigSerializer, AffiliateSerializer,
)
from apps.accounts.permissions import IsAdminRole


INTERVAL_LABELS = {
    Plan.MONTHLY: 'mensual',
    Plan.QUARTERLY: 'trimestral',
    Plan.ANNUAL: 'anual',
    Plan.LIFETIME: 'lifetime',
}


INTERVAL_ORDER = {Plan.MONTHLY: 0, Plan.QUARTERLY: 1, Plan.ANNUAL: 2, Plan.LIFETIME: 3}


def order_plans_by_interval(queryset):
    from django.db.models import Case, When, IntegerField
    return queryset.annotate(
        interval_order=Case(
            *[When(interval=k, then=v) for k, v in INTERVAL_ORDER.items()],
            output_field=IntegerField(),
        )
    ).order_by('interval_order', 'id')


def notify_new_subscription(user, plan):
    """Envía un email al correo de notificaciones configurado en Admin cuando alguien se suscribe."""
    config = SiteConfig.get()
    if not config.notification_email:
        return
    from django.core.mail import send_mail

    interval_label = INTERVAL_LABELS.get(plan.interval if plan else None, plan.interval if plan else 'desconocido')
    name = user.get_full_name() or user.username
    try:
        send_mail(
            subject=f'Nueva suscripción en Academy ({interval_label}) — {name}',
            message=(
                f"{name} ({user.email}) se ha suscrito al plan \"{plan.name if plan else 'N/A'}\" ({interval_label}).\n"
            ),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[config.notification_email],
            fail_silently=True,
        )
    except Exception:
        pass


class PlanListView(generics.ListAPIView):
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return order_plans_by_interval(Plan.objects.filter(is_active=True))


class MyMembershipView(generics.RetrieveAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.membership
        except Membership.DoesNotExist:
            return None

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({'detail': 'Sin membresía activa.'}, status=404)
        return Response(self.get_serializer(instance).data)


# ── Stripe checkout ───────────────────────────────────────────────────────────

class CreateCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import stripe
        config = SiteConfig.get()
        if not config.stripe_secret_key:
            return Response(
                {'detail': 'Stripe no está configurado. Contacta al administrador.'},
                status=400,
            )
        stripe.api_key = config.stripe_secret_key

        plan_id = request.data.get('plan_id')
        try:
            plan = Plan.objects.get(pk=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response({'detail': 'Plan no encontrado.'}, status=404)

        if not plan.stripe_price_id:
            return Response(
                {'detail': 'Este plan no tiene un precio de Stripe configurado. Contacta al administrador.'},
                status=400,
            )

        frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                mode='subscription',
                customer_email=request.user.email,
                line_items=[{'price': plan.stripe_price_id, 'quantity': 1}],
                success_url=f'{frontend_url}/membership?success=1&session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/membership',
                metadata={'user_id': str(request.user.id), 'plan_id': str(plan.id)},
            )
        except stripe.error.StripeError as e:
            return Response({'detail': str(getattr(e, 'user_message', None) or e)}, status=400)

        return Response({
            'checkout_url': session.url,
            'stripe_public_key': config.stripe_public_key,
        })


class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import stripe
        config = SiteConfig.get()
        if not config.stripe_secret_key:
            return Response(status=400)

        stripe.api_key = config.stripe_secret_key
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, config.stripe_webhook_secret)
        except Exception:
            return Response(status=400)

        ev_type = event['type']
        data = event['data']['object']

        if ev_type == 'checkout.session.completed':
            self._handle_checkout_completed(data)
        elif ev_type in ('customer.subscription.updated', 'customer.subscription.deleted'):
            self._handle_subscription_change(data, ev_type)
        elif ev_type == 'invoice.payment_failed':
            self._handle_payment_failed(data)
        elif ev_type == 'invoice.payment_succeeded':
            self._handle_payment_succeeded(data)

        return Response({'received': True})

    def _handle_checkout_completed(self, session):
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from datetime import timedelta

        User = get_user_model()
        meta = session.get('metadata') or {}
        user_id = meta.get('user_id')
        plan_id = meta.get('plan_id')
        subscription_id = session.get('subscription', '')
        customer_id = session.get('customer', '')

        if not user_id:
            return
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return
        plan = None
        if plan_id:
            try:
                plan = Plan.objects.get(pk=plan_id)
            except Plan.DoesNotExist:
                pass

        interval = plan.interval if plan else 'monthly'
        if interval == 'lifetime':
            end_date, status = None, Membership.LIFETIME
        elif interval == 'annual':
            end_date, status = timezone.now() + timedelta(days=365), Membership.ACTIVE
        elif interval == 'quarterly':
            end_date, status = timezone.now() + timedelta(days=90), Membership.ACTIVE
        else:
            end_date, status = timezone.now() + timedelta(days=30), Membership.ACTIVE

        Membership.objects.update_or_create(
            user=user,
            defaults={
                'plan': plan,
                'status': status,
                'stripe_subscription_id': subscription_id,
                'stripe_customer_id': customer_id,
                'start_date': timezone.now(),
                'end_date': end_date,
            },
        )
        notify_new_subscription(user, plan)

    def _handle_subscription_change(self, subscription, ev_type):
        sub_id = subscription.get('id')
        if not sub_id:
            return
        try:
            membership = Membership.objects.get(stripe_subscription_id=sub_id)
        except Membership.DoesNotExist:
            return

        update_fields = ['status', 'cancel_at_period_end', 'updated_at']

        if ev_type == 'customer.subscription.deleted':
            membership.status = Membership.CANCELLED
            membership.cancel_at_period_end = False
        else:
            stripe_status = subscription.get('status', '')
            if stripe_status == 'active':
                membership.status = Membership.ACTIVE
            elif stripe_status in ('canceled', 'unpaid', 'past_due'):
                membership.status = Membership.CANCELLED
            # cancel_at_period_end=True con status 'active' es válido: Stripe no
            # revoca acceso hasta que termina el periodo ya pagado.
            membership.cancel_at_period_end = bool(subscription.get('cancel_at_period_end'))

            # Si el plan se cambió desde el portal de Stripe (no desde nuestra
            # web), reflejamos aquí el nuevo price_id también.
            items = subscription.get('items', {}).get('data', [])
            price_id = items[0]['price']['id'] if items and items[0].get('price') else None
            if price_id:
                plan = Plan.objects.filter(stripe_price_id=price_id).first()
                if plan and plan.id != membership.plan_id:
                    membership.plan = plan
                    update_fields.append('plan')

        membership.save(update_fields=update_fields)

    def _handle_payment_succeeded(self, invoice):
        from django.utils import timezone
        from datetime import timedelta

        # El primer pago ya lo gestiona checkout.session.completed; aquí solo
        # extendemos end_date en los cobros de renovación del ciclo.
        if invoice.get('billing_reason') != 'subscription_cycle':
            return

        sub_id = invoice.get('subscription')
        if not sub_id:
            return
        try:
            membership = Membership.objects.get(stripe_subscription_id=sub_id)
        except Membership.DoesNotExist:
            return

        if membership.status == Membership.LIFETIME:
            return

        interval = membership.plan.interval if membership.plan else 'monthly'
        if interval == 'annual':
            delta = timedelta(days=365)
        elif interval == 'quarterly':
            delta = timedelta(days=90)
        else:
            delta = timedelta(days=30)

        membership.status = Membership.ACTIVE
        membership.end_date = timezone.now() + delta
        membership.save(update_fields=['status', 'end_date', 'updated_at'])

    def _handle_payment_failed(self, invoice):
        sub_id = invoice.get('subscription')
        if not sub_id:
            return
        try:
            membership = Membership.objects.get(stripe_subscription_id=sub_id)
            membership.status = Membership.CANCELLED
            membership.save(update_fields=['status', 'updated_at'])
        except Membership.DoesNotExist:
            pass


# ── Simulate subscribe (dev/fallback) ────────────────────────────────────────

class SimulateSubscribeView(APIView):
    """Demo: crea/actualiza membresía sin pasar por Stripe.

    Solo disponible con settings.DEBUG=True (instancias de demo/desarrollo
    sin cobro real). No usar SiteConfig.stripe_secret_key (BD) como señal de
    "modo demo": ese campo puede estar vacío en producción por simple falta
    de configuración, dejando este endpoint activo y permitiendo que
    cualquier usuario autenticado se auto-otorgue una membresía (incluida
    'lifetime') sin pagar. settings.DEBUG es una variable de entorno, no
    editable desde el panel admin, y es la señal correcta de entorno.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.http import Http404
        from django.utils import timezone
        from datetime import timedelta

        if not django_settings.DEBUG:
            raise Http404

        plan_id = request.data.get('plan_id')
        try:
            plan = Plan.objects.get(pk=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response({'detail': 'Plan no encontrado.'}, status=404)

        if plan.interval == 'lifetime':
            end_date, status = None, 'lifetime'
        elif plan.interval == 'annual':
            end_date, status = timezone.now() + timedelta(days=365), 'active'
        elif plan.interval == 'quarterly':
            end_date, status = timezone.now() + timedelta(days=90), 'active'
        else:
            end_date, status = timezone.now() + timedelta(days=30), 'active'

        membership, created = Membership.objects.update_or_create(
            user=request.user,
            defaults={'plan': plan, 'status': status, 'start_date': timezone.now(), 'end_date': end_date},
        )
        notify_new_subscription(request.user, plan)
        return Response(MembershipSerializer(membership).data, status=201 if created else 200)


# ── Change plan (upgrade/downgrade de una suscripción ya activa) ──────────────

class ChangePlanView(APIView):
    """Cambia el price de la suscripción de Stripe existente en vez de crear
    una segunda suscripción duplicada (que cobraría dos veces al usuario)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        try:
            plan = Plan.objects.get(pk=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response({'detail': 'Plan no encontrado.'}, status=404)

        if not plan.stripe_price_id:
            return Response(
                {'detail': 'Este plan no tiene un precio de Stripe configurado. Contacta al administrador.'},
                status=400,
            )

        try:
            membership = request.user.membership
        except Membership.DoesNotExist:
            return Response({'detail': 'No tienes una membresía activa.'}, status=404)

        if not membership.stripe_subscription_id:
            return Response(
                {'detail': 'Tu membresía no está vinculada a una suscripción de Stripe. Contacta al administrador.'},
                status=400,
            )

        if membership.plan_id == plan.id:
            return Response({'detail': 'Ya tienes este plan activo.'}, status=400)

        config = SiteConfig.get()
        if not config.stripe_secret_key:
            return Response({'detail': 'Stripe no está configurado.'}, status=400)

        import stripe
        stripe.api_key = config.stripe_secret_key
        try:
            subscription = stripe.Subscription.retrieve(membership.stripe_subscription_id)
            item_id = subscription['items']['data'][0]['id']
            stripe.Subscription.modify(
                membership.stripe_subscription_id,
                items=[{'id': item_id, 'price': plan.stripe_price_id}],
                proration_behavior='create_prorations',
                cancel_at_period_end=False,
            )
        except stripe.error.StripeError as e:
            return Response({'detail': str(getattr(e, 'user_message', None) or e)}, status=400)

        # El webhook customer.subscription.updated confirmará esto, pero lo
        # reflejamos ya mismo para que la UI no se quede desactualizada.
        membership.plan = plan
        membership.status = Membership.ACTIVE
        membership.cancel_at_period_end = False
        membership.save(update_fields=['plan', 'status', 'cancel_at_period_end', 'updated_at'])

        return Response(MembershipSerializer(membership).data)


# ── Cancel subscription ───────────────────────────────────────────────────────

class CancelMembershipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            membership = request.user.membership
        except Membership.DoesNotExist:
            return Response({'detail': 'No tienes una membresía activa.'}, status=404)

        if membership.status == Membership.CANCELLED or membership.cancel_at_period_end:
            return Response({'detail': 'Tu membresía ya está cancelada.'}, status=400)

        if membership.stripe_subscription_id:
            config = SiteConfig.get()
            if config.stripe_secret_key:
                import stripe
                stripe.api_key = config.stripe_secret_key
                try:
                    stripe.Subscription.modify(membership.stripe_subscription_id, cancel_at_period_end=True)
                except stripe.error.StripeError as e:
                    return Response({'detail': str(getattr(e, 'user_message', None) or e)}, status=400)

            # No forzamos status=CANCELLED: Stripe mantiene la suscripción activa
            # hasta el final del periodo ya pagado. El webhook
            # customer.subscription.deleted marcará CANCELLED cuando ese periodo
            # termine de verdad. Aquí solo dejamos constancia de que no se renovará.
            membership.cancel_at_period_end = True
            membership.save(update_fields=['cancel_at_period_end', 'updated_at'])
        else:
            # Membresía manual sin suscripción de Stripe detrás: no hay periodo
            # que esperar, se cancela de inmediato.
            membership.status = Membership.CANCELLED
            membership.save(update_fields=['status', 'updated_at'])

        return Response(MembershipSerializer(membership).data)


# ── Stripe config (admin) ─────────────────────────────────────────────────────

class StripeConfigView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(SiteConfigSerializer(SiteConfig.get()).data)

    def patch(self, request):
        config = SiteConfig.get()
        serializer = SiteConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Plan admin ────────────────────────────────────────────────────────────────

class AdminPlanListView(generics.ListCreateAPIView):
    serializer_class = PlanAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return order_plans_by_interval(Plan.objects.all())


class AdminPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlanAdminSerializer
    permission_classes = [IsAdminRole]
    queryset = Plan.objects.all()

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


# ── Membership admin ──────────────────────────────────────────────────────────

class AdminMembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminMembershipSerializer
    permission_classes = [IsAdminRole]
    queryset = Membership.objects.select_related('user', 'plan').all()


class AdminMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminMembershipSerializer
    permission_classes = [IsAdminRole]
    queryset = Membership.objects.select_related('user', 'plan').all()

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


# ── Affiliates admin ──────────────────────────────────────────────────────────

class AdminAffiliateListCreateView(generics.ListCreateAPIView):
    serializer_class = AffiliateSerializer
    permission_classes = [IsAdminRole]
    queryset = Affiliate.objects.all()
    pagination_class = None


class AdminAffiliateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AffiliateSerializer
    permission_classes = [IsAdminRole]
    queryset = Affiliate.objects.all()

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)
