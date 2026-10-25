"""
Check Registry for SEO GPS.
Discovers and loads all BaseCheck subclasses located in engine/checks/ automatically.
Author: Ismail El Asiouty
"""
import importlib
import inspect
import pkgutil
from pathlib import Path
from typing import Dict, List, Type
from .base import BaseCheck


class CheckRegistry:
    def __init__(self):
        self._checks: Dict[str, BaseCheck] = {}
        self.load_checks()

    def load_checks(self):
        """Discovers all modules in the checks directory and registers valid subclasses."""
        package_dir = Path(__file__).parent
        for _, module_name, is_pkg in pkgutil.iter_modules([str(package_dir)]):
            if is_pkg or module_name in ("base", "registry"):
                continue

            try:
                module = importlib.import_module(f"engine.checks.{module_name}")
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (
                        inspect.isclass(attr)
                        and issubclass(attr, BaseCheck)
                        and attr is not BaseCheck
                        and getattr(attr, "id", None)
                    ):
                        instance = attr()
                        self._checks[instance.id] = instance
            except Exception as e:
                print(f"[CheckRegistry] Warning: Failed to load check from {module_name}: {e}")

    def get_check(self, check_id: str) -> BaseCheck:
        return self._checks.get(check_id)

    def get_all_checks(self) -> List[BaseCheck]:
        return list(self._checks.values())

    def get_all_metadata(self) -> List[dict]:
        return [check.get_metadata() for check in self._checks.values()]


# Global registry instance
registry = CheckRegistry()
