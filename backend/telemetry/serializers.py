from rest_framework import serializers
from .models import TelemetryRecord, TelemetryEvent, DeviceStatus, UsageStatistics, Outlet, Machine


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


class OutletSerializer(serializers.ModelSerializer):
    machine_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Outlet
        fields = [
            "id",
            "name",
            "location",
            "address",
            "contact_person",
            "contact_phone",
            "is_active",
            "created_at",
            "updated_at",
            "machine_count",
        ]
    
    def get_machine_count(self, obj):
        return obj.machines.filter(is_active=True).count()


class MachineSerializer(serializers.ModelSerializer):
    outlet_name = serializers.CharField(source='outlet.name', read_only=True)
    outlet_location = serializers.CharField(source='outlet.location', read_only=True)
    device_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Machine
        fields = [
            "id",
            "device_id",
            "outlet",
            "outlet_name",
            "outlet_location",
            "name",
            "machine_type",
            "is_active",
            "installed_date",
            "last_maintenance",
            "notes",
            "created_at",
            "updated_at",
            "device_status",
        ]
    
    def get_device_status(self, obj):
        try:
            from .models import DeviceStatus
            status = DeviceStatus.objects.get(device_id=obj.device_id)
            return DeviceStatusSerializer(status).data
        except DeviceStatus.DoesNotExist:
            return None

