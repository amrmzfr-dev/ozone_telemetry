from rest_framework import serializers
from .models import TelemetryRecord, TelemetryEvent


class TelemetryRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelemetryRecord
        fields = [
            "id",
            "device_id",
            "temperature_c",
            "humidity_percent",
            "pressure_hpa",
            "voltage_v",
            "rssi_dbm",
            "payload",
            "created_at",
        ]


class TelemetryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelemetryEvent
        fields = [
            "id",
            "device_id",
            "event_type",
            "count_basic",
            "count_standard",
            "count_premium",
            "occurred_at",
            "payload",
        ]

