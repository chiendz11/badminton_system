import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class CenterDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(5) @MaxLength(300) address!: string;
  @IsString() @Matches(/^[+0-9 ()-]{8,20}$/) phone!: string;
  @IsString() @MinLength(1) @MaxLength(128) managerId!: string;
  @IsOptional() @IsString() @MaxLength(2000) description = "";
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  facilities: string[] = [];
  @IsOptional() @IsInt() @Min(0) @Max(1380) openMinute = 300;
  @IsOptional() @IsInt() @Min(60) @Max(1440) closeMinute = 1440;
  @IsOptional() @IsInt() @Min(0) @Max(2000000) pricePerHour = 80000;
}
export class UpdateCenterDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(300) address?: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{8,20}$/) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  facilities?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
