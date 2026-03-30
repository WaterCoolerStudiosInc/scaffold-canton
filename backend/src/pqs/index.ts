// src/pqs/index.ts
import postgres from 'postgres';

export type PqsContract<T> = {
  contractId: string;
  payload: T;
  createdAt: string;
};

export function createPqsClient(connectionString: string) {
  const sql = postgres(connectionString);

  async function queryActiveByField<T>(
    templateId: string,
    field: string,
    value: string
  ): Promise<PqsContract<T>[]> {
    const rows = await sql<
      { contract_id: string; payload: T; created_effective_at: string }[]
    >`
      SELECT contract_id, payload, created_effective_at
      FROM active(${templateId})
      WHERE payload->>${field} = ${value}
    `;
    return rows.map((r) => ({
      contractId: r.contract_id,
      payload: r.payload,
      createdAt: r.created_effective_at,
    }));
  }

  async function queryActiveById<T>(
    templateId: string,
    contractId: string
  ): Promise<PqsContract<T> | null> {
    const rows = await sql<
      { contract_id: string; payload: T; created_effective_at: string }[]
    >`
      SELECT contract_id, payload, created_effective_at
      FROM active(${templateId})
      WHERE contract_id = ${contractId}
    `;
    if (rows.length === 0) return null;
    return {
      contractId: rows[0].contract_id,
      payload: rows[0].payload,
      createdAt: rows[0].created_effective_at,
    };
  }

  return { sql, queryActiveByField, queryActiveById };
}

export type PqsClient = ReturnType<typeof createPqsClient>;
