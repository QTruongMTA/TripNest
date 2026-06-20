UPDATE "Payment"
SET "confirmedByRole" = CASE
  WHEN "method" IN ('CASH', 'BANK_TRANSFER') THEN 'HOST'
  ELSE 'PAYMENT_GATEWAY'
END
WHERE "confirmedByRole" IS NULL;
