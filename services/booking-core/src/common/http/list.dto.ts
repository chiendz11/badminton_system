import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
export class ListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(["CONFIRMED", "CANCELLED"]) status?:
    "CONFIRMED" | "CANCELLED";
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @IsIn(["true", "false"]) managed?: string;
  @IsOptional() @IsUUID("4") centerId?: string;
  @IsOptional() @IsIn(["week", "month", "year"]) period?: string;
  @IsOptional() @IsIn(["DAILY", "FIXED"]) type?: "DAILY" | "FIXED";
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
}
