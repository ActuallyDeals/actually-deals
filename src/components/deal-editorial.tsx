import { editorialSections, hasEditorialBlock } from "@/lib/editorial";
import type { Deal } from "@/lib/types";

export function DealEditorial({
  deal,
  staffEmptyHint = false,
}: {
  deal: Deal;
  staffEmptyHint?: boolean;
}) {
  const sections = editorialSections(deal);
  const missingWriteup =
    staffEmptyHint && (!sections.why || !sections.stacking.length || !sections.verify);
  if (!hasEditorialBlock(deal) && !missingWriteup) return null;

  return (
    <section className="mt-8 space-y-6 border-t border-slate-100 pt-6">
      <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">Editor&apos;s take</p>
      {missingWriteup ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Why / stack / verify are still empty. Public readers will not see invented commentary.
          Fill all three before Ready. Incoming and Draft can stay blank.
        </p>
      ) : null}
      {sections.why ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Why this is good</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">{sections.why}</p>
        </div>
      ) : null}
      {sections.stacking.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-950">How the stack works</h2>
          <ol className="mt-3 space-y-3">
            {sections.stacking.map((step) => (
              <li key={step.step} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">
                  {step.step}. {step.title}
                </p>
                {step.detail.trim() ? (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {sections.verify ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Verify in the cart</h2>
          <p className="mt-2 text-sm font-semibold text-slate-900">{sections.verify.title}</p>
          {sections.verify.detail.trim() ? (
            <p className="mt-1 text-base leading-relaxed text-slate-700">{sections.verify.detail}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
