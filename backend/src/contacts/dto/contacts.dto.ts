import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CONSENT_STATUSES } from '../../consent/consent-detector';

export class CreateContactDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateContactDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class GetContactsQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn([...CONSENT_STATUSES])
    consent?: string;

    @IsOptional()
    @IsString()
    tags?: string;

    @IsOptional()
    @IsString()
    cities?: string;

    @IsOptional()
    @IsIn(['createdAt', 'name', 'city'])
    sortBy?: string;

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
