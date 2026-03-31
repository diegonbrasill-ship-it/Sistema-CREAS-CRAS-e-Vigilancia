import { AuthenticatedUser } from "../../middleware/auth/authenticated.user";

export type AccessScope = { whereClause: string; params: (string | number)[] };

export type RelatorioRequester = Pick<
  AuthenticatedUser,
  "id" | "username" | "role" | "unit_id" | "role_id" | "permissions"
>;

export type RelatorioGeralInput = {
  startDate: string;
  endDate: string;
  accessScope: AccessScope;
  requestedBy: RelatorioRequester;
};

export type RelatorioDashboardInput = {
  filters: {
    mes?: string;
    tec_ref?: string;
    bairro?: string;
  };
  accessScope: AccessScope;
  requestedBy: RelatorioRequester;
};

export class RelatorioValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RelatorioValidationError";
    this.status = status;
  }
}
