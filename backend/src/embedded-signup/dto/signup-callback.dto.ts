import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SignupCallbackDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsOptional()
    @IsObject()
    sessionInfo?: Record<string, any>;

    @IsOptional()
    @IsString()
    redirectUri?: string;
}
