import assert from "node:assert/strict";
import { attachAffiliate, cleanTrackingParams, withHttps } from "../src/lib/affiliate.ts";
import { imageFallbackChain, isBrandedPlaceholder, resolveDealImage } from "../src/lib/images.ts";
import { findDuplicateDeal } from "../src/lib/desk.ts";
import { readFileSync } from "node:fs";
import {
  dealsFromRoundupCandidates,
  extractRetailerCandidates,
  hydrateDealFromListingHtml,
  ingestDealPaste,
  isClickWrapper,
  isDealBlogArticleUrl,
  isDealHubUrl,
  isSlickdealsThreadUrl,
  livePromoCodeFromDealBlog,
  pickRetailerHref,
  resolvePasteTarget,
  shouldFetchRetailerListing,
} from "../src/lib/ingest-roundup.ts";
import { detectMerchant, extractMerchantProductId, merchantLabel, storeLabelFromUrl } from "../src/lib/merchants.ts";
import { canonicalSourceUrl, extractFromHtml, titleFromProductUrl } from "../src/lib/parse-deal.ts";
import { giftCardFaceValue } from "../src/lib/pricing.ts";
import { isCouponOnlyDeal, isDirectRetailerListing, isRetailerShortUrl } from "../src/lib/outbound.ts";
import { socialAutoPostEnabled } from "../src/lib/social-post.ts";
import { buildDanBullets, buildFacebookPost, buildInstagramCaption, buildSocialPost, extractDealMechanics } from "../src/lib/copy-engine.ts";
import { looksClonedWriteup, publicBullets } from "../src/lib/stack-copy.ts";
import { AMAZON_ASSOCIATE_DISCLOSURE, GENERIC_AFFILIATE_DISCLOSURE } from "../src/lib/disclosures.ts";

assert.equal(withHttps("amazon.com/dp/B08PQ2KWHS"), "https://amazon.com/dp/B08PQ2KWHS");
assert.equal(extractMerchantProductId(withHttps("amazon.com/dp/B08PQ2KWHS"), "amazon"), "B08PQ2KWHS");

assert.equal(storeLabelFromUrl("ashleyfurniture.com"), "Ashley Furniture");
assert.equal(storeLabelFromUrl("https://photo.walgreens.com/store/sample-set-of-6-premium"), "Walgreens");
assert.equal(storeLabelFromUrl("www.wayfair.com"), "Wayfair");
assert.equal(storeLabelFromUrl("shop.example.co.uk"), "Example");
assert.equal(storeLabelFromUrl(""), "Store");
assert.equal(storeLabelFromUrl(null), "Store");
assert.equal(storeLabelFromUrl("not a url"), "Store");
assert.equal(merchantLabel("amazon", "https://www.ashleyfurniture.com/p/x"), "Amazon");
assert.equal(merchantLabel("other", "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html"), "Ashley Furniture");
assert.equal(merchantLabel("other"), "Store");
assert.equal(merchantLabel("uber"), "Uber");
const ashleyBullets = buildDanBullets({
  merchant: "other",
  currentPrice: 399,
  listPrice: null,
  percentOff: null,
  promoCode: null,
  sourceUrl: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
});
assert.equal(ashleyBullets.some((line) => line.includes("$399 at Ashley Furniture")), true);
assert.equal(ashleyBullets.some((line) => /\bat Store\b/.test(line)), false);
const noUrlBullets = buildDanBullets({
  merchant: "other",
  currentPrice: 399,
  listPrice: null,
  percentOff: null,
  promoCode: null,
});
assert.equal(noUrlBullets.some((line) => line.includes("$399 at Store")), true);

const clipCouponLine = "Clip any on-page coupon, then confirm the total before you pay.";
const amazonNoCodeBullets = publicBullets({
  title: "Kettle Brand Sea Salt Potato Chips",
  merchant: "amazon",
  promoCode: null,
  bullets: [
    "$3.49 at Amazon. Confirm the total at checkout.",
    "Free Prime shipping on eligible orders; otherwise check the threshold.",
    clipCouponLine,
  ],
});
assert.equal(amazonNoCodeBullets.includes(clipCouponLine), false);
assert.equal(
  amazonNoCodeBullets.some((line) => line === "Confirm the live total at Amazon before you pay."),
  true,
);
assert.equal(amazonNoCodeBullets[0], "$3.49 at Amazon. Confirm the total at checkout.");
assert.equal(
  amazonNoCodeBullets[1],
  "Free Prime shipping on eligible orders; otherwise check the threshold.",
);

const amazonWithCodeBullets = publicBullets({
  title: "Kettle Brand Sea Salt Potato Chips",
  merchant: "amazon",
  promoCode: "SAVE10",
  bullets: [clipCouponLine],
});
assert.equal(amazonWithCodeBullets[0], clipCouponLine);

const stackedAcBullets = publicBullets({
  title: "[AC] $3.49* | Kettle chips at Amazon",
  merchant: "amazon",
  promoCode: null,
  bullets: [clipCouponLine],
});
assert.equal(stackedAcBullets[0], clipCouponLine);

const stackedSnsBullets = publicBullets({
  title: "[SnS] $12* | Baby Trend at Amazon",
  merchant: "amazon",
  promoCode: null,
  bullets: ["Turn on Subscribe & Save on this listing, then confirm the total. You can cancel after it ships."],
});
assert.equal(/Subscribe & Save/.test(stackedSnsBullets[0] ?? ""), true);
assert.equal(
  buildSocialPost({
    title: "Storrow Sofa",
    merchant: "other",
    currentPrice: 399,
    sourceUrl: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
  }).includes("$399 Storrow Sofa at Ashley Furniture"),
  true,
);

const amazon =
  "https://www.amazon.com/Instant-Pot/dp/B08PQ2KWHS?tag=other-20&th=1&psc=1&utm_source=ig&pf_rd_r=ABC&ref=sr_1_1";
assert.equal(detectMerchant(amazon), "amazon");
assert.equal(extractMerchantProductId(amazon, "amazon"), "B08PQ2KWHS");
const cleanedAmazon = cleanTrackingParams(amazon);
assert.equal(cleanedAmazon.includes("utm_source"), false);
assert.equal(cleanedAmazon.includes("pf_rd_r"), false);
assert.equal(cleanedAmazon.includes("tag="), false);

const walmart = "https://www.walmart.com/ip/Red-Bull-Sugar-Free/14898365?athcpid=1&utm_campaign=x";
assert.equal(detectMerchant(walmart), "walmart");
assert.equal(extractMerchantProductId(walmart, "walmart"), "14898365");

const target = "https://www.target.com/p/dyson-v8/-/A-54191097?clkid=abc&utm_medium=email";
assert.equal(detectMerchant(target), "target");
assert.equal(extractMerchantProductId(target, "target"), "54191097");
assert.equal(cleanTrackingParams(target).includes("clkid"), false);
assert.equal(cleanTrackingParams(target).includes("utm_medium"), false);

const depot = "https://www.homedepot.com/p/DEWALT-20V-MAX-Kit/304667167";
assert.equal(detectMerchant(depot), "home-depot");
assert.equal(extractMerchantProductId(depot, "home-depot"), "304667167");

const bestbuy = "https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p?skuId=6505727&intl=nosplash";
assert.equal(detectMerchant(bestbuy), "best-buy");
assert.equal(extractMerchantProductId(bestbuy, "best-buy"), "6505727");

process.env.AFFILIATE_AMAZON_TAG = "actuallydea07-20";
const tagged = attachAffiliate("https://www.amazon.com/dp/B08PQ2KWHS?tag=old-20&th=1", "amazon");
assert.equal(tagged.includes("tag=actuallydea07-20"), true);
assert.equal(tagged.includes("th=1"), false);

const image = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(image.imageTier, "cdn");
assert.equal(image.imageUrl.includes("B08PQ2KWHS"), true);

const chain = imageFallbackChain({
  scrapedImageUrl: "https://example.com/photo.jpg",
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(chain[0], "https://example.com/photo.jpg");
assert.equal(chain.at(-1), "/placeholders/amazon.svg");

const placeholder = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "walmart",
  merchantProductId: "14898365",
});
assert.equal(placeholder.imageTier, "placeholder");


const amazonCdn = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(amazonCdn.imageTier, "cdn");
assert.equal(isBrandedPlaceholder(amazonCdn.imageUrl), false);

const pageUrl = "https://9to5toys.com/2026/09/01/iphone-17-pro-deals/";
assert.equal(
  pickRetailerHref(
    "https://9to5toys.com/goto?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB0G467WG1C%3Ftag%3Dtoysj-20",
    pageUrl,
  )?.includes("B0G467WG1C"),
  true,
);
assert.equal(
  pickRetailerHref("/out?u=https://www.amazon.com/dp/B0G45F93BH", pageUrl)?.includes("B0G45F93BH"),
  true,
);
assert.equal(
  pickRetailerHref("https://9to5toys.com/recomm?dest=https://www.amazon.com/gp/product/B0G458PMRL", pageUrl)?.includes(
    "B0G458PMRL",
  ),
  true,
);

const html = `
<div class="post-content">
<h1>iPhone 17 Pro models drop to new Amazon all-time lows again at up to $285 off (Renewed Premium)</h1>
<ul class="wp-block-list">
<li>1TB iPhone 17 Pro Cosmic Orange <a href="https://amzn.to/4gzXuys"><strong>$1,214</strong> (Reg. $1,499 new)</a> – New all-time low</li>
<li>512GB iPhone 17 Pro Silver <a href="https://www.amazon.com/dp/B0G467WG1C?tag=toysj-20"><strong>$1,171</strong> (Reg. $1,299 new)</a></li>
<li>512GB iPhone 17 Pro Silver <a href="https://9to5toys.com/goto?url=https%3A%2F%2Fwww.amazon.com%2Fgp%2Fproduct%2FB0G467WG1C%3Ftag%3Dtoysj-20"><strong>$1,171</strong> (Reg. $1,299 new)</a></li>
</ul>
<div class="wp-block-media-text"><p><a href="https://www.amazon.com/dp/B0GJTXVN9Z?tag=toysj-20">New 2026 AirTag 2 now down as low as $20 each</a></p></div>
<div class="related-guides"><ul><li><a href="https://www.amazon.com/dp/B0D1XD1ZV3">AirPods leftover</a></li></ul></div>
<div class="author-gear"><a href="https://amzn.to/3E1qSMS">AirPods leftover</a></div>
</div>
`;
const found = extractRetailerCandidates(html, pageUrl);
assert.equal(found.length, 2);
assert.equal(found[0].currentPrice, 1214);
assert.equal(found[0].listPrice, 1499);
assert.equal(found[1].currentPrice, 1171);
assert.equal(found[1].listPrice, 1299);
assert.equal(found[0].href.includes("amzn.to/4gzXuys"), true);
assert.equal(found[1].href.includes("B0G467WG1C"), true);
assert.equal(found[1].href.includes("9to5toys.com/goto"), false);
assert.equal(found.some((item) => item.href.includes("B0GJTXVN9Z")), false);
assert.equal(found.some((item) => item.href.includes("B0D1XD1ZV3")), false);
assert.equal(found.some((item) => item.href.includes("3E1qSMS")), false);
assert.equal(/all-time low|models drop|renewed premium/i.test(found[0].title), false);
assert.equal(found[0].title.includes("1TB iPhone 17 Pro Cosmic Orange"), true);
assert.equal(found[1].title.includes("512GB iPhone 17 Pro Silver"), true);

const asins = new Set(
  found
    .map((item) => extractMerchantProductId(item.href, detectMerchant(item.href)))
    .filter((value): value is string => Boolean(value)),
);
assert.equal(asins.size, 1);
assert.equal(asins.has("B0G467WG1C"), true);

const roundupDeals = dealsFromRoundupCandidates(found);
assert.equal(roundupDeals.length, 2);
for (const deal of roundupDeals) {
  assert.equal(/toysj-20|9to5-20|tag=9to5/i.test(deal.affiliateUrl), false);
  assert.equal(deal.socialPost, "");
}
const silver = roundupDeals.find((deal) => deal.merchantProductId === "B0G467WG1C");
assert.equal(silver?.merchant, "amazon");
assert.equal(silver?.affiliateUrl.includes("tag=actuallydea07-20"), true);
assert.equal(silver?.sourceUrl, "https://www.amazon.com/dp/B0G467WG1C");
assert.equal(silver?.listPrice, 1299);
assert.equal(silver?.imageTier, "cdn");
assert.equal(silver?.imageUrl.includes("B0G467WG1C"), true);
assert.equal(silver?.bullets.length, 3);
assert.equal(/uber|doordash|grubhub|app code/i.test(silver?.bullets.join(" ") ?? ""), false);

assert.equal(isDirectRetailerListing("https://9to5toys.com/2026/09/01/iphone-17-pro-deals/", "other"), false);
assert.equal(isDirectRetailerListing("https://www.amazon.com/dp/B08PQ2KWHS", "amazon"), true);
assert.equal(isCouponOnlyDeal({ promoCode: "PIZZA20", sourceUrl: "", merchant: "other" }), true);
assert.equal(
  isCouponOnlyDeal({
    promoCode: "SAVE10",
    sourceUrl: "https://www.amazon.com/dp/B08PQ2KWHS",
    merchant: "amazon",
  }),
  false,
);

delete process.env.SOCIAL_AUTO_POST;
assert.equal(socialAutoPostEnabled(), false);
process.env.SOCIAL_AUTO_POST = "true";
assert.equal(socialAutoPostEnabled(), true);
process.env.SOCIAL_AUTO_POST = "false";
assert.equal(socialAutoPostEnabled(), false);

const costco =
  "https://www.costco.com/p/-/inkind-one-egift-card-thousands-of-restaurants-100-value/4000233859?langId=-1";
assert.equal(detectMerchant(costco), "costco");
assert.equal(extractMerchantProductId(costco, "costco"), "4000233859");
assert.equal(isDirectRetailerListing(costco, "costco"), true);
assert.equal(
  isCouponOnlyDeal({ promoCode: null, sourceUrl: costco, merchant: "costco" }),
  false,
);
assert.equal(titleFromProductUrl(costco, "costco", "4000233859")?.startsWith("Inkind One eGift Card"), true);
assert.equal(giftCardFaceValue(costco), 100);
assert.equal(giftCardFaceValue("Inkind One eGift Card 100 value"), 100);
assert.equal(giftCardFaceValue("$100 restaurant card"), 100);
assert.equal(canonicalSourceUrl("costco", "4000233859", costco).includes("langId"), false);
assert.equal(canonicalSourceUrl("costco", "4000233859", costco).includes("4000233859"), true);
const costcoImage = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "costco",
  merchantProductId: "4000233859",
});
assert.equal(costcoImage.imageTier, "placeholder");
assert.equal(costcoImage.imageUrl, "/placeholders/other.svg");

const dup = findDuplicateDeal(
  [
    {
      slug: "live-inkind",
      title: "Inkind One eGift Card",
      merchant: "costco",
      merchantProductId: "4000233859",
    } as never,
  ],
  "costco",
  "4000233859",
);
assert.equal(dup?.slug, "live-inkind");
assert.equal(findDuplicateDeal([dup!], "costco", "4000233859", null, "live-inkind"), null);
assert.equal(findDuplicateDeal([dup!], "ebay", "4000233859"), null);
assert.equal(findDuplicateDeal([dup!], "costco", null), null);
assert.equal(findDuplicateDeal([dup!], "costco", "4000233859", "OTHERCODE")?.slug, "live-inkind");

const codeLive = {
  slug: "doordash-save10",
  title: "DoorDash $10 off",
  merchant: "doordash",
  merchantProductId: null,
  promoCode: "SAVE10",
} as never;
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "save10")?.slug, "doordash-save10");
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "  SAVE10  ")?.slug, "doordash-save10");
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "SAVE10", "doordash-save10"), null);
assert.equal(findDuplicateDeal([codeLive], "uber", null, "SAVE10"), null);
assert.equal(findDuplicateDeal([codeLive], "doordash", null, ""), null);
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "   "), null);
assert.equal(
  findDuplicateDeal([{ ...codeLive, promoCode: "" } as never], "doordash", null, "SAVE10"),
  null,
);


const newegg =
  "https://www.newegg.com/amd-ryzen-7-9800x3d/p/N82E16819113877?Item=N82E16819113877&cm_mmc=track";
assert.equal(detectMerchant(newegg), "newegg");
assert.equal(extractMerchantProductId(newegg, "newegg"), "N82E16819113877");
assert.equal(
  extractMerchantProductId("https://www.newegg.com/Product/Product.aspx?Item=9SIA19UK8T1234", "newegg"),
  "9SIA19UK8T1234",
);
assert.equal(extractMerchantProductId("https://www.newegg.com/p/pl?d=ssd", "newegg"), null);
assert.equal(titleFromProductUrl(newegg, "newegg", "N82E16819113877"), "Amd Ryzen 7 9800x3d");
assert.equal(canonicalSourceUrl("newegg", "N82E16819113877", newegg), "https://www.newegg.com/p/N82E16819113877");
assert.equal(attachAffiliate(newegg, "newegg").includes("goto."), false);
assert.equal(attachAffiliate(newegg, "newegg").includes("cm_mmc"), false);

const ebay = "https://www.ebay.com/itm/sony-wh-1000xm5/256890123456?hash=item&utm_source=x";
assert.equal(detectMerchant(ebay), "ebay");
assert.equal(detectMerchant("https://ebay.us/m/abc"), "ebay");
assert.equal(extractMerchantProductId(ebay, "ebay"), "256890123456");
assert.equal(extractMerchantProductId("https://www.ebay.com/itm/256890123456", "ebay"), "256890123456");
assert.equal(extractMerchantProductId("https://www.ebay.com/itm/not-an-id", "ebay"), null);
assert.equal(titleFromProductUrl(ebay, "ebay", "256890123456"), "Sony Wh 1000xm5");
assert.equal(canonicalSourceUrl("ebay", "256890123456", ebay), "https://www.ebay.com/itm/256890123456");
assert.equal(isRetailerShortUrl("https://ebay.us/m/abc"), true);
assert.equal(isRetailerShortUrl("https://ebay.to/xyz"), true);

const kohls = "https://www.kohls.com/product/prd-3949587/nike-air-max-90-shoes.jsp?utm_campaign=x";
assert.equal(detectMerchant(kohls), "kohls");
assert.equal(extractMerchantProductId(kohls, "kohls"), "3949587");
assert.equal(extractMerchantProductId("https://www.kohls.com/catalog.jsp?productId=3949587", "kohls"), "3949587");
assert.equal(titleFromProductUrl(kohls, "kohls", "3949587"), "Nike Air Max 90 Shoes");
assert.equal(
  canonicalSourceUrl("kohls", "3949587", kohls),
  "https://www.kohls.com/product/prd-3949587/nike-air-max-90-shoes.jsp",
);
assert.equal(
  canonicalSourceUrl("kohls", "3949587", "https://www.kohls.com/catalog.jsp?prd=3949587"),
  "https://www.kohls.com/product/prd-3949587/",
);

const dicks = "https://www.dickssportinggoods.com/p/yeti-rambler-20-oz/21218426?utm_source=x";
assert.equal(detectMerchant(dicks), "dicks");
assert.equal(extractMerchantProductId(dicks, "dicks"), "21218426");
assert.equal(
  extractMerchantProductId("https://www.dickssportinggoods.com/p/foo?sku=21NIK123", "dicks"),
  "21NIK123",
);
assert.equal(titleFromProductUrl(dicks, "dicks", "21218426"), "Yeti Rambler 20 Oz");
assert.equal(
  canonicalSourceUrl("dicks", "21218426", dicks),
  "https://www.dickssportinggoods.com/p/yeti-rambler-20-oz/21218426",
);

const office =
  "https://www.officedepot.com/a/products/1234567/HP-Black-Ink/?cm_mmc=track";
assert.equal(detectMerchant(office), "office-depot");
assert.equal(detectMerchant("https://www.officemax.com/a/products/1234567/"), "office-depot");
assert.equal(extractMerchantProductId(office, "office-depot"), "1234567");
assert.equal(titleFromProductUrl(office, "office-depot", "1234567"), "HP Black Ink");
assert.equal(
  canonicalSourceUrl("office-depot", "1234567", office),
  "https://www.officedepot.com/a/products/1234567/",
);

for (const merchant of ["newegg", "ebay", "kohls", "dicks", "office-depot", "uber", "doordash", "grubhub"] as const) {
  const image = resolveDealImage({ scrapedImageUrl: null, merchant, merchantProductId: "x" });
  assert.equal(image.imageTier, "placeholder");
  assert.equal(image.imageUrl, "/placeholders/other.svg");
}

assert.equal(detectMerchant("https://www.uber.com/us/en/eats"), "uber");
assert.equal(detectMerchant("https://www.ubereats.com/promo"), "uber");
assert.equal(detectMerchant("https://www.postmates.com/"), "uber");
assert.equal(detectMerchant("https://www.doordash.com/deals"), "doordash");
assert.equal(detectMerchant("https://www.grubhub.com/lets-eat"), "grubhub");
assert.equal(extractMerchantProductId("https://www.ubereats.com/promo", "uber"), null);
assert.equal(extractMerchantProductId("https://www.doordash.com/store/123", "doordash"), null);
assert.equal(extractMerchantProductId("https://www.grubhub.com/lets-eat", "grubhub"), null);
assert.equal(canonicalSourceUrl("uber", null, "https://www.ubereats.com/promo"), "https://www.ubereats.com/promo");
assert.equal(attachAffiliate("https://www.doordash.com/deals", "doordash").includes("goto."), false);
assert.equal(
  isCouponOnlyDeal({ promoCode: "EATS20", sourceUrl: "https://www.ubereats.com/promo", merchant: "uber" }),
  true,
);

const couponDraftInput = {
  title: "Uber Eats 20% off first order",
  merchant: "uber" as const,
  currentPrice: null,
  promoCode: "EATS20",
  slug: "uber-eats-20",
  why: "Use Get Deal so you land on the cleaned product page.",
  stack: "Free Prime shipping on eligible orders.",
};
const couponX = buildSocialPost(couponDraftInput);
assert.equal(couponX.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponX.includes("actuallydeals.com/deal/uber-eats-20"), true);
assert.equal(couponX.includes("#ad"), true);
assert.equal(couponX.includes("$"), false);
assert.equal(couponX.includes("Get Deal"), false);
assert.equal(couponX.includes("Prime"), false);
assert.equal(couponX.length <= 280, true);

const couponIg = buildInstagramCaption(couponDraftInput);
assert.equal(couponIg.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponIg.includes(GENERIC_AFFILIATE_DISCLOSURE), true);
assert.equal(couponIg.includes(AMAZON_ASSOCIATE_DISCLOSURE), false);
assert.equal(couponIg.includes("@actuallydeals_"), true);
assert.equal(couponIg.includes("actuallydeals.com/deal/uber-eats-20"), true);
assert.equal(couponIg.includes("Get Deal"), false);
assert.equal(couponIg.includes("Prime"), false);

const couponFb = buildFacebookPost(couponDraftInput);
assert.equal(couponFb.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponFb.includes(GENERIC_AFFILIATE_DISCLOSURE), true);
assert.equal(couponFb.includes("ActuallyDeals"), true);
assert.equal(couponFb.includes("Get Deal"), false);
assert.equal(
  couponFb.indexOf("actuallydeals.com/deal/uber-eats-20") < couponFb.indexOf(GENERIC_AFFILIATE_DISCLOSURE),
  true,
);

const emptyTitleX = buildSocialPost({
  title: "   ",
  merchant: "doordash",
  currentPrice: null,
  promoCode: "DASH10",
});
assert.equal(emptyTitleX.includes("This deal at DoorDash w/ code DASH10"), true);
assert.equal(emptyTitleX.includes("#ad"), true);
assert.equal(emptyTitleX.includes("$"), false);

const uberNoCode = buildSocialPost({
  title: "Uber Eats weekend promo",
  merchant: "uber",
  currentPrice: null,
  slug: "uber-weekend",
});
assert.equal(uberNoCode.includes("Uber Eats weekend promo at Uber"), true);
assert.equal(uberNoCode.includes("w/ code"), false);
assert.equal(uberNoCode.includes("$"), false);

assert.equal(
  buildSocialPost({ title: "Mystery SKU", merchant: "walmart", currentPrice: null }),
  "",
);

const pricedX = buildSocialPost({
  title: "Instant Pot Duo Plus",
  merchant: "amazon",
  currentPrice: 49,
  slug: "instant-pot",
});
assert.equal(pricedX.includes("$49 Instant Pot Duo Plus at Amazon"), true);
assert.equal(pricedX.includes("w/ code"), false);

const amazonCouponIg = buildInstagramCaption({
  title: "Paper towels",
  merchant: "amazon",
  currentPrice: null,
  promoCode: "SAVE5",
});
assert.equal(amazonCouponIg.includes(AMAZON_ASSOCIATE_DISCLOSURE), true);
assert.equal(amazonCouponIg.includes(GENERIC_AFFILIATE_DISCLOSURE), false);

const pricedSocial = {
  title: "Instant Pot Duo Plus",
  merchant: "amazon" as const,
  currentPrice: 49,
  slug: "instant-pot",
  why: "This is a real drop versus recent street.",
  stack: "Clip nothing. Confirm the total.",
  verify: "If the total does not match, vote Expired.",
};
const pricedIg = buildInstagramCaption(pricedSocial);
assert.equal(pricedIg.startsWith("$49 Instant Pot Duo Plus at Amazon"), true);
assert.equal(pricedIg.includes("How it stacks:"), false);
assert.equal(pricedIg.includes("Verify:"), false);
assert.equal(pricedIg.includes(AMAZON_ASSOCIATE_DISCLOSURE), true);
assert.equal(pricedIg.includes("@actuallydeals_"), true);
assert.equal(pricedIg.includes("actuallydeals.com/deal/instant-pot"), true);
assert.equal(pricedIg.includes("vote Expired"), false);

const pricedFb = buildFacebookPost(pricedSocial);
assert.equal(pricedFb.startsWith("$49 Instant Pot Duo Plus at Amazon"), true);
assert.equal(
  pricedFb.indexOf("actuallydeals.com/deal/instant-pot") < pricedFb.indexOf(AMAZON_ASSOCIATE_DISCLOSURE),
  true,
);
assert.equal(pricedFb.includes("How it stacks:"), false);
assert.equal(pricedFb.includes("Verify:"), false);
assert.equal(pricedFb.includes(AMAZON_ASSOCIATE_DISCLOSURE), true);
assert.equal(pricedFb.includes("ActuallyDeals"), true);
assert.equal(pricedFb.includes("vote Expired"), false);

assert.equal(isSlickdealsThreadUrl("https://slickdeals.net/f/19957455-ashley-storrow-sofa-399"), true);
assert.equal(isSlickdealsThreadUrl("https://www.slickdeals.net/f/19957455-ashley-storrow-sofa-399"), true);
assert.equal(isSlickdealsThreadUrl("https://daily.slickdeals.net/stores/amazon/"), false);
assert.equal(isClickWrapper("https://slickdeals.net/click?trd=Get+Deal+at+Ashley&sdtid=19957455"), true);
assert.equal(isClickWrapper("https://slickdeals.net/visit?sid=1"), true);
assert.equal(isClickWrapper("https://slickdeals.net/attachdeal?id=1"), true);
assert.equal(isClickWrapper("https://sldc.net/abc"), true);
assert.equal(isClickWrapper("https://slickdeals.net/f/19957455-ashley-storrow-sofa-399"), false);

const sdPage = "https://slickdeals.net/f/19957455-ashley-storrow-sofa-399";
assert.equal(
  pickRetailerHref(
    "https://slickdeals.net/click?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB08PQ2KWHS%3Ftag%3Dslickdeals-20",
    sdPage,
  )?.includes("B08PQ2KWHS"),
  true,
);
assert.equal(pickRetailerHref("https://slickdeals.net/click?trd=Get+Deal+at+Ashley&sdtid=19957455", sdPage)?.includes("/click"), true);
assert.equal(pickRetailerHref("https://sldc.net/go?url=https://www.amazon.com/dp/B08PQ2KWHS", sdPage)?.includes("B08PQ2KWHS"), true);
assert.equal(
  pickRetailerHref(
    "https://click.linksynergy.com/deeplink?murl=https%3A%2F%2Fwww.ashleyfurniture.com%2Fp%2Fstorrow_sofa%2F2920338.html",
    sdPage,
  )?.includes("ashleyfurniture.com/p/storrow_sofa/2920338.html"),
  true,
);
assert.equal(pickRetailerHref("https://9to5toys.com/2026/09/01/iphone-17-pro-deals/", sdPage), null);

const sdHtml = readFileSync(new URL("../src/lib/__fixtures__/slickdeals-thread.html", import.meta.url), "utf8");
const sdFound = extractRetailerCandidates(sdHtml, sdPage);
assert.equal(sdFound.length, 1);
assert.equal(sdFound[0].currentPrice, 399);
assert.equal(sdFound[0].listPrice, null);
assert.equal(/deal score|frontpage deal|slickdeals/i.test(sdFound[0].title), false);
assert.equal(sdFound[0].title.includes("Ashley Storrow Sofa"), true);
assert.equal(sdFound[0].href.includes("/click"), true);
assert.equal(sdFound.some((item) => /B0SIDEBAR01|B0COMMENT01|B0COMMNOTES/.test(item.href)), false);

const sdDeals = dealsFromRoundupCandidates(sdFound);
assert.equal(sdDeals.length, 1);
const sofa = sdDeals[0]!;
assert.equal(sofa.currentPrice, 399);
assert.equal(sofa.listPrice, null);
assert.equal(sofa.promoCode ?? null, null);
const sofaWriteup = [
  sofa.title,
  sofa.bullets.join(" "),
  sofa.stackingSteps.map((step) => `${step.title} ${step.detail}`).join(" "),
  sofa.summary ?? "",
].join("\n");
assert.equal(looksClonedWriteup(sofaWriteup), false);
assert.equal(/deal score|frontpage deal|slickdeals/i.test(sofaWriteup), false);
assert.equal(/doorstep|white glove/i.test(sofaWriteup), true);
assert.equal(/Ashley Furniture has Storrow Sofa for \$399/i.test(sofaWriteup), false);
assert.equal(sofa.bullets.length, 3);
assert.equal(sofa.stackingSteps.length >= 3, true);

const mechanics = extractDealMechanics(
  "Ashley Furniture has Storrow Sofa for $399. Doorstep delivery is free, or White Glove Delivery adds $79.99",
);
assert.equal(mechanics.freeShipping, true);
assert.equal(mechanics.extraDeliveryFee?.amount, 79.99);
assert.equal(mechanics.promoCode, null);

const codeMechanics = extractDealMechanics("Use code SAVE25 at checkout. Clip the coupon. Subscribe & Save. Costco membership. Limit 2 per customer.");
assert.equal(codeMechanics.promoCode, "SAVE25");
assert.equal(codeMechanics.clipCoupon, true);
assert.equal(codeMechanics.subscribeSave, true);
assert.equal(Boolean(codeMechanics.membership), true);
assert.equal(codeMechanics.quantityLimit?.includes("2"), true);

const nestedSd = `
<div class="dealDetailsMainBlock"><h1 class="dealDetailsMainBlock__dealTitle">Instant Pot $49</h1></div>
<div class="dealDetailsTab__bodyHtml">
  Instant Pot Duo for $49 after clipping the coupon. Use code POT49.
  <a href="https://slickdeals.net/click?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB08PQ2KWHS%3Ftag%3Dslickdeals-20">See Deal</a>
</div>
<div id="commentsBox"><a href="https://www.amazon.com/dp/B0COMMENT01">nope</a></div>
`;
const nestedFound = extractRetailerCandidates(nestedSd, sdPage);
assert.equal(nestedFound.length, 1);
assert.equal(nestedFound[0].href.includes("B08PQ2KWHS"), true);
assert.equal(nestedFound[0].currentPrice, 49);
assert.equal(nestedFound.some((item) => item.href.includes("B0COMMENT01")), false);
const nestedDeals = dealsFromRoundupCandidates(nestedFound);
assert.equal(nestedDeals[0]?.merchant, "amazon");
assert.equal(nestedDeals[0]?.affiliateUrl.includes("tag=actuallydea07-20"), true);
assert.equal(nestedDeals[0]?.affiliateUrl.includes("slickdeals-20"), false);
assert.equal(nestedDeals[0]?.promoCode, "POT49");
assert.equal(nestedDeals[0]?.clipCoupon, true);
assert.equal(looksClonedWriteup(nestedDeals[0]?.bullets.join(" ") ?? ""), false);

const slackBlob =
  "Mike — saw this in Slack: check https://hip2save.com/tips/tide-pods-amazon/ and https://www.amazon.com/dp/B08PQ2KWHS?tag=other-20 thanks";
assert.equal(resolvePasteTarget(slackBlob)?.includes("B08PQ2KWHS"), true);
assert.equal(resolvePasteTarget("fire deal https://www.amazon.com/dp/B08PQ2KWHS going fast")?.includes("B08PQ2KWHS"), true);
assert.equal(
  resolvePasteTarget("Worth a look: https://hip2save.com/tips/tide-pods-amazon/")?.includes("hip2save.com/tips/tide-pods-amazon"),
  true,
);
assert.equal(
  resolvePasteTarget("https://x.com/foo/status/1 check https://www.amazon.com/dp/B08PQ2KWHS")?.includes("B08PQ2KWHS"),
  true,
);
assert.equal(resolvePasteTarget("https://www.amazon.com/dp/B08PQ2KWHS"), "https://www.amazon.com/dp/B08PQ2KWHS");

assert.equal(isDealHubUrl("https://thefreebieguy.com/food-deals-freebies/"), true);
assert.equal(isDealHubUrl("https://thefreebieguy.com/hersheys-chocolate-sale/"), false);
assert.equal(isDealHubUrl("https://hip2save.com/tips/current-restaurant-deals-and-discounts/"), true);
assert.equal(isDealHubUrl("https://hip2save.com/tips/"), true);
assert.equal(isDealHubUrl("https://hip2save.com/tips/tide-pods-amazon/"), false);
assert.equal(isDealBlogArticleUrl("https://hip2save.com/tips/tide-pods-amazon/"), true);
assert.equal(isDealBlogArticleUrl("https://thefreebieguy.com/food-deals-freebies/"), false);
assert.equal(isDealBlogArticleUrl("https://thefreebieguy.com/hersheys-chocolate-sale/"), true);
assert.equal(
  isDealBlogArticleUrl(
    "https://www.doctorofcredit.com/walgreens-set-of-6-customized-5x7-premium-photo-cards-free-with-promo-code/",
  ),
  true,
);
assert.equal(
  isDealHubUrl(
    "https://www.doctorofcredit.com/walgreens-set-of-6-customized-5x7-premium-photo-cards-free-with-promo-code/",
  ),
  false,
);
assert.equal(isDealHubUrl("https://www.doctorofcredit.com/"), true);
assert.equal(isDealHubUrl("https://www.doctorofcredit.com/category/deals/"), true);
assert.equal(isDealBlogArticleUrl("https://www.doctorofcredit.com/"), false);
assert.equal(looksClonedWriteup("Per Doctor of Credit this is live"), true);
assert.equal(looksClonedWriteup("See doctorofcredit.com for the original"), true);
assert.equal(
  livePromoCodeFromDealBlog(
    "Walgreens photo cards Free With Promo Code PREM6",
    "The Offer: promo code SIXFREE. Update 9/1/26: Deal is back with promo code PREM6. Update 8/11/26: promo code FREEMIUM. Our Verdict: skip. Post history: promo code PREMCARDS",
  ),
  "PREM6",
);
assert.equal(
  livePromoCodeFromDealBlog("Tide Pods 96-count $12 at Amazon", "Clip the coupon then use code TIDE12. Subscribe & Save."),
  null,
);

const hipPage = "https://hip2save.com/tips/tide-pods-amazon/";
const hipHtml = `
<article class="post">
  <h1 class="entry-title">Tide Pods 96-count $12 at Amazon (Reg. $24) | Hip2Save</h1>
  <div class="entry-content">
    <p>Clip the coupon then use code TIDE12. Subscribe &amp; Save. Tide Pods 96-count for $12 (Reg. $24).</p>
    <p><a href="https://www.amazon.com/dp/B08PQ2KWHS?tag=hip2save-20">Get it at Amazon</a></p>
  </div>
</article>
<div id="comments"><a href="https://www.amazon.com/dp/B0COMMENT01">comment leftover</a></div>
<div class="related-posts"><ul><li><a href="https://www.amazon.com/dp/B0RELATED01">related leftover</a></li></ul></div>
<div class="newsletter"><a href="https://www.amazon.com/dp/B0NEWS01">newsletter leftover</a></div>
`;
const hipFound = extractRetailerCandidates(hipHtml, hipPage);
assert.equal(hipFound.length, 1);
assert.equal(hipFound[0].href.includes("B08PQ2KWHS"), true);
assert.equal(hipFound[0].currentPrice, 12);
assert.equal(hipFound[0].listPrice, 24);
assert.equal(/hip2save/i.test(hipFound[0].title), false);
assert.equal(hipFound[0].title.includes("Tide Pods"), true);
assert.equal(hipFound.some((item) => /B0COMMENT01|B0RELATED01|B0NEWS01/.test(item.href)), false);
const hipDeals = dealsFromRoundupCandidates(hipFound);
assert.equal(hipDeals.length, 1);
assert.equal(hipDeals[0]?.merchant, "amazon");
assert.equal(hipDeals[0]?.affiliateUrl.includes("tag=actuallydea07-20"), true);
assert.equal(hipDeals[0]?.affiliateUrl.includes("hip2save-20"), false);
assert.equal(hipDeals[0]?.promoCode, "TIDE12");
assert.equal(hipDeals[0]?.clipCoupon, true);
assert.equal(hipDeals[0]?.subscribeSave, true);
const hipWriteup = [
  hipDeals[0]?.title,
  hipDeals[0]?.bullets.join(" "),
  hipDeals[0]?.stackingSteps.map((step) => `${step.title} ${step.detail}`).join(" "),
  hipDeals[0]?.summary ?? "",
].join("\n");
assert.equal(looksClonedWriteup(hipWriteup), false);
assert.equal(/hip2save|freebie guy|deal score|frontpage deal|slickdeals/i.test(hipWriteup), false);
assert.equal(/Clip the coupon then use code TIDE12\. Subscribe & Save\. Tide Pods 96-count for \$12/i.test(hipWriteup), false);
assert.equal(/TIDE12|clip/i.test(hipWriteup), true);

const hub = await ingestDealPaste("https://thefreebieguy.com/food-deals-freebies/");
assert.equal(hub.deals.length, 0);
assert.equal(/single deal article|retailer product URL/i.test(hub.scrapeNote ?? ""), true);
const hubBlob = await ingestDealPaste("staff dump https://thefreebieguy.com/food-deals-freebies/");
assert.equal(hubBlob.deals.length, 0);
assert.equal(/single deal article|retailer product URL/i.test(hubBlob.scrapeNote ?? ""), true);

const docPage =
  "https://www.doctorofcredit.com/walgreens-set-of-6-customized-5x7-premium-photo-cards-free-with-promo-code/";
const docHtml = readFileSync(new URL("../src/lib/__fixtures__/doctorofcredit-walgreens.html", import.meta.url), "utf8");
const docFound = extractRetailerCandidates(docHtml, docPage);
assert.equal(docFound.length, 1);
assert.equal(docFound[0].href.includes("photo.walgreens.com/store/sample-set-of-6-premium"), true);
assert.equal(docFound[0].promoCode, "PREM6");
assert.equal(docFound[0].listPrice, null);
assert.equal(docFound[0].currentPrice, 0);
assert.equal(/doctor of credit|hip2save|slickdeals/i.test(docFound[0].title), false);
assert.equal(/photo cards/i.test(docFound[0].title), true);
assert.equal(docFound.some((item) => /B0COMMENT01|B0RELATED01/.test(item.href)), false);
const retiredCodes = /SIXFRE|FREEMIUM|\b6FREE\b|SEND6CARDS|SENDTHESE|57CARDS|6cards|PREMCARDS/i;
assert.equal(retiredCodes.test(docFound[0].promoCode ?? ""), false);
const docDeals = dealsFromRoundupCandidates(docFound);
assert.equal(docDeals.length, 1);
const cards = docDeals[0]!;
assert.equal(cards.merchant, "other");
assert.equal(cards.sourceUrl.includes("photo.walgreens.com/store/sample-set-of-6-premium"), true);
assert.equal(cards.promoCode, "PREM6");
assert.equal(cards.listPrice, null);
assert.equal(cards.currentPrice, 0);
assert.equal(cards.pricesBlocked, false);
const cardsWriteup = [
  cards.title,
  cards.bullets.join(" "),
  cards.stackingSteps.map((step) => `${step.title} ${step.detail}`).join(" "),
  cards.summary ?? "",
].join("\n");
assert.equal(looksClonedWriteup(cardsWriteup), false);
assert.equal(retiredCodes.test(cardsWriteup), false);
assert.equal(/doctor of credit|doctorofcredit|our verdict|hat tip/i.test(cardsWriteup), false);
assert.equal(/PREM6/i.test(cardsWriteup), true);
assert.equal(/Walgreens/.test(cards.bullets.join(" ")), true);
assert.equal(/Enter PREM6|Apply code PREM6|Use code PREM6/i.test(cardsWriteup), true);
const cardsSocialInput = {
  title: cards.title,
  merchant: cards.merchant,
  currentPrice: cards.currentPrice,
  promoCode: cards.promoCode,
  sourceUrl: cards.sourceUrl,
  why: cards.summary,
};
const cardsSocial = buildSocialPost(cardsSocialInput);
assert.equal(retiredCodes.test(cardsSocial), false);
assert.equal(
  retiredCodes.test(
    [cardsSocial, buildInstagramCaption(cardsSocialInput), buildFacebookPost(cardsSocialInput)].join("\n"),
  ),
  false,
);

assert.equal(
  shouldFetchRetailerListing({
    merchant: "amazon",
    productId: "B08PQ2KWHS",
    url: "https://www.amazon.com/dp/B08PQ2KWHS",
  }),
  false,
);
assert.equal(
  shouldFetchRetailerListing({
    merchant: "other",
    productId: null,
    url: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
  }),
  true,
);
assert.equal(
  shouldFetchRetailerListing({
    merchant: "other",
    productId: null,
    url: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
    scrapedImageUrl: "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg",
  }),
  false,
);
assert.equal(
  shouldFetchRetailerListing({
    merchant: "other",
    productId: null,
    url: "https://slickdeals.net/click?trd=Get+Deal+at+Ashley",
  }),
  false,
);

const ashleyListingHtml = readFileSync(new URL("../src/lib/__fixtures__/ashley-listing.html", import.meta.url), "utf8");
const ashleyExtracted = extractFromHtml(ashleyListingHtml, "other");
assert.equal(ashleyExtracted.scrapedImageUrl, "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg");
assert.equal(ashleyExtracted.currentPrice, 449);
assert.equal(ashleyExtracted.title?.includes("Storrow Sofa"), true);

assert.equal(sofa.imageTier, "placeholder");
const sofaHydrated = hydrateDealFromListingHtml(sofa, ashleyListingHtml);
assert.equal(sofaHydrated.imageUrl, "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg");
assert.equal(sofaHydrated.scrapedImageUrl, "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg");
assert.equal(sofaHydrated.imageTier, "scraped");
assert.equal(sofaHydrated.currentPrice, 399);
assert.equal(sofaHydrated.listPrice, null);
assert.equal(sofaHydrated.title.includes("Ashley Storrow Sofa"), true);
assert.equal(/biggest living room|0% APR|financing this weekend|collection packages/i.test(sofaHydrated.title), false);
assert.equal(/biggest living room|0% APR|financing this weekend|collection packages/i.test(sofaHydrated.summary ?? ""), false);
assert.equal(/biggest living room|0% APR|financing this weekend|collection packages/i.test(sofaHydrated.bullets.join(" ")), false);
assert.equal(/doorstep|white glove/i.test(sofaHydrated.bullets.join(" ") + sofaHydrated.stackingSteps.map((step) => step.detail).join(" ")), true);
assert.equal(isBrandedPlaceholder(sofaHydrated.imageUrl), false);
assert.equal(/Paste the product Image URL/i.test(sofaHydrated.scrapeNote ?? ""), false);

const noPriceHydrated = hydrateDealFromListingHtml(
  dealsFromRoundupCandidates([
    {
      href: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
      title: "Ashley Storrow Sofa",
      currentPrice: null,
      listPrice: null,
    },
  ])[0]!,
  ashleyListingHtml,
);
assert.equal(noPriceHydrated.currentPrice, 449);
assert.equal(noPriceHydrated.pricesBlocked, false);
assert.equal(noPriceHydrated.title.includes("Ashley Storrow Sofa"), true);
assert.equal(noPriceHydrated.listPrice, null);

const untitledHydrated = hydrateDealFromListingHtml(
  dealsFromRoundupCandidates([
    {
      href: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html",
      title: "Untitled deal",
      currentPrice: 399,
      listPrice: null,
    },
  ])[0]!,
  ashleyListingHtml,
);
assert.equal(untitledHydrated.title, "Storrow Sofa");
assert.equal(untitledHydrated.currentPrice, 399);

const amazonHydrated = hydrateDealFromListingHtml(silver!, ashleyListingHtml);
assert.equal(amazonHydrated.imageTier, "cdn");
assert.equal(amazonHydrated.imageUrl.includes("B0G467WG1C"), true);
assert.equal(amazonHydrated.imageUrl.includes("storrow-sofa"), false);

const originalFetch = globalThis.fetch;
let ashleyListingFetches = 0;
let amazonListingFetches = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (/ashleyfurniture\.com/i.test(url)) {
    ashleyListingFetches += 1;
    return new Response(ashleyListingHtml, { status: 200, headers: { "content-type": "text/html" } });
  }
  if (/slickdeals\.net\/click|sldc\.net|sdclick\./i.test(url)) {
    return new Response(null, {
      status: 302,
      headers: { location: "https://www.ashleyfurniture.com/p/storrow_sofa/2920338.html" },
    });
  }
  if (/slickdeals\.net/i.test(url)) {
    return new Response(sdHtml, { status: 200, headers: { "content-type": "text/html" } });
  }
  if (/9to5toys\.com/i.test(url)) {
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  }
  if (/amzn\.to/i.test(url)) {
    return new Response(null, {
      status: 302,
      headers: { location: "https://www.amazon.com/dp/B0G467WG1C" },
    });
  }
  if (/amazon\.com/i.test(url)) {
    amazonListingFetches += 1;
    return new Response("<html><body>nope</body></html>", { status: 200, headers: { "content-type": "text/html" } });
  }
  return originalFetch(input, init);
}) as typeof fetch;
try {
  const pasted = await ingestDealPaste("https://slickdeals.net/f/19957455-ashley-storrow-sofa-399");
  assert.equal(pasted.deals.length, 1);
  assert.equal(pasted.deals[0]?.imageUrl, "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg");
  assert.equal(pasted.deals[0]?.scrapedImageUrl, "https://cdn.ashleyfurniture.com/images/storrow-sofa.jpg");
  assert.equal(pasted.deals[0]?.imageTier, "scraped");
  assert.equal(pasted.deals[0]?.currentPrice, 399);
  assert.equal(pasted.deals[0]?.title.includes("Ashley Storrow Sofa"), true);
  assert.equal(/biggest living room|0% APR|collection packages/i.test(pasted.deals[0]?.bullets.join(" ") ?? ""), false);
  assert.equal(/Ashley Furniture/.test(pasted.deals[0]?.bullets.join(" ") ?? ""), true);
  assert.equal(/\bat Store\b/.test(pasted.deals[0]?.bullets.join(" ") ?? ""), false);
  assert.equal(/Ashley Furniture/.test(pasted.deals[0]?.stackingSteps.map((step) => step.title).join(" ") ?? ""), true);
  assert.equal(ashleyListingFetches, 1);

  const toys = await ingestDealPaste("https://9to5toys.com/2026/09/01/iphone-17-pro-deals/");
  assert.equal(toys.deals.length >= 1, true);
  assert.equal(amazonListingFetches, 0);
  const toysSilver = toys.deals.find((deal) => deal.merchantProductId === "B0G467WG1C");
  assert.equal(toysSilver?.imageTier, "cdn");
  assert.equal(toysSilver?.affiliateUrl.includes("tag=actuallydea07-20"), true);
} finally {
  globalThis.fetch = originalFetch;
}

const walgreensListingHtml = `<html><head>
<meta property="og:title" content="Set of 6 Premium Photo Cards">
<meta property="og:image" content="https://photo.walgreens.com/images/sample-set-of-6-premium.jpg">
</head><body><h1>Set of 6 Premium Photo Cards</h1></body></html>`;
const originalDocFetch = globalThis.fetch;
let walgreensListingFetches = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (/doctorofcredit\.com/i.test(url)) {
    return new Response(docHtml, { status: 200, headers: { "content-type": "text/html" } });
  }
  if (/photo\.walgreens\.com/i.test(url)) {
    walgreensListingFetches += 1;
    if (init?.method === "GET" && init.redirect === "manual") {
      return new Response(null, { status: 200 });
    }
    return new Response(walgreensListingHtml, { status: 200, headers: { "content-type": "text/html" } });
  }
  return originalDocFetch(input, init);
}) as typeof fetch;
try {
  const docPaste = await ingestDealPaste(docPage);
  assert.equal(docPaste.deals.length, 1);
  assert.equal(docPaste.deals[0]?.promoCode, "PREM6");
  assert.equal(docPaste.deals[0]?.sourceUrl.includes("photo.walgreens.com/store/sample-set-of-6-premium"), true);
  assert.equal(docPaste.deals[0]?.merchant, "other");
  assert.equal(docPaste.deals[0]?.listPrice ?? null, null);
  assert.equal(docPaste.deals[0]?.currentPrice, 0);
  assert.equal(docPaste.deals[0]?.imageUrl, "https://photo.walgreens.com/images/sample-set-of-6-premium.jpg");
  assert.equal(docPaste.deals[0]?.imageTier, "scraped");
  const deskWriteup = [
    docPaste.deals[0]?.title,
    docPaste.deals[0]?.bullets.join(" "),
    docPaste.deals[0]?.stackingSteps.map((step) => `${step.title} ${step.detail}`).join(" "),
    docPaste.deals[0]?.summary ?? "",
  ].join("\n");
  assert.equal(retiredCodes.test(deskWriteup), false);
  assert.equal(/PREM6/.test(deskWriteup), true);
  assert.equal(walgreensListingFetches >= 1, true);
} finally {
  globalThis.fetch = originalDocFetch;
}

console.log("parser verification passed");
