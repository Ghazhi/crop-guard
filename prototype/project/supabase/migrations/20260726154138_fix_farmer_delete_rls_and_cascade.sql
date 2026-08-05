-- 1. Add DELETE policy on farmers (staff/admin only, same org)
CREATE POLICY "Staff and admin can delete farmers in their org"
  ON farmers FOR DELETE
  TO authenticated
  USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- 2. Change enrollment_workflow FK to CASCADE so farmer deletion cleans up workflow history
ALTER TABLE enrollment_workflow
  DROP CONSTRAINT enrollment_workflow_farmer_id_fkey,
  ADD CONSTRAINT enrollment_workflow_farmer_id_fkey
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE;
