from django.core.management.base import BaseCommand
from django.conf import settings
import os
import sys
import signal

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ozontelemetry.settings')

import django
django.setup()

from telemetry.mqtt_client import mqtt_client

class Command(BaseCommand):
    help = 'Start MQTT client to receive telemetry data'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting MQTT client...')
        )
        
        try:
            # Set up signal handler for graceful shutdown
            def signal_handler(sig, frame):
                self.stdout.write(
                    self.style.WARNING('Shutting down MQTT client...')
                )
                mqtt_client.disconnect()
                sys.exit(0)
            
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
            # Connect to MQTT broker
            self.stdout.write(f'Connecting to MQTT broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}')
            mqtt_client.connect()
            
            # Wait a moment for connection
            import time
            time.sleep(2)
            
            if mqtt_client.connected:
                self.stdout.write(
                    self.style.SUCCESS('MQTT client started successfully!')
                )
                self.stdout.write('Press Ctrl+C to stop...')
                
                # Keep the process running
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    signal_handler(None, None)
            else:
                self.stdout.write(
                    self.style.ERROR('Failed to start MQTT client - not connected')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error starting MQTT client: {e}')
            )
            import traceback
            traceback.print_exc()
