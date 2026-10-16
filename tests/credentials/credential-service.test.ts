import crypto from 'node:crypto';
import {
  CredentialCrypto,
  CredentialIntegrityError,
  CredentialConfigurationError,
  CREDENTIAL_ALGORITHM,
} from '../../src/orchestrator/credentials/credential-crypto';
import {
  InMemoryCredentialStore,
  NeonCredentialStore,
  CredentialStoreError,
} from '../../src/orchestrator/credentials/credential-store';
import {
  CredentialService,
  CredentialNotFoundError,
  ProviderNotSupportedError,
  getCredentialService,
} from '../../src/orchestrator/credentials/credential-service';
import { verifyOwnerAssertion } from '../../src/lib/owner-assertion';
import { mapCredentialError } from '../../src/lib/byok-context';

const MASTER = 'test-master-secret-with-enough-length-0123456789';
const SECRET = 'sk-core-byok-value-3d9f1a';

function service(store = new InMemoryCredentialStore(), storage: 'durable' | 'temporary' = 'temporary') {
  return new CredentialService({ masterSecret: MASTER, store, storage });
}

/** Firma una asercion con el mismo formato que usa La Casa. */
function signAssertion(ownerId: string, secret: string, ttlMs = 60_000): string {
  const payload = { ownerId, iat: Date.now(), exp: Date.now() + ttlMs };
  const segment = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(segment).digest().toString('base64url');
  return `${segment}.${signature}`;
}

interface FakeRow { [key: string]: unknown }

function fakeSql(rows: FakeRow[] = []) {
  const calls: Array<{ text: string; params?: unknown[] }> = [];
  const runner = async (text: string, params?: unknown[]) => {
    calls.push({ text, params });
    if (text.startsWith('INSERT')) {
      rows.push({
        credential_id: params?.[2],
        owner_id: params?.[0],
        provider_id: params?.[1],
        algorithm: params?.[3],
        iv: params?.[4],
        auth_tag: params?.[5],
        ciphertext: params?.[6],
        created_at: params?.[7],
      });
      return { rows: [], rowCount: 1 };
    }
    if (text.startsWith('SELECT')) {
      const owner = params?.[0];
      const id = params?.[1];
      return { rows: rows.filter((r) => r.owner_id === owner && (!id || r.credential_id === id)), rowCount: null };
    }
    if (text.startsWith('DELETE')) {
      const owner = params?.[0];
      const id = params?.[1];
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].owner_id === owner && rows[i].credential_id === id) rows.splice(i, 1);
      }
      const removed = before - rows.length;
      return { rows: removed ? [{ credential_id: id }] : [], rowCount: removed };
    }
    return { rows: [], rowCount: null };
  };
  return { runner, rows, calls };
}

describe('Cifrado de credenciales BYOK (Core)', () => {
  it('cifra con AES-256-GCM y rechaza authTag manipulado', () => {
    const c = new CredentialCrypto(MASTER);
    const payload = c.encrypt(SECRET);

    expect(payload.algorithm).toBe(CREDENTIAL_ALGORITHM);
    expect(payload.iv).toHaveLength(24);
    expect(payload.authTag).toHaveLength(32);
    expect(payload.ciphertext).not.toContain(SECRET);
    expect(c.decrypt(payload)).toBe(SECRET);

    const tampered = { ...payload, authTag: payload.authTag.replace(/.$/, 'f') };
    expect(() => c.decrypt(tampered)).toThrow(CredentialIntegrityError);
    expect(() => new CredentialCrypto('otro-secreto-suficientemente-largo-000000').decrypt(payload)).toThrow(
      CredentialIntegrityError,
    );
  });

  it('sin CREDENTIAL_MASTER_SECRET no hay cifrado', () => {
    expect(() => new CredentialCrypto(undefined)).toThrow(CredentialConfigurationError);
  });
});

describe('Almacenamiento durable y aislamiento por propietario', () => {
  it('1. crear credencial no devuelve la clave y persiste solo el sobre cifrado', async () => {
    const { runner, rows } = fakeSql();
    const svc = service(new NeonCredentialStore(runner), 'durable');

    const metadata = await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });

    expect(metadata.providerId).toBe('gemini');
    expect(metadata.status).toBe('active');
    expect(JSON.stringify(metadata)).not.toContain(SECRET);

    expect(rows).toHaveLength(1);
    expect(rows[0].algorithm).toBe(CREDENTIAL_ALGORITHM);
    expect(rows[0].owner_id).toBe('user-a');
    expect(JSON.stringify(rows[0])).not.toContain(SECRET);
    expect(rows[0].ciphertext).toBeTruthy();
  });

  it('2. lista solo las credenciales del propietario', async () => {
    const svc = service();
    await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });
    await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: 'sk-otra' });
    await svc.save({ ownerId: 'user-b', providerId: 'gemini', apiKey: 'sk-ajena' });

    expect(await svc.listMetadata('user-a')).toHaveLength(2);
    expect(await svc.listMetadata('user-b')).toHaveLength(1);
    expect(await svc.listMetadata('user-c')).toHaveLength(0);
  });

  it('3. rechaza la credencial ajena con error generico', async () => {
    const svc = service();
    const metadata = await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });

    await expect(svc.resolveForOwner(metadata.credentialId, 'user-b')).rejects.toThrow(CredentialNotFoundError);
    await expect(svc.deleteForOwner(metadata.credentialId, 'user-b')).rejects.toThrow(CredentialNotFoundError);
    await expect(svc.resolveForOwner('no-existe', 'user-a')).rejects.toThrow(CredentialNotFoundError);

    // La credencial sigue intacta para su propietario
    expect((await svc.listMetadata('user-a'))).toHaveLength(1);
  });

  it('4. elimina solo la credencial propia', async () => {
    const svc = service();
    const metadata = await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });

    await svc.deleteForOwner(metadata.credentialId, 'user-a');
    expect(await svc.listMetadata('user-a')).toHaveLength(0);
    await expect(svc.resolveForOwner(metadata.credentialId, 'user-a')).rejects.toThrow(CredentialNotFoundError);
  });

  it('5. resuelve la credencial para ejecutar el chat', async () => {
    const svc = service();
    const metadata = await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });

    const resolved = await svc.resolveForOwner(metadata.credentialId, 'user-a');
    expect(resolved.providerId).toBe('gemini');
    expect(resolved.apiKey).toBe(SECRET);
  });

  it('rechaza proveedores sin adaptador BYOK', async () => {
    const svc = service();
    await expect(svc.save({ ownerId: 'user-a', providerId: 'groq', apiKey: 'sk-groq' })).rejects.toThrow(
      ProviderNotSupportedError,
    );
  });

  it('8. el fallback temporal funciona sin Neon', async () => {
    const withoutDb = getCredentialService({ env: { CREDENTIAL_MASTER_SECRET: MASTER } });
    expect(withoutDb.storage).toBe('temporary');

    const metadata = await withoutDb.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });
    expect((await withoutDb.listMetadata('user-a')).map((c) => c.credentialId)).toEqual([metadata.credentialId]);
    expect((await withoutDb.resolveForOwner(metadata.credentialId, 'user-a')).apiKey).toBe(SECRET);

    const withDb = getCredentialService({
      env: { CREDENTIAL_MASTER_SECRET: MASTER, DATABASE_URL: 'postgres://user:pass@db.internal:5432/neon' },
      runSql: fakeSql().runner,
    });
    expect(withDb.storage).toBe('durable');

    // Con DATABASE_URL pero sin ejecutor SQL no se inventa persistencia
    const withoutRunner = getCredentialService({
      env: { CREDENTIAL_MASTER_SECRET: MASTER, DATABASE_URL: 'postgres://x' },
    });
    expect(withoutRunner.storage).toBe('temporary');
  });

  it('el store Neon filtra siempre por owner_id y sanitiza errores', async () => {
    const { runner, calls, rows } = fakeSql();
    const store = new NeonCredentialStore(runner);
    const svc = service(store, 'durable');
    const metadata = await svc.save({ ownerId: 'user-a', providerId: 'gemini', apiKey: SECRET });

    await store.listByOwner('user-a');
    await store.findByOwnerAndId('user-b', metadata.credentialId);
    await store.deleteByOwnerAndId('user-b', metadata.credentialId);

    for (const call of calls) {
      if (call.text.startsWith('INSERT')) continue;
      expect(call.text).toContain('owner_id = $1');
      expect(call.params?.[0]).toBeDefined();
    }
    // El borrado ajeno no elimina nada
    expect(rows).toHaveLength(1);

    const failing = new NeonCredentialStore(async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.9:5432');
    });
    await expect(failing.listByOwner('user-a')).rejects.toThrow(CredentialStoreError);
    try {
      await failing.listByOwner('user-a');
    } catch (error) {
      expect(String((error as Error).message)).not.toContain('10.0.0.9');
    }
  });
});

describe('Identidad del usuario final entre La Casa y el Core', () => {
  const SECRET_TOKEN = 'bridge-token-value';

  it('acepta solo aserciones firmadas y vigentes', () => {
    const good = verifyOwnerAssertion({ assertion: signAssertion('user-a', SECRET_TOKEN), secret: SECRET_TOKEN });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.ownerId).toBe('user-a');

    const badSignature = verifyOwnerAssertion({
      assertion: signAssertion('user-a', 'otro-token'),
      secret: SECRET_TOKEN,
    });
    expect(badSignature.ok).toBe(false);
    if (!badSignature.ok) expect(badSignature.status).toBe(401);

    const expired = verifyOwnerAssertion({ assertion: signAssertion('user-a', SECRET_TOKEN, -1000), secret: SECRET_TOKEN });
    expect(expired.ok).toBe(false);

    const missing = verifyOwnerAssertion({ assertion: null, secret: SECRET_TOKEN });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe(401);

    const notConfigured = verifyOwnerAssertion({ assertion: signAssertion('user-a', SECRET_TOKEN), secret: undefined });
    expect(notConfigured.ok).toBe(false);
    if (!notConfigured.ok) {
      expect(notConfigured.status).toBe(500);
      expect(notConfigured.code).toBe('CONFIGURATION_ERROR');
    }
  });

  it('la identidad no se toma del cuerpo ni de cabeceras no firmadas', () => {
    const forged = verifyOwnerAssertion({ assertion: 'user-a', secret: SECRET_TOKEN });
    expect(forged.ok).toBe(false);
    const tampered = signAssertion('user-a', SECRET_TOKEN).split('.');
    const otherPayload = Buffer.from(JSON.stringify({ ownerId: 'user-b', iat: 0, exp: Date.now() + 10000 })).toString('base64url');
    const swapped = verifyOwnerAssertion({ assertion: `${otherPayload}.${tampered[1]}`, secret: SECRET_TOKEN });
    expect(swapped.ok).toBe(false);
  });
});

describe('Mapeo de errores de credenciales', () => {
  it('traduce cada fallo a un codigo estable', () => {
    expect(mapCredentialError(new CredentialNotFoundError()).status).toBe(404);
    expect(mapCredentialError(new CredentialIntegrityError()).code).toBe('NOT_FOUND');
    expect(mapCredentialError(new ProviderNotSupportedError())).toMatchObject({ status: 400, code: 'PROVIDER_NOT_SUPPORTED' });
    expect(mapCredentialError(new CredentialStoreError()).status).toBe(503);
    expect(mapCredentialError(new CredentialConfigurationError()).status).toBe(500);
    expect(mapCredentialError(new Error('boom')).code).toBe('INTERNAL_ERROR');
  });
});
