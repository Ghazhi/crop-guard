/*
# Add invoice_url to fund_requests

Adds an optional invoice/attachment URL column to fund_requests so users can
upload supporting documents when creating a fund request.
*/

ALTER TABLE fund_requests ADD COLUMN IF NOT EXISTS invoice_url text;
