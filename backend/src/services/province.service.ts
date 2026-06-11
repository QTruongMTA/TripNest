import { prisma } from "../lib/prisma";
import { CURRENT_VIETNAM_PROVINCES } from "../constants/vietnam-provinces";

const currentProvinceNames = new Set(CURRENT_VIETNAM_PROVINCES.map((province) => province.name));

async function ensureCurrentVietnamProvinces() {
  await prisma.$transaction(async (tx) => {
    for (const province of CURRENT_VIETNAM_PROVINCES) {
      const [existingByCode, existingByName] = await Promise.all([
        tx.province.findUnique({ where: { code: province.code } }),
        tx.province.findUnique({ where: { name: province.name } }),
      ]);

      if (existingByCode && existingByName && existingByCode.id !== existingByName.id) {
        throw new Error(`Province conflict for ${province.name} (${province.code})`);
      }

      const existing = existingByCode ?? existingByName;
      if (existing) {
        await tx.province.update({
          where: { id: existing.id },
          data: {
            name: province.name,
            code: province.code,
            type: province.type,
          },
        });
        continue;
      }

      await tx.province.create({ data: province });
    }
  });
}

export const provinceService = {
  async listAll() {
    await ensureCurrentVietnamProvinces();
    return prisma.province.findMany({
      where: { name: { in: [...currentProvinceNames] } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        operatorAssignments: {
          include: {
            operator: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  },

  async listAvailable() {
    await ensureCurrentVietnamProvinces();
    return prisma.province.findMany({
      where: {
        name: { in: [...currentProvinceNames] },
        operatorAssignments: { none: {} },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  },

  async findById(id: string) {
    return prisma.province.findUnique({
      where: { id },
      include: {
        operatorAssignments: {
          include: {
            operator: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
          },
        },
      },
    });
  },

  async create(data: { name: string; code: string; type: "TINH" | "THANH_PHO" }) {
    return prisma.province.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; code: string; type: "TINH" | "THANH_PHO" }>) {
    return prisma.province.update({ where: { id }, data });
  },

  async delete(id: string) {
    const hasOperator = await prisma.operatorProvinceAssignment.findFirst({ where: { provinceId: id } });
    if (hasOperator) throw new Error("PROVINCE_HAS_OPERATOR");
    return prisma.province.delete({ where: { id } });
  },
};
