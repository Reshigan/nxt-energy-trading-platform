import { DurableObject } from 'cloudflare:workers';

interface P2POffer {
  id: string;
  participant_id: string;
  volume_kwh: number;
  price_cents_per_kwh: number;
  distribution_zone: string;
  offer_type: 'sell' | 'buy';
  expires_at: string;
}

interface P2PMatch {
  sell_offer_id: string;
  buy_offer_id: string;
  volume_kwh: number;
  price_cents_per_kwh: number;
  total_cents: number;
}

export class P2PMatcherDO extends DurableObject {
  private offers: P2POffer[] = [];

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/offer') {
      const offer = await request.json() as P2POffer;
      this.offers.push(offer);
      await this.ctx.storage.put('offers', this.offers);
      return Response.json({ success: true, offer_id: offer.id });
    }

    if (request.method === 'POST' && url.pathname === '/match') {
      const matches = this.runMatching();
      return Response.json({ success: true, matches });
    }

    if (request.method === 'GET' && url.pathname === '/offers') {
      return Response.json({ success: true, offers: this.offers });
    }

    if (request.method === 'DELETE') {
      const { offer_id } = await request.json() as { offer_id: string };
      this.offers = this.offers.filter((o) => o.id !== offer_id);
      await this.ctx.storage.put('offers', this.offers);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private runMatching(): P2PMatch[] {
    const matches: P2PMatch[] = [];
    const now = new Date().toISOString();

    // Remove expired offers
    this.offers = this.offers.filter((o) => !o.expires_at || o.expires_at > now);

    // Group by zone
    const zones = new Map<string, { sells: P2POffer[]; buys: P2POffer[] }>();
    for (const offer of this.offers) {
      if (!zones.has(offer.distribution_zone)) {
        zones.set(offer.distribution_zone, { sells: [], buys: [] });
      }
      const zone = zones.get(offer.distribution_zone)!;
      if (offer.offer_type === 'sell') zone.sells.push(offer);
      else zone.buys.push(offer);
    }

    // Match within each zone: seller floor <= buyer ceiling
    for (const [, zone] of zones) {
      // Sort sells by price ascending, buys by price descending
      zone.sells.sort((a, b) => a.price_cents_per_kwh - b.price_cents_per_kwh);
      zone.buys.sort((a, b) => b.price_cents_per_kwh - a.price_cents_per_kwh);

      for (const sell of zone.sells) {
        for (const buy of zone.buys) {
          if (sell.price_cents_per_kwh <= buy.price_cents_per_kwh && sell.volume_kwh > 0 && buy.volume_kwh > 0) {
            const matchVolume = Math.min(sell.volume_kwh, buy.volume_kwh);
            const matchPrice = Math.round((sell.price_cents_per_kwh + buy.price_cents_per_kwh) / 2);
            matches.push({
              sell_offer_id: sell.id,
              buy_offer_id: buy.id,
              volume_kwh: matchVolume,
              price_cents_per_kwh: matchPrice,
              total_cents: Math.round(matchVolume * matchPrice),
            });
            sell.volume_kwh -= matchVolume;
            buy.volume_kwh -= matchVolume;
          }
        }
      }
    }

    // Remove fully matched offers
    this.offers = this.offers.filter((o) => o.volume_kwh > 0);
    return matches;
  }

  override async alarm(): Promise<void> {
    // Run matching every 5 minutes
    this.runMatching();
    await this.ctx.storage.put('offers', this.offers);
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }
}
