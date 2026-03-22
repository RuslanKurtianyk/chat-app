import { IsMobilePhone, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsMobilePhone(undefined, { strictMode: false })
  mobile: string;

  @IsString()
  @MinLength(1)
  password: string;
}
