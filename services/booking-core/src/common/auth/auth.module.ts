import { Global, Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
@Global()
@Module({
  imports: [],
  providers: [AuthGuard],

  exports: [AuthGuard],
})
export class AuthModule {}
