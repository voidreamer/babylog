from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Baby(Base):
    __tablename__ = "babies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    owner_email = Column(String, nullable=True)
    name = Column(String, nullable=False)
    birth_date = Column(DateTime, nullable=True)
    shared_with_emails = Column(ARRAY(String), default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    feedings = relationship("Feeding", back_populates="baby", cascade="all, delete-orphan")
    diapers = relationship("Diaper", back_populates="baby", cascade="all, delete-orphan")
    sleeps = relationship("Sleep", back_populates="baby", cascade="all, delete-orphan")
    pumpings = relationship("Pumping", back_populates="baby", cascade="all, delete-orphan")


class Feeding(Base):
    __tablename__ = "feedings"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)  # 'formula', 'breast', 'bottle', 'solid'
    duration_minutes = Column(Integer, nullable=True)
    amount_ml = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="feedings")


class Diaper(Base):
    __tablename__ = "diapers"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)  # 'pee', 'poo', 'mixed'
    # Poo details
    poo_color = Column(String, nullable=True)  # 'yellow', 'brown', 'green', 'black', 'red', 'white', 'orange'
    poo_consistency = Column(String, nullable=True)  # 'liquid', 'soft', 'formed', 'hard', 'pellets'
    poo_amount = Column(String, nullable=True)  # 'small', 'medium', 'large', 'blowout'
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="diapers")


class Sleep(Base):
    __tablename__ = "sleeps"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="sleeps")
    
    @property
    def duration_minutes(self) -> int | None:
        if self.end_time and self.start_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return None


class Pumping(Base):
    __tablename__ = "pumpings"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    amount_ml = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="pumpings")
