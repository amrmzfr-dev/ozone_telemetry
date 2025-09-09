from django.db import models


class TelemetryRecord(models.Model):
    device_id = models.CharField(max_length=128, db_index=True)
    temperature_c = models.FloatField(null=True, blank=True)
    humidity_percent = models.FloatField(null=True, blank=True)
    pressure_hpa = models.FloatField(null=True, blank=True)
    voltage_v = models.FloatField(null=True, blank=True)
    rssi_dbm = models.IntegerField(null=True, blank=True)
    payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.device_id} @ {self.created_at.isoformat()}"


class TelemetryEvent(models.Model):
    EVENT_BASIC = "BASIC"
    EVENT_STANDARD = "STANDARD"
    EVENT_PREMIUM = "PREMIUM"
    EVENT_STATUS = "status"
    EVENT_CHOICES = [
        (EVENT_BASIC, "BASIC"),
        (EVENT_STANDARD, "STANDARD"),
        (EVENT_PREMIUM, "PREMIUM"),
        (EVENT_STATUS, "Status Update"),
    ]

    device_id = models.CharField(max_length=128, db_index=True)
    event_type = models.CharField(max_length=16, choices=EVENT_CHOICES)
    count_basic = models.IntegerField(null=True, blank=True)
    count_standard = models.IntegerField(null=True, blank=True)
    count_premium = models.IntegerField(null=True, blank=True)
    occurred_at = models.DateTimeField(db_index=True)
    device_timestamp = models.CharField(max_length=25, null=True, blank=True, help_text="Timestamp from ESP32 device")
    wifi_status = models.BooleanField(null=True, blank=True, help_text="WiFi connection status")
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]

    def __str__(self) -> str:
        return f"{self.device_id} {self.event_type} @ {self.occurred_at.isoformat()}"


class DeviceStatus(models.Model):
    """Track current status of each device"""
    device_id = models.CharField(max_length=128, unique=True, db_index=True)
    last_seen = models.DateTimeField(auto_now=True)
    wifi_connected = models.BooleanField(default=False)
    rtc_available = models.BooleanField(default=False)
    sd_card_available = models.BooleanField(default=False)
    current_count_basic = models.IntegerField(default=0)
    current_count_standard = models.IntegerField(default=0)
    current_count_premium = models.IntegerField(default=0)
    uptime_seconds = models.IntegerField(null=True, blank=True)
    device_timestamp = models.CharField(max_length=25, null=True, blank=True)
    
    class Meta:
        ordering = ["-last_seen"]

    def __str__(self) -> str:
        return f"{self.device_id} - Last seen: {self.last_seen}"


class UsageStatistics(models.Model):
    """Daily usage statistics for analytics"""
    device_id = models.CharField(max_length=128, db_index=True)
    date = models.DateField(db_index=True)
    basic_count = models.IntegerField(default=0)
    standard_count = models.IntegerField(default=0)
    premium_count = models.IntegerField(default=0)
    total_events = models.IntegerField(default=0)
    first_event = models.DateTimeField(null=True, blank=True)
    last_event = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['device_id', 'date']
        ordering = ["-date", "-device_id"]

    def __str__(self) -> str:
        return f"{self.device_id} - {self.date}: {self.total_events} events"
