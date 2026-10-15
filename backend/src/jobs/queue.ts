import { db } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { workflowEngine } from "../workflow-engine/engine.js";

export interface JobRecord {
  id: string;
  organization_id: string;
  queue_name: string;
  payload: string;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  leased_until: string | null;
  leased_by: string | null;
}

export class DurableJobQueue {
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private workerId: string = `worker-${process.pid}-${uuidv4().slice(0, 8)}`;

  /**
   * Enqueue a durable job with optional scheduling and idempotency key
   */
  async enqueue(params: {
    organizationId: string;
    queueName: string;
    payload: Record<string, any>;
    scheduledFor?: string;
    idempotencyKey?: string;
  }): Promise<string> {
    const { organizationId, queueName, payload, scheduledFor, idempotencyKey } = params;
    const jobId = uuidv4();
    const scheduleTime = scheduledFor || new Date().toISOString();

    try {
      await db.execute(
        `INSERT INTO jobs (id, organization_id, queue_name, payload, status, scheduled_for, idempotencyKey)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [jobId, organizationId, queueName, JSON.stringify(payload), scheduleTime, idempotencyKey || null]
      );
      return jobId;
    } catch (err: any) {
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        // Idempotent duplicate: return existing job ID
        const existing = await db.queryOne<{ id: string }>(
          "SELECT id FROM jobs WHERE organization_id = ? AND idempotency_key = ?",
          [organizationId, idempotencyKey]
        );
        if (existing) return existing.id;
      }
      throw err;
    }
  }

  /**
   * Claim next pending job atomically with lease locking
   */
  async claimJob(): Promise<JobRecord | null> {
    const nowIso = new Date().toISOString();
    const leaseUntil = new Date(Date.now() + config.QUEUE_LOCK_DURATION_MS).toISOString();

    // Find and lease an eligible job atomically
    const eligible = await db.queryOne<{ id: string }>(
      `SELECT id FROM jobs 
       WHERE status = 'pending' 
         AND scheduled_for <= ?
         AND (leased_until IS NULL OR leased_until < ?)
       ORDER BY scheduled_for ASC LIMIT 1`,
      [nowIso, nowIso]
    );

    if (!eligible) return null;

    const updated = await db.execute(
      `UPDATE jobs 
       SET status = 'running', leased_until = ?, leased_by = ?, attempts = attempts + 1, updated_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
      [leaseUntil, this.workerId, eligible.id]
    );

    if (updated.rowsAffected === 0) return null; // Another worker claimed it

    return db.queryOne<JobRecord>("SELECT * FROM jobs WHERE id = ?", [eligible.id]);
  }

  /**
   * Acknowledge successful job completion
   */
  async acknowledge(jobId: string): Promise<void> {
    await db.execute(
      "UPDATE jobs SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
      [jobId]
    );
  }

  /**
   * Mark job failed or schedule retry with exponential backoff
   */
  async failJob(job: JobRecord, error: Error): Promise<void> {
    if (job.attempts >= job.max_attempts) {
      // Dead letter queue
      await db.execute(
        "UPDATE jobs SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?",
        [error.message || "Max retry attempts reached", job.id]
      );
    } else {
      // Exponential backoff: 2^attempt * 2 seconds
      const backoffSeconds = Math.pow(2, job.attempts) * 2;
      const nextSchedule = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      await db.execute(
        `UPDATE jobs 
         SET status = 'pending', leased_until = NULL, leased_by = NULL, scheduled_for = ?, error_message = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [nextSchedule, error.message, job.id]
      );
    }
  }

  /**
   * Start worker processing loop
   */
  startWorker(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`⚙️ Durable Job Queue Worker started [${this.workerId}]`);

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        const job = await this.claimJob();
        if (job) {
          await this.processJob(job);
        }
      } catch (err) {
        console.error("Worker loop exception:", err);
      } finally {
        if (this.isRunning) {
          this.pollTimer = setTimeout(poll, config.QUEUE_POLL_INTERVAL_MS);
        }
      }
    };

    poll();
  }

  /**
   * Stop worker loop gracefully
   */
  stopWorker(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log(`⏹️ Durable Job Queue Worker stopped [${this.workerId}]`);
  }

  /**
   * Process a claimed job
   */
  private async processJob(job: JobRecord): Promise<void> {
    try {
      const payload = JSON.parse(job.payload);

      if (job.queue_name === "workflow_execution") {
        await workflowEngine.startExecution({
          workflowId: payload.workflowId,
          inputData: payload.inputData,
          organizationId: job.organization_id,
          triggeredBy: payload.triggeredBy,
          triggerType: payload.triggerType,
          requestId: payload.requestId,
        });
      } else if (job.queue_name === "delay_continuation") {
        // Resuming after delay
        await workflowEngine.resumeExecution({
          executionId: payload.executionId,
          approved: true,
        });
      }

      await this.acknowledge(job.id);
    } catch (err: any) {
      console.error(`Error processing job ${job.id}:`, err);
      await this.failJob(job, err);
    }
  }
}

export const jobQueue = new DurableJobQueue();
