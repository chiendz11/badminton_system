import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Telemetry } from "../../common/observability/telemetry";

type IdentityUserResponse = {
  userId?: string;
  id?: string;
  role?: string;
  isActive?: boolean;
};

@Injectable()
export class IdentityClientService {
  constructor(@Inject(Telemetry) private readonly telemetry: Telemetry) {}

  async assertManageableUser(managerId: string): Promise<void> {
    const baseUrl = process.env.IDENTITY_INTERNAL_URL?.trim();
    if (!baseUrl) return;

    const url = `${baseUrl.replace(/\/+$/, "")}/internal/identity/users/${encodeURIComponent(managerId)}`;
    const headers: Record<string, string> = {};
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN?.trim();
    if (internalToken) {
      headers["x-internal-token"] = internalToken;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      this.telemetry.logger.warn(
        { err, managerId },
        "identity.internal_lookup.network_error",
      );
      throw new ServiceUnavailableException(
        "Không thể kết nối Identity để xác minh quản lý trung tâm",
      );
    }

    if (response.status === 404) {
      throw new BadRequestException("Tài khoản quản lý trung tâm không tồn tại");
    }
    if (!response.ok) {
      this.telemetry.logger.warn(
        { status: response.status, managerId },
        "identity.internal_lookup.unexpected_status",
      );
      throw new ServiceUnavailableException(
        "Không thể xác minh tài khoản quản lý trung tâm với Identity",
      );
    }

    const user = (await response.json()) as IdentityUserResponse;
    if (user.isActive === false) {
      throw new BadRequestException("Tài khoản quản lý trung tâm đang bị khóa");
    }
    if (user.role !== "center_manager" && user.role !== "super_admin") {
      throw new BadRequestException(
        "Người được phân công phải có vai trò center_manager hoặc super_admin",
      );
    }
  }
}
