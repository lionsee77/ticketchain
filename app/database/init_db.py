"""Database initialization script to create tables and default roles"""

import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import engine, SessionLocal, Base
from database.db_models import Role, User
from services.auth_service import auth_service


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


def create_default_roles():
    """Create default roles"""
    print("Creating default roles...")

    db = SessionLocal()
    try:
        # Check if roles already exist
        existing_roles = db.query(Role).count()
        if existing_roles > 0:
            print(f"Roles already exist ({existing_roles} found), skipping...")
            return

        # Create default roles
        default_roles = [
            {"name": "user", "description": "Regular user with basic permissions"},
            {
                "name": "organiser",
                "description": "Event organiser with event management permissions",
            },
            {
                "name": "admin",
                "description": "Administrator with full system permissions",
            },
        ]

        for role_data in default_roles:
            new_role = Role(
                name=role_data["name"], description=role_data["description"]
            )
            db.add(new_role)

        db.commit()
        print(f"✅ Created {len(default_roles)} default roles")

        # List created roles
        all_roles = db.query(Role).all()
        print(f"Available roles: {[role.name for role in all_roles]}")

    except Exception as e:
        print(f"❌ Error creating roles: {e}")
        db.rollback()
    finally:
        db.close()


def create_initial_admin():
    """Create initial admin user if no admin users exist"""
    print("Setting up initial admin user...")

    db = SessionLocal()
    try:
        # Check if any admin users exist
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("❌ Admin role not found! Make sure roles are created first.")
            return

        # Check if any users have admin role
        existing_admins = (
            db.query(User).join(User.roles).filter(Role.name == "admin").count()
        )
        if existing_admins > 0:
            print(f"Admin users already exist ({existing_admins} found), skipping...")
            return

        # Create initial admin user
        print("Creating initial admin user...")

        admin_user = auth_service.create_user(
            db=db,
            username="admin",
            email="admin@ticketchain.com",
            password="password123",
            full_name="System Administrator",
            roles=["admin", "user"],
            account_index=0,
            wallet_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            private_key="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        )

        print("✅ Initial admin user created successfully!")
        print("   Username: admin")
        print("   Email: admin@ticketchain.com")
        print("   Password: password123")
        print(f"   Roles: {[role.name for role in admin_user.roles]}")
        print(f"   Wallet Address: {admin_user.wallet_address}")
        print(f"   Wallet Priv Key: {admin_user.private_key}")
        print(f"   Hardhat account Index: {admin_user.account_index}")
        
        print("⚠️  IMPORTANT: Change the default password in production!")

    except Exception as e:
        print(f"❌ Error creating initial admin: {e}")
        db.rollback()
    finally:
        db.close()

def create_initial_organiser():
    """Create initial organiser user if no organiser users exist"""
    print("Setting up initial organiser user...")

    db = SessionLocal()
    try:
        # Check if organiser role exists
        organiser_role = db.query(Role).filter(Role.name == "organiser").first()
        if not organiser_role:
            print("❌ Organiser role not found! Make sure roles are created first.")
            return

        # Check if any users have organiser role
        existing_organisers = (
            db.query(User).join(User.roles).filter(Role.name == "organiser").count()
        )
        if existing_organisers > 0:
            print(f"Organiser users already exist ({existing_organisers} found), skipping...")
            return

        # Create initial organiser user
        print("Creating initial organiser user...")

        organiser_user = auth_service.create_user(
            db=db,
            username="organiser",
            email="organiser@ticketchain.com",
            password="password123",
            full_name="Event Organiser",
            roles=["organiser", "user"],
            account_index=1,
            wallet_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            private_key="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        )

        print("✅ Initial organiser user created successfully!")
        print("   Username: organiser")
        print("   Email: organiser@ticketchain.com")
        print("   Password: password123")
        print(f"   Roles: {[role.name for role in organiser_user.roles]}")
        print(f"   Wallet Address: {organiser_user.wallet_address}")
        print(f"   Wallet Priv Key: {organiser_user.private_key}")
        print(f"   Hardhat account Index: {organiser_user.account_index}")
        
        print("⚠️  IMPORTANT: Change the default password in production!")

    except Exception as e:
        print(f"❌ Error creating initial organiser: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    """Initialize database"""
    print("🔧 Initializing TicketChain database...")

    try:
        # Create tables
        create_tables()

        # Create default roles
        create_default_roles()

        # Create initial admin user
        create_initial_admin()
        create_initial_organiser()

        print("✅ Database initialization completed successfully!")

    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
