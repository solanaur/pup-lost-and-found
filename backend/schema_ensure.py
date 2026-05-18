from sqlalchemy import inspect, text

from backend.database import engine


def ensure_schema_updates() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        if "users" in insp.get_table_names():
            user_cols = {c["name"] for c in insp.get_columns("users")}
            if "full_name" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NOT NULL DEFAULT ''"))
            if "approval_status" not in user_cols:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN approval_status "
                        "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'"
                    )
                )
            if "id_photo_data" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN id_photo_data TEXT NOT NULL"))
            conn.execute(text("ALTER TABLE users MODIFY COLUMN id_photo_data LONGTEXT NOT NULL"))
            if "login_count" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN login_count INT NOT NULL DEFAULT 0"))
            if "last_login_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL"))
            conn.execute(text("UPDATE users SET approval_status='approved' WHERE role='admin'"))
            conn.execute(text("UPDATE users SET full_name=username WHERE full_name='' OR full_name IS NULL"))

        if "items" in insp.get_table_names():
            item_cols = {c["name"] for c in insp.get_columns("items")}
            add_cols = [
                ("code", "VARCHAR(40) NOT NULL DEFAULT ''"),
                ("item_category", "VARCHAR(80) NOT NULL DEFAULT 'General'"),
                ("color", "VARCHAR(60) NOT NULL DEFAULT ''"),
                ("building", "VARCHAR(40) NOT NULL DEFAULT ''"),
                ("floor", "VARCHAR(20) NOT NULL DEFAULT ''"),
                ("room", "VARCHAR(40) NOT NULL DEFAULT ''"),
                ("photo_data", "TEXT NOT NULL"),
            ]
            for col, ddl in add_cols:
                if col not in item_cols:
                    conn.execute(text(f"ALTER TABLE items ADD COLUMN {col} {ddl}"))
            conn.execute(text("ALTER TABLE items MODIFY COLUMN photo_data LONGTEXT NOT NULL"))
            conn.execute(text("UPDATE items SET code = CONCAT('PUPLF-', LPAD(id,6,'0')) WHERE code = '' OR code IS NULL"))
            conn.execute(text("UPDATE items SET item_category='General' WHERE item_category='' OR item_category IS NULL"))

