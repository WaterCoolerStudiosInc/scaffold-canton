import { trace } from '@opentelemetry/api';

export type CreateCommand = {
  CreateCommand: {
    templateId: string;
    createArguments: Record<string, unknown>;
  };
};

export type ExerciseCommand = {
  ExerciseCommand: {
    templateId: string;
    contractId: string;
    choice: string;
    choiceArgument: Record<string, unknown>;
  };
};

export type LedgerCommand = CreateCommand | ExerciseCommand;

export function buildCreate(
  templateId: string,
  args: Record<string, unknown>
): CreateCommand {
  return { CreateCommand: { templateId, createArguments: args } };
}

export function buildExercise(
  templateId: string,
  contractId: string,
  choice: string,
  args: Record<string, unknown> = {}
): ExerciseCommand {
  return {
    ExerciseCommand: { templateId, contractId, choice, choiceArgument: args },
  };
}

export type SubmitResult = {
  completion: { updateId: string; commandId: string };
};

export function createLedgerClient(
  baseUrl: string,
  getToken: () => string | Promise<string>
) {
  async function submit(
    actAs: string[],
    commands: LedgerCommand[],
    commandId: string
  ): Promise<SubmitResult> {
    const span = trace.getActiveSpan();
    span?.setAttribute('canton.command_id', commandId);
    span?.setAttribute('canton.act_as', actAs.join(','));

    const token = await getToken();
    const res = await fetch(`${baseUrl}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commands, actAs, commandId }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ledger API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<SubmitResult>;
  }

  async function getActiveContracts(
    parties: string[],
    templateIds?: string[],
    limit?: number
  ): Promise<{ contractId: string; templateId: string; createArgument: unknown; signatories: string[]; observers: string[] }[]> {
    const token = await getToken();

    const filtersByParty: Record<string, unknown> = {};
    for (const party of parties) {
      filtersByParty[party] = templateIds?.length
        ? { inclusive: { templateFilters: templateIds.map((t) => ({ templateId: t })) } }
        : {};
    }

    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    const query = params.size ? `?${params}` : '';

    const res = await fetch(`${baseUrl}/v2/state/active-contracts${query}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parties,
        transactionFilter: { filtersByParty },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`getActiveContracts failed ${res.status}: ${body}`);
    }

    const items = (await res.json()) as Array<
      | { ActiveContract: { contractId: string; templateId: string; createArgument: unknown; signatories: string[]; observers: string[] } }
      | { OffsetCheckpoint: unknown }
    >;

    return items
      .filter((i): i is { ActiveContract: { contractId: string; templateId: string; createArgument: unknown; signatories: string[]; observers: string[] } } => 'ActiveContract' in i)
      .map((i) => i.ActiveContract);
  }

  async function listPackages(): Promise<string[]> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v2/packages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`listPackages failed ${res.status}: ${body}`);
    }
    const data = (await res.json()) as { packageIds: string[] };
    return data.packageIds;
  }

  async function uploadPackage(dar: ArrayBuffer): Promise<unknown> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v2/packages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: dar,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`uploadPackage failed ${res.status}: ${body}`);
    }
    return res.json();
  }

  return { submit, getActiveContracts, listPackages, uploadPackage };
}

export type LedgerClient = ReturnType<typeof createLedgerClient>;
