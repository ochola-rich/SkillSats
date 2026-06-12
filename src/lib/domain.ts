export const SAT_USD_RATE = 0.00065;
export const CREATOR_REVENUE_PERCENT = 90;
export const AD_VIEWER_REWARD_PERCENT = 60;

export function calculateCreatorRevenue(paidSats: number) {
  return Math.floor((paidSats * CREATOR_REVENUE_PERCENT) / 100);
}

export function calculateAdViewerReward(rewardSats: number) {
  return Math.floor((rewardSats * AD_VIEWER_REWARD_PERCENT) / 100);
}

export function hasRemainingAdBudget(spentSats: number, rewardSats: number, budgetSats: number) {
  return spentSats + rewardSats <= budgetSats;
}

export function isAdAvailableToUser(
  ad: { id: string; spentSats: number; rewardSats: number; budgetSats: number },
  recentlyWatchedAdIds: ReadonlySet<string>,
) {
  return (
    !recentlyWatchedAdIds.has(ad.id) &&
    hasRemainingAdBudget(ad.spentSats, ad.rewardSats, ad.budgetSats)
  );
}

export function satsToUsd(sats: number) {
  return (sats * SAT_USD_RATE).toFixed(2);
}
