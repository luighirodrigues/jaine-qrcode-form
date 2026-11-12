CREATE TABLE leads (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL,
  phone varchar(16) NOT NULL,
  email varchar(254) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  submission_key uuid NOT NULL UNIQUE
);

CREATE INDEX leads_created_at_idx ON leads (created_at);
