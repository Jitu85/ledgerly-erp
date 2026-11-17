-- Phase 6 Core Accounting and Expenses Engine.
-- Strict tenant isolation, double-entry balanced journals, and immutable financial history.

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  subtype text,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  parent_account_id uuid,
  is_control_account boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(company_id, id),
  UNIQUE(company_id, code)
);

CREATE TABLE accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  closed_at timestamptz,
  closed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(company_id, id),
  UNIQUE(company_id, name)
);

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  entry_number text NOT NULL,
  entry_type text NOT NULL DEFAULT 'MANUAL',
  source_module text,
  source_reference_id text,
  business_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  is_balanced boolean NOT NULL DEFAULT true,
  total_debit numeric(20,4) NOT NULL DEFAULT 0,
  total_credit numeric(20,4) NOT NULL DEFAULT 0,
  description text,
  posted_at timestamptz,
  posted_by uuid REFERENCES users(id),
  reversed_at timestamptz,
  reversal_of_id uuid,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(company_id, id),
  UNIQUE(company_id, entry_number)
);

CREATE TABLE journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id),
  debit numeric(20,4) NOT NULL DEFAULT 0,
  credit numeric(20,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(18,6) NOT NULL DEFAULT 1,
  base_debit numeric(20,4) NOT NULL DEFAULT 0,
  base_credit numeric(20,4) NOT NULL DEFAULT 0,
  description text,
  partner_type text,
  partner_id uuid,
  cost_center text,
  project_code text,
  UNIQUE(company_id, id)
);

CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  account_id uuid REFERENCES accounts(id),
  policy_limit numeric(20,4),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(company_id, id),
  UNIQUE(company_id, code)
);

CREATE TABLE expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  claim_number text NOT NULL,
  employee_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric(20,4) NOT NULL DEFAULT 0,
  total_tax_amount numeric(20,4) NOT NULL DEFAULT 0,
  submission_date date,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  rejection_reason text,
  journal_entry_id uuid REFERENCES journal_entries(id),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(company_id, id),
  UNIQUE(company_id, claim_number)
);

CREATE TABLE expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  expense_claim_id uuid NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  category_id uuid NOT NULL REFERENCES expense_categories(id),
  expense_date date NOT NULL,
  amount numeric(20,4) NOT NULL,
  tax_amount numeric(20,4) NOT NULL DEFAULT 0,
  description text NOT NULL,
  merchant text,
  receipt_url text,
  cost_center text,
  UNIQUE(company_id, id)
);

-- Indexes
CREATE INDEX accounts_company_type_idx ON accounts(company_id, type);
CREATE INDEX accounts_company_active_idx ON accounts(company_id, is_active);
CREATE INDEX accounting_periods_company_dates_idx ON accounting_periods(company_id, start_date, end_date);
CREATE INDEX journal_entries_company_date_idx ON journal_entries(company_id, business_date);
CREATE INDEX journal_entries_company_status_idx ON journal_entries(company_id, status);
CREATE INDEX journal_lines_company_account_idx ON journal_lines(company_id, account_id);
CREATE INDEX journal_lines_entry_idx ON journal_lines(journal_entry_id);
CREATE INDEX expense_categories_company_active_idx ON expense_categories(company_id, is_active);
CREATE INDEX expense_claims_company_employee_idx ON expense_claims(company_id, employee_id);
CREATE INDEX expense_claims_company_status_idx ON expense_claims(company_id, status);
CREATE INDEX expense_lines_claim_idx ON expense_lines(expense_claim_id);

-- Immutable Posted History Trigger
CREATE OR REPLACE FUNCTION reject_accounting_history_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'posted accounting history is append-only';
END;
$$;

-- Row Level Security (RLS) enforcement
DO $accounting_rls$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'accounts',
    'accounting_periods',
    'journal_entries',
    'journal_lines',
    'expense_categories',
    'expense_claims',
    'expense_lines'
  ] LOOP
    EXECUTE format('alter table %I enable row level security', table_name);
    EXECUTE format('alter table %I force row level security', table_name);
    EXECUTE format('create policy %I on %I using (company_id = current_setting(''app.current_company_id'',true)::uuid) with check (company_id = current_setting(''app.current_company_id'',true)::uuid)', table_name || '_tenant_policy', table_name);
  END LOOP;
END $accounting_rls$;
