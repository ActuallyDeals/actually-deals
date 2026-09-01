import assert from "node:assert/strict";
import { originalWhyNote } from "../src/lib/editorial.ts";
import { isCouponOnlyDeal } from "../src/lib/outbound.ts";
import { validateDealInput } from "../src/lib/store.ts";
import { publicPriceDisplay } from "../src/lib/pricing.ts";
import { rewritePastedDeal, stackedBullets } from "../src/lib/stack-copy.ts";

const junkWas = publicPriceDisplay({
  merchant: "amazon",
  currentPrice: 2.99,
  listPrice: 0.46,
});
assert.equal(junkWas.listPrice, null);
assert.equal(junkWas.percent, null);

const samePrice = publicPriceDisplay({
  merchant: "amazon",
  currentPrice: 109.99,
  listPrice: 109.99,
});
assert.equal(samePrice.listPrice, null);
assert.equal(samePrice.percent, null);

const realWas = publicPriceDisplay({
  merchant: "amazon",
  currentPrice: 42.5,
  listPrice: 50,
});
assert.equal(realWas.listPrice, 50);
assert.equal(realWas.percent, 15);

const junkWasBullets = stackedBullets({
  merchant: "amazon",
  currentPrice: 2.99,
  listPrice: 0.46,
  clipCoupon: false,
  subscribeSave: false,
  promoCode: "",
}).join(" ");
assert.equal(/0\.46/.test(junkWasBullets), false);

const paste = [
  "Kettle Brand Potato Chips $2.99",
  "Clip 20% coupon and Subscribe & Save 5% = $2.24",
  "Frontpage Deal at $2.30",
  "Deal Score: 4821",
  "10%: $2.09",
  "Deal history $0.46",
].join("\n");

const rewritten = rewritePastedDeal(paste, {
  title: "Kettle chips",
  merchant: "amazon",
  currentPrice: "2.99",
  listPrice: "",
  promoCode: "",
});
assert.equal(rewritten.clipCoupon, true);
assert.equal(rewritten.subscribeSave, true);
assert.equal(rewritten.currentPrice, "2.24");
assert.equal(rewritten.listPrice, "2.99");
assert.equal(rewritten.listPrice === "2.09", false);
assert.equal(rewritten.listPrice === "2.3", false);
assert.equal(rewritten.listPrice === "0.46", false);

const clone = originalWhyNote(
  "Frontpage Deal. Deal Score 99. Clip coupon then add to next delivery. https://www.amazon.com/dp/B0BBL5TWP3 leftover slickdeals dump.",
);
assert.equal(clone, null);

const original = originalWhyNote("Clip the coupon and turn on Subscribe & Save; cart should be $2.24.");
assert.equal(original?.includes("Subscribe & Save"), true);


const oneLine = rewritePastedDeal(
  "Kettle chips $2.99, clip 20%, SnS 5% = $2.24, plus Frontpage Deal at $2.30 and 10%: $2.09 and Deal history $0.46",
  { title: "Kettle chips", merchant: "amazon", currentPrice: "2.99", listPrice: "0.46", promoCode: "" },
);
assert.equal(oneLine.clipCoupon, true);
assert.equal(oneLine.subscribeSave, true);
assert.equal(oneLine.currentPrice, "2.24");
assert.equal(oneLine.listPrice, "2.99");


validateDealInput({
  title: "Domino's 50% off",
  merchant: "other",
  sourceUrl: "",
  currentPrice: 0,
  listPrice: null,
  promoCode: "PIZZA50",
  bullets: ["Use the code at checkout.", "No retailer link on this post.", "Confirm the app total before you pay."],
  status: "published",
});

let threw = false;
try {
  validateDealInput({
    title: "Instant Pot",
    merchant: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B08PQ2KWHS",
    currentPrice: 49,
    listPrice: null,
    bullets: ["a", "b", "c"],
    status: "published",
  });
} catch {
  threw = true;
}
assert.equal(threw, true);
assert.equal(isCouponOnlyDeal({ promoCode: "PIZZA50", sourceUrl: "", merchant: "other" }), true);

console.log("pricing verification passed");
