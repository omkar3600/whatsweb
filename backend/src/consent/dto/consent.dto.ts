import { IsIn, IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';
import { CONSENT_STATUSES, CONSENT_SOURCES } from '../consent-detector';

export class UpdateConsentDto {
    @IsIn([...CONSENT_STATUSES])
    status: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsIn([...CONSENT_SOURCES])
    source?: string;
}

export class BulkConsentUpdateDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    contactIds: string[];

    @IsIn([...CONSENT_STATUSES])
    status: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsIn([...CONSENT_SOURCES])
    source?: string;
}

export class SaveConsentConfigDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    optInKeywords?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    optOutKeywords?: string[];

    @IsOptional()
    enabled?: boolean;
}
