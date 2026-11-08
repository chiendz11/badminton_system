
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    Max,
    IsOptional,
} from 'class-validator';

export class CreateRatingDto {
    @IsString()
    @IsNotEmpty()
    centerId!: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    score!: number;

    @IsOptional()
    @IsString()
    comment?: string;
}
