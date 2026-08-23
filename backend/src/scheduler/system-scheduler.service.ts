import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSchedulerService {
  private readonly logger = new Logger(SystemSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hourly job: Auto-expire old pending AI actions older than 24 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAiActions() {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const res = await this.prisma.aiAction.updateMany({
        where: {
          status: 'pending',
          createdAt: { lt: yesterday },
        },
        data: {
          status: 'expired',
          errorMessage: 'Automatically expired after 24 hours without manager approval.',
        },
      });
      if (res.count > 0) {
        this.logger.log(`[Scheduler] Expired ${res.count} stale AI pending actions.`);
      }
    } catch (err: any) {
      this.logger.error(`[Scheduler] Error cleaning expired AI actions: ${err.message}`);
    }
  }

  /**
   * Daily Midnight job: Prune resolved dead letter events & log health check
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyMaintenanceCleanup() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedDeadLetters = await this.prisma.deadLetterEvent.deleteMany({
        where: {
          status: 'resolved',
          createdAt: { lt: thirtyDaysAgo },
        },
      });
      this.logger.log(`[Scheduler] Daily maintenance completed. Pruned ${deletedDeadLetters.count} resolved dead letter events.`);
    } catch (err: any) {
      this.logger.error(`[Scheduler] Error executing daily maintenance: ${err.message}`);
    }
  }
}
