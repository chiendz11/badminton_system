import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from "class-validator";
export class AvailabilityDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
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
