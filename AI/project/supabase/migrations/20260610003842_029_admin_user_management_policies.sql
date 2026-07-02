-- Admin can read all audit logs in their org
CREATE POLICY "Admin can view audit logs in their org"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    AND actor_id IN (
      SELECT id FROM users WHERE organisation_id = (
        SELECT organisation_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Ensure admin can deactivate/reactivate users (update is_active)
-- Policy already exists from migration 007, but ensure it covers is_active + must_change_password

-- Admin can delete users from their org (soft: is_active = false is handled by update)
-- No hard DELETE policy needed

-- Staff and admin can also view audit logs (read-only)
CREATE POLICY "Staff can view audit logs in their org"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('staff')
    AND actor_id IN (
      SELECT id FROM users WHERE organisation_id = (
        SELECT organisation_id FROM users WHERE id = auth.uid()
      )
    )
  );
