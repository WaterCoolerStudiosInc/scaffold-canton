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

  async function lookupContract(contractId: string): Promise<{
    contractId: string;
    templateId: string;
    payload: unknown;
    createdAt: string;
    archivedAt: string | null;
  } | null> {
    const rows = await sql<{
      contract_id: string;
      template_id: string;
      payload: unknown;
      created_effective_at: string;
      archived_effective_at: string | null;
    }[]>`
      SELECT contract_id, template_id, payload, created_effective_at, archived_effective_at
      FROM lookup_contract(${contractId})
    `;
    if (rows.length === 0) return null;
    return {
      contractId: rows[0].contract_id,
      templateId: rows[0].template_id,
      payload: rows[0].payload,
      createdAt: rows[0].created_effective_at,
      archivedAt: rows[0].archived_effective_at,
    };
  }

  async function getTemplateSummary(
    templateIds: Record<string, string>
  ): Promise<Record<string, number>> {
    const entries = await Promise.all(
      Object.entries(templateIds).map(async ([name, templateId]) => {
        const rows = await sql<{ count: string }[]>`
          SELECT COUNT(*) AS count FROM active(${templateId})
        `;
        return [name, Number(rows[0].count)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  async function queryAllActive<T>(templateId: string): Promise<PqsContract<T>[]> {
    const rows = await sql<
      { contract_id: string; payload: T; created_effective_at: string }[]
    >`
      SELECT contract_id, payload, created_effective_at
      FROM active(${templateId})
    `;
    return rows.map((r) => ({
      contractId: r.contract_id,
      payload: r.payload,
      createdAt: r.created_effective_at,
    }));
  }

  async function listKnownTemplates(): Promise<string[]> {
    // active() with no filter returns all active contracts; grab distinct template_ids
    const rows = await sql<{ template_id: string }[]>`
      SELECT DISTINCT template_id FROM active('') ORDER BY template_id
    `.catch(async () => {
      // Fallback: show PQS schema so the caller can debug
      const tables = await sql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name
      `;
      return tables.map((r) => ({ template_id: `[table] ${r.table_name}` }));
    });
    return rows.map((r) => r.template_id);
  }

  return { sql, queryActiveByField, queryActiveById, lookupContract, getTemplateSummary, queryAllActive, listKnownTemplates };
}

export type PqsClient = ReturnType<typeof createPqsClient>;
