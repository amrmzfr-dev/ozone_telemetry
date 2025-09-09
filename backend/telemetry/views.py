from rest_framework import viewsets, mixins, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.utils import timezone
from .models import TelemetryRecord, TelemetryEvent
from .serializers import TelemetryRecordSerializer, TelemetryEventSerializer


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
    Optional header: X-API-Key
    """
    mode = request.data.get("mode")
    macaddr = request.data.get("macaddr")
    type1 = request.data.get("type1")
    type2 = request.data.get("type2")
    type3 = request.data.get("type3")
    count1 = request.data.get("count1")
    count2 = request.data.get("count2")
    count3 = request.data.get("count3")

    if not macaddr:
        return Response({"detail": "macaddr required"}, status=status.HTTP_400_BAD_REQUEST)

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
        },
    )
    # If mode is an event, create a TelemetryEvent. Allow optional 'ts' (ISO8601 or epoch seconds)
    event_type = None
    if mode in {"BASIC", "STANDARD", "PREMIUM"}:
        event_type = mode
    # parse timestamp
    ts_value = request.data.get("ts")
    occurred_at = timezone.now()
    if ts_value:
        parsed = _parse_timestamp(ts_value)
        if parsed:
            occurred_at = parsed
    if event_type:
        TelemetryEvent.objects.create(
            device_id=str(macaddr),
            event_type=event_type,
            count_basic=_safe_number(count1),
            count_standard=_safe_number(count2),
            count_premium=_safe_number(count3),
            occurred_at=occurred_at,
            payload={
                "type1": _safe_number(type1),
                "type2": _safe_number(type2),
                "type3": _safe_number(type3),
            },
        )
    return Response({"status": "ok", "id": record.id})


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
