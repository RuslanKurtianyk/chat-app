import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateListingDto {
  @IsUUID()
  productId: string;

  /** How many units to list (reserved from your inventory). */
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  /** Asking price per unit (minor units, integer string). */
  @Matches(/^\d+$/)
  unitPrice: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;
}

/** Body for `POST .../offers` (buyer requests purchase; seller must accept). */
export class CreateTradeOfferDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number;
}
