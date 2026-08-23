import { Controller, Get, Post, Param, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmbeddedSignupService } from './embedded-signup.service';
import { SignupCallbackDto } from './dto/signup-callback.dto';

@Controller('embedded-signup')
@UseGuards(JwtAuthGuard)
export class EmbeddedSignupController {
    private readonly logger = new Logger(EmbeddedSignupController.name);

    constructor(private readonly signupService: EmbeddedSignupService) { }

    /**
     * Returns the Meta App configuration needed for the frontend to launch
     * the Embedded Signup popup.
     */
    @Get('config')
    getConfig() {
        return this.signupService.getConfig();
    }

    /**
     * Receives the authorization code from the frontend after the user
     * completes the Meta Embedded Signup popup. Processes the full OAuth flow.
     */
    @Post('callback')
    async processCallback(@Req() req: any, @Body() dto: SignupCallbackDto) {
        this.logger.log(`Processing embedded signup callback for user ${req.user.id}`);
        return this.signupService.processCallback(req.user.id, dto.code, dto.sessionInfo, dto.redirectUri);
    }

    /**
     * Returns the connection status for all WABAs belonging to the current shop.
     */
    @Get('status')
    async getConnectionStatus(@Req() req: any) {
        return this.signupService.getConnectionStatus(req.user.id);
    }

    /**
     * Soft-disconnects a WABA from the shop.
     */
    @Post('disconnect/:wabaAccountId')
    async disconnectWaba(@Req() req: any, @Param('wabaAccountId') wabaAccountId: string) {
        this.logger.log(`Disconnecting WABA ${wabaAccountId} for user ${req.user.id}`);
        return this.signupService.disconnectWaba(req.user.id, wabaAccountId);
    }

    /**
     * Re-initiates OAuth for an existing disconnected WABA.
     */
    @Post('reconnect/:wabaAccountId')
    async reconnectWaba(
        @Req() req: any,
        @Param('wabaAccountId') wabaAccountId: string,
        @Body() dto: SignupCallbackDto,
    ) {
        this.logger.log(`Reconnecting WABA ${wabaAccountId} for user ${req.user.id}`);
        return this.signupService.reconnectWaba(req.user.id, wabaAccountId, dto.code, dto.redirectUri);
    }

    @Post('sync-webhooks/:wabaAccountId')
    async syncWebhooks(@Req() req: any, @Param('wabaAccountId') wabaAccountId: string) {
        this.logger.log(`Syncing webhooks for WABA ${wabaAccountId} for user ${req.user.id}`);
        return this.signupService.syncWebhooks(req.user.id, wabaAccountId);
    }

    @Get('onboarding-logs')
    async getOnboardingLogs(@Req() req: any) {
        this.logger.log(`Fetching onboarding logs for user ${req.user.id}`);
        return this.signupService.getOnboardingLogs(req.user.id);
    }
}
