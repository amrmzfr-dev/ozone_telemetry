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
    EVENT_CHOICES = [
        (EVENT_BASIC, "BASIC"),
        (EVENT_STANDARD, "STANDARD"),
        (EVENT_PREMIUM, "PREMIUM"),
    ]

    device_id = models.CharField(max_length=128, db_index=True)
    event_type = models.CharField(max_length=16, choices=EVENT_CHOICES)
    count_basic = models.IntegerField(null=True, blank=True)
    count_standard = models.IntegerField(null=True, blank=True)
    count_premium = models.IntegerField(null=True, blank=True)
    occurred_at = models.DateTimeField(db_index=True)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]

    def __str__(self) -> str:
        return f"{self.device_id} {self.event_type} @ {self.occurred_at.isoformat()}"
