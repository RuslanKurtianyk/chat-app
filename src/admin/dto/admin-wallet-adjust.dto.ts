import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AdminWalletAdjustDto {
  /** Signed minor-units delta (credit positive, debit negative). */
  @Matches(/^-?\d+$/)
  delta: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
