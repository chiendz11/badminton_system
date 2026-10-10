import { Type } from "class-transformer";
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
  ValidateNested,
} from "class-validator";
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
