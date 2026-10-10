import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { FixedRangeDto } from "../../availability/dto/availability.dto";
import { SelectionDto } from "../../reservations/dto/reservation.dto";
export class FixedOccurrenceDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SelectionDto)
  selections!: SelectionDto[];
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
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => FixedOccurrenceDto)
  occurrences?: FixedOccurrenceDto[];
}
