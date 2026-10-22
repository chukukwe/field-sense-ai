import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchSeasonalRainfall, SeasonalRainfallApiError } from '../../src/data/seasonRainfallApi.js';

describe('Seasonal rainfall browser client', () => {
  it('calls only the controlled backend endpoint with an LGA ID and year', async () => {
    let url = '';
    let authorization: string | null = null;
    const result = await fetchSeasonalRainfall(12, 2026, async (input, init) => {
      url = String(input);
      authorization = new Headers(init?.headers).get('Authorization');
      return Response.json({ status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2026, onset: '15 May' } });
    });
    const parsedUrl = new URL(url, 'http://localhost');
    assert.equal(parsedUrl.pathname, '/api/season/rainfall');
    assert.equal(parsedUrl.searchParams.get('lgaId'), '12');
    assert.equal(parsedUrl.searchParams.get('year'), '2026');
    assert.equal(authorization, null);
    assert.deepEqual(result, { status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2026, onset: '15 May' } });
  });

  it('keeps missing optional NiMet fields absent and accepts an explicit no-record result', async () => {
    const available = await fetchSeasonalRainfall(12, 2026, async () => Response.json({
      status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2026 },
    }));
    assert.deepEqual(available, { status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2026 } });
    const missing = await fetchSeasonalRainfall(12, 2026, async () => Response.json({
      status: 'no_record', state: 'Akwa Ibom', lga: 'Eket', year: 2026,
    }));
    assert.equal(missing.status, 'no_record');
  });

  it('shows backend configuration errors without requiring or receiving an API key', async () => {
    await assert.rejects(fetchSeasonalRainfall(12, 2026, async () => Response.json({
      error: { code: 'NIMET_NOT_CONFIGURED', message: 'Add NIMET_API_KEY to the backend environment.' },
    }, { status: 503 })), (error: unknown) => {
      assert.ok(error instanceof SeasonalRainfallApiError);
      assert.equal(error.code, 'NIMET_NOT_CONFIGURED');
      assert.match(error.message, /backend environment/);
      return true;
    });
  });

  it('rejects invalid input and malformed or mismatched backend data', async () => {
    await assert.rejects(fetchSeasonalRainfall(0, 2026, async () => Response.json({})), SeasonalRainfallApiError);
    await assert.rejects(fetchSeasonalRainfall(12, 2026, async () => Response.json({ status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2025 } })), SeasonalRainfallApiError);
    await assert.rejects(fetchSeasonalRainfall(12, 2026, async () => Response.json({ status: 'no_record', state: 'Akwa Ibom', lga: 'Eket', year: 2025 })), SeasonalRainfallApiError);
  });
});
