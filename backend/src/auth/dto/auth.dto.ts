import { IsString, IsNotEmpty, MinLength, IsOptional, MaxLength } from 'class-validator';

export class RegisterInterestDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    shopName: string;

    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class RegisterShopDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    shopName: string;

    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
