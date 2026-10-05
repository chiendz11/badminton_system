import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
export class CourtDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsOptional() @IsIn(["thảm", "gỗ", "xi_măng"]) surface = "thảm";
}
export class UpdateCourtDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsIn(["thảm", "gỗ", "xi_măng"]) surface?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
