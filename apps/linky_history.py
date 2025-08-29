from zoneinfo import ZoneInfo
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
import yaml
from pathlib import Path

TZ = ZoneInfo("Europe/Paris")
SECRETS = Path("/config/secrets.yaml")
DAYS = 15  # J-1 à J-15

def _load_db_url():
    with open(SECRETS, "r") as f:
        secrets = yaml.safe_load(f)
    return secrets["recorder_db_url"]

def _get_engine():
    db_url = _load_db_url()
    return create_engine(db_url, pool_pre_ping=True, pool_recycle=3600)

def _local_midnight_utc_bounds(d: date):
    """Retourne (start_utc, end_utc) pour la journée locale d (Europe/Paris)."""
    start_local = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=TZ)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(ZoneInfo("UTC")), end_local.astimezone(ZoneInfo("UTC"))

def _numeric_diff_for_day(conn, entity_id: str, day: date):
    """max(state) - min(state) entre minuit et 23:59:59 (jour local)."""
    start_utc, end_utc = _local_midnight_utc_bounds(day)
    q = text("""
        SELECT
          MAX(CAST(state AS DECIMAL(16,6))) AS max_v,
          MIN(CAST(state AS DECIMAL(16,6))) AS min_v
        FROM states
        WHERE entity_id = :entity_id
          AND state REGEXP '^[0-9]+(\\.[0-9]+)?$'
          AND last_updated >= :start_ts
          AND last_updated < :end_ts
    """)
    r = conn.execute(q, {"entity_id": entity_id, "start_ts": start_utc, "end_ts": end_utc}).first()
    if not r or r[0] is None or r[1] is None:
        return 0.0
    max_v, min_v = float(r[0]), float(r[1])
    return max(0.0, max_v - min_v)

def _list_linky_sensors(conn):
    q = text("""
        SELECT DISTINCT entity_id
        FROM states
        WHERE entity_id LIKE 'sensor.linky_tempo_index_%'
    """)
    return [row[0] for row in conn.execute(q)]

def _update_all():
    engine = _get_engine()
    with engine.connect() as conn:
        sensors = _list_linky_sensors(conn)
        today_local = datetime.now(TZ).date()
        days = [(today_local - timedelta(days=i)) for i in range(1, DAYS + 1)]

        updated = 0
        for entity_id in sensors:
            history = {}
            for d in days:
                history[d.isoformat()] = _numeric_diff_for_day(conn, entity_id, d)

            # state = conso J-1
            state_value = history[days[0].isoformat()]
            target = f"{entity_id}_week"

            state.set(target, state=state_value, attributes=history)
            updated += 1

        log.info(f"linky_history: {updated} sensors mis à jour")

# --- Déclencheurs ---

@time_trigger("cron(0 0 * * *)")  # tous les jours à minuit
def _nightly_job():
    _update_all()

@service("refresh_linky_history")
def refresh_linky_history():
    """
    Service manuel : pyscript.refresh_linky_history
    """
    _update_all()
