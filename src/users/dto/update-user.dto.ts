import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
