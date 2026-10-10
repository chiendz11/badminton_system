import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  ValidateIf,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsUrl,
} from "class-validator";
import { Type } from "class-transformer";
import { BandDto } from "../../pricing/dto/pricing.dto";
export class CenterDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(5) @MaxLength(300) address!: string;
  @IsString() @Matches(/^[+0-9 ()-]{8,20}$/) phone!: string;
  @IsString() @MinLength(1) @MaxLength(128) managerId!: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description = "";
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  facilities: string[] = [];
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1380)
  openMinute = 300;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(60)
  @Max(1440)
  closeMinute = 1440;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2000000)
  pricePerHour = 80000;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  totalCourts = 0;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => BandDto)
  pricingBands?: BandDto[];
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2000)
  googleMapUrl?: string;
  @IsOptional() @IsString() @MaxLength(128) logoFileId?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  imageFileIds: string[] = [];
}
export class UpdateCenterDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^[+0-9 ()-]{8,20}$/)
  phone?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  facilities?: string[];
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  managerId?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  totalCourts?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => BandDto)
  pricingBands?: BandDto[];
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2000)
  googleMapUrl?: string;
  @IsOptional() @IsString() @MaxLength(128) logoFileId?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  imageFileIds?: string[];
}
