import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
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
export class CourtDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsOptional() @IsIn(["thảm", "gỗ", "xi_măng"]) surface = "thảm";
}
export class UpdateCourtDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsIn(["thảm", "gỗ", "xi_măng"]) surface?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class BandDto {
  @IsIn(["WEEKDAY", "WEEKEND"]) dayType!: "WEEKDAY" | "WEEKEND";
  @IsInt() @Min(0) @Max(1380) startMinute!: number;
  @IsInt() @Min(60) @Max(1440) endMinute!: number;
  @IsInt() @Min(0) @Max(2000000) pricePerHour!: number;
}
export class PricingDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => BandDto)
  bands!: BandDto[];
}
export class SelectionDto {
  @IsUUID("4") courtId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1380, { each: true })
  slots!: number[];
}
export class ReservationDto {
  @IsUUID("4") centerId!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SelectionDto)
  selections!: SelectionDto[];
}
export class FixedRangeDto {
  @IsUUID("4") centerId!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[];
}
export class FixedBookingDto extends FixedRangeDto {
  @IsString() @MinLength(1) @MaxLength(128) userId!: string;
  @IsString() @MinLength(1) @MaxLength(150) userName!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SelectionDto)
  selections!: SelectionDto[];
}
export class ListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(["CONFIRMED", "CANCELLED"]) status?:
    "CONFIRMED" | "CANCELLED";
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @IsIn(["true", "false"]) managed?: string;
}
export class AvailabilityDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}
export class DemoDto {
  @IsIn(["customer", "customer2", "manager", "admin"]) profile!:
    "customer" | "customer2" | "manager" | "admin";
}
