# Copilot Instructions for Babylog

## Project Context
Babylog is a baby tracking app with FastAPI backend (Python) and React frontend (JSX). Database is Supabase PostgreSQL.

## Code Style

### Python (Backend)
- Python 3.11+ syntax
- Use `datetime.now(timezone.utc)` not `datetime.utcnow()`
- SQLAlchemy ORM for database operations
- FastAPI dependency injection for auth
- Type hints encouraged but not strictly required
- Docstrings for public functions

### JavaScript/React (Frontend)
- React 18 with hooks
- JSX files, NOT TypeScript
- Functional components only
- Use existing hooks: useAuth, useBaby, useOfflineSync
- lucide-react for icons
- sonner for toast notifications
- framer-motion for animations
- CSS variables for theming

## Patterns to Follow

### API Endpoints
```python
@router.get("/items")
def list_items(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.baby.has(user_id=user_id)).all()
```

### React Components
```jsx
import { useState } from 'react';
import { SomeIcon } from 'lucide-react';

function MyComponent({ baby }) {
    const [loading, setLoading] = useState(false);
    // ...
}
```

### API Calls
```javascript
import { api } from '../api/client';
const data = await api.get(`/babies/${babyId}/feedings`);
```

## Security
- Always filter by user_id in backend queries
- Use auth dependency on all protected routes
- Validate baby ownership before operations
- Sanitize HTML with DOMPurify in frontend

## Don't
- Don't use class components
- Don't use TypeScript (project uses plain JS)
- Don't use datetime.utcnow() (deprecated)
- Don't query without user_id filter
- Don't add new npm dependencies without necessity
