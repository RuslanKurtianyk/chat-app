import { IsString, IsMobilePhone, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsMobilePhone(undefined, { strictMode: false })
  mobile: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
