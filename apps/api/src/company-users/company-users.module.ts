import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CompanyUsersController } from "./company-users.controller.js";
import { CompanyUsersService } from "./company-users.service.js";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService],
})
export class CompanyUsersModule {}
