import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { NeonStorageService } from "./neon-storage.service.js";
import { NeonAuthService } from "./neon-auth.service.js";
import { NeonRealtimeService } from "./neon-realtime.service.js";
import { NeonFunctionsService } from "./neon-functions.service.js";
import { NeonService } from "./neon.service.js";
import { NeonController } from "./neon.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [NeonController],
  providers: [
    NeonStorageService,
    NeonAuthService,
    NeonRealtimeService,
    NeonFunctionsService,
    NeonService,
  ],
  exports: [
    NeonStorageService,
    NeonAuthService,
    NeonRealtimeService,
    NeonFunctionsService,
    NeonService,
  ],
})
export class NeonModule {}
