/*
  # Fix remaining recursive farmer_fri_scores policy

  The old "Farmers select own scores" policy on farmer_fri_scores was missed
  in the previous fix because it has a different name from the policy we dropped
  ("Farmers view own FRI scores"). It still uses the recursive pattern:
    farmer_id IN (SELECT farmers.id FROM farmers WHERE farmers.user_id = auth.uid())

  Replace it with the non-recursive get_my_farmer_id() helper.
*/

DROP POLICY IF EXISTS "Farmers select own scores" ON farmer_fri_scores;

CREATE POLICY "Farmers select own scores"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());
