type MatchType = "exact" | "fuzzy" | "new";

type StrictGroup = {
  strictKey: string;
  variants: Map<string, number>;
  totalCount: number;
  canonicalLabel: string;
  tokens: string[];
};

type Cluster = {
  canonicalKey: string;
  canonicalLabel: string;
  groups: StrictGroup[];
};

export type CourseVariantGroup = {
  canonicalLabel: string;
  variants: string[];
};

export type FuzzyCourseGroup = {
  canonicalLabel: string;
  mergedLabels: string[];
};

export type ResolvedCourseName = {
  canonicalKey: string;
  canonicalLabel: string;
  strictKey: string;
  matchType: MatchType;
};

export type CourseNameNormalizer = {
  resolveCourseName: (rawName: string) => ResolvedCourseName | null;
  variantGroups: CourseVariantGroup[];
  fuzzyGroups: FuzzyCourseGroup[];
};

const COURSE_STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "y",
  "e",
  "en",
  "para",
  "con",
  "por",
  "a",
  "al",
]);

export const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const normalizeLookupKey = (value: string): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeForTokens = (value: string): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const tokenizeCourseLabel = (value: string): string[] => {
  const tokens = normalizeForTokens(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !COURSE_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
};

export const buildCourseStrictKey = (value: string): string => {
  const tokens = tokenizeCourseLabel(value).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );

  if (tokens.length > 0) {
    return tokens.join("");
  }

  return normalizeLookupKey(value);
};

const chooseCanonicalLabel = (variants: Map<string, number>): string => {
  const ranked = Array.from(variants.entries()).sort((a, b) => {
    const countDiff = (b[1] ?? 0) - (a[1] ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }

    return a[0].localeCompare(b[0], "es", { sensitivity: "base" });
  });

  return ranked[0]?.[0] ?? "";
};

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j] ?? 0;
    }
  }

  return previous[b.length] ?? 0;
};

const jaccardSimilarity = (a: string[], b: string[]): number => {
  const setA = new Set(a);
  const setB = new Set(b);

  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
};

const hasSharedLongToken = (a: string[], b: string[]): boolean => {
  const setB = new Set(b);
  return a.some((token) => token.length >= 5 && setB.has(token));
};

const computeSimilarity = (left: StrictGroup, right: StrictGroup): number => {
  const leftTokens = left.tokens;
  const rightTokens = right.tokens;

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const tokenScore = jaccardSimilarity(leftTokens, rightTokens);
  if (tokenScore < 0.4) {
    return 0;
  }

  if (!hasSharedLongToken(leftTokens, rightTokens) && tokenScore < 0.75) {
    return 0;
  }

  const joinedLeft = leftTokens.join(" ");
  const joinedRight = rightTokens.join(" ");
  const maxLen = Math.max(joinedLeft.length, joinedRight.length);

  if (maxLen < 8) {
    return tokenScore >= 0.9 ? tokenScore : 0;
  }

  const distance = levenshteinDistance(joinedLeft, joinedRight);
  const distanceRatio = distance / maxLen;
  if (distanceRatio > 0.25) {
    return 0;
  }

  const distanceScore = 1 - distanceRatio;
  return tokenScore * 0.55 + distanceScore * 0.45;
};

const mergeThreshold = 0.72;

export const createCourseNameNormalizer = (rawNames: string[]): CourseNameNormalizer => {
  const strictGroupsMap = new Map<string, StrictGroup>();

  for (const rawName of rawNames) {
    const cleaned = normalizeWhitespace(rawName);
    if (!cleaned) {
      continue;
    }

    const strictKey = buildCourseStrictKey(cleaned);
    if (!strictKey) {
      continue;
    }

    const group = strictGroupsMap.get(strictKey) ?? {
      strictKey,
      variants: new Map<string, number>(),
      totalCount: 0,
      canonicalLabel: cleaned,
      tokens: tokenizeCourseLabel(cleaned),
    };

    group.variants.set(cleaned, (group.variants.get(cleaned) ?? 0) + 1);
    group.totalCount += 1;
    group.canonicalLabel = chooseCanonicalLabel(group.variants);

    strictGroupsMap.set(strictKey, group);
  }

  const strictGroups = Array.from(strictGroupsMap.values()).sort((a, b) => {
    const countDiff = b.totalCount - a.totalCount;
    if (countDiff !== 0) {
      return countDiff;
    }

    return a.canonicalLabel.localeCompare(b.canonicalLabel, "es", {
      sensitivity: "base",
    });
  });

  const clusters: Cluster[] = [];
  const strictKeyToCluster = new Map<string, Cluster>();

  for (const group of strictGroups) {
    let bestCluster: Cluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const anchor = cluster.groups[0];
      if (!anchor) {
        continue;
      }

      const similarity = computeSimilarity(group, anchor);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= mergeThreshold) {
      bestCluster.groups.push(group);
      strictKeyToCluster.set(group.strictKey, bestCluster);
      continue;
    }

    const cluster: Cluster = {
      canonicalKey: group.strictKey,
      canonicalLabel: group.canonicalLabel,
      groups: [group],
    };
    clusters.push(cluster);
    strictKeyToCluster.set(group.strictKey, cluster);
  }

  const variantGroups: CourseVariantGroup[] = strictGroups
    .filter((group) => group.variants.size > 1)
    .map((group) => ({
      canonicalLabel: group.canonicalLabel,
      variants: Array.from(group.variants.keys()).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      ),
    }));

  const fuzzyGroups: FuzzyCourseGroup[] = clusters
    .filter((cluster) => cluster.groups.length > 1)
    .map((cluster) => ({
      canonicalLabel: cluster.canonicalLabel,
      mergedLabels: Array.from(
        new Set(cluster.groups.map((group) => group.canonicalLabel)),
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    }));

  const resolveCourseName = (rawName: string): ResolvedCourseName | null => {
    const cleaned = normalizeWhitespace(rawName);
    if (!cleaned) {
      return null;
    }

    const strictKey = buildCourseStrictKey(cleaned);
    if (!strictKey) {
      return null;
    }

    const cluster = strictKeyToCluster.get(strictKey);

    if (!cluster) {
      return {
        canonicalKey: strictKey,
        canonicalLabel: cleaned,
        strictKey,
        matchType: "new",
      };
    }

    const matchType: MatchType =
      cluster.canonicalKey === strictKey ? "exact" : "fuzzy";

    return {
      canonicalKey: cluster.canonicalKey,
      canonicalLabel: cluster.canonicalLabel,
      strictKey,
      matchType,
    };
  };

  return {
    resolveCourseName,
    variantGroups,
    fuzzyGroups,
  };
};
