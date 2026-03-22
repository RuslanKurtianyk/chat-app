import { IsMobilePhone, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsMobilePhone(undefined, { strictMode: false })
  mobile: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
