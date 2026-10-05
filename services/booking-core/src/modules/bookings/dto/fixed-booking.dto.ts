import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { FixedRangeDto } from "../../availability/dto/availability.dto";
import { SelectionDto } from "../../reservations/dto/reservation.dto";
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
