declare module "@prisma/adapter-pg" {
  import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";

  export const PrismaPg: new (config: {
    connectionString: string;
  }) => SqlDriverAdapterFactory;
}
