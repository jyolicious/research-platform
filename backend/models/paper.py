from sqlalchemy import Column, String, Text, Date, ARRAY
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

class Paper(Base):
    __tablename__ = "papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    abstract = Column(Text)
    authors = Column(ARRAY(String))
    category = Column(String)
    published_date = Column(Date)
    status = Column(String, default="published")