# Database relationships

```mermaid
erDiagram
    USERS ||--o{ RESERVATIONS : organizes
    USERS o|--o{ RESERVATIONS : cancels
    USERS ||--o{ SESSIONS : authenticates
    RESOURCES ||--o{ RESERVATIONS : reserved_for
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        text password_hash
        text role
        timestamptz created_at
    }
    SESSIONS {
        text token_hash PK
        uuid user_id FK
        timestamptz expires_at
        timestamptz created_at
    }
    RESOURCES {
        uuid id PK
        varchar name
        text category
        varchar location
        integer capacity
        varchar description
        timestamptz archived_at
        timestamptz created_at
        timestamptz updated_at
    }
    RESERVATIONS {
        uuid id PK
        uuid resource_id FK
        uuid user_id FK
        varchar title
        varchar notes
        timestamptz starts_at
        timestamptz ends_at
        integer attendees
        timestamptz cancelled_at
        uuid cancelled_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    LOGIN_ATTEMPTS {
        varchar email PK
        integer attempts
        timestamptz window_started_at
    }
```

Every reservation has one resource and one organizer. A cancelled reservation also records the user who cancelled it. Resources and reservation history are retained, rather than deleted. Login attempts are keyed by the submitted email address, including addresses without an account, so this table deliberately has no user foreign key. `schema_migrations` is operational migration bookkeeping, not part of the business model.

Active resource names are unique without regard to case. PostgreSQL's `reservations_no_overlap` exclusion constraint compares the resource ID and the half-open `[start, end)` time range of non-cancelled reservations. Adjacent reservations are allowed; overlapping reservations for the same resource are rejected, including concurrent inserts.

The diagram can be shared using this file's GitHub page once these changes are pushed. GitHub renders the Mermaid diagram directly. A standalone [SVG version](er-diagram.svg) is also included.
