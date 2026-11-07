// Validates every skill under skills/: the rules Claude Code needs to load it, plus house rules.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../skills/', import.meta.url).pathname;
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const SKILL_MAX_LINES = 500;
// Backticked paths into a skill's own folders, e.g. `templates/story.md` or `references/`.
const LOCAL_PATH = /`((?:templates|references)\/[\w./-]*)`/g;

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const frontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split('\n')
      .map((line) => /^([a-z-]+):\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()]),
  );
};

const skills = readdirSync(ROOT).filter((entry) => statSync(join(ROOT, entry)).isDirectory());
if (skills.length === 0) fail('skills/', 'no skills found');

for (const skill of skills) {
  const dir = join(ROOT, skill);
  const where = `skills/${skill}`;
  const skillFile = join(dir, 'SKILL.md');
  if (!existsSync(skillFile)) {
    fail(where, 'missing SKILL.md');
    continue;
  }
  const text = readFileSync(skillFile, 'utf8');
  const meta = frontmatter(text);
  if (!meta) {
    fail(`${where}/SKILL.md`, 'missing --- frontmatter --- block');
    continue;
  }
  if (meta.name !== skill) fail(`${where}/SKILL.md`, `name "${meta.name}" must equal the folder`);
  if (!NAME_PATTERN.test(skill) || skill.length > NAME_MAX) {
    fail(where, `folder name must be kebab-case, at most ${NAME_MAX} characters`);
  }
  if (!meta.description) fail(`${where}/SKILL.md`, 'missing description');
  else if (meta.description.length > DESCRIPTION_MAX) {
    fail(
      `${where}/SKILL.md`,
      `description is ${meta.description.length} > ${DESCRIPTION_MAX} chars`,
    );
  }
  const lines = text.split('\n').length;
  if (lines > SKILL_MAX_LINES) {
    fail(`${where}/SKILL.md`, `${lines} lines > ${SKILL_MAX_LINES}; move detail into files`);
  }

  for (const file of walk(dir)) {
    if (!file.endsWith('.md') || relative(dir, file).startsWith('templates/')) continue;
    const body = readFileSync(file, 'utf8');
    // SKILL.md may talk about placeholders; reference files must not carry unfilled ones.
    if (file !== skillFile) {
      if (body.includes('{{')) fail(relative(ROOT, file), 'placeholder {{…}} outside templates/');
      continue;
    }
    for (const [, path] of body.matchAll(LOCAL_PATH)) {
      if (!existsSync(join(dir, path))) {
        fail(`${where}/SKILL.md`, `refers to \`${path}\`, which does not exist`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`${skills.length} skills OK: ${skills.join(', ')}`);
