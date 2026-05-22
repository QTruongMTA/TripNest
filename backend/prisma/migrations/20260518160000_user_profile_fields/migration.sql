ALTER TABLE "User"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "birthDate" DATE,
ADD COLUMN "nationality" TEXT NOT NULL DEFAULT 'Việt Nam',
ADD COLUMN "gender" TEXT,
ADD COLUMN "address" TEXT;
