from rest_framework import viewsets, mixins, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.utils import timezone
from django.db.models import Sum, Count, Q, Min, Max
from django.db.models.functions import TruncDate
from datetime import datetime, timedelta
from .models import TelemetryRecord, TelemetryEvent, DeviceStatus, UsageStatistics, Outlet, Machine, MachineDevice
from .serializers import TelemetryRecordSerializer, TelemetryEventSerializer, DeviceStatusSerializer, UsageStatisticsSerializer, OutletSerializer, MachineSerializer
from django.db import transaction


class TelemetryViewSet(mixins.CreateModelMixin,
                       mixins.ListModelMixin,
                       mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    queryset = TelemetryRecord.objects.all()
    serializer_class = TelemetryRecordSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["get"], url_path="latest")
    def latest(self, request):
        device_id = request.query_params.get("device_id")
        qs = self.get_queryset()
        if device_id:
            qs = qs.filter(device_id=device_id)
        record = qs.first()
        if not record:
            return Response({}, status=200)
        return Response(self.get_serializer(record).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        device_id = request.query_params.get("device_id")
        qs = self.get_queryset()
        if device_id:
            qs = qs.filter(device_id=device_id)
        record = qs.first()
        if not record:
            return Response({"device_id": device_id, "latest": None}, status=200)
        # Extract ESP32-style fields if present
        payload = record.payload or {}
        data = {
            "device_id": record.device_id,
            "mode": payload.get("mode"),
            "counts": {
                "basic": payload.get("count1"),
                "standard": payload.get("count2"),
                "premium": payload.get("count3"),
            },
            "on_time": {
                "basic": payload.get("type1"),
                "standard": payload.get("type2"),
                "premium": payload.get("type3"),
            },
            "created_at": record.created_at,
        }
        return Response(data)


@api_view(["POST"]) 
@permission_classes([permissions.AllowAny])
def iot_ingest(request):
    """Accept ESP32 form-urlencoded payload and store as TelemetryRecord.

    Expected fields:
      - mode: "status" or one of BASIC|STANDARD|PREMIUM
      - macaddr: device identifier
      - type1, type2, type3
      - count1, count2, count3
      - timestamp: ESP32 device timestamp (optional)
    """
    mode = request.data.get("mode")
    macaddr = request.data.get("macaddr")
    type1 = request.data.get("type1")
    type2 = request.data.get("type2")
    type3 = request.data.get("type3")
    count1 = request.data.get("count1")
    count2 = request.data.get("count2")
    count3 = request.data.get("count3")
    device_timestamp = request.data.get("timestamp")
    rtc_available_raw = request.data.get("rtc_available", None)
    sd_available_raw = request.data.get("sd_available", None)
    rtc_available = None if rtc_available_raw is None else str(rtc_available_raw).lower() == "true"
    sd_available = None if sd_available_raw is None else str(sd_available_raw).lower() == "true"

    if not macaddr:
        return Response({"detail": "macaddr required"}, status=status.HTTP_400_BAD_REQUEST)

    # Parse device timestamp if provided
    occurred_at = timezone.now()
    if device_timestamp:
        parsed = _parse_device_timestamp(device_timestamp)
        if parsed:
            occurred_at = parsed

    # Create or update device status
    device_status, created = DeviceStatus.objects.get_or_create(
        device_id=str(macaddr),
        defaults={
            'wifi_connected': True,
            'rtc_available': bool(rtc_available) if rtc_available is not None else False,
            'sd_card_available': bool(sd_available) if sd_available is not None else False,
            'current_count_basic': _safe_number(count1) or 0,
            'current_count_standard': _safe_number(count2) or 0,
            'current_count_premium': _safe_number(count3) or 0,
            'device_timestamp': device_timestamp,
        }
    )
    
    if not created:
        device_status.wifi_connected = True
        # Only update flags if provided in this request. This avoids event posts clearing flags.
        if rtc_available is not None:
            device_status.rtc_available = rtc_available
        if sd_available is not None:
            device_status.sd_card_available = sd_available
        device_status.current_count_basic = _safe_number(count1) or 0
        device_status.current_count_standard = _safe_number(count2) or 0
        device_status.current_count_premium = _safe_number(count3) or 0
        device_status.device_timestamp = device_timestamp
        device_status.save()

    # Create telemetry record
    record = TelemetryRecord.objects.create(
        device_id=str(macaddr),
        payload={
            "mode": mode,
            "type1": _safe_number(type1),
            "type2": _safe_number(type2),
            "type3": _safe_number(type3),
            "count1": _safe_number(count1),
            "count2": _safe_number(count2),
            "count3": _safe_number(count3),
            "timestamp": device_timestamp,
        },
    )

    # Determine event type (status = heartbeat)
    event_type = mode if mode in {"BASIC", "STANDARD", "PREMIUM", "status"} else "status"

    # Persist events only for real triggers (exclude heartbeat "status")
    if event_type != "status":
        TelemetryEvent.objects.create(
            device_id=str(macaddr),
            event_type=event_type,
            count_basic=_safe_number(count1),
            count_standard=_safe_number(count2),
            count_premium=_safe_number(count3),
            occurred_at=occurred_at,
            device_timestamp=device_timestamp,
            wifi_status=True,
            payload={
                "type1": _safe_number(type1),
                "type2": _safe_number(type2),
                "type3": _safe_number(type3),
            },
        )

        # Update daily statistics only for real events
        _update_daily_statistics(str(macaddr), event_type, occurred_at)

    return Response({"status": "ok", "id": record.id})


def _parse_device_timestamp(value):
    """Parse ESP32 device timestamp format: '2024-01-15 14:30:25'"""
    try:
        if not value:
            return None
        # ESP32 format: "2024-01-15 14:30:25" - Now synced with NTP (Kuala Lumpur time)
        dt = datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
        return timezone.make_aware(dt)
    except Exception:
        return None

def _parse_timestamp(value):
    try:
        # epoch seconds
        if str(value).isdigit():
            return timezone.datetime.fromtimestamp(int(value), tz=timezone.utc)
        # ISO 8601
        from django.utils.dateparse import parse_datetime
        dt = parse_datetime(str(value))
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def _update_daily_statistics(device_id, event_type, occurred_at):
    """Update daily usage statistics"""
    try:
        date = occurred_at.date()
        stats, created = UsageStatistics.objects.get_or_create(
            device_id=device_id,
            date=date,
            defaults={
                'first_event': occurred_at,
                'last_event': occurred_at,
            }
        )
        
        if not created:
            if not stats.first_event or occurred_at < stats.first_event:
                stats.first_event = occurred_at
            if not stats.last_event or occurred_at > stats.last_event:
                stats.last_event = occurred_at
        
        # Update counts based on event type
        if event_type == "BASIC":
            stats.basic_count += 1
        elif event_type == "STANDARD":
            stats.standard_count += 1
        elif event_type == "PREMIUM":
            stats.premium_count += 1
        
        stats.total_events += 1
        stats.save()
    except Exception as e:
        print(f"Error updating daily statistics: {e}")


class TelemetryEventViewSet(mixins.ListModelMixin,
                            mixins.RetrieveModelMixin,
                            viewsets.GenericViewSet):
    queryset = TelemetryEvent.objects.all()
    serializer_class = TelemetryEventSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        device_id = self.request.query_params.get("device_id")
        days = self.request.query_params.get("days")
        exclude_status = self.request.query_params.get("exclude_status")
        
        if device_id:
            qs = qs.filter(device_id=device_id)
            
        if days:
            from datetime import timedelta
            from django.utils import timezone
            days_int = int(days)
            qs = qs.filter(occurred_at__gte=timezone.now() - timedelta(days=days_int))
            
        if exclude_status:
            qs = qs.exclude(event_type='status')
            
        return qs.order_by('-occurred_at')

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """Get usage analytics for a device"""
        device_id = request.query_params.get("device_id")
        days = int(request.query_params.get("days", 7))
        
        if not device_id:
            return Response({"detail": "device_id required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use consistent time range for both queries
        end_datetime = timezone.now()
        start_datetime = end_datetime - timedelta(days=days)
        
        # Convert to dates for UsageStatistics (daily aggregated data)
        end_date = end_datetime.date()
        start_date = start_datetime.date()
        
        # Get daily statistics
        daily_stats = UsageStatistics.objects.filter(
            device_id=device_id,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        # Get recent events (exclude heartbeats/status) - use same time range
        recent_events = TelemetryEvent.objects.filter(
            device_id=device_id,
            occurred_at__gte=start_datetime,
            occurred_at__lte=end_datetime
        ).exclude(event_type='status').order_by('-occurred_at')[:50]
        
        # Calculate totals from UsageStatistics (daily aggregated data)
        total_events = daily_stats.aggregate(
            total=Sum('total_events'),
            basic=Sum('basic_count'),
            standard=Sum('standard_count'),
            premium=Sum('premium_count')
        )
        
        # Also calculate totals from individual events for comparison
        event_totals = recent_events.aggregate(
            total_events=Count('id'),
            basic_events=Count('id', filter=Q(event_type='BASIC')),
            standard_events=Count('id', filter=Q(event_type='STANDARD')),
            premium_events=Count('id', filter=Q(event_type='PREMIUM'))
        )
        
        data = {
            "device_id": device_id,
            "period": {
                "start_date": start_datetime.isoformat(),
                "end_date": end_datetime.isoformat(),
                "days": days
            },
            "totals": {
                "total": event_totals['total_events'] or 0,
                "basic": event_totals['basic_events'] or 0,
                "standard": event_totals['standard_events'] or 0,
                "premium": event_totals['premium_events'] or 0
            },
            "daily_stats": UsageStatisticsSerializer(daily_stats, many=True).data,
            "recent_events": TelemetryEventSerializer(recent_events, many=True).data
        }
        
        return Response(data)


class DeviceStatusViewSet(mixins.ListModelMixin,
                         mixins.RetrieveModelMixin,
                         viewsets.GenericViewSet):
    queryset = DeviceStatus.objects.all()
    serializer_class = DeviceStatusSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["get"], url_path="online")
    def online_devices(self, request):
        """Get list of online devices"""
        recent_threshold = timezone.now() - timedelta(minutes=5)
        online_devices = self.get_queryset().filter(last_seen__gte=recent_threshold)
        return Response(DeviceStatusSerializer(online_devices, many=True).data)

    @action(detail=False, methods=["get"], url_path="all")
    def all_devices(self, request):
        """Get list of all devices (online and offline)"""
        all_devices = self.get_queryset().order_by('-last_seen')
        return Response(DeviceStatusSerializer(all_devices, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def export_data(request):
    """Export telemetry data as CSV"""
    device_id = request.query_params.get("device_id")
    days = int(request.query_params.get("days", 30))
    
    if not device_id:
        return Response({"detail": "device_id required"}, status=status.HTTP_400_BAD_REQUEST)
    
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    events = TelemetryEvent.objects.filter(
        device_id=device_id,
        occurred_at__gte=start_date,
        occurred_at__lte=end_date
    ).order_by('occurred_at')
    
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="telemetry_{device_id}_{start_date.date()}_to_{end_date.date()}.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Timestamp', 'Device Timestamp', 'Event Type', 'Basic Count', 'Standard Count', 'Premium Count', 'WiFi Status'])
    
    for event in events:
        writer.writerow([
            event.occurred_at.isoformat(),
            event.device_timestamp or '',
            event.event_type,
            event.count_basic or 0,
            event.count_standard or 0,
            event.count_premium or 0,
            'Connected' if event.wifi_status else 'Disconnected'
        ])
    
    return response


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def flush_all_data(request):
    """Dangerous: wipe all telemetry tables. Intended for admin/testing via UI button.

    Deletes TelemetryEvent, TelemetryRecord, UsageStatistics, and DeviceStatus.
    """
    try:
        with transaction.atomic():
            TelemetryEvent.objects.all().delete()
            TelemetryRecord.objects.all().delete()
            UsageStatistics.objects.all().delete()
            DeviceStatus.objects.all().delete()
        return Response({"status": "flushed"})
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _safe_number(value):
    try:
        if value is None:
            return None
        # try int first, then float
        iv = int(str(value))
        return iv
    except Exception:
        try:
            fv = float(str(value))
            return fv
        except Exception:
            return None


class OutletViewSet(viewsets.ModelViewSet):
    """CRUD operations for Outlets"""
    queryset = Outlet.objects.all()
    serializer_class = OutletSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class MachineViewSet(viewsets.ModelViewSet):
    """CRUD operations for Machines"""
    queryset = Machine.objects.select_related('outlet').all()
    serializer_class = MachineSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        qs = super().get_queryset()
        outlet_id = self.request.query_params.get('outlet_id')
        is_active = self.request.query_params.get('is_active')
        device_id = self.request.query_params.get('device_id')
        
        if outlet_id:
            qs = qs.filter(outlet_id=outlet_id)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        if device_id:
            # Filter by current device_id
            qs = qs.filter(devices__device_id=device_id, devices__is_active=True)
        return qs
    
    @action(detail=False, methods=["get"], url_path="unregistered")
    def unregistered_devices(self, request):
        """Get devices that have telemetry data but are not registered as machines"""
        registered_device_ids = set(MachineDevice.objects.values_list('device_id', flat=True))
        unregistered_devices = DeviceStatus.objects.exclude(device_id__in=registered_device_ids)
        return Response(DeviceStatusSerializer(unregistered_devices, many=True).data)
    
    @action(detail=False, methods=["post"], url_path="register")
    def register_device(self, request):
        """Register a device as a machine to an outlet"""
        device_id = request.data.get('device_id')
        outlet_id = request.data.get('outlet_id')
        name = request.data.get('name', '')
        
        if not device_id or not outlet_id:
            return Response({"detail": "device_id and outlet_id required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            outlet = Outlet.objects.get(id=outlet_id)
        except Outlet.DoesNotExist:
            return Response({"detail": "Outlet not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if MachineDevice.objects.filter(device_id=device_id, is_active=True).exists():
            return Response({"detail": "Device already registered"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create machine
        machine = Machine.objects.create(
            outlet=outlet,
            name=name or f"Machine {device_id[-6:]}"
        )
        
        # Create machine device relationship
        MachineDevice.objects.create(
            machine=machine,
            device_id=device_id,
            is_active=True
        )
        
        return Response(MachineSerializer(machine).data, status=status.HTTP_201_CREATED)
