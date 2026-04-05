import { nowISO } from '../utils/id';

interface EscrowState {
  id: string;
  tradeId?: string;
  optionId?: string;
  depositorId: string;
  beneficiaryId?: string;
  amountCents: number;
  conditions?: Record<string, unknown>;
  status: 'created' | 'funded' | 'held' | 'released' | 'disputed' | 'expired';
  fundedAt?: string;
  releasedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface StateTransition {
  from: string;
  to: string;
  timestamp: string;
  actor?: string;
  reason?: string;
}

export class EscrowManagerDO implements DurableObject {
  private escrow: EscrowState | null = null;
  private transitions: StateTransition[] = [];
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.escrow = await this.state.storage.get<EscrowState>('escrow') || null;
      this.transitions = await this.state.storage.get<StateTransition[]>('transitions') || [];
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/create':
        return this.handleCreate(request);
      case '/fund':
        return this.handleTransition(request, 'created', 'funded');
      case '/hold':
        return this.handleTransition(request, 'funded', 'held');
      case '/release':
        return this.handleRelease(request);
      case '/dispute':
        return this.handleTransition(request, 'held', 'disputed');
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    if (this.escrow) {
      return Response.json({ success: false, error: 'Escrow already exists' }, { status: 409 });
    }

    const body = await request.json() as Omit<EscrowState, 'status' | 'createdAt'>;
    this.escrow = {
      ...body,
      status: 'created',
      createdAt: nowISO(),
    };

    this.transitions.push({
      from: 'none',
      to: 'created',
      timestamp: nowISO(),
    });

    await this.persistState();

    // Set expiry alarm if applicable
    if (this.escrow.expiresAt) {
      const expiryTime = new Date(this.escrow.expiresAt).getTime();
      if (expiryTime > Date.now()) {
        await this.state.storage.setAlarm(expiryTime);
      }
    }

    return Response.json({ success: true, escrow: this.escrow });
  }

  private async handleTransition(
    request: Request,
    expectedFrom: string,
    targetStatus: EscrowState['status']
  ): Promise<Response> {
    if (!this.escrow) {
      return Response.json({ success: false, error: 'Escrow not found' }, { status: 404 });
    }

    if (this.escrow.status !== expectedFrom) {
      return Response.json({
        success: false,
        error: `Cannot transition from '${this.escrow.status}' to '${targetStatus}'. Expected status: '${expectedFrom}'`,
      }, { status: 400 });
    }

    const body = await request.json() as { actor?: string; reason?: string };
    const previousStatus = this.escrow.status;
    this.escrow.status = targetStatus;

    if (targetStatus === 'funded') {
      this.escrow.fundedAt = nowISO();
    }

    this.transitions.push({
      from: previousStatus,
      to: targetStatus,
      timestamp: nowISO(),
      actor: body.actor,
      reason: body.reason,
    });

    await this.persistState();
    return Response.json({ success: true, escrow: this.escrow });
  }

  private async handleRelease(request: Request): Promise<Response> {
    if (!this.escrow) {
      return Response.json({ success: false, error: 'Escrow not found' }, { status: 404 });
    }

    if (this.escrow.status !== 'held' && this.escrow.status !== 'funded') {
      return Response.json({
        success: false,
        error: `Cannot release escrow in status '${this.escrow.status}'`,
      }, { status: 400 });
    }

    const body = await request.json() as { actor?: string; reason?: string };
    const previousStatus = this.escrow.status;
    this.escrow.status = 'released';
    this.escrow.releasedAt = nowISO();

    this.transitions.push({
      from: previousStatus,
      to: 'released',
      timestamp: nowISO(),
      actor: body.actor,
      reason: body.reason,
    });

    await this.persistState();
    return Response.json({ success: true, escrow: this.escrow });
  }

  private handleStatus(): Response {
    return Response.json({
      success: true,
      escrow: this.escrow,
      transitions: this.transitions,
    });
  }

  // Alarm handler for expiry
  async alarm(): Promise<void> {
    if (this.escrow && this.escrow.status !== 'released' && this.escrow.status !== 'expired') {
      const previousStatus = this.escrow.status;
      this.escrow.status = 'expired';
      this.transitions.push({
        from: previousStatus,
        to: 'expired',
        timestamp: nowISO(),
        reason: 'Escrow expired automatically',
      });
      await this.persistState();
    }
  }

  private async persistState(): Promise<void> {
    await this.state.storage.put('escrow', this.escrow);
    await this.state.storage.put('transitions', this.transitions);
  }
}
