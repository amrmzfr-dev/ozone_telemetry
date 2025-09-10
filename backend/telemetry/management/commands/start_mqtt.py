from django.core.management.base import BaseCommand
from telemetry.mqtt_client import mqtt_client
import signal
import sys

class Command(BaseCommand):
    help = 'Start MQTT client to receive telemetry data'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting MQTT client...')
        )
        
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
        mqtt_client.connect()
        
        if mqtt_client.connected:
            self.stdout.write(
                self.style.SUCCESS('MQTT client started successfully!')
            )
            self.stdout.write('Press Ctrl+C to stop...')
            
            # Keep the process running
            try:
                while True:
                    import time
                    time.sleep(1)
            except KeyboardInterrupt:
                signal_handler(None, None)
        else:
            self.stdout.write(
                self.style.ERROR('Failed to start MQTT client')
            )
