import path from "path";

// Keep uploaded files in backend/uploads regardless of the shell working directory.
export const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");
export const PROPERTY_UPLOAD_DIR = path.join(UPLOAD_ROOT, "properties");
