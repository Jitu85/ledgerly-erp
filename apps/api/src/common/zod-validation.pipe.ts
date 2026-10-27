import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { z, type ZodType } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fieldErrors = z.flattenError(result.error).fieldErrors;
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      fieldErrors,
    });
  }
}
