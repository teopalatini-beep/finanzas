"use client";

import { useCallback, useState } from "react";
import { ExpenseForm, type AdviceContext } from "@/components/ExpenseForm";
import { VoiceEntry } from "@/components/VoiceEntry";
import type { SpokenDraft } from "@/lib/spoken-types";

type Group = Parameters<typeof ExpenseForm>[0]["groups"];
type Methods = Parameters<typeof ExpenseForm>[0]["methods"];

// Junta el cuadro de voz con el formulario: lo dictado completa el formulario (y se puede corregir).
export function NewExpense({
  groups,
  methods,
  today,
  advice,
}: {
  groups: Group;
  methods: Methods;
  today: string;
  advice: AdviceContext | null;
}) {
  const [draft, setDraft] = useState<{ key: number; value: SpokenDraft } | null>(null);
  const onDraft = useCallback((key: number, value: SpokenDraft) => setDraft({ key, value }), []);

  return (
    <>
      <VoiceEntry onDraft={onDraft} />
      {/* La clave hace que el formulario se vuelva a armar con cada borrador nuevo. */}
      <ExpenseForm
        key={draft?.key ?? 0}
        groups={groups}
        methods={methods}
        today={today}
        advice={advice}
        draft={draft?.value ?? null}
      />
    </>
  );
}
