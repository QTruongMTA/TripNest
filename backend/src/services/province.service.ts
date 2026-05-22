import { prisma } from "../lib/prisma";

export const provinceService = {
  async listAll() {
    return prisma.province.findMany({
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
    return prisma.province.findMany({
      where: { operatorAssignments: { none: {} } },
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
