import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
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
