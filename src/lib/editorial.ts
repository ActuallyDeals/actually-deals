import { looksClonedWriteup } from "@/lib/stack-copy";
import type { Deal, StackingStep } from "@/lib/types";

export function originalWhyNote(summary: string | null | undefined): string | null {
  const trimmed = summary?.trim() ?? "";
  if (!trimmed) return null;
  if (looksClonedWriteup(trimmed)) return null;
  return trimmed;
}

export function editorialSections(deal: Pick<Deal, "summary" | "stackingSteps">): {
  why: string | null;
  stacking: StackingStep[];
  verify: StackingStep | null;
} {
  const why = originalWhyNote(deal.summary);
  const steps = (deal.stackingSteps ?? []).filter(
    (step) => step.title.trim() || step.detail.trim(),
  );
  if (steps.length >= 2) {
    const last = steps[steps.length - 1]!;
    if (/confirm|checkout|cart|vote expired/i.test(`${last.title} ${last.detail}`)) {
      return { why, stacking: steps.slice(0, -1), verify: last };
    }
  }
  return { why, stacking: steps, verify: null };
}

export function hasEditorialBlock(deal: Pick<Deal, "summary" | "stackingSteps">): boolean {
  const sections = editorialSections(deal);
  return Boolean(sections.why || sections.stacking.length || sections.verify);
}

export function writeupReady(why: string, stack: string, verify: string): boolean {
  return Boolean(why.trim() && stack.trim() && verify.trim());
}

/** Pull stored editorial into the three staff boxes. Does not invent text. */
export function staffWriteupBoxes(deal: Pick<Deal, "summary" | "stackingSteps">): {
  why: string;
  stack: string;
  verify: string;
} {
  const sections = editorialSections(deal);
  return {
    why: sections.why ?? "",
    stack: sections.stacking
      .map((step) => [step.title, step.detail].filter((part) => part.trim()).join(" — "))
      .join("\n"),
    verify: sections.verify
      ? [sections.verify.title, sections.verify.detail].filter((part) => part.trim()).join(" — ")
      : "",
  };
}

/** Persist staff stack + verify notes. Empty strings stay empty — no generated copy. */
export function boxesToStackingSteps(stack: string, verify: string): StackingStep[] {
  const steps: StackingStep[] = [];
  const stackText = stack.trim();
  const verifyText = verify.trim();
  if (stackText) {
    steps.push({ step: 1, title: "How the stack works", detail: stackText });
  }
  if (verifyText) {
    steps.push({
      step: steps.length + 1,
      title: "Verify in the cart",
      detail: verifyText,
    });
  }
  return steps;
}
