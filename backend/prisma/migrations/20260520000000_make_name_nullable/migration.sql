-- Make User.name nullable (no longer required; email is the primary identifier)
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;
