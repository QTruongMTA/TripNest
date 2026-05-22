import Joi from "joi";

const SENSITIVE_WORDS = [
  "admin", "administrator", "moderator", "root", "system", "support",
  "tripnest", "staff", "manager", "cskh", "hotline",
  "dit", "lon", "cu", "dm", "vcl", "fuck", "shit", "bitch", "asshole",
];

const passwordStrong = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[!@#$%^&*()\-_=+\[\]{};':",.<>?/\\|`~]/, "special")
  .required();

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: passwordStrong,
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  password: passwordStrong,
});

export const avatarSchema = Joi.object({
  avatar: Joi.string()
    .pattern(/^data:image\/(png|jpeg|jpg|webp);base64,/)
    .max(900_000)
    .allow(null)
    .required(),
});

export const profileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  displayName: Joi.string()
    .max(50)
    .allow(null, "")
    .custom((value, helpers) => {
      if (!value) return value;
      const lower = value.toLowerCase();
      if (SENSITIVE_WORDS.some((w) => lower.includes(w))) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .optional()
    .messages({ "any.invalid": "Tên hiển thị chứa từ ngữ không phù hợp" }),
  phone: Joi.string().pattern(/^\d{10,11}$/).allow(null, "").optional()
    .messages({ "string.pattern.base": "Số điện thoại phải từ 10 đến 11 chữ số" }),
  birthDate: Joi.string()
    .isoDate()
    .allow(null, "")
    .custom((value, helpers) => {
      if (!value) return value;
      const birth = new Date(value);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      if (
        now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
      ) {
        age--;
      }
      if (age < 18) return helpers.error("any.invalid");
      return value;
    })
    .optional()
    .messages({ "any.invalid": "Bạn phải từ 18 tuổi trở lên" }),
  nationality: Joi.string().max(100).optional(),
  gender: Joi.string()
    .valid("Nam", "Nữ", "Không xác định (Non-binary)", "Không muốn nêu rõ")
    .allow(null, "")
    .optional(),
  address: Joi.string().max(255).allow(null, "").optional(),
});
