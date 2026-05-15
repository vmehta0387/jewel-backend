import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export enum LoginClientPlatform {
  MOBILE_APP = 'MOBILE_APP',
  ADMIN_PORTAL = 'ADMIN_PORTAL',
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(LoginClientPlatform)
  clientPlatform?: LoginClientPlatform;
}
