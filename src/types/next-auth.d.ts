import type { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/authz";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      rol?: AppRole;
    };
  }

  interface User {
    rol?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: AppRole;
  }
}