import pytest
import pytest_asyncio
from app.core.database import engine, Base
from app.db.seed import seed_database


@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_database()
    yield
    await engine.dispose()
