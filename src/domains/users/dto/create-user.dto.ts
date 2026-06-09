import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../../../common/enums/prisma.enums';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
