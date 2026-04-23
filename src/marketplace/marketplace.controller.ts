import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto, CreateTradeOfferDto } from './dto/marketplace.dto';

/**
 * Peer trade with **seller confirmation**:
 *
 * 1. `POST /wallet/me/purchase` — shop → your **inventory**
 * 2. `POST /marketplace/listings` — list for sale (stock reserved on listing)
 * 3. Buyer: `POST /marketplace/listings/:id/offers` — request to buy (price = listing `unitPrice`, snapshotted on offer; stock reserved)
 * 4. Seller: `POST /marketplace/offers/:id/accept` — charge buyer, pay seller, deliver items  
 *    or `POST /marketplace/offers/:id/reject` — release reservation  
 * 5. Buyer can `POST /marketplace/offers/:id/cancel` while pending
 */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('inventory/me')
  myInventory(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.getMyInventory(userId);
  }

  @Get('listings')
  listListings() {
    return this.marketplace.listActiveListings();
  }

  @Get('listings/:id')
  oneListing(@Param('id') id: string) {
    return this.marketplace.getListing(id);
  }

  @Get('offers/selling')
  pendingSales(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.myPendingSales(userId);
  }

  @Get('offers/buying')
  pendingPurchases(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.myPendingPurchases(userId);
  }

  @Post('listings')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  createListing(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateListingDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.createListing(userId, dto);
  }

  @Post('listings/:id/offers')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  requestTrade(
    @Headers('x-user-id') userId: string,
    @Param('id') listingId: string,
    @Body() dto: CreateTradeOfferDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.createTradeOffer(
      userId,
      listingId,
      dto.quantity ?? 1,
    );
  }

  @Post('offers/:id/accept')
  accept(@Headers('x-user-id') userId: string, @Param('id') offerId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.acceptOffer(userId, offerId);
  }

  @Post('offers/:id/reject')
  reject(@Headers('x-user-id') userId: string, @Param('id') offerId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.rejectOffer(userId, offerId);
  }

  @Post('offers/:id/cancel')
  cancelOffer(
    @Headers('x-user-id') userId: string,
    @Param('id') offerId: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.cancelOfferByBuyer(userId, offerId);
  }

  @Post('listings/:id/cancel')
  cancelListing(
    @Headers('x-user-id') userId: string,
    @Param('id') listingId: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.marketplace.cancelListing(userId, listingId);
  }
}
