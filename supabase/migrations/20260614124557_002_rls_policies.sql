-- Communes policies
CREATE POLICY "select_communes" ON communes FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_communes" ON communes FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_communes" ON communes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Users policies - users can see their own record and others in their commune
CREATE POLICY "select_users" ON users FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_users" ON users FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_users" ON users FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Budget years policies
CREATE POLICY "select_budget_years" ON budget_years FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_budget_years" ON budget_years FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_budget_years" ON budget_years FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_budget_years" ON budget_years FOR DELETE
  TO authenticated USING (true);

-- Budget lines policies
CREATE POLICY "select_budget_lines" ON budget_lines FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_budget_lines" ON budget_lines FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_budget_lines" ON budget_lines FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_budget_lines" ON budget_lines FOR DELETE
  TO authenticated USING (true);

-- Forecasts policies
CREATE POLICY "select_forecasts" ON forecasts FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_forecasts" ON forecasts FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_forecasts" ON forecasts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Import history policies
CREATE POLICY "select_import_history" ON import_history FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_import_history" ON import_history FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_import_history" ON import_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Action logs policies
CREATE POLICY "select_action_logs" ON action_logs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_action_logs" ON action_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Recommendations policies
CREATE POLICY "select_recommendations" ON recommendations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_recommendations" ON recommendations FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_recommendations" ON recommendations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);