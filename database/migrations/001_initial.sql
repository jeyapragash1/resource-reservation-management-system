CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  category text NOT NULL CHECK (category IN ('Meeting room', 'Workspace', 'Equipment', 'Vehicle')),
  location varchar(160) NOT NULL,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
  description varchar(1000) NOT NULL DEFAULT '',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX resources_active_name_idx ON resources(lower(name)) WHERE archived_at IS NULL;

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id),
  user_id uuid NOT NULL REFERENCES users(id),
  title varchar(160) NOT NULL,
  notes varchar(1000) NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  attendees integer NOT NULL CHECK (attendees BETWEEN 1 AND 1000),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (ends_at - starts_at <= interval '7 days'),
  CHECK ((cancelled_at IS NULL) = (cancelled_by IS NULL)),
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (cancelled_at IS NULL)
);
CREATE INDEX reservations_user_start_idx ON reservations(user_id, starts_at DESC);
CREATE INDEX reservations_start_idx ON reservations(starts_at) WHERE cancelled_at IS NULL;

CREATE TABLE login_attempts (
  email varchar(254) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
