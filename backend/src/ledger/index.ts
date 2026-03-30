// src/ledger/index.ts
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

  return { submit };
}

export type LedgerClient = ReturnType<typeof createLedgerClient>;
