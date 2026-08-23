import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_SHOP_STATUS_KEY = 'bypassShopStatus';
export const BypassShopStatus = () => SetMetadata(IS_PUBLIC_SHOP_STATUS_KEY, true);
