from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Item, User
from backend.security import hash_password


def seed_if_empty(db: Session) -> None:
    has_users = db.scalar(select(User.id).limit(1))
    if has_users:
        return

    student = User(
        username="2021-00001-PQ-0",
        full_name="Juan Dela Cruz",
        password_hash=hash_password("password"),
        role="student",
        approval_status="approved",
    )
    admin = User(
        username="admin",
        full_name="Campus Admin",
        password_hash=hash_password("password"),
        role="admin",
        approval_status="approved",
    )
    db.add_all([student, admin])
    db.commit()
    db.refresh(student)

    demo = [
        Item(type="lost", code="PUPLF-000001", name="Black umbrella", item_category="Accessories", building="Old Building", floor="2F", room="Library Area", loc="Library, 2nd floor", description="Compact foldable.", status="approved", submitted_by=student.id),
        Item(type="found", code="PUPLF-000002", name="Student ID card", item_category="IDs/Documents", building="New Building", floor="1F", room="Canteen", loc="Canteen entrance", description="Turn in at security.", status="approved", submitted_by=student.id),
        Item(type="lost", code="PUPLF-000003", name="Scientific calculator", item_category="Electronics", building="Old Building", floor="3F", room="Room 301", loc="Room 301, Engineering Bldg", description="Casio fx-991.", status="approved", submitted_by=student.id),
        Item(type="found", code="PUPLF-000004", name="Green water bottle", item_category="Personal Items", building="New Building", floor="Roof Deck", room="Covered Court", loc="Covered court", description="Reunited with owner.", status="claimed", submitted_by=student.id),
        Item(type="lost", code="PUPLF-000005", name="Navy blue hoodie", item_category="Clothing", building="Old Building", floor="4F", room="Faculty Room", loc="Gymnasium", description="Size M, PUP print on back.", status="pending", submitted_by=student.id),
    ]
    db.add_all(demo)
    db.commit()
