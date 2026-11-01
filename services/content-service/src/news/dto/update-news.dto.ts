
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    Matches,
    IsDateString,
} from 'class-validator';

export class UpdateNewsDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    summary?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsUrl({ require_tld: false })
    url?: string;

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
