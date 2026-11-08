
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    Matches,
    IsDateString,
} from 'class-validator';

export class CreateNewsDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    summary!: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsUrl({ require_tld: false })
    url!: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @Matches(/^\d{2}\/\d{2}\/\d{4}$/)
    date?: string;

    @IsOptional()
    @IsDateString()
    publishedAt?: string;
}
