
import {
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class UpdateRatingDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    score?: number;

    @IsOptional()
    @IsString()
    comment?: string;
}
