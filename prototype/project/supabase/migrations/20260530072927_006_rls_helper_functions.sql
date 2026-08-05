/*
  # Helper Functions for RLS

  These functions are called inside policies to avoid repeating
  subqueries inline, improving readability and performance.

  ## Functions
    - get_my_role()        — returns current user's role from users table
    - get_my_org_id()      — returns current user's organisation_id
    - is_admin_or_staff()  — true if role is admin or staff
    - is_agent()           — true if role is agent
    - my_farmer_ids()      — set of farmer IDs the agent manages (via enrollments)
*/

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organisation_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('admin','staff') FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_agent_or_above()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role IN ('admin','staff','agent') FROM users WHERE id = auth.uid();
$$;
