import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(120)
  name: string;

  /** Minor units integer string (bigint). */
  @Matches(/^\d+$/)
  priceAmount: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

