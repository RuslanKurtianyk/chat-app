import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const intString = /^-?\d+$/;

export class WalletSetBalanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  /** New absolute balance (minor units) as integer string. */
  @Matches(intString)
  balance: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WalletEarnDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  /** Positive amount (minor units) as integer string. */
  @Matches(/^\d+$/)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WalletTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsUUID()
  toUserId: string;

  @Matches(/^\d+$/)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WalletPurchaseDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

