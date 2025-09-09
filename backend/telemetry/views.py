from rest_framework import viewsets, mixins, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.utils import timezone
from django.db.models import Sum, Count, Min, Max
from django.db.models.functions import TruncDate
from datetime import datetime, timedelta
from .models import TelemetryRecord, TelemetryEvent, DeviceStatus, UsageStatistics
from .serializers import TelemetryRecordSerializer, TelemetryEventSerializer, DeviceStatusSerializer, UsageStatisticsSerializer


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
            'current_count_basic': _safe_number(count1) or 0,
            'current_count_standard': _safe_number(count2) or 0,
            'current_count_premium': _safe_number(count3) or 0,
            'device_timestamp': device_timestamp,
        }
    )
    
    if not created:
        device_status.wifi_connected = True
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

    # Create telemetry event
    event_type = mode if mode in {"BASIC", "STANDARD", "PREMIUM", "status"} else "status"
    
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

    # Update daily statistics
    _update_daily_statistics(str(macaddr), event_type, occurred_at)

    return Response({"status": "ok", "id": record.id})


def _parse_device_timestamp(value):
    """Parse ESP32 device timestamp format: '2024-01-15 14:30:25'"""
    try:
        if not value:
            return None
        # ESP32 format: "2024-01-15 14:30:25"
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
        if device_id:
            qs = qs.filter(device_id=device_id)
        return qs

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """Get usage analytics for a device"""
        device_id = request.query_params.get("device_id")
        days = int(request.query_params.get("days", 7))
        
        if not device_id:
            return Response({"detail": "device_id required"}, status=status.HTTP_400_BAD_REQUEST)
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get daily statistics
        daily_stats = UsageStatistics.objects.filter(
            device_id=device_id,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        # Get recent events
        recent_events = TelemetryEvent.objects.filter(
            device_id=device_id,
            occurred_at__gte=timezone.now() - timedelta(days=days)
        ).order_by('-occurred_at')[:50]
        
        # Calculate totals
        total_events = daily_stats.aggregate(
            total=Sum('total_events'),
            basic=Sum('basic_count'),
            standard=Sum('standard_count'),
            premium=Sum('premium_count')
        )
        
        data = {
            "device_id": device_id,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "totals": total_events,
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
