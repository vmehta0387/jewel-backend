import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LoginClientPlatform } from './login.dto';

export class HelpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contactInfo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  clientPlatform?: LoginClientPlatform;
}
