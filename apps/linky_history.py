import mariadb
import datetime
import re
import yaml
from pathlib import Path

# Charger recorder_db_url depuis secrets.yaml
secrets_path = Path("/config/secrets.yaml")
with open(secrets_path, "r") as f:
    secrets = yaml.safe_load(f)

db_url = secrets["recorder_db_url"]

# Exemple: mysql://user:password@host/db?charset=utf8
m = re.match(r"^mysql:\/\/(.*?):(.*?)@(.*?)(?:\/(.*?))(?:\?.*)?$", db_url)
if not m:
    raise ValueError("recorder_db_url mal formaté")

DB_CONFIG = {
    "user": m.group(1),
    "password": m.group(2),
    "host": m.group(3),
    "port": 3306,
    "database": m.group(4),
}

@time_trigger("cron(0 0 * * *)")  # Tous les jours à minuit
def update_linky_history():
    try:
        conn = mariadb.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Récupérer tous les sensors linky tempo existants dans states
        cur.execute("""
            SELECT DISTINCT entity_id
            FROM states
            WHERE entity_id LIKE 'sensor.linky_tempo_index_%';
        """)
        sensors = [row[0] for row in cur.fetchall()]

        for sensor in sensors:
            query = f"""
                SELECT DATE(last_updated) as jour,
                       MAX(CAST(state AS DECIMAL(10,3))) - MIN(CAST(state AS DECIMAL(10,3))) as conso
                FROM states
                WHERE entity_id = '{sensor}'
                  AND state REGEXP '^[0-9]+(\\.[0-9]+)?$'
                  AND last_updated >= CURDATE() - INTERVAL 15 DAY
                GROUP BY DATE(last_updated)
                ORDER BY jour DESC;
            """
            cur.execute(query)
            rows = cur.fetchall()

            history = {}
            for jour, conso in rows:
                history[str(jour)] = float(conso) if conso is not None else 0.0

            yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
            state_value = history.get(yesterday, 0.0)

            sensor_name = sensor + "_week"
            state.set(sensor_name, state=state_value, attributes=history)

    except Exception as e:
        log.error(f"Erreur Linky History : {e}")
    finally:
        try:
            conn.close()
        except:
            pass
