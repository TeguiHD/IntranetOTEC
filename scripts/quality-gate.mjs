import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.cwd());
const srcRoot = path.join(projectRoot, "src");
const tailwindConfigPath = path.join(projectRoot, "tailwind.config.ts");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".security-build"]);

const RULES = [
  {
    id: "no-outline-none",
    severity: "error",
    description: "Uso de `outline-none` sin reemplazo accesible.",
    evaluate: (content) => findMatches(content, /\boutline-none\b/g),
  },
  {
    id: "no-transition-all",
    severity: "error",
    description: "Uso de `transition-all` prohibido por UX/security gate.",
    evaluate: (content) => findMatches(content, /\btransition-all\b/g),
  },
  {
    id: "no-div-span-onclick",
    severity: "error",
    description: "Evitar acciones con `div/span onClick`; usar `<button>` o `<a>`.",
    evaluate: (content) => findMatches(content, /<(div|span)\b[^>]*\bonClick\s*=/g),
  },
];

const lineFromIndex = (content, index) =>
  content.slice(0, index).split("\n").length;

const findMatches = (content, pattern) => {
  const issues = [];

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    issues.push({
      line: lineFromIndex(content, index),
      excerpt: match[0],
    });
  }

  return issues;
};

const listSourceFiles = async (baseDir) => {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(baseDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

const checkInputMode = (content) => {
  const issues = [];
  const inputRegex = /<input\b[^>]*>/g;

  for (const match of content.matchAll(inputRegex)) {
    const tag = match[0];
    const index = match.index ?? 0;

    if (/type\s*=\s*["']hidden["']/i.test(tag)) {
      continue;
    }

    if (!/\binputMode\s*=/.test(tag)) {
      issues.push({
        line: lineFromIndex(content, index),
        excerpt: tag,
      });
    }
  }

  return issues;
};

const checkIconButtonLabels = (content) => {
  const issues = [];
  const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;

  for (const match of content.matchAll(buttonRegex)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const index = match.index ?? 0;

    if (/\baria-label\s*=/.test(attrs) || /\baria-labelledby\s*=/.test(attrs)) {
      continue;
    }

    const textOnly = body
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (textOnly.length === 0) {
      issues.push({
        line: lineFromIndex(content, index),
        excerpt: "<button>...</button>",
      });
    }
  }

  return issues;
};

const checkTailwindDvh = async () => {
  const config = await fs.readFile(tailwindConfigPath, "utf8");
  const issues = [];

  if (!config.includes("100dvh")) {
    issues.push({
      line: 1,
      rule: "tailwind-dvh-required",
      severity: "error",
      description: "Tailwind debe mapear `h-screen`/`min-h-screen` a `100dvh`.",
      excerpt: "100dvh missing",
      file: "tailwind.config.ts",
    });
  }

  if (!config.includes("darkMode")) {
    issues.push({
      line: 1,
      rule: "tailwind-darkmode-required",
      severity: "error",
      description: "Tailwind debe declarar `darkMode: 'class'`.",
      excerpt: "darkMode missing",
      file: "tailwind.config.ts",
    });
  }

  return issues;
};

const run = async () => {
  const files = await listSourceFiles(srcRoot);
  const findings = [];

  for (const file of files) {
    const relativeFile = path.relative(projectRoot, file).replaceAll(path.sep, "/");
    const content = await fs.readFile(file, "utf8");

    for (const rule of RULES) {
      const matches = rule.evaluate(content);

      for (const issue of matches) {
        findings.push({
          file: relativeFile,
          line: issue.line,
          rule: rule.id,
          severity: rule.severity,
          description: rule.description,
          excerpt: issue.excerpt,
        });
      }
    }

    const inputModeIssues = checkInputMode(content);

    for (const issue of inputModeIssues) {
      findings.push({
        file: relativeFile,
        line: issue.line,
        rule: "inputmode-required",
        severity: "error",
        description: "Cada `<input>` visible debe declarar `inputMode`.",
        excerpt: issue.excerpt,
      });
    }

    const iconButtonIssues = checkIconButtonLabels(content);

    for (const issue of iconButtonIssues) {
      findings.push({
        file: relativeFile,
        line: issue.line,
        rule: "icon-button-aria-label",
        severity: "error",
        description: "Botones sin texto visible deben declarar `aria-label`.",
        excerpt: issue.excerpt,
      });
    }
  }

  findings.push(...(await checkTailwindDvh()));

  if (findings.length === 0) {
    console.log("quality-gate: OK");
    return;
  }

  console.error("quality-gate: violations detected");

  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line} [${finding.severity}] ${finding.rule} - ${finding.description}`,
    );
  }

  const errorCount = findings.filter((item) => item.severity === "error").length;

  if (errorCount > 0) {
    process.exitCode = 1;
  }
};

await run();
