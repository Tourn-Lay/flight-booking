import time

from django.core.management.base import BaseCommand
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Block until the default database accepts connections."

    def handle(self, *args, **options):
        for attempt in range(1, 61):
            try:
                connections["default"].cursor()
                self.stdout.write(self.style.SUCCESS("Database is ready."))
                return
            except OperationalError:
                self.stdout.write(f"Database unavailable (attempt {attempt}/60), retrying in 2s...")
                time.sleep(2)
        raise SystemExit("Database never became available.")
