from rest_framework import serializers
from .models import TelemetryRecord, TelemetryEvent, DeviceStatus, UsageStatistics


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
            "device_timestamp",
            "wifi_status",
            "payload",
        ]


class DeviceStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceStatus
        fields = [
            "device_id",
            "last_seen",
            "wifi_connected",
            "rtc_available",
            "sd_card_available",
            "current_count_basic",
            "current_count_standard",
            "current_count_premium",
            "uptime_seconds",
            "device_timestamp",
        ]


class UsageStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageStatistics
        fields = [
            "device_id",
            "date",
            "basic_count",
            "standard_count",
            "premium_count",
            "total_events",
            "first_event",
            "last_event",
        ]

