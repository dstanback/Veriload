export function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function weightedConfidence(scores: Array<{ score: number; weight: number }>) {
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weightedTotal = scores.reduce((sum, item) => sum + item.score * item.weight, 0);
  return clampConfidence(weightedTotal / totalWeight);
}
