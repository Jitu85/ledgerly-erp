import { Controller, Get } from "@nestjs/common";
import { NeonService, type NeonServicesReport } from "./neon.service.js";

@Controller("neon")
export class NeonController {
  constructor(private readonly neonService: NeonService) {}

  @Get("status")
  async getStatus(): Promise<NeonServicesReport> {
    return this.neonService.testAllServices();
  }
}
