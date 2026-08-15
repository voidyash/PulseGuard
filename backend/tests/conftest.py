"""Test configuration: pin the demo credentials used by the auth tests."""

import os

os.environ.setdefault("PULSEGUARD_DEMO_USERNAME", "demo")
os.environ.setdefault("PULSEGUARD_DEMO_PASSWORD", "demo-password")
